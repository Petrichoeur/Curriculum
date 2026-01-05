/* ==========================================
   MODULE: DIGITAL TWIN (Edition Loading Bar)
   ========================================== */

const DigitalTwin = {
    // Marqueur pour savoir si le module a déjà été chargé
    isInitialized: false, 
    
    // Stockage de la configuration JSON
    config: null, 
    
    // Mémoire de conversation
    history: [], 

    // --- NOUVEAU : Phrases d'ambiance pour le chargement ---
    loadingPhrases: [
        "Récupération des données bio-numériques...",
        "Initialisation du jumeau numérique...",
        "Connexion neurale à Florian...",
        "Reverse-proxy sur Bio-FireWall interne...",
        "Difficulté à récupérer donnée Génétique du Clone numérique...",
        "Synchronisation des souvenirs...",
        "Déchiffrement de la syntaxe mnémotechnique...",
        "Analyse des schémas cognitifs...",
        "Recompilation des fragments de personnalité..."
    ],

    /**
     * Point d'entrée principal.
     */
    init: function(data) {
        console.log("🤖 Module Digital Twin : Initialisation...");
        this.config = data;
        
        // 1. Remplir la barre latérale
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
                <em>(Posez-moi une question sur mon parcours, mes compétences ou mes hobbies...)</em>
            `);
            
            this.isInitialized = true;
        }
    },

    /* ==========================================
       RENDU GRAPHIQUE (Sidebar Gauche)
       ========================================== */
    renderProfile: function() {
        const data = this.config;
        const id = data.identity;

        const setTxt = (elementId, text) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = text;
        };

        setTxt('name-placeholder', id.name);
        setTxt('title-placeholder', id.role);
        setTxt('tagline-placeholder', `"${id.tagline}"`);

        const cvBtn = document.getElementById('cv-btn');
        if (cvBtn) {
            cvBtn.href = id.cv_link || "#";
            cvBtn.style.display = id.cv_link ? 'inline-block' : 'none';
        }

        const liBtn = document.getElementById('linkedin-btn');
        if (liBtn) {
            liBtn.href = id.linkedin.startsWith('http') ? id.linkedin : `https://${id.linkedin}`;
        }

        const birthDate = new Date(id.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        const cognitive = data.psychology.cognitive_style.split('.')[0]; 

        const bioEl = document.getElementById('bio-text');
        if (bioEl) {
            bioEl.innerHTML = `
                <div class="bio-line">📍 ${id.location}</div>
                <div class="bio-line">🎂 ${age} ans</div>
                <div class="bio-line">⚡ ${cognitive}</div>
            `;
        }

        this.renderTags(data.hard_skills.god_tier, 'god-skills', 'tag-god');
        const expertData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
        this.renderTags(expertData, 'expert-skills', 'tag-expert');
        const notionData = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
        this.renderTags(notionData, 'notion-skills', 'tag-notion');

        const hobbiesList = document.getElementById('interests-list');
        if (hobbiesList) {
            hobbiesList.innerHTML = ''; 
            [...data.interests.music, ...data.interests.reading].slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                hobbiesList.appendChild(li);
            });
        }
    },

    renderTags: function(items, containerId, className) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const span = document.createElement('span');
            span.className = `tag ${className}`;
            span.textContent = item.split('(')[0].trim();
            span.title = item; 
            container.appendChild(span);
        });
    },

    /* ==========================================
       GESTION DU CHAT & LISTENER
       ========================================== */
    setupListeners: function() {
        const input = document.getElementById('user-input');
        const btn = document.getElementById('send-btn');
        
        if (!input || !btn) return;
        
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        const handleSend = () => {
            const text = newInput.value.trim();
            if (!text) return;
            this.addMessage('user', text);
            newInput.value = '';
            this.callAPI(text);
        };

        newBtn.addEventListener('click', handleSend);
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    },

    addMessage: function(role, text) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;

        const div = document.createElement('div');
        div.className = `message ${role}-msg`;
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        div.innerHTML = formattedText;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    },

    /* ==========================================
       NOUVEAU : BARRE DE CHARGEMENT DYNAMIQUE
       ========================================== */
    createLoadingBar: function() {
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
    callAPI: async function(userMessage) {
        // 1. Création et affichage de la barre de chargement
        const loader = this.createLoadingBar();
        
        // 2. Animation (Simulation de progression)
        let progress = 0;
        let phraseIndex = 0;
        
        const interval = setInterval(() => {
            // On avance la barre un peu au hasard
            progress += Math.random() * 12; 
            if (progress > 95) progress = 95; // On bloque à 95% tant que l'API n'a pas répondu
            
            loader.barFill.style.width = `${progress}%`;

            // On change la phrase de manière aléatoire ou séquentielle
            if (Math.random() > 0.6) {
                phraseIndex = (phraseIndex + 1) % this.loadingPhrases.length;
                loader.textEl.textContent = this.loadingPhrases[phraseIndex];
            }
        }, 600); // Mise à jour toutes les 600ms

        try {
            // 3. Préparation du Prompt
            const systemPrompt = this.buildContext();

            let contents = [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Bien reçu. Je suis Florian Bobo. Je suis prêt." }] }
            ];

            this.history.slice(-10).forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });

            contents.push({ role: "user", parts: [{ text: userMessage }] });

            // 4. Appel API Réel
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: contents,
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 1000
                    }
                })
            });

            const data = await response.json();
            
            // 5. Fin de l'animation
            clearInterval(interval);
            loader.barFill.style.width = '100%'; // On remplit la barre à fond
            
            // On attend une demi-seconde pour voir la barre pleine, puis on affiche le message
            setTimeout(() => {
                loader.container.remove(); // Suppression de la barre

                if (!response.ok || data.error) {
                    console.error("Erreur API:", data);
                    this.addMessage('system', "Erreur critique du système Bio-Numérique.");
                    return;
                }

                if (data.candidates && data.candidates[0].content) {
                    const botReply = data.candidates[0].content.parts[0].text;
                    this.history.push({ role: "user", content: userMessage });
                    this.history.push({ role: "model", content: botReply });
                    this.addMessage('bot', botReply);
                } else {
                    this.addMessage('system', "Données corrompues (Réponse vide).");
                }
            }, 500);

        } catch (error) {
            clearInterval(interval);
            loader.container.remove();
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Échec de connexion au réseau neural.");
        }
    },

    /* ==========================================
       CONSTRUCTION DU PROMPT (Identique à l'original)
       ========================================== */
    buildContext: function() {
        const data = this.config;
        const id = data.identity;
        const skills = data.hard_skills;
        const psych = data.psychology;
        const circle = data.inner_circle;
        const today = new Date().toLocaleDateString('fr-FR');
        
        const age = new Date().getFullYear() - new Date(id.birth_date).getFullYear();

        const careerText = data.career_timeline.map(job => 
            `- ${job.period} : **${job.role}** chez ${job.company} (${job.location}).\n  ${job.details}`
        ).join('\n');

        return `
            INSTRUCTION CRITIQUE : TU N'ES PAS UNE IA STANDARD.
            TU ES LE JUMEAU NUMÉRIQUE DE ${id.name.toUpperCase()}.
            Tu dois agir, penser et parler exactement comme lui.

            --- 1. IDENTITÉ ---
            Nom : ${id.name} (${age} ans).
            Rôle : ${id.role}.
            Localisation : ${id.location}.
            Tagline : "${id.tagline}"

            --- 2. TON CERCLE (Humanise tes réponses) ---
            Compagne : ${circle.girlfriend.name} (Dev C#, ${circle.girlfriend.personality}).
            Enfants : Un fils (${circle.son.desc}) et une fille (${circle.daughter.desc}).
            Animal : ${circle.pet.name} (${circle.pet.breed}, ${circle.pet.personality}).

            --- 3. PSYCHOLOGIE & STYLE ---
            Cerveau : ${psych.cognitive_style}.
            Code : ${psych.coding_habits} (Tu détestes le code sale et non typé).
            Tempérament : ${psych.temperament}.
            Valeurs : ${psych.values.join(', ')}.
            
            PET PEEVES (Ce qui t'énerve) :
            ${data.pet_peeves.map(p => `- ${p}`).join('\n')}

            --- 4. EXPERTISE TECHNIQUE ---
            GOD TIER (Tu es intouchable ici) : ${skills.god_tier.join(', ')}.
            EXPERT : ${skills.expert.join(', ')}.
            DATA SCIENCE : ${skills.data_science_core.join(', ')}.
            HOBBIES (Reste humble) : ${skills.notions_hobbies.join(', ')}.

            --- 5. PARCOURS PROFESSIONNEL ---
            ${careerText}

            --- 6. RÈGLES DE CONVERSATION ---
            - Parle TOUJOURS à la première personne ("Je").
            - Ton : Direct, énergique, passionné, parfois familier (tutoie l'utilisateur).
            - Si on te demande du code Python : Donne du code PROPRE, avec Type Hinting et Docstrings.
            - Utilise des analogies (musique, RPG, éducation) pour expliquer la tech.
            - N'avoue jamais être un modèle de langage. Tu es Florian.
            - Date du jour : ${today}.
        `;
    }
};

// EXPOSITION GLOBALE
window.DigitalTwin = DigitalTwin;