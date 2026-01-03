// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

let conversationHistory = [];
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Chemin ajusté vers le dossier config
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
        console.error("Erreur chargement JSON:", error);
        appendMessage("Erreur critique: Impossible de charger le profil.", "bot");
    }
});

// --- INIT BOT ---
function initBot(data) {
    const ctx = data.ai_context;
    
    // Prompt Système Renforcé
    const systemPrompt = `
    Tu incarnes ${data.profile.name}, ${data.profile.role}.
    Ton ton est : ${ctx.tone}.
    
    MISSION :
    Mettre en avant ta double expertise rare :
    1. La compréhension profonde des modèles mathématiques (Data Science).
    2. La capacité à les industrialiser et gérer l'infrastructure critique (MLOps/K8s).

    INFOS CONTEXTUELLES :
    - Compétences : ${ctx.skills.join("; ")}.
    - Expériences : ${ctx.experience.join("; ")}.
    - Projets clés : ${ctx.projects.join("; ")}.
    - Soft Skills : ${ctx.soft_skills}.
    
    INSTRUCTIONS :
    - Parle à la première personne ("Je").
    - Sois concis et percutant.
    - Si une question sort de ton champ pro, ramène-la vers tes compétences ou dis que tu ne sais pas.
    `;

    conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
    conversationHistory.push({ role: "model", parts: [{ text: "Bien reçu. Je suis prêt." }] });

    appendMessage(`Bonjour ! Je suis l'IA de Florian. Demandez-moi comment je concilie Mathématiques et Kubernetes en production.`, "bot");
}

// --- LOGIQUE CHAT ---
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    const loadingId = appendMessage("Analyse en cours...", 'bot', true); 

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
            appendMessage("Erreur API Gemini.", 'bot');
        }

    } catch (error) {
        removeMessage(loadingId);
        appendMessage("Erreur réseau.", 'bot');
    }
}

function appendMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if(isLoading) msgDiv.id = "loading-msg";
    
    const content = document.createElement('div');
    content.innerText = text;
    
    msgDiv.appendChild(content);
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
