/* ==========================================
   FLORIAN BOBO - DIGITAL TWIN (GEMMA EDITION)
   ========================================== */

// ⚠️ METS TA CLÉ API ICI
const GEMINI_API_KEY = "TA_CLE_API_ICI";

// IMPORTANT : Si 'gemma-3-27b-it' ne marche pas, essaie 'gemma-2-27b-it'
// Les modèles Gemma sur l'API Google changent souvent de nom de version.
const MODEL_NAME = "gemma-3-27b-it"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

let configData = {};
let conversationHistory = [];

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    setupEventListeners();
    initNeuralNetwork();
});

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (!response.ok) throw new Error("config.json introuvable");
        
        configData = await response.json();
        renderProfile(configData);
        
        addMessageToChat('system', `
            <strong>SYSTEM:</strong> Connexion au modèle ${MODEL_NAME} établie.<br>
            <strong>Mode :</strong> Site Statique (Client-Side).<br>
            <strong>Contexte :</strong> Injecté manuellement dans l'historique.<br>
            En attente d'input...
        `);

    } catch (error) {
        console.error("Erreur:", error);
        addMessageToChat('system', "ERREUR : Impossible de charger config.json.");
    }
}

/* --- RENDER UI (Identique à avant) --- */
function renderProfile(data) {
    document.getElementById('name-placeholder').textContent = data.identity.name;
    document.getElementById('title-placeholder').textContent = data.identity.role;
    document.getElementById('tagline-placeholder').textContent = `"${data.identity.tagline}"`;
    
    // Boutons
    const cvBtn = document.getElementById('cv-btn');
    if (cvBtn) {
        if (data.identity.cv_link) {
            cvBtn.href = data.identity.cv_link;
            cvBtn.style.display = 'inline-block';
        } else {
            cvBtn.style.display = 'none';
        }
    }
    
    const linkedinBtn = document.getElementById('linkedin-btn');
    if (linkedinBtn) linkedinBtn.href = data.identity.linkedin.startsWith('http') ? data.identity.linkedin : `https://${data.identity.linkedin}`;

    // Bio
    const age = new Date().getFullYear() - new Date(data.identity.birth_date).getFullYear();
    const cognitive = data.psychology.cognitive_style.split('.')[0] || "Passionné";
    document.getElementById('bio-text').innerHTML = `
        <div class="bio-line">📍 ${data.identity.location}</div>
        <div class="bio-line">🎂 ${age} ans</div>
        <div class="bio-line">⚡ ${cognitive}</div>
    `;

    renderTags(data.hard_skills.god_tier, 'god-skills', 'tag-god');
    
    const expertAndData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
    renderTags(expertAndData, 'expert-skills', 'tag-expert');
    
    const notionsAndCompetent = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
    renderTags(notionsAndCompetent, 'notion-skills', 'tag-notion');
    
    const hobbiesList = document.getElementById('interests-list');
    [...data.interests.music, ...data.interests.reading].slice(0, 5).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        hobbiesList.appendChild(li);
    });
}

function renderTags(items, containerId, className) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const span = document.createElement('span');
        span.className = `tag ${className}`;
        span.textContent = item.split('(')[0].trim();
        span.title = item;
        container.appendChild(span);
    });
}

/* --- LOGIQUE CHAT --- */
function setupEventListeners() {
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');

    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addMessageToChat('user', text);
        input.value = '';
        callGemmaAPI(text);
    };

    btn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

