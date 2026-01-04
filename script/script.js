// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 

// MODÈLE UNIQUE IMPOSÉ
const MODEL_ID = "gemini-3-flash-preview"; 

let conversationHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
    
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // 1. Chargement des données Profil
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        if(document.getElementById('profile-name')) document.getElementById('profile-name').textContent = data.profile.name;
        if(document.getElementById('profile-role')) document.getElementById('profile-role').textContent = data.profile.role;
        if(document.getElementById('profile-img')) document.getElementById('profile-img').src = data.profile.photo_url;
        if(document.getElementById('link-linkedin')) document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        if(document.getElementById('link-cv')) document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement data:", error);
        appendMessage("⚠️ Erreur critique: Impossible de charger le profil.", 'bot');
    }

    // 2. Fonction d'envoi
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // UI Utilisateur
        appendMessage(text, 'user');
        userInput.value = '';
        conversationHistory.push({ role: "user", parts: [{ text: text }] });

        // Indicateur de chargement
        const loadingId = appendMessage("Analyse en cours...", 'bot', true); 

        try {
            // Construction URL directe avec le modèle imposé
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            const data = await response.json();
            removeMessage(loadingId);

            if (data.error) {
                // Gestion explicite des erreurs API (ex: modèle introuvable)
                console.error("API Error:", data.error);
                appendMessage(`⚠️ Erreur API: ${data.error.message}`, 'bot');
            } 
            else if (data.candidates && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                appendMessage(reply, 'bot');
                conversationHistory.push({ role: "model", parts: [{ text: reply }] });
            } 
            else {
                appendMessage("⚠️ Réponse vide du modèle.", 'bot');
            }

        } catch (error) {
            removeMessage(loadingId);
            appendMessage("⚠️ Erreur Réseau (Check Logs).", 'bot');
            console.error(error);
        }
    }

    // 3. Initialisation Système
    function initBot(data) {
        const sys = data.system_instruction;
        const ctx = data.ai_context;
        const pers = data.personal_core;

        const systemPrompt = `
        IDENTITY: ${sys.identity}
        TONE: ${sys.tone}
        GOAL: ${sys.mission}
        
        TECH STACK: ${ctx.hard_skills.join(" || ")}
        PROJECTS: ${ctx.key_projects.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(" || ")}
        EXPERIENCE: ${ctx.experience_highlights.join(" || ")}
        AWARDS: ${JSON.stringify(ctx.education_and_awards)}
        
        PERSONAL: Family (${pers.family}), Dog (${pers.companion}), Hobbies (${pers.geek_culture.join(", ")})

        RULES: 
        1. Tu es Florian. Réponds directement.
        2. Format concis.
        `;

        conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
        conversationHistory.push({ role: "model", parts: [{ text: "Système prêt." }] });

        appendMessage(`👋 <b>Online.</b><br>Modèle actif : <code>${MODEL_ID}</code>.<br>Je suis le jumeau numérique de Florian.`, "bot");
    }

    // Utilitaires
    function appendMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        if(isLoading) msgDiv.id = "loading-msg";
        let formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/`(.*?)`/g, '<code>$1</code>');
        msgDiv.innerHTML = formatted;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return msgDiv.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if(el) el.remove();
    }

    // Events
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
});
