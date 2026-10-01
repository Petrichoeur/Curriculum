// Ce code tourne sur les serveurs de Vercel, pas dans le navigateur.
// La clé est en sécurité ici.

/**
 * Bornes d'abus appliquées côté serveur.
 * Sans elles, ce endpoint est un proxy ouvert : n'importe qui peut
 * burner la clé Gemini à volonté (facturation) ou s'en servir de relai.
 */
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10); // requêtes
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_INPUT_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 1_000;
const MIN_OUTPUT_TOKENS = 16;
const ALLOWED_ROLES = new Set(['user', 'model']);

/**
 * Rate limiter en mémoire.
 * NOTE : sur Vercel les instances sont éphémères et non partagées, donc cette
 * limite est *best-effort* (elle bloque les abus simples et les bursts, mais
 * n'est pas une garantie). Pour une garantie ferme, brancher un store partagé
 * (Upstash Redis / Vercel KV) derrière la même interface.
 */
const buckets = new Map();

function getClientKey(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        ?.split(',')[0]
        ?.trim() || req.socket?.remoteAddress || 'unknown';
    return ip;
}

function checkRateLimit(key) {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
        buckets.set(key, { start: now, count: 1 });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (bucket.count >= RATE_LIMIT_MAX) {
        const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.start)) / 1000);
        return { allowed: false, retryAfter };
    }

    bucket.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - bucket.count };
}

/**
 * Vérifie que la requête vient bien du site (anti-CSRF / anti-relay).
 * L'Origin des navigateurs est envoyé automatiquement : un script serveur
 * (curl, python) n'en fournit pas et se voit rejected.
 * À désactiver uniquement si l'API doit être publique.
 */
function isOriginAllowed(req) {
    const allowed = process.env.ALLOWED_ORIGIN;
    if (!allowed) return true; // non configuré -> pas de contrôle

    const origin = req.headers.origin;
    if (!origin) return false;

    return origin === allowed;
}

/**
 * Valide et assainit le payload `contents` reçu du client.
 * On reconstruit un objet propre : rien de ce que le client envoie
 * n'est réinjecté tel quel vers Google.
 */
function sanitizeContents(raw) {
    if (!Array.isArray(raw)) {
        return { error: 'Le champ "contents" doit être un tableau.' };
    }
    if (raw.length > 40) {
        return { error: 'Trop de messages dans la conversation.' };
    }

    const cleaned = [];
    let totalChars = 0;

    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') {
            return { error: 'Structure de message invalide.' };
        }
        if (!ALLOWED_ROLES.has(entry.role)) {
            return { error: `Rôle non autorisé : ${String(entry.role).slice(0, 20)}` };
        }
        if (!Array.isArray(entry.parts) || entry.parts.length === 0) {
            return { error: 'Message sans contenu.' };
        }

        const parts = [];
        for (const part of entry.parts) {
            if (!part || typeof part.text !== 'string') continue;

            const text = part.text.slice(0, MAX_INPUT_CHARS);
            totalChars += text.length;
            if (totalChars > MAX_TOTAL_CHARS) {
                return { error: 'Conversation trop volumineuse.' };
            }
            parts.push({ text });
        }

        if (parts.length > 0) {
            cleaned.push({ role: entry.role, parts });
        }
    }

    if (cleaned.length === 0) {
        return { error: 'Aucun message exploitable.' };
    }
    return { contents: cleaned };
}

export default async function handler(req, res) {
    // 1. Sécurité : On accepte uniquement les POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Clé API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Configuration serveur manquante (API KEY)' });
    }

    // 3. Contrôle d'origine
    if (!isOriginAllowed(req)) {
        return res.status(403).json({ error: 'Origine non autorisée' });
    }

    // 4. Rate limiting
    const { allowed, retryAfter, remaining } = checkRateLimit(getClientKey(req));
    if (!allowed) {
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
            error: `Trop de requêtes. Réessayez dans ${retryAfter}s.`
        });
    }
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    const MODEL_NAME = process.env.GEMINI_MODEL || 'gemma-3-27b-it';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    try {
        // 5. Validation du body
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { contents, generationConfig } = body;

        const sanitized = sanitizeContents(contents);
        if (sanitized.error) {
            return res.status(400).json({ error: sanitized.error });
        }

        // On n'accepte qu'un sous-ensemble de generationConfig, borné.
        const requestedTokens = Number(generationConfig?.maxOutputTokens) || MAX_OUTPUT_TOKENS;
        const temperature = Math.min(
            Math.max(Number(generationConfig?.temperature) || 0.8, 0),
            2
        );

        const upstreamBody = {
            contents: sanitized.contents,
            generationConfig: {
                temperature,
                maxOutputTokens: Math.min(
                    Math.max(requestedTokens, MIN_OUTPUT_TOKENS),
                    MAX_OUTPUT_TOKENS
                )
            }
        };

        // 6. Appel Google Gemini
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upstreamBody)
        });

        const data = await response.json();

        // 7. On renvoie la réponse au front
        if (!response.ok) {
            console.error('Erreur Gemini:', response.status, JSON.stringify(data).slice(0, 500));
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Erreur serveur proxy:", error);
        res.status(500).json({ error: 'Erreur interne lors de l\'appel à Gemini' });
    }
}