function addMessageToChat(role, text) {
    const chatWindow = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `message ${role}-msg`;
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    div.innerHTML = formattedText;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* --- API CALL (GEMMA VERSION) --- */
async function callGemmaAPI(userMessage) {
    const chatWindow = document.getElementById('chat-window');
    
    const typing = document.createElement('div');
    typing.className = 'message bot-msg typing';
    typing.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // 1. On construit le prompt système
        const systemPrompt = buildSystemContext(configData);

        // 2. On construit le tableau 'contents' MANUELLEMENT
        // Gemma ne supporte pas 'system_instruction', donc on triche
        // en insérant le système comme le premier message utilisateur.
        
        let apiContents = [];

        // --- INJECTION DU CONTEXTE (TRICK) ---
        apiContents.push({
            role: "user",
            parts: [{ text: `INSTRUCTION SYSTÈME CRITIQUE : \n${systemPrompt}\n\nConfirme que tu as ingéré ce profil.` }]
        });
        
        apiContents.push({
            role: "model",
            parts: [{ text: "C'est compris. Je suis Florian Bobo. Je suis prêt à répondre selon ce profil et ces instructions." }]
        });
        // -------------------------------------

        // 3. On ajoute l'historique de conversation réel
        conversationHistory.forEach(msg => {
            apiContents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        });

        // 4. On ajoute le message actuel
        apiContents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        const payload = {
            contents: apiContents,
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024 // Gemma est parfois limité en tokens de sortie
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        typing.remove();

        if (data.error) {
            console.error("API Error:", data.error);
            // Gestion spécifique si le modèle n'existe pas
            if(data.error.message.includes("models/")) {
                addMessageToChat('system', `Erreur Modèle : Vérifiez le nom '${MODEL_NAME}'. Essayez 'gemma-2-27b-it'.`);
            } else {
                addMessageToChat('system', `Erreur API: ${data.error.message}`);
            }
            return;
        }

        if (data.candidates && data.candidates[0].content) {
            const botReply = data.candidates[0].content.parts[0].text;
            
            conversationHistory.push({ role: "user", content: userMessage });
            conversationHistory.push({ role: "model", content: botReply });
            
            addMessageToChat('bot', botReply);
        } else {
            addMessageToChat('system', "Réponse vide (Sécurité ou erreur modèle).");
        }

    } catch (error) {
        typing.remove();
        console.error(error);
        addMessageToChat('system', "Erreur réseau. Vérifiez votre connexion.");
    }
}

/* --- SYSTEM PROMPT --- */
function buildSystemContext(data) {
    const today = new Date().toLocaleDateString('fr-FR');
    const myAge = new Date().getFullYear() - new Date(data.identity.birth_date).getFullYear();
    
    return `
    TU N'ES PAS UNE IA. TU ES FLORIAN BOBO.
    Agis uniquement selon ce persona.
    
    [TON PROFIL]
    Nom: ${data.identity.name} (${myAge} ans).
    Rôle: ${data.identity.role}.
    Localisation: ${data.identity.location}.
    
    [TON CARACTÈRE (IMPORTANT)]
    Tu es un "Berger Malinois" : intense, énergique, fidèle.
    Cognitif : Hyperactif et passionné (pensée rapide, arborescente).
    Tu es pédagogue (ancien prof). Tu es casanier mais l'esprit vif.
    
    [TES COMPÉTENCES]
    - GOD TIER (Tu es un crack): ${data.hard_skills.god_tier.join(', ')}.
    - EXPERT: ${data.hard_skills.expert.join(', ')}.
    - HUMBLE SUR: Rust et Go (tu as juste des notions).
    
    [TON HISTOIRE]
    ${JSON.stringify(data.career_timeline)}
    
    [RÈGLES DE RÉPONSE]
    1. Parle toujours à la première personne ("Je").
    2. Sois direct, naturel, tutoie si c'est cool.
    3. Si on parle Python, montre ton expertise (Cython, Async).
    4. Date: ${today}.
    `;
}

/* ==========================================
   VISUAL EFFECTS (NEURAL)
   ========================================== */
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    let pulsesArray = [];
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() * 0.4) - 0.2;
            this.vy = (Math.random() * 0.4) - 0.2;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.vx = -this.vx;
            if (this.y > canvas.height || this.y < 0) this.vy = -this.vy;
            this.x += this.vx; this.y += this.vy;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
            ctx.fill();
        }
    }

    class Pulse {
        constructor(x, y) { this.x = x; this.y = y; this.r = 1; this.life = 1; }
        update() { this.r += 4; this.life -= 0.02; }
    }

    function initParticles() {
        particlesArray = [];
        let nb = (canvas.height * canvas.width) / 15000;
        for (let i = 0; i < nb; i++) particlesArray.push(new Particle());
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pulsesArray.forEach((p, i) => { p.update(); if (p.life <= 0) pulsesArray.splice(i, 1); });
        particlesArray.forEach(p => {
            p.update(); p.draw();
            particlesArray.forEach(p2 => {
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 150) {
                    let c = 'rgba(189, 0, 255, 0.05)'; let w = 1;
                    pulsesArray.forEach(pu => { if (Math.abs(Math.hypot(pu.x - p.x, pu.y - p.y) - pu.r) < 30) { c = `rgba(0, 255, 157, ${pu.life})`; w = 2; } });
                    ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                }
            });
        });
    }
    window.addEventListener('click', (e) => pulsesArray.push(new Pulse(e.x, e.y)));
    initParticles();
    animate();
}
