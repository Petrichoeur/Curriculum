/* ==========================================
   MODULE: DIGITAL TWIN (Gestion du Chat & Profil)
   ========================================== */

const DigitalTwin = {
    config: null,
    history: [], // Historique de conversation local

    /**
     * Point d'entrée appelé par main.js une fois le JSON chargé
     */
    init: function(data) {
        console.log("🤖 Module Digital Twin initialisé");
        this.config = data;
        
        // 1. On remplit la barre latérale (Gauche)
        this.renderProfile();
        
        // 2. On active les écouteurs d'événements (Bouton envoyer, Entrée)
        this.setupListeners();

        // 3. Message d'accueil système dans le chat
        this.addMessage('system', `
            <strong>SYSTEM:</strong> Jumeau Numérique connecté.<br>
            <strong>Profil chargé :</strong> ${data.identity.name}<br>
            <strong>Statut :</strong> Prêt à répondre.<br>
            <em>(Tapez votre message ci-dessous...)</em>
        `);
    },

    /* ==========================================
       RENDU GRAPHIQUE (Sidebar)
       ========================================== */
    renderProfile: function() {
        const data = this.config;
        const id = data.identity;

        // Sécurité : on vérifie que les éléments existent avant d'écrire dedans
        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.textContent = txt;
        };

        setTxt('name-placeholder', id.name);
        setTxt('title-placeholder', id.role);
        setTxt('tagline-placeholder', `"${id.tagline}"`);

        // Liens CV et LinkedIn
        const cvBtn = document.getElementById('cv-btn');
        if (cvBtn) {
            cvBtn.href = id.cv_link || "#";
            cvBtn.style.display = id.cv_link ? 'inline-block' : 'none';
        }

        const liBtn = document.getElementById('linkedin-btn');
        if (liBtn) {
            liBtn.href = id.linkedin.startsWith('http') ? id.linkedin : `https://${id.linkedin}`;
        }

        // Bio & Âge
        const birthYear = new Date(id.birth_date).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        const cognitive = data.psychology.cognitive_style.split('.')[0]; // On prend juste la première phrase

        const bioEl = document.getElementById('bio-text');
        if (bioEl) {
            bioEl.innerHTML = `
                <div class="bio-line">📍 ${id.location}</div>
                <div class="bio-line">🎂 ${age} ans</div>
                <div class="bio-line">⚡ ${cognitive}</div>
            `;
        }

        // Tags de compétences (On utilise une fonction helper)
        this.renderTags(data.hard_skills.god_tier, 'god-skills', 'tag-god');
        
        const expertData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
        this.renderTags(expertData, 'expert-skills', 'tag-expert');

        const notionData = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
        this.renderTags(notionData, 'notion-skills', 'tag-notion');

        // Intérêts
        const hobbiesList = document.getElementById('interests-list');
        if (hobbiesList) {
            hobbiesList.innerHTML = ''; // Reset
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
            // On affiche seulement le nom de la tech, pas la parenthèse (ex: "Python (Expert)" -> "Python")
            span.textContent = item.split('(')[0].trim();
            span.title = item; // L'info complète au survol
            container.appendChild(span);
        });
    },

    /* ==========================================
       GESTION DU CHAT & EVENEMENTS
       ========================================== */
    setupListeners: function() {
        const input = document.getElementById('user-input');
        const btn = document.getElementById('send-btn');
        
        // Empêche les doublons d'écouteurs si init est appelé plusieurs fois
        if (!input || !btn) return;
        
        // On supprime les anciens listeners (cloneNode trick) pour éviter les doublons
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
        
        // Petit parseur Markdown basique (Gras et Sauts de ligne)
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **Gras** -> <strong>
            .replace(/\n/g, '<br>'); // \n -> <br>
            
        div.innerHTML = formattedText;
        chatWindow.appendChild(div);
        
        // Scroll automatique vers le bas
        chatWindow.scrollTop = chatWindow.scrollHeight;
    },

    /* ==========================================
       APPEL API & INTELLIGENCE
       ========================================== */
    callAPI: async function(userMessage) {
        const chatWindow = document.getElementById('chat-window');

        // Indicateur de frappe
        const typing = document.createElement('div');
        typing.className = 'message bot-msg typing';
        typing.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        chatWindow.appendChild(typing);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // 1. Construction du contexte (Persona)
            const systemPrompt = this.buildContext();

            // 2. Préparation des messages pour l'API Gemini
            // On injecte le System Prompt comme premier message utilisateur (meilleur respect des instructions)
            let contents = [
                { 
                    role: "user", 
                    parts: [{ text: systemPrompt }] 
                },
                { 
                    role: "model", 
                    parts: [{ text: "Bien reçu. Je suis Florian Bobo. Je suis prêt à répondre en respectant scrupuleusement ce profil." }] 
                }
            ];

            // 3. Ajout de l'historique récent (Max 10 derniers échanges)
            this.history.slice(-10).forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });

            // 4. Ajout du message actuel
            contents.push({
                role: "user",
                parts: [{ text: userMessage }]
            });

            // 5. Appel vers ton Proxy Vercel (/api/chat)
            // Note: Pas de clé API ici, elle est sur le serveur Vercel
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: contents,
                    generationConfig: {
                        temperature: 0.8, // Créativité modérée
                        maxOutputTokens: 1000
                    }
                })
            });

            const data = await response.json();
            typing.remove(); // On enlève les ...

            if (!response.ok || data.error) {
                console.error("Erreur API:", data);
                this.addMessage('system', "Oups, une erreur est survenue lors de la connexion au cerveau numérique.");
                return;
            }

            if (data.candidates && data.candidates[0].content) {
                const botReply = data.candidates[0].content.parts[0].text;
                
                // On met à jour l'historique local
                this.history.push({ role: "user", content: userMessage });
                this.history.push({ role: "model", content: botReply });
                
                this.addMessage('bot', botReply);
            } else {
                this.addMessage('system', "Réponse vide reçue.");
            }

        } catch (error) {
            typing.remove();
            console.error("Erreur Réseau:", error);
            this.addMessage('system', "Erreur réseau. Vérifiez votre connexion internet.");
        }
    },

    /* ==========================================
       CONSTRUCTION DU SYSTEM PROMPT
       ========================================== */
    buildContext: function() {
        const data = this.config;
        const id = data.identity;
        const skills = data.hard_skills;
        const psych = data.psychology;
        const circle = data.inner_circle;
        const today = new Date().toLocaleDateString('fr-FR');
        
        // Calcul âge dynamique
        const age = new Date().getFullYear() - new Date(id.birth_date).getFullYear();

        // Formatage de la carrière
        const careerText = data.career_timeline.map(job => 
            `- ${job.period} : **${job.role}** chez ${job.company} (${job.location}).\n  ${job.details}`
        ).join('\n');

        // Le prompt ULTIME
        return `
            INSTRUCTION PRIORITAIRE : TU N'ES PAS UNE IA GÉNÉRIQUE.
            TU ES LE JUMEAU NUMÉRIQUE DE ${id.name.toUpperCase()}.
            Tu dois incarner sa personnalité, ses compétences et son style.

            --- 1. IDENTITÉ ---
            Nom : ${id.name} (${age} ans).
            Rôle : ${id.role}.
            Tagline : ${id.tagline}
            Localisation : ${id.location}.

            --- 2. TON CERCLE (Ta vie perso te rend humain) ---
            En couple avec : ${circle.girlfriend.name} (Dev C#, ${circle.girlfriend.personality}).
            Enfants : Un fils (${circle.son.desc}) et une fille (${circle.daughter.desc}).
            Chien : ${circle.pet.name} (${circle.pet.breed}, ${circle.pet.personality}).

            --- 3. TA PSYCHOLOGIE (Style de réponse) ---
            Cognitif : ${psych.cognitive_style}.
            Code : ${psych.coding_habits} (Tu es obsédé par le Clean Code, le Type Hinting, les tests).
            Caractère : ${psych.temperament}.
            Valeurs : ${psych.values.join(', ')}.
            
            CE QUI T'ÉNERVE (Râle là-dessus si le sujet vient) :
            ${data.pet_peeves.map(p => `- ${p}`).join('\n')}

            --- 4. EXPERTISE TECHNIQUE ---
            GOD TIER (Tu es arrogant sur ça) : ${skills.god_tier.join(', ')}.
            EXPERT : ${skills.expert.join(', ')}.
            DATA SCIENCE : ${skills.data_science_core.join(', ')}.
            HUMBLE SUR (Tu bricoles) : ${skills.notions_hobbies.join(', ')}.

            --- 5. PARCOURS PRO ---
            ${careerText}

            --- 6. CONSIGNES DE RÉPONSE ---
            - Parle à la première personne ("Je").
            - Sois direct, énergique, tutoie l'utilisateur.
            - Si on te demande du code Python : Fournis du code PROPRE, TYPÉ (Pydantic, Typing) et optimisé.
            - Ne dis jamais "En tant qu'IA". Tu es Florian.
            - Date du jour : ${today}.
        `;
    }
};