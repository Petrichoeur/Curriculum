/* ==========================================
   MODULE: DIGITAL TWIN (Gestion du Chat & Profil)
   ========================================== */

const DigitalTwin = {
    // Marqueur pour savoir si le module a déjà été chargé (évite le reset du chat)
    isInitialized: false, 
    
    // Stockage de la configuration JSON
    config: null, 
    
    // Mémoire de conversation (pour que l'IA se souvienne des échanges précédents)
    history: [], 

    /**
     * Point d'entrée principal.
     * Appelé par main.js quand l'utilisateur arrive sur l'onglet #digital-twin
     */
    init: function(data) {
        console.log("🤖 Module Digital Twin : Initialisation...");
        this.config = data;
        
        // 1. Remplir la barre latérale (Gauche) avec tes infos
        // On le fait même si déjà initialisé, au cas où le DOM aurait changé
        this.renderProfile(); 

        // Si c'est la première fois qu'on lance le module :
        if (!this.isInitialized) {
            // 2. Activer les écouteurs d'événements (Bouton envoyer, Touche Entrée)
            this.setupListeners();

            // 3. Message d'accueil système dans le chat
            this.addMessage('system', `
                <strong>SYSTEM:</strong> Connexion au Jumeau Numérique établie.<br>
                <strong>Profil chargé :</strong> ${data.identity.name}<br>
                <strong>Statut :</strong> En ligne et prêt à discuter.<br>
                <em>(Posez-moi une question sur mon parcours, mes compétences ou mes hobbies...)</em>
            `);
            
            // On marque le module comme prêt
            this.isInitialized = true;
        }
    },

    /* ==========================================
       RENDU GRAPHIQUE (Sidebar Gauche)
       ========================================== */
    renderProfile: function() {
        const data = this.config;
        const id = data.identity;

        // Fonction utilitaire pour modifier le texte d'un ID en sécurité
        const setTxt = (elementId, text) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = text;
        };

        // Identité de base
        setTxt('name-placeholder', id.name);
        setTxt('title-placeholder', id.role);
        setTxt('tagline-placeholder', `"${id.tagline}"`);

        // Boutons CV et LinkedIn
        const cvBtn = document.getElementById('cv-btn');
        if (cvBtn) {
            cvBtn.href = id.cv_link || "#";
            // Cache le bouton si pas de lien CV
            cvBtn.style.display = id.cv_link ? 'inline-block' : 'none';
        }

        const liBtn = document.getElementById('linkedin-btn');
        if (liBtn) {
            // Ajoute https si manquant
            liBtn.href = id.linkedin.startsWith('http') ? id.linkedin : `https://${id.linkedin}`;
        }

        // Bio & Âge (Calcul automatique)
        const birthYear = new Date(id.birth_date).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        const cognitive = data.psychology.cognitive_style.split('.')[0]; // Prend la 1ère phrase

        const bioEl = document.getElementById('bio-text');
        if (bioEl) {
            bioEl.innerHTML = `
                <div class="bio-line">📍 ${id.location}</div>
                <div class="bio-line">🎂 ${age} ans</div>
                <div class="bio-line">⚡ ${cognitive}</div>
            `;
        }

        // Tags de compétences (Appel de la fonction helper)
        this.renderTags(data.hard_skills.god_tier, 'god-skills', 'tag-god');
        
        // Fusion des tableaux pour les catégories Expert et Notions
        const expertData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
        this.renderTags(expertData, 'expert-skills', 'tag-expert');

        const notionData = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
        this.renderTags(notionData, 'notion-skills', 'tag-notion');

        // Liste des centres d'intérêt
        const hobbiesList = document.getElementById('interests-list');
        if (hobbiesList) {
            hobbiesList.innerHTML = ''; // Nettoyage
            // On prend les 5 premiers items combinés Musique + Lecture
            [...data.interests.music, ...data.interests.reading].slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                hobbiesList.appendChild(li);
            });
        }
    },

    // Helper pour créer les badges colorés (tags)
    renderTags: function(items, containerId, className) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ''; // Reset du conteneur
        items.forEach(item => {
            const span = document.createElement('span');
            span.className = `tag ${className}`;
            // Affiche "Python" au lieu de "Python (Expert)"
            span.textContent = item.split('(')[0].trim();
            // Affiche tout le texte au survol de la souris
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
        
        // Astuce : On clone les boutons pour supprimer les anciens écouteurs 
        // (au cas où cette fonction serait appelée plusieurs fois par erreur)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // La fonction qui gère l'envoi
        const handleSend = () => {
            const text = newInput.value.trim();
            if (!text) return; // Pas de message vide
            
            this.addMessage('user', text); // Affiche message user
            newInput.value = ''; // Vide l'input
            this.callAPI(text); // Appelle l'IA
        };

        // Clic sur bouton
        newBtn.addEventListener('click', handleSend);
        // Touche Entrée dans l'input
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    },

    // Ajoute un message (User, Bot ou System) dans la fenêtre de chat
    addMessage: function(role, text) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;

        const div = document.createElement('div');
        div.className = `message ${role}-msg`;
        
        // Formatage simple : **Gras** et sauts de ligne
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
            
        div.innerHTML = formattedText;
        chatWindow.appendChild(div);
        
        // Scroll automatique vers le bas pour voir le dernier message
        chatWindow.scrollTop = chatWindow.scrollHeight;
    },

    /* ==========================================
       APPEL API (Backend Vercel)
       ========================================== */
    callAPI: async function(userMessage) {
        const chatWindow = document.getElementById('chat-window');

        // 1. Afficher l'animation "En train d'écrire..."
        const typing = document.createElement('div');
        typing.className = 'message bot-msg typing';
        typing.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        chatWindow.appendChild(typing);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // 2. Construire le prompt système (Qui suis-je ?)
            const systemPrompt = this.buildContext();

            // 3. Préparer le tableau de messages pour l'IA
            let contents = [
                // Injection du rôle système via un message utilisateur (Hack pour certains modèles)
                { 
                    role: "user", 
                    parts: [{ text: systemPrompt }] 
                },
                // Confirmation forcée du modèle
                { 
                    role: "model", 
                    parts: [{ text: "Bien reçu. Je suis Florian Bobo. Je suis prêt." }] 
                }
            ];

            // 4. Ajouter l'historique de conversation (les 10 derniers échanges max)
            this.history.slice(-10).forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });

            // 5. Ajouter le message actuel de l'utilisateur
            contents.push({
                role: "user",
                parts: [{ text: userMessage }]
            });

            // 6. Envoi vers NOTRE serveur Vercel (/api/chat)
            // Note : Pas de clé API ici, c'est le serveur qui gère ça.
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: contents,
                    generationConfig: {
                        temperature: 0.8, // Créativité équilibrée
                        maxOutputTokens: 1000
                    }
                })
            });

            const data = await response.json();
            
            // On supprime l'animation de chargement
            typing.remove();

            // Gestion des erreurs
            if (!response.ok || data.error) {
                console.error("Erreur API:", data);
                this.addMessage('system', "Erreur de connexion au cerveau numérique. Réessayez plus tard.");
                return;
            }

            // Gestion de la réponse réussie
            if (data.candidates && data.candidates[0].content) {
                const botReply = data.candidates[0].content.parts[0].text;
                
                // On met à jour l'historique local
                this.history.push({ role: "user", content: userMessage });
                this.history.push({ role: "model", content: botReply });
                
                // On affiche la réponse
                this.addMessage('bot', botReply);
            } else {
                this.addMessage('system', "Le modèle n'a rien répondu (Réponse vide).");
            }

        } catch (error) {
            typing.remove();
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Erreur réseau. Vérifiez votre connexion internet.");
        }
    },

    /* ==========================================
       CONSTRUCTION DU PROMPT (L'Intelligence)
       ========================================== */
    buildContext: function() {
        const data = this.config;
        const id = data.identity;
        const skills = data.hard_skills;
        const psych = data.psychology;
        const circle = data.inner_circle;
        const today = new Date().toLocaleDateString('fr-FR');
        
        // Calcul âge
        const age = new Date().getFullYear() - new Date(id.birth_date).getFullYear();

        // Formatage propre du texte de carrière
        const careerText = data.career_timeline.map(job => 
            `- ${job.period} : **${job.role}** chez ${job.company} (${job.location}).\n  ${job.details}`
        ).join('\n');

        // LE TEXTE ENVOYÉ À L'IA POUR LUI DONNER SA PERSONNALITÉ
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

// EXPOSITION GLOBALE : Permet à main.js de trouver "DigitalTwin"
window.DigitalTwin = DigitalTwin;