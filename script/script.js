
// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 
let currentModel = "gemini-3-flash-preview"; 
let conversationHistory = [];

// --- DÉMARRAGE SÉCURISÉ ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // Récupération sécurisée des éléments
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const modelSelect = document.getElementById('model-select');

    // 1. Chargement des données
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        // Remplissage UI (avec vérification si l'élément existe)
        if(document.getElementById('profile-name')) document.getElementById('profile-name').textContent = data.profile.name;
        if(document.getElementById('profile-role')) document.getElementById('profile-role').textContent = data.profile.role;
        if(document.getElementById('profile-bio')) document.getElementById('profile-bio').textContent = data.profile.short_bio;
        if(document.getElementById('profile-img')) document.getElementById('profile-img').src = data.profile.photo_url;
        if(document.getElementById('link-linkedin')) document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        if(document.getElementById('link-cv')) document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement data:", error);
    }

    // 2. Gestionnaire du changement de modèle (Si le menu existe)
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            currentModel = e.target.value;
            // Feedback visuel discret dans le chat
            const badge = document.createElement('div');
            badge.className = 'system-badge';
            badge.innerHTML = `<i class="fas fa-sync"></i> Moteur basculé sur : <b>${currentModel}</b>`;
            chatHistory.appendChild(badge);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        });
    }

    // 3. Fonctions de Chat
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        userInput.value = '';
        conversationHistory.push({ role: "user", parts: [{ text: text }] });

        const loadingId = appendMessage("...", 'bot', true); 

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: conversationHistory })
            });

            const data = await response.json();
            removeMessage(loadingId);

            if (data.candidates && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                appendMessage(reply, 'bot');
                conversationHistory.push({ role: "model", parts: [{ text: reply }] });
            } else {
                appendMessage("⚠️ Erreur API (Vérifiez la clé ou le modèle)", 'bot');
                console.error(data);
            }

        } catch (error) {
            removeMessage(loadingId);
            appendMessage("⚠️ Erreur Réseau", 'bot');
            console.error(error);
        }
    }

    // Initialisation du contexte
    function initBot(data) {
        const sys = data.system_instruction;
        const ctx = data.ai_context;
        const pers = data.personal_core;

        const systemPrompt = `
        RÔLE: ${sys.identity}
        TON: ${sys.tone}
        OBJECTIF: ${sys.mission}
        
        CONTEXTE TECHNIQUE: ${ctx.hard_skills.join(" | ")}
        PROJETS CLÉS: ${ctx.key_projects.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(" | ")}
        PARCOURS: ${ctx.experience_highlights.join(" | ")}
        PUBLIS: ${JSON.stringify(ctx.education_and_awards)}
        
        CONTEXTE PERSO: Famille (${pers.family}), Chien (${pers.companion}), Passions (${pers.geek_culture.join(", ")})

        RÈGLES: 
        1. Je suis Florian. 
        2. Réponses concises.
        `;

        conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
        conversationHistory.push({ role: "model", parts: [{ text: "Système synchronisé. Identité Florian active." }] });

        appendMessage(`👋 <b>Online.</b><br>Je suis le jumeau numérique de Florian.<br>Architecture <b>K8s</b>, <b>GenAI</b> ou <b>JDR</b> ? Posez vos questions.`, "bot");
    }

    // Utilitaires d'affichage
    function appendMessage(text, sender, isLoading = false) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        if(isLoading) msgDiv.id = "loading-msg";
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

    // Écouteurs d'événements (Attachés seulement si les éléments existent)
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
});
