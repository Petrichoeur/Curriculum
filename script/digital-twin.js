/* ==========================================
   MODULE: DIGITAL TWIN (Fast Tickers & Loading)
   ========================================== */

const DigitalTwin = {
    isInitialized: false,
    config: null,
    history: [],
    
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
    init: function(data) {
        console.log("🤖 Module Digital Twin : Initialisation...");
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
        
        const cognitive = data.psychology.cognitive_style.split('.')[0]; 

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
        const expertData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
        const notionData = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
        
        // Fusion des Intérêts (Musique + Lecture + Sport si dispo)
        const interestData = [...data.interests.music, ...data.interests.reading];
        if (data.interests.sports) interestData.push(...data.interests.sports);

        // 3. Lancement des animations (VITESSE AUGMENTÉE ICI)
        // Les valeurs sont en millisecondes. Plus c'est bas, plus ça va vite.
        this.startTicker('ticker-god', data.hard_skills.god_tier, 2000);
        this.startTicker('ticker-expert', expertData, 2200);
        this.startTicker('ticker-notion', notionData, 2500);
        
        // Le nouveau ticker pour les intérêts (Rouge)
        this.startTicker('ticker-interests', interestData, 2800);
    },

    /* ==========================================
       LOGIQUE D'ANIMATION (TICKER & GLITCH)
       ========================================== */
    startTicker: function(elementId, items, speed) {
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
    randomChars: function(length) {
        const chars = "010101_[]#%&AFXZ";
        let result = "";
        for(let i=0; i<length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
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
       BARRE DE CHARGEMENT DYNAMIQUE
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
        
        // 2. Animation (Simulation de progression plus rapide)
        let progress = 0;
        let phraseIndex = 0;
        
        const interval = setInterval(() => {
            // On avance la barre plus vite
            progress += Math.random() * 15; 
            if (progress > 95) progress = 95; // On bloque à 95%
            
            loader.barFill.style.width = `${progress}%`;

            // On change la phrase aléatoirement
            if (Math.random() > 0.6) {
                phraseIndex = (phraseIndex + 1) % this.loadingPhrases.length;
                loader.textEl.textContent = this.loadingPhrases[phraseIndex];
            }
        }, 400); // Mise à jour plus fréquente (400ms au lieu de 600ms)

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
            loader.barFill.style.width = '100%'; 
            
            setTimeout(() => {
                loader.container.remove(); 

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
            }, 300); // Délai réduit avant affichage

        } catch (error) {
            clearInterval(interval);
            loader.container.remove();
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Échec de connexion au réseau neural.");
        }
    },

    /* ==========================================
       CONSTRUCTION DU PROMPT (STRICTEMENT PRÉSERVÉ)
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
            Collègues: Maxime mon squad-lead, un commercial dans l'âme, Tony un expert DevOps du Tonnerre, Michel un couteau-suisse de l'infra, Mina une cheffe de Projet qui a réponse à tout, Imad le nouvel arrivant qui adore les architectures I.A. complexes.

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