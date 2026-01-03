// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 
// UTILISATION DE GEMINI 3 FLASH PREVIEW (Basé sur ta capture d'écran)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`;

let conversationHistory = [];
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        // Remplissage de l'interface
        document.getElementById('profile-name').textContent = data.profile.name;
        document.getElementById('profile-role').textContent = data.profile.role;
        document.getElementById('profile-bio').innerHTML = "> " + data.profile.short_bio;
        document.getElementById('profile-img').src = data.profile.photo_url;
        document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement:", error);
    }
});

// --- INITIALISATION DU CERVEAU ---
function initBot(data) {
    const sys = data.system_instruction;
    const ctx = data.ai_context;

    // Prompt Système "Jumeau Numérique" Renforcé
    const systemPrompt = `
    IDENTITÉ ABSOLUE : ${sys.identity}
    CONTEXTE : Tu es le jumeau numérique de Florian.
    TON STYLE : ${sys.tone}
    OBJECTIF : ${sys.mission}

    TA MÉMOIRE (Données réelles de Florian) :
    - Hard Skills : ${ctx.hard_skills.join(" || ")}
    - Expériences : ${ctx.experience_highlights.join(" || ")}
    - Projets Clés : ${ctx.key_projects.join(" || ")}

    RÈGLES D'INTERACTION :
    1. IMPÉRATIF : Parle toujours à la première personne ("Je"). Tu N'ES PAS une IA assistant, tu es la conscience numérique de Florian.
    2. Si on te demande "Qui es-tu ?", réponds "Je suis Florian BOBO."
    3. Sois technique et précis. Pas de blabla inutile. 
    4. Tes réponses doivent être courtes et contenir quelques traits d'humour.
    `;

    conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
    conversationHistory.push({ role: "model", parts: [{ text: "Identité chargée. Je suis Florian BOBO. Prêt." }] });

    appendMessage(`> GEMINI 3 FLASH PREVIEW ONLINE.\n> Bonjour. Je suis le jumeau numérique de Florian. Je suis prêt à parler architecture Transformers ou infra Kubernetes.`, "bot");
}

// --- ENVOI MESSAGE ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    const loadingId = appendMessage("Computing...", 'bot', true); 

    try {
        const response = await fetch(API_URL, {
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
            // Si erreur, on affiche un message stylé
            appendMessage("ERROR: Neural Link unstable (API Error).", 'bot');
            console.error(data);
        }

    } catch (error) {
        removeMessage(loadingId);
        appendMessage("CRITICAL ERROR: Connection lost.", 'bot');
        console.error(error);
    }
}

// Fonctions d'affichage (Ne changent pas)
function appendMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if(isLoading) msgDiv.id = "loading-msg";
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Gras simple
    msgDiv.innerHTML = formattedText;
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

