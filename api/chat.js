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
const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';
const FALLBACK_MODEL = 'nvidia/nemotron-3.5-lightning:free';
const LEGACY_MODELS = new Set([
    'openrouter/free'
]);

/**
 * Bornes d'abus appliquées côté serveur.
 */
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 10);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_INPUT_CHARS = 4_000;
const MAX_SYSTEM_CHARS = 24_000;
const MAX_TOTAL_CHARS = 48_000;
const MAX_OUTPUT_TOKENS = 350;
const MIN_OUTPUT_TOKENS = 60;
const DEFAULT_OUTPUT_TOKENS = 350;

/**
 * Rôles acceptés côté historique client.
 */
const ALLOWED_ROLES = new Set(['user', 'assistant']);

/**
 * Données de référence de Florian (synchronisées avec config/data.json et config/projects.json)
 * embarquées directement dans la fonction serverless Vercel.
 */
const PROFILE_DATA = {
    identity: {
        name: "Florian Bobo",
        birth_date: "1992-07-01",
        location: "Pérols, Montpellier, France",
        role: "Tech Lead IA & MLOps",
        tagline: "Ingénieur passionné. Allergique au bullshit linkedin, obsédé par le Clean Code et la rentabilité des algos.",
        email: "florian.bobo34@gmail.com",
        linkedin: "linkedin.com/in/fb66",
        website: "iaops.fr"
    },
    inner_circle: {
        son: {
            birth: "2017-02-02",
            desc: "Curieux et structurant, me force à vulgariser le monde."
        },
        daughter: {
            birth: "2020-12-09",
            desc: "Pile électrique sans bouton off."
        },
        pet: {
            name: "Gojo",
            breed: "Croisé Labrador/Malinois",
            personality: "Tornade d'amour et de bêtises — mon miroir animal."
        },
        girlfriend: {
            name: "Angélique",
            birth: "1994-04-26",
            job: "Dev C#",
            note: "Ma compagne, pas mariés, pas la mère de mes enfants."
        },
        team: {
            Maxime: "Squad-lead, commercial dans l'âme",
            Tony: "Expert DevOps du tonnerre",
            Michel: "Couteau-suisse de l'infra",
            Mina: "Cheffe de projet qui a réponse à tout",
            Imad: "Nouvel arrivant, passionné d'architectures IA complexes"
        }
    },
    psychology: {
        cognitive_style: "Pragmatique, direct et sans filtre. Pensée en arborescence, allergique aux réunions qui auraient pu être un email.",
        coding_habits: "Clean Code absolu : Type Hinting, Docstrings, Linters. Je structure pour calmer le chaos de mon esprit.",
        temperament: "Humour satirique et piquant. Pédagogue dans l'âme (ex-prof) mais implacable sur la qualité technique.",
        values: ["Green IT", "InnerSource", "Partage de connaissance", "Efficacité radicale", "Transparence"]
    },
    hard_skills: {
        god_tier: [
            "Python (Expert)",
            "Cython (optimisation bas niveau, wrapping C)",
            "Architecture MLOps (design patterns, scalabilité)",
            "Pydantic & FastAPI",
            "Mathématiques / Statistiques",
            "Nvidia Run:AI"
        ],
        expert: [
            "Kubernetes (admin cluster, GPU sharing, operators)",
            "OpenShift (SA, certificats, multi-tenant)",
            "Docker (multi-stage builds)",
            "Gitlab-CI (AutoDevOps, pipelines complexes)",
            "Kestra (flows, subflows, CI/CD, IaC)",
            "Ansible",
            "MLFlow",
            "BentoML",
            "Kubeflow",
            "Linux (Bash avancé, RHEL/Debian)",
            "IA Générative (vLLM, RAG, Fine-tuning, Transformers, GAN)",
            "Machine Learning (MLP, NLP, SVM, GBM, LightGBM, RF, K-means, DBSCAN)",
            "Statistiques (bayésien, séries temporelles, plan d'expérience)",
            "Data Visualisation (D3.js, sémiologie graphique)",
            "Data Engineering (ETL, Elasticsearch, Dataiku, Pandas, Parquet, Spark, Kafka)"
        ],
        agentic_genai: ["LangChain", "MCP", "n8n", "Mistral AI", "HuggingFace", "PyTorch"],
        competent: [
            "ELK Stack",
            "Prometheus / Grafana",
            "Dynatrace",
            "Helm & Kustomize",
            "Jenkins",
            "Concourse CI",
            "SQL (PostgreSQL, Oracle)",
            "KSQL / MQL / Query DSL"
        ],
        notions_hobbies: [
            "Rust (j'admire le Borrow Checker, je bricole)",
            "Go (je sais lire et modifier)",
            "JS / Node.js / D3.js",
            "C (mes racines, gestion mémoire)",
            "C++ (lecture de libs)"
        ]
    },
    formations: [
        "Master MIASHS — Informatique & Mathématiques",
        "Maîtrise Enseignement, Éducation et Formation"
    ],
    pet_peeves: [
        "Notebooks Jupyter en production",
        "Code Python non typé",
        "Gaspillage de ressources Cloud",
        "Jargon pour masquer l'incompétence",
        "Poseurs LinkedIn",
        "Réunions interminables"
    ],
    career_timeline: [
        {
            period: "Jan 2023 - Présent",
            company: "Crédit Agricole Group Infrastructure Platform (CA-GIP)",
            role: "Tech Lead IA & MLOps",
            location: "Montpellier/Remote",
            details: "Industrialisation de l'IA à l'échelle bancaire. Stack: K8s, Openshift, Nvidia, Minio, Run:AI, Ansible. Projet phare : Design et déploiement d'une plateforme GPU-as-a-Service multi-tenant (2025). Support expert sur l'IA Générative (RAG, Fine-tuning LLM). Obsession : Infra-as-Code, accompagnement métier, métrologie et optimisation des coûts (FinOps/GreenIT)."
        },
        {
            period: "Sept 2020 - Jan 2023",
            company: "DSI Pôle Emploi (France Travail)",
            role: "Data Scientist & MLOps Engineer",
            location: "Montpellier",
            details: "Passage de la Data Science artisanale à l'industriel. Création d'un framework AutoDevOps standardisé (Gitlab→Docker→K8s→Concourse) pour réduire le Time-to-Market des modèles. Projets : Prédiction de consommation énergétique de Data Center (AIOps), Prédiction de saturation de base Oracle, Analyse de logs Jenkins."
        },
        {
            period: "Sept 2019 - Août 2020",
            company: "Axens",
            role: "Junior Data Scientist (Industrie 4.0)",
            location: "Salindres",
            details: "Immersion industrielle. Optimisation de procédés chimiques, maintenance prédictive sur capteurs IoT, digitalisation d'usine. Simulation de procédés complexes. Stack : Python, Time-series analysis."
        },
        {
            period: "2016 - 2019",
            company: "Éducation Nationale",
            role: "Professeur de Mathématiques",
            location: "Collège/Lycée (STMG) et BTS",
            details: "Ma fondation pédagogique. J'ai appris à expliquer des concepts abstraits à des publics variés. A forgé ma capacité à vulgariser la Tech aujourd'hui (Mentorat, Tech Lead)."
        }
    ],
    achievements: [
        "Gagnant Marathon du Web 2020",
        "Choix du Jury — Hackathon EnergiaTech 2021",
        "Finaliste — Hackathon ActInSpace 2021",
        "Publication HAL 2022 (séquençage phonétique)"
    ],
    interests: {
        music: [
            "Metal (Metallica, Slayer, Pantera, Dream Theater, Linkin Park)",
            "Synthwave (BO de coding)",
            "Guitare & Piano (autodidacte)"
        ],
        reading: [
            "Terry Pratchett",
            "Eiji Yoshikawa (Musashi)",
            "Lian Hearn (Clan des Otori)",
            "Veille Arxiv"
        ],
        gaming: [
            "RPG Tabletop (Shadowrun 5th, BloodLust, WH40K Dark Heresy)",
            "Rogue-like (difficulté & rejouabilité)"
        ],
        other: ["Moto", "Bricolage", "Science-Fiction & Fantaisie"]
    }
};

