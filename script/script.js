// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; // Sera remplacée par Vercel
let currentModel = "gemini-3-flash-preview"; 

let conversationHistory = [];
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modelSelect = document.getElementById('model-select');

// --- CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        // UI Population
        document.getElementById('profile-name').textContent = data.profile.name;
        document.getElementById('profile-role').textContent = data.profile.role;
        document.getElementById('profile-bio').textContent = data.profile.short_bio;
        document.getElementById('profile-img').src = data.profile.photo_url;
        document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement:", error);
    }
});

// --- SWITCHER ---
modelSelect.addEventListener('change', (e) => {
    currentModel = e.target.value;
    const badge = document.createElement('div');
    badge.className = 'system-badge';
    badge.innerText = `Moteur IA basculé sur : ${currentModel.replace('preview', '').toUpperCase()}`;
    chatHistory.appendChild(badge);
    chatHistory.scrollTop = chatHistory.scrollHeight;
});

// --- INITIALISATION ---
function initBot(data) {
    const sys = data.system_instruction;
    const ctx = data.ai_context;
    const pers = data.personal_core;

    const systemPrompt = `
    RÔLE : ${sys.identity}
    TON : ${sys.tone}
    OBJECTIF : ${sys.mission}

    COMPÉTENCES TECHNIQUES (Vraie stack) :
    ${ctx.hard_skills.map(s => `- ${s}`).join('\n')}

    PARCOURS :
    ${ctx.experience_highlights.map(e => `- ${e}`).join('\n')}

    PROJETS :
    ${ctx.key_projects.map(p => `- ${p}`).join('\n')}

    VIE PERSO (Pour humaniser) :
    - Enfants : ${pers.family}
    - Chien : ${pers.companion}
    - Hobbies : ${pers.geek_culture.join(", ")}, ${pers.music}

    RÈGLES D'INTERACTION :
    1. "Qui es-tu ?" -> "Je suis Florian BOBO."
    2. SOIS HONNÊTE : Je maîtrise Python/C/Cython. J'ai des notions en Rust/Go.
    3. EXPLICITE : Mentionne mes compétences en Sysadmin/Réseau/OpenShift si on parle d'infra.
    4. EXPLICITE : Mentionne SVM/XGBoost/Stats si on parle de Data Science.
    `;

    conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
    conversationHistory.push({ role: "model", parts: [{ text: "Identité chargée. Je suis Florian. Stack technique mise à jour. Prêt." }] });

    appendMessage(`👋 Bonjour. Je suis le Jumeau Numérique de Florian.\nJe peux parler **Sysadmin/Réseau**, algorithmes **ML (SVM/XGBoost)** ou de mon chien **Gojo** !`, "bot");
}

// --- ENVOI ---
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
            appendMessage("⚠️ Erreur API", 'bot');
        }

    } catch (error) {
        removeMessage(loadingId);
        appendMessage("⚠️ Erreur Réseau", 'bot');
    }
}

// --- DISPLAY ---
function appendMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if(isLoading) msgDiv.id = "loading-msg";
    
    // Formatage simple
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

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
