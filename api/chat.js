// Ce code tourne sur les serveurs de Vercel, pas dans le navigateur.
// La clé est en sécurité ici.

/**
 * Proxy OpenRouter (API compatible OpenAI).
 *
 * Le site interroge ce endpoint, qui relaie vers OpenRouter. Sans ces
 * garde-fous, ce serait un proxy ouvert : n'importe qui pourrait POST en
 * boucle et faire construire la facture.
 *
 * Format : OpenAI chat completions (`messages`), pas le format `contents`/
 * `parts` de Gemini. Le front a été aligné en conséquence.
 */
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/free';

/**
 * Bornes d'abus appliquées côté serveur.
 */
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_INPUT_CHARS = 4_000;
const MAX_TOTAL_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 1_000;
const MIN_OUTPUT_TOKENS = 16;

/**
 * Rôles acceptés. `system` n'est volontairement pas autorisé ici : le prompt
 * système est construit par le serveur à partir de config/data.json, il ne
 * doit pas pouvoir être fourni par le client (sinon un attaquant s'en sert
 * pour contourner la persona).
 */
const ALLOWED_ROLES = new Set(['user', 'assistant']);

/**
 * Rate limiter en mémoire.
 * NOTE : sur Vercel les instances sont éphémères et non partagées, donc cette
 * limite est *best-effort*. Pour une garantie ferme, brancher un store
 * partagé (Upstash Redis / Vercel KV) derrière la même interface.
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
 * Valide et assainit le tableau `messages` reçu du client.
 *
 * Le front envoie le prompt système dans `systemPrompt` (champ séparé), pas
 * dans `messages` : c'est ce qui permet de le reconstruire côté serveur à
 * partir de la config, donc de ne jamais faire confiance au client sur ce
 * point.
 */
function sanitizeMessages(rawMessages, rawSystemPrompt) {
    if (!Array.isArray(rawMessages)) {
        return { error: 'Le champ "messages" doit être un tableau.' };
    }
    if (rawMessages.length > 40) {
        return { error: 'Trop de messages dans la conversation.' };
    }

    const systemPrompt = typeof rawSystemPrompt === 'string'
        ? rawSystemPrompt.trim().slice(0, MAX_INPUT_CHARS)
        : '';

    const messages = [];
    let totalChars = systemPrompt.length;

    for (const entry of rawMessages) {
        if (!entry || typeof entry !== 'object') {
            return { error: 'Structure de message invalide.' };
        }
        if (!ALLOWED_ROLES.has(entry.role)) {
            return { error: `Rôle non autorisé : ${String(entry.role).slice(0, 20)}` };
        }
        if (typeof entry.content !== 'string') {
            return { error: 'Message sans contenu textuel.' };
        }

        const content = entry.content.slice(0, MAX_INPUT_CHARS);
        totalChars += content.length;
        if (totalChars > MAX_TOTAL_CHARS) {
            return { error: 'Conversation trop volumineuse.' };
        }

        const trimmed = content.trim();
        if (trimmed) messages.push({ role: entry.role, content: trimmed });
    }

    if (messages.length === 0) {
        return { error: 'Aucun message exploitable.' };
    }
    if (!systemPrompt) {
        return { error: 'Prompt système manquant.' };
    }

    // Le système en tête, comme dans mirza (openRouterLlm.formatPrompt).
    messages.unshift({ role: 'system', content: systemPrompt });
    return { messages };
}

export default async function handler(req, res) {
    // 1. Sécurité : On accepte uniquement les POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Clé API
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'Configuration serveur manquante (OPENROUTER_API_KEY)'
        });
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

    const baseUrl = (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL)
        .trim().replace(/\/+$/, '');
    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
    const apiUrl = `${baseUrl}/chat/completions`;

    try {
        // 5. Validation du body
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { messages, temperature, maxTokens } = body || {};

        const sanitized = sanitizeMessages(messages, body?.systemPrompt);
        if (sanitized.error) {
            return res.status(400).json({ error: sanitized.error });
        }

        // On n'accepte qu'un sous-ensemble de paramètres, borné.
        const requestedTokens = Number(maxTokens) || MAX_OUTPUT_TOKENS;
        const clampedTemperature = Math.min(
            Math.max(Number(temperature) || 0.8, 0),
            2
        );

        const upstreamBody = {
            model,
            messages: sanitized.messages,
            temperature: clampedTemperature,
            max_tokens: Math.min(
                Math.max(requestedTokens, MIN_OUTPUT_TOKENS),
                MAX_OUTPUT_TOKENS
            ),
            stream: false
        };

        // 6. Appel OpenRouter
        // HTTP-Referer / X-Title : facultatifs pour l'API mais sans eux le
        // trafic est indistinguable d'une erreur dans le tableau de bord
        // OpenRouter. Même choix que mirza (engine/llm/openRouterLlm.py).
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://github.com/Petrichoeur/Curriculum',
                'X-Title': 'Curriculum - Jumeau Numerique'
            },
            body: JSON.stringify(upstreamBody)
        });

        const data = await response.json();

        // 7. On renvoie la réponse au front
        if (!response.ok) {
            console.error('Erreur OpenRouter:', response.status,
                JSON.stringify(data).slice(0, 500));
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Erreur serveur proxy:", error);
        res.status(500).json({ error: 'Erreur interne lors de l\'appel à OpenRouter' });
    }
}