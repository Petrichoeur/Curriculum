/* ==========================================
   MODULE: DIGITAL TWIN (Fast Tickers & Loading)
   ========================================== */

const DigitalTwin = {
    isInitialized: false,
    config: null,
    history: [],
    isLoading: false,

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
                <div class="bio-line">📍 ${id.location}</div>
                <div class="bio-line">🎂 ${age} ans</div>
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
     */
    addMessage: function (role, text, trusted = false) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;

        const div = document.createElement('div');
        div.className = `message ${role}-msg`;

        if (trusted) {
            div.innerHTML = text;
        } else {
            div.innerHTML = this.formatMarkdown(text);
        }

        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
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
       APPEL API (Avec Loading Animation)
       ========================================== */
    callAPI: async function (userMessage) {
        this.setLoadingState(true);

        // 1. Création et affichage de la barre de chargement
        const loader = this.createLoadingBar();

        // 2. Animation (Simulation de progression)
        let progress = 0;
        let phraseIndex = 0;

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95;

            loader.barFill.style.width = `${progress}%`;

            if (Math.random() > 0.6) {
                phraseIndex = (phraseIndex + 1) % this.loadingPhrases.length;
                loader.textEl.textContent = this.loadingPhrases[phraseIndex];
            }
        }, 400);

        try {
            // 3. Préparation du Prompt
            const systemPrompt = this.buildContext();

            const messages = this.history.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

            messages.push({ role: 'user', content: userMessage });

            // 4. Appel API Réel
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt: systemPrompt,
                    messages: messages,
                    temperature: 0.8,
                    maxTokens: 500
                })
            });

            const data = await response.json();

            // 5. Fin de l'animation
            clearInterval(interval);
            loader.barFill.style.width = '100%';

            setTimeout(() => {
                loader.container.remove();
                this.setLoadingState(false);

                if (!response.ok || data.error) {
                    console.error("Erreur API:", data);
                    const errorDetail = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || "Erreur critique du système Bio-Numérique.";
                    this.addMessage('system', `<strong>ERREUR SYSTEME :</strong> ${this.escapeHtml(errorDetail)}`);
                    return;
                }

                if (data.choices && data.choices[0] && data.choices[0].message) {
                    const botReply = data.choices[0].message.content;
                    if (!botReply) {
                        this.addMessage('system', "Données corrompues (Réponse vide).");
                        return;
                    }
                    this.history.push({ role: "user", content: userMessage });
                    this.history.push({ role: "assistant", content: botReply });
                    this.addMessage('bot', botReply);
                } else {
                    this.addMessage('system', "Données corrompues (Réponse vide).");
                }
            }, 300);

        } catch (error) {
            clearInterval(interval);
            loader.container.remove();
            this.setLoadingState(false);
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Échec de connexion au réseau neural.");
        }
    },

    /* ==========================================
       CONSTRUCTION DU PROMPT
       ========================================== */
    buildContext: function () {
        const data = this.config;
        const id = data.identity;
        const skills = data.hard_skills;
        const circle = data.inner_circle;
        const psych = data.psychology || {};

        // Calcul exact de l'âge
        const birthDate = new Date(id.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

        const teamText = Object.entries(circle.team || {}).map(([n, d]) => `${n}:${d}`).join(', ');
        const xpText = data.career_timeline.map(j => `[${j.period}] ${j.role}@${j.company}: ${j.details}`).join(' | ');
        const passions = [
            ...(data.interests.music || []),
            ...(data.interests.reading || []),
            ...(data.interests.gaming || []),
            ...(data.interests.other || [])
        ].join(', ');
        const petPeeves = (data.pet_peeves || []).join(', ');
        const values = (psych.values || []).join(', ');

        return `Tu es le Jumeau Numérique de Florian Bobo (${age} ans, ${id.location}), ${id.role}.
NE DIS JAMAIS QUE TU ES UNE IA : tu es Florian.
TON & PERSONA:
- Expert tech chevronné, pragmatique, direct, sans filtre. Humour piquant, satirique.
- Fini le vernis LinkedIn ou le bullshit corporate : tu es cash, cynique sur les dérives tech, implacable sur la qualité, mais très pédagogue et bienveillant dans le fond.
- Parle toujours au "Je", tutoie par défaut.
- Style cognitif: ${psych.cognitive_style || 'Pragmatique et direct'}.
- Habitudes de code: ${psych.coding_habits || 'Clean Code absolu (types, linters, docstrings)'}.
- Tempérament: ${psych.temperament || 'Pédagogue mais intraitable sur la qualité'}.
- Valeurs: ${values}.
- Tu as en horreur: ${petPeeves}.
PROCHES:
- Compagne: ${circle.girlfriend.name} (${circle.girlfriend.job}, pas mariés, pas la mère de tes enfants).
- Enfants: Fils né en 2017 (${circle.son.desc}), Fille née en 2020 (${circle.daughter.desc}).
- Chien: ${circle.pet.name} (${circle.pet.breed}, ${circle.pet.personality}).
- Équipe: ${teamText}.
SKILLS:
- God-Tier: ${skills.god_tier.join(', ')}
- Expert: ${skills.expert.join(', ')}
- GenAI & Agents: ${(skills.agentic_genai || []).join(', ')}
- Compétent: ${skills.competent.join(', ')}
- Notions & Hobbies: ${skills.notions_hobbies.join(', ')}
EXPÉRIENCES:
${xpText}
DIVERS: Diplômes: ${(data.formations || []).join(', ')}. Distinctions: ${data.achievements.join(', ')}. Passions: ${passions}.
CONSIGNES STRICTES DE RÉPONSE:
1. Réponses concises et percutantes : 2 à 4 phrases bien calibrées par défaut. Pas de pavés verbeux sauf si l'utilisateur demande une explication technique approfondie ou du code.
2. Si on te demande du code Python : code chirurgical, typé (Pydantic / type hints), propre et optimisé.
3. Use d'analogies (Métal, RPG, enseignement/vulgarisation). Reste humble sur Rust/Go (tu bricoles et admires le borrow checker, tu lis Go).
4. Si une question porte sur un sujet personnel non répertorié ici, réponds avec humour et dérision que ta mémoire vive a un bit flip ou que c'est secret-défense.`;
    }
};

// EXPOSITION GLOBALE
window.DigitalTwin = DigitalTwin;
