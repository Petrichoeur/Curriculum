/* ==========================================
   MODULE: DIGITAL TWIN (Fast Tickers & Loading)
   ========================================== */

const DigitalTwin = {
    isInitialized: false,
    config: null,
    projects: [],
    history: [],
    isLoading: false,
    currentModel: 'nvidia/nemotron-3.5-lightning:free',

    // Stockage des intervalles pour pouvoir les nettoyer proprement
    intervals: [],

    // Phrases d'ambiance pour le chargement
    loadingPhrases: [
        "Récupération des données bio-numériques...",
        "Initialisation du jumeau numérique...",
        "Connexion neurale à Florian...",
        "Reverse-proxy sur Bio-FireWall interne...",
        "Difficulté à récupérer donnée Génétique...",
        "Synchronisation des souvenirs...",
        "Déchiffrement de la syntaxe mnémotechnique...",
        "Analyse des schémas cognitifs...",
        "Recompilation des fragments de personnalité..."
    ],

    /**
     * Point d'entrée principal.
     */
    init: function (data) {
        console.log("[Digital Twin] Initialisation...");
        this.config = data;

        // 1. Remplir la barre latérale (Profil + Tickers)
        this.renderProfile();

        // Récupérer le modèle actif et les projets
        this.fetchActiveModel();
        this.fetchProjects();

        // Si c'est la première fois qu'on lance le module :
        if (!this.isInitialized) {
            // 2. Activer les écouteurs d'événements
            this.setupListeners();

            // 3. Message d'accueil système
            this.addMessage('system', `
                <strong>SYSTEM:</strong> Connexion au Jumeau Numérique établie.<br>
                <strong>Profil chargé :</strong> ${data.identity.name}<br>
                <strong>Statut :</strong> En ligne et prêt à discuter.<br>
                <em>(Posez-moi une question sur mon parcours, mes compétences ou mes projets...)</em>
            `, true);

            this.isInitialized = true;
        }
    },

    fetchActiveModel: async function () {
        try {
            const res = await fetch('/api/chat');
            if (res.ok) {
                const info = await res.json();
                if (info.model) this.updateModelDisplay(info.model);
            }
        } catch (e) {
            // Fallback silencieux sur le modèle par défaut
        }
    },

    fetchProjects: async function () {
        try {
            const res = await fetch('config/projects.json');
            if (res.ok) {
                this.projects = await res.json();
            }
        } catch (e) {
            // Optionnel : le serveur injecte déjà config/projects.json
        }
    },

    updateModelDisplay: function (modelName) {
        if (!modelName) return;
        this.currentModel = modelName;
        const el = document.getElementById('active-model-display');
        if (el) el.textContent = modelName;
    },

    /* ==========================================
       RENDU GRAPHIQUE (Sidebar Gauche)
       ========================================== */
    renderProfile: function () {
        const data = this.config;
        const id = data.identity;

        const setTxt = (elementId, text) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = text;
        };

        // Identité de base avec effet GLITCH
        const nameEl = document.getElementById('name-placeholder');
        if (nameEl) {
            nameEl.textContent = id.name;
            nameEl.setAttribute('data-text', id.name);
        };
        setTxt('title-placeholder', id.role);
        setTxt('tagline-placeholder', `"${id.tagline}"`);

        // Liens Sociaux
        const cvBtn = document.getElementById('cv-btn');
        if (cvBtn) {
            cvBtn.href = id.cv_link || "#";
            cvBtn.style.display = id.cv_link ? 'inline-block' : 'none';
        }
        const liBtn = document.getElementById('linkedin-btn');
        if (liBtn) {
            liBtn.href = id.linkedin.startsWith('http') ? id.linkedin : `https://${id.linkedin}`;
        }

        // Bio & Age
        const birthDate = new Date(id.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

        const bioEl = document.getElementById('bio-text');
        if (bioEl) {
            bioEl.innerHTML = `
                <div class="bio-line">Localisation : ${id.location}</div>
                <div class="bio-line">Âge : ${age} ans</div>
            `;
            // J'ai retiré le style cognitif ici pour alléger, mais vous pouvez le remettre si souhaité
        }

        // --- ANIMATION DES COMPÉTENCES & INTÉRÊTS (TICKERS RAPIDES) ---

        // 1. On nettoie les anciens intervalles pour éviter les superpositions
        this.intervals.forEach(clearInterval);
        this.intervals = [];

        // 2. Préparation des données
        const expertData = [...data.hard_skills.expert, ...(data.hard_skills.agentic_genai || [])];
        const notionData = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];

        // Fusion des Intérêts
        const interestData = [...data.interests.music, ...data.interests.reading];
        if (data.interests.other) interestData.push(...data.interests.other);

        // 3. Lancement des animations
        this.startTicker('ticker-god', data.hard_skills.god_tier, 2000);
        this.startTicker('ticker-expert', expertData, 2200);
        this.startTicker('ticker-notion', notionData, 2500);
        this.startTicker('ticker-interests', interestData, 2800);
    },

    /* ==========================================
       LOGIQUE D'ANIMATION (TICKER & GLITCH)
       ========================================== */
    startTicker: function (elementId, items, speed) {
        const el = document.getElementById(elementId);
        if (!el || !items || items.length === 0) return;

        let index = 0;

        // Fonction de mise à jour
        const update = () => {
            // 1. Glitch Effect Start (Affiche du charabia)
            el.classList.add('glitching');
            el.textContent = this.randomChars(8); // Moins de charabia pour être plus vif

            // 2. Reveal Real Text (Plus rapide : 200ms au lieu de 300ms)
            setTimeout(() => {
                // On nettoie le texte
                const cleanText = items[index].split('(')[0].trim();
                el.textContent = cleanText;
                el.classList.remove('glitching');

                // Préparer le prochain item
                index = (index + 1) % items.length;
            }, 200);
        };

        // Premier appel immédiat
        update();

        // Lancer la boucle
        const intervalId = setInterval(update, speed);
        this.intervals.push(intervalId);
    },

    // Génère des caractères aléatoires pour l'effet de décryptage
    randomChars: function (length) {
        const chars = "010101_[]#%&AFXZ";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /* ==========================================
       GESTION DU CHAT & LISTENER
       ========================================== */
    setLoadingState: function (loading) {
        this.isLoading = loading;
        const input = document.getElementById('user-input');
        const btn = document.getElementById('send-btn');
        if (input) {
            input.disabled = loading;
            if (!loading) input.focus();
        }
        if (btn) {
            btn.disabled = loading;
            btn.style.opacity = loading ? '0.5' : '1';
            btn.style.cursor = loading ? 'not-allowed' : 'pointer';
        }
    },

    setupListeners: function () {
        const input = document.getElementById('user-input');
        const btn = document.getElementById('send-btn');

        if (!input || !btn) return;

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        const handleSend = () => {
            if (this.isLoading) return;
            const text = newInput.value.trim();
            if (!text) return;
            this.addMessage('user', text);
            newInput.value = '';
            this.callAPI(text);
        };

        newBtn.addEventListener('click', handleSend);
        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    },

    /**
     * Échappe le HTML pour prévenir les injections.
     */
    escapeHtml: function (text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Formate le markdown léger de façon sûre (après échappement).
     */
    formatMarkdown: function (rawText) {
        let text = this.escapeHtml(rawText);

        // 1. Blocs de code ```...```
        const codeBlocks = [];
        text = text.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_, code) => {
            const index = codeBlocks.length;
            codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
            return `__CODE_BLOCK_${index}__`;
        });

        // 2. Code inline `code`
        text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // 3. Gras **texte**
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // 4. Italique *texte*
        text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

        // 5. Retours à la ligne
        text = text.replace(/\n/g, '<br>');

        // 6. Restauration des blocs de code
        codeBlocks.forEach((block, idx) => {
            text = text.replace(`__CODE_BLOCK_${idx}__`, block);
        });

        return text;
    },

    /**
     * @param {string} role
     * @param {string} text
     * @param {boolean} trusted
     * @param {string|null} model
     */
    addMessage: function (role, text, trusted = false, model = null) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return null;

        const div = document.createElement('div');
        div.className = `message ${role}-msg`;

        let body = null;
        if (role === 'bot') {
            const header = document.createElement('div');
            header.className = 'msg-header';

            const author = document.createElement('span');
            author.className = 'msg-author';
            author.textContent = 'FLORIAN (AI)';
            header.appendChild(author);

            const displayModel = model || this.currentModel;
            if (displayModel) {
                const badge = document.createElement('span');
                badge.className = 'msg-model-badge';
                badge.title = 'Modèle utilisé pour cette réponse';
                badge.textContent = displayModel;
                header.appendChild(badge);
            }
            div.appendChild(header);

            body = document.createElement('div');
            body.className = 'msg-body';
            body.innerHTML = trusted ? text : this.formatMarkdown(text);
            div.appendChild(body);
        } else {
            div.innerHTML = trusted ? text : this.formatMarkdown(text);
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return { div, body, chatWindow };
    },

    /* ==========================================
       BARRE DE CHARGEMENT DYNAMIQUE
       ========================================== */
    createLoadingBar: function () {
        const chatWindow = document.getElementById('chat-window');

        // Conteneur principal
        const container = document.createElement('div');
        container.className = 'loading-container';
        container.id = 'current-loader';

        // Texte (Phrase changeante)
        const textEl = document.createElement('div');
        textEl.className = 'loading-text';
        textEl.textContent = this.loadingPhrases[0];

        // Fond de la barre
        const barBg = document.createElement('div');
        barBg.className = 'loading-bar-bg';

        // Remplissage de la barre
        const barFill = document.createElement('div');
        barFill.className = 'loading-bar-fill';

        // Assemblage
        barBg.appendChild(barFill);
        container.appendChild(textEl);
        container.appendChild(barBg);
        chatWindow.appendChild(container);

        // Scroll en bas
        chatWindow.scrollTop = chatWindow.scrollHeight;

        return { container, textEl, barFill };
    },

    /* ==========================================
       APPEL API (Avec Streaming SSE Temps Réel)
       ========================================== */
    callAPI: async function (userMessage) {
        this.setLoadingState(true);

        // 1. Création et affichage de la barre de chargement
        const loader = this.createLoadingBar();

        // 2. Animation jusqu'au premier token (TTFT)
        let progress = 15;
        let phraseIndex = 0;
        loader.barFill.style.width = `${progress}%`;

        const interval = setInterval(() => {
            progress += Math.random() * 18;
            if (progress > 92) progress = 92;
            loader.barFill.style.width = `${progress}%`;

            if (Math.random() > 0.5) {
                phraseIndex = (phraseIndex + 1) % this.loadingPhrases.length;
                loader.textEl.textContent = this.loadingPhrases[phraseIndex];
            }
        }, 250);

        const cleanupLoader = () => {
            clearInterval(interval);
            if (loader.container && loader.container.parentNode) {
                loader.container.remove();
            }
        };

        try {
            // 3. Préparation des messages (le serveur injecte le prompt système complet)
            const messages = this.history.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
            messages.push({ role: 'user', content: userMessage });

            // 4. Appel API avec stream: true
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    temperature: 0.65,
                    maxTokens: 350,
                    frequencyPenalty: 0.35,
                    presencePenalty: 0.25,
                    stream: true
                })
            });

            const contentType = response.headers.get('content-type') || '';

            if (!response.ok || !contentType.includes('text/event-stream')) {
                const data = await response.json().catch(() => ({}));
                cleanupLoader();
                this.setLoadingState(false);

                if (!response.ok || data.error) {
                    console.error("Erreur API:", data);
                    const errorDetail = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || "Erreur critique du système Bio-Numérique.";
                    this.addMessage('system', `<strong>ERREUR SYSTEME :</strong> ${this.escapeHtml(errorDetail)}`, true);
                    return;
                }

                const botReply = data.choices?.[0]?.message?.content;
                if (!botReply) {
                    this.addMessage('system', "Données corrompues (Réponse vide).", true);
                    return;
                }
                const usedModel = data.model || this.currentModel || 'nvidia/nemotron-3.5-lightning:free';
                this.updateModelDisplay(usedModel);
                this.history.push({ role: "user", content: userMessage });
                this.history.push({ role: "assistant", content: botReply });
                this.addMessage('bot', botReply, false, usedModel);
                return;
            }

            // 5. Lecture du flux SSE token par token
            const usedModel = response.headers.get('X-Model-Used') || this.currentModel || 'nvidia/nemotron-3.5-lightning:free';
            this.updateModelDisplay(usedModel);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullReply = '';
            let msgUI = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line || line.startsWith(':')) continue;
                    if (!line.startsWith('data:')) continue;

                    const payload = line.slice(5).trim();
                    if (payload === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(payload);
                        if (parsed.model && parsed.model !== this.currentModel) {
                            this.updateModelDisplay(parsed.model);
                        }
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullReply += delta;
                            if (!msgUI) {
                                cleanupLoader();
                                msgUI = this.addMessage('bot', fullReply, false, parsed.model || usedModel);
                            } else if (msgUI.body) {
                                msgUI.body.innerHTML = this.formatMarkdown(fullReply);
                                msgUI.chatWindow.scrollTop = msgUI.chatWindow.scrollHeight;
                            }
                        }
                    } catch (e) {
                        // Chunk JSON partiel ignoré
                    }
                }
            }

            cleanupLoader();
            this.setLoadingState(false);

            if (!fullReply.trim()) {
                this.addMessage('system', "Données corrompues (Réponse vide).", true);
                return;
            }

            this.history.push({ role: "user", content: userMessage });
            this.history.push({ role: "assistant", content: fullReply });

        } catch (error) {
            cleanupLoader();
            this.setLoadingState(false);
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Échec de connexion au réseau neural.", true);
        }
    },

    /* ==========================================
       CONSTRUCTION DU PROMPT
       ========================================== */
    computeAge: function (isoDate) {
        if (!isoDate) return '';
        const birthDate = new Date(isoDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    },

    buildContext: function () {
        const data = this.config;
        const id = data.identity || {};
        const skills = data.hard_skills || {};
        const circle = data.inner_circle || {};
        const psych = data.psychology || {};
        const interests = data.interests || {};

        const age = this.computeAge(id.birth_date);
        const sonAge = this.computeAge(circle.son?.birth);
        const daughterAge = this.computeAge(circle.daughter?.birth);
        const gfAge = this.computeAge(circle.girlfriend?.birth);

        const teamText = Object.entries(circle.team || {})
            .map(([n, d]) => `${n} (${d})`)
            .join(' ; ');
        const xpText = (data.career_timeline || [])
            .map(j => `- [${j.period}] ${j.role} chez ${j.company} (${j.location}) : ${j.details}`)
            .join('\n');
        const projectsText = (this.projects || [])
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
    }
};

// EXPOSITION GLOBALE
window.DigitalTwin = DigitalTwin;
