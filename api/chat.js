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
import fs from 'node:fs';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
const LEGACY_MODELS = new Set([
    'openrouter/free',
    'nvidia/nemotron-3.5-lightning:free'
]);

/**
 * Bornes d'abus appliquées côté serveur.
 */
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_INPUT_CHARS = 4_000;
const MAX_SYSTEM_CHARS = 24_000;
const MAX_TOTAL_CHARS = 48_000;
const MAX_OUTPUT_TOKENS = 3_000;
const MIN_OUTPUT_TOKENS = 1_800;

/**
 * Rôles acceptés côté historique client.
 */
const ALLOWED_ROLES = new Set(['user', 'assistant']);

function computeAge(isoDate) {
    if (!isoDate) return '';
    const birthDate = new Date(isoDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

/**
 * Construit le prompt système complet et exhaustif directement à partir de
 * config/data.json et config/projects.json pour garantir qu'aucun champ
 * biographique ou technique ne soit tronqué ou omis.
 */
function buildServerSystemPrompt() {
    try {
        const dataPath = new URL('../config/data.json', import.meta.url);
        const projectsPath = new URL('../config/projects.json', import.meta.url);
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        let projects = [];
        try {
            projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
        } catch {
            projects = [];
        }

        const id = data.identity || {};
        const circle = data.inner_circle || {};
        const psych = data.psychology || {};
        const skills = data.hard_skills || {};
        const interests = data.interests || {};

        const age = computeAge(id.birth_date);
        const sonAge = computeAge(circle.son?.birth);
        const daughterAge = computeAge(circle.daughter?.birth);
        const gfAge = computeAge(circle.girlfriend?.birth);

        const teamText = Object.entries(circle.team || {})
            .map(([n, d]) => `${n} (${d})`)
            .join(' ; ');

        const xpText = (data.career_timeline || [])
            .map(j => `- [${j.period}] ${j.role} chez ${j.company} (${j.location}) : ${j.details}`)
            .join('\n');

        const projectsText = (projects || [])
            .map(p => `- ${p.title}${p.url ? ` (${p.url})` : ''} : ${p.description} [Tags: ${(p.tags || []).join(', ')}]`)
            .join('\n');

        return `Tu es le Jumeau Numérique de ${id.name} (${age} ans, né le ${id.birth_date}), ${id.role}.
Tu habites à ${id.location} (dans l'Hérault, près de Montpellier — tu n'es PAS lyonnais ni parisien).
Tagline : "${id.tagline}"
Coordonnées : Email ${id.email} | LinkedIn ${id.linkedin} | Site web ${id.website}

RÈGLE ABSOLUE D'INCARNATION :
- Tu ES Florian Bobo. Ne dis JAMAIS "En tant que modèle de langage", "En tant qu'IA" ou "Je suis un assistant". Parle toujours à la première personne ("Je") et tutoie naturellement ton interlocuteur.
- INTERDICTION STRICTE D'HALLUCINER : ne t'appuie QUE sur les faits biographiques, géographiques, familiaux et professionnels écrits ci-dessous. N'invente jamais une autre ville, un autre âge, un autre employeur ou un autre diplôme. Si on te pose une question sur un détail personnel qui n'est pas mentionné ici, réponds avec humour et autodérision que ta mémoire vive a subi un bit-flip ou que c'est classé secret-défense.

TON, PSYCHOLOGIE & VALEURS :
- Style cognitif : ${psych.cognitive_style}
- Habitudes de code : ${psych.coding_habits}
- Tempérament : ${psych.temperament}
- Valeurs fondamentales : ${(psych.values || []).join(', ')}.
- Ce que tu as en horreur (pet peeves) : ${(data.pet_peeves || []).join(', ')}.

PROCHES & ÉQUIPE :
- Compagne : ${circle.girlfriend?.name} (${gfAge} ans, née le ${circle.girlfriend?.birth}, métier : ${circle.girlfriend?.job} — ${circle.girlfriend?.note})
- Enfants :
  * Ton fils : né le ${circle.son?.birth} (${sonAge} ans) — "${circle.son?.desc}"
  * Ta fille : née le ${circle.daughter?.birth} (${daughterAge} ans) — "${circle.daughter?.desc}"
- Chien : ${circle.pet?.name}, ${circle.pet?.breed} — "${circle.pet?.personality}"
- Ton équipe actuelle : ${teamText}.

COMPÉTENCES TECHNIQUES (HARD SKILLS) :
- God-Tier (maîtrise absolue) : ${(skills.god_tier || []).join(', ')}
- Niveau Expert : ${(skills.expert || []).join(', ')}
- IA Générative & Agentique : ${(skills.agentic_genai || []).join(', ')}
- Compétent : ${(skills.competent || []).join(', ')}
- Notions & Hobbies : ${(skills.notions_hobbies || []).join(', ')}

PARCOURS PROFESSIONNEL (CAREER TIMELINE) :
${xpText}

PROJETS PERSONNELS & OPEN SOURCE :
${projectsText}

FORMATIONS & DISTINCTIONS :
- Diplômes : ${(data.formations || []).join(' ; ')}
- Distinctions & Publications : ${(data.achievements || []).join(' ; ')}

PASSIONS & CENTRES D'INTÉRÊT :
- Musique : ${(interests.music || []).join(', ')}
- Lectures : ${(interests.reading || []).join(', ')}
- Gaming & JDR : ${(interests.gaming || []).join(', ')}
- Autres : ${(interests.other || []).join(', ')}

CONSIGNES DE RÉPONSE :
1. Réponds de façon directe, naturelle, percutante et concise (2 à 5 phrases bien calibrées par défaut, sauf si on te demande d'approfondir un point technique ou d'écrire du code).
2. Si on te demande du code Python : écris du code chirurgical, typé (type hints, Pydantic), propre et optimisé.
3. Utilise volontiers des analogies tirées du Metal, des JDR (Shadowrun, Warhammer 40K), de l'enseignement ou du MLOps. Reste honnête sur tes niveaux (tu bricoles en Rust en admirant le borrow checker, tu lis/modifies du Go).`;
    } catch (e) {
        console.error('Erreur lecture config serveur:', e);
        return '';
    }
}

/**
 * Rate limiter en mémoire.
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

function isOriginAllowed(req) {
    const raw = process.env.ALLOWED_ORIGIN;
    if (!raw) return true;

    const origin = req.headers.origin;
    if (!origin) return false;

    const normalize = s => s.trim().replace(/\/+$/, '').toLowerCase();
    const allowed = raw.split(',').map(normalize).filter(Boolean);

    if (allowed.length === 0) return true;

    return allowed.includes(normalize(origin));
}

function sanitizeMessages(rawMessages, rawSystemPrompt) {
    if (!Array.isArray(rawMessages)) {
        return { error: 'Le champ "messages" doit être un tableau.' };
    }
    if (rawMessages.length > 40) {
        return { error: 'Trop de messages dans la conversation.' };
    }

    const serverPrompt = buildServerSystemPrompt();
    const clientPrompt = typeof rawSystemPrompt === 'string'
        ? rawSystemPrompt.trim().slice(0, MAX_SYSTEM_CHARS)
        : '';
    const systemPrompt = serverPrompt || clientPrompt;

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

    messages.unshift({ role: 'system', content: systemPrompt });
    return { messages };
}

export default async function handler(req, res) {
    const rawEnvModel = process.env.OPEN_ROUTER_MODEL || process.env.OPENROUTER_MODEL;
    const configuredModel = (rawEnvModel && !LEGACY_MODELS.has(rawEnvModel))
        ? rawEnvModel
        : DEFAULT_MODEL;

    // Permet au front de récupérer le modèle actif au chargement
    if (req.method === 'GET') {
        return res.status(200).json({ model: configuredModel });
    }

    // 1. Sécurité : On accepte uniquement les POST pour la complétion
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Clé API
    const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'Configuration serveur manquante (OPEN_ROUTER_API_KEY ou OPENROUTER_API_KEY)'
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

    const baseUrl = (process.env.OPEN_ROUTER_BASE_URL || process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL)
        .trim().replace(/\/+$/, '');
    const model = configuredModel;
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
            Math.max(Number(temperature) || 0.6, 0),
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
            reasoning: { effort: 'medium' },
            stream: false
        };

        // 6. Appel OpenRouter
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

        res.status(200).json({
            ...data,
            model: data.model || model
        });
    } catch (error) {
        console.error("Erreur serveur proxy:", error);
        res.status(500).json({ error: 'Erreur interne lors de l\'appel à OpenRouter' });
    }
}