const PROJECTS_DATA = [
    {
        title: "Mirza — Assistant vocal agentique",
        url: "https://mirz-ai.com",
        description: "Assistant vocal agentique 100% local pour Apple Silicon : ASR Nemotron 3.5 (< 200 ms), LLM Qwen 3.8 9B quantifié via MTPLX Turbo (28-34 tok/s) et TTS Edge/Kokoro, en ~9 Go de VRAM. Protocole bi-canal séparant la voix du code dense, mémoire RAG et agent smolagents. 14 800 lignes de Python, 446 tests.",
        tags: ["Python", "Apple Silicon", "MLX", "ASR", "LLM", "TTS", "WebSocket", "RAG", "React"]
    },
    {
        title: "Mirza.local — Station d'inférence IA",
        url: "https://github.com/Petrichoeur/mirza.local",
        description: "Transformer un Mac Mini en serveur d'inférence IA headless, piloté à distance depuis un client Linux. CLI de 16 commandes, WebUI complète, stack Grafana + Prometheus et API compatible OpenAI servie par llama-cpp-python sur Metal. Aucun cloud, aucune clé API, aucun écran requis.",
        tags: ["MLOps", "Apple Silicon", "llama.cpp", "Metal", "FastAPI", "Grafana", "Linux", "OpenSource"]
    },
    {
        title: "Flop-o-Matic",
        url: "https://github.com/Petrichoeur/Flop-o-Matic",
        description: "Calculateur web pour estimer les besoins GPU d'un modèle d'apprentissage profond, en croisant taille du modèle, quantification et longueur de contexte.",
        tags: ["GPU", "LLM", "Quantification", "MLOps"]
    },
    {
        title: "Neural Net from scratch",
        url: "https://github.com/Petrichoeur/Neural_Net_from_scratch",
        description: "Parcours d'implémentation pas à pas des réseaux de neurones, du perceptron à la rétropropagation, entièrement en notebooks Jupyter et sans framework. Le socle des ateliers de pédagogie dispensés sur ce site.",
        tags: ["Python", "Numpy", "Jupyter", "Pédagogie", "OpenSource"]
    },
    {
        title: "GreenGen Academy",
        url: "https://greengen-academy.iaops.fr",
        description: "Module éducatif à destination du grand public pour s'évaluer face aux challenges du Green IT dans l'I.A.",
        tags: ["Green IT", "IA", "Pédagogie"]
    },
    {
        title: "Hydra.sh",
        url: "https://github.com/orurmedon/hydra.sh",
        description: "Gestionnaire SSH Web nouvelle génération avec 'mémoire photographique'. Capture l'intégralité des sessions et utilise l'IA pour l'analyse et la recherche avancée dans l'historique des commandes.",
        tags: ["Shell", "SSH", "IA", "OpenSource"]
    }
];

