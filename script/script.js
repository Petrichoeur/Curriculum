// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 

// On stocke l'historique de la conversation
let conversationHistory = [];

// --- DÉMARRAGE SÉCURISÉ ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // Récupération des éléments du DOM
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const modelSelect = document.getElementById('model-select');

    // Variable pour suivre le modèle actuel (initialisée avec la valeur par défaut du HTML)
    let currentModel = modelSelect ? modelSelect.value : "gemini-3-flash-preview";

    // 1. Chargement des données JSON
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        // Injection des données dans l'interface (avec sécurité)
        if(document.getElementById('profile-name')) document.getElementById('profile-name').textContent = data.profile.name;
        if(document.getElementById('profile-role')) document.getElementById('profile-role').textContent = data.profile.role;
        if(document.getElementById('profile-img')) document.getElementById('profile-img').src = data.profile.photo_url;
        if(document.getElementById('link-linkedin')) document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        if(document.getElementById('link-cv')) document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement data:", error);
    }

    // 2. Écouteur de changement de modèle (Le Switch Réel)
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            currentModel = e.target.value;
            console.log("Modèle changé pour : " + currentModel);
            
            // Petit feedback visuel dans le chat pour confirmer le changement
            const badge = document.createElement('div');
            badge.className = 'system-badge';
            badge.innerHTML = `<i class="fas fa-sync-alt"></i> Moteur basculé sur : <b>${currentModel}</b>`;
            chatHistory.appendChild(badge);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        });
    }

    // 3. Fonction d'envoi (Cœur du système)
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Affichage message utilisateur
        appendMessage(text, 'user');
        userInput.value = '';
        conversationHistory.push({ role: "user", parts: [{ text: text }] });

        // Indicateur de chargement
        const loadingId = appendMessage("Calcul en cours...", 'bot', true); 

        try {
            // --- CORRECTION CRITIQUE ICI ---
            // On construit l'URL ICI, au moment de l'envoi, pour utiliser le `currentModel` actif.
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            const data = await response.json();
            removeMessage(loadingId); // On retire le message "Calcul en cours..."

            if (data.candidates && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                appendMessage(reply, 'bot');
                conversationHistory.push({ role: "model", parts: [{ text: reply }] });
            } else {
                console.error("Erreur API:", data);
                appendMessage(`⚠️ Erreur: Le modèle ${currentModel} ne répond pas ou n'existe pas.`, 'bot');
            }

        } catch (error) {
            removeMessage(loadingId);
            appendMessage("⚠️ Erreur Réseau critique.", 'bot');
            console.error(error);
        }
    }

    // 4. Initialisation du Jumeau Numérique (Prompt Système)
    function initBot(data) {
        const sys = data.system_instruction;
        const ctx = data.ai_context;
        const pers = data.personal_core;

        const systemPrompt = `
        INSTRUCTION: ${sys.identity}
        TON: ${sys.tone}
        MISSION: ${sys.mission}
        
        HARD SKILLS: ${ctx.hard_skills.join(" || ")}
        PROJETS: ${ctx.key_projects.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(" || ")}
        EXPÉRIENCE: ${ctx.experience_highlights.join(" || ")}
        AWARDS & PUBLIS: ${JSON.stringify(ctx.education_and_awards)}
        
        PERSO: Famille (${pers.family}), Chien (${pers.companion}), JDR/Lecture (${pers.geek_culture.join(", ")})

        RÈGLES: 
        1. Tu ES Florian. Pas d'assistant.
        2. Réponses concises et structurées.
        `;

        conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
        conversationHistory.push({ role: "model", parts: [{ text: "Profil chargé. Prêt." }] });

        appendMessage(`👋 <b>Système en ligne.</b><br>Je suis le jumeau numérique de Florian.<br>Architecture <b>K8s</b>, <b>GenAI</b> ou <b>JDR</b> ?`, "bot");
    }

    // 5. Utilitaires d'affichage
    function appendMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        if(isLoading) msgDiv.id = "loading-msg";
        
        // Formatage basique (Gras et retours à la ligne)
        let formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        msgDiv.innerHTML = formatted;
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return msgDiv.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if(el) el.remove();
    }

    // Événements
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
});