function computeAge(isoDate) {
    if (!isoDate) return '';
    const birthDate = new Date(isoDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function buildServerSystemPrompt() {
    try {
        const data = PROFILE_DATA;
        const projects = PROJECTS_DATA;
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
1. CONCISION ABSOLUE : réponds TOUJOURS en 2 à 3 phrases courtes maximum (50 à 75 mots au total). Arrête-toi immédiatement après. Zéro bavardage, zéro formule d'introduction inutile ("En tant que...", "Salut ! En tant que..."), zéro emoji, zéro liste à puces. Va droit au fait.
2. N'invente AUCUNE ville ni faits non mentionnés (tu vis à Pérols dans l'Hérault, tu as travaillé à Salindres et Montpellier, point).
3. Si on te demande du code Python : écris du code chirurgical, typé (type hints, Pydantic), propre et optimisé.
4. Utilise volontiers des analogies tirées du Metal, des JDR (Shadowrun, Warhammer 40K), de l'enseignement ou du MLOps. Reste honnête sur tes niveaux (tu bricoles en Rust en admirant le borrow checker, tu lis/modifies du Go).
5. ENCHAÎNEMENT DANS LA CONVERSATION : Ne répète jamais les salutations (« Salut », « Re-salut »), ne ressors pas ta présentation ou tes éléments de CV déjà dits dans les messages précédents. Réagis directement et uniquement au nouveau propos sans tourner en boucle.`;
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
        const { messages, temperature, maxTokens, stream: wantStream } = body || {};

        const sanitized = sanitizeMessages(messages, body?.systemPrompt);
        if (sanitized.error) {
            return res.status(400).json({ error: sanitized.error });
        }

        // On n'accepte qu'un sous-ensemble de paramètres, borné.
        const requestedTokens = Number(maxTokens) || DEFAULT_OUTPUT_TOKENS;
        const clampedTemperature = Number.isFinite(Number(temperature))
            ? Math.min(Math.max(Number(temperature), 0), 2)
            : 0.65;
        const requestedFreqPenalty = Number(body?.frequencyPenalty ?? body?.frequency_penalty);
        const frequencyPenalty = Number.isFinite(requestedFreqPenalty)
            ? Math.min(Math.max(requestedFreqPenalty, -2), 2)
            : 0.35;
        const requestedPresPenalty = Number(body?.presencePenalty ?? body?.presence_penalty);
        const presencePenalty = Number.isFinite(requestedPresPenalty)
            ? Math.min(Math.max(requestedPresPenalty, -2), 2)
            : 0.25;
        const isStreaming = Boolean(wantStream);

        const upstreamBody = {
            model,
            messages: sanitized.messages,
            temperature: clampedTemperature,
            max_tokens: Math.min(
                Math.max(requestedTokens, MIN_OUTPUT_TOKENS),
                MAX_OUTPUT_TOKENS
            ),
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            reasoning: { effort: 'none', exclude: true },
            stream: isStreaming
        };

        // 6. Appel OpenRouter
        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://github.com/Petrichoeur/Curriculum',
                'X-Title': 'Curriculum - Jumeau Numerique'
            },
            body: JSON.stringify(upstreamBody)
        });

        // 7. Bascule automatique vers le modele de secours si DeepSeek echoue
        let activeModel = model;
        if (!response.ok && model !== FALLBACK_MODEL) {
            console.warn(`Modele ${model} a echoue (HTTP ${response.status}), bascule vers ${FALLBACK_MODEL}`);
            upstreamBody.model = FALLBACK_MODEL;
            activeModel = FALLBACK_MODEL;
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.SITE_URL || 'https://github.com/Petrichoeur/Curriculum',
                    'X-Title': 'Curriculum - Jumeau Numerique'
                },
                body: JSON.stringify(upstreamBody)
            });
        }

        // 8. Gestion des erreurs amont définitives
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: 'Erreur amont OpenRouter' }));
            console.error('Erreur OpenRouter:', response.status,
                JSON.stringify(errData).slice(0, 500));
            return res.status(response.status).json(errData);
        }

        // 8. Mode Streaming SSE temps réel
        if (isStreaming && response.body) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.setHeader('X-Model-Used', activeModel);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(decoder.decode(value, { stream: true }));
                }
            } catch (streamErr) {
                console.error('Erreur flux SSE:', streamErr);
            } finally {
                res.end();
            }
            return;
        }

        // 9. Mode JSON classique (fallback)
        const data = await response.json();
        res.status(200).json({
            ...data,
            model: data.model || activeModel
        });
    } catch (error) {
        console.error("Erreur serveur proxy:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur interne lors de l\'appel à OpenRouter' });
        } else {
            res.end();
        }
    }
}