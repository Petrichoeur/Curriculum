/* ==========================================
   FLORIAN BOBO - DIGITAL TWIN v3.0 (GEMINI)
   ========================================== */

// ⚠️ COLLE TA CLÉ API GEMINI CI-DESSOUS
const GEMINI_API_KEY = "TA_CLE_API_ICI"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;

let configData = {};
let conversationHistory = [];

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    setupEventListeners();
    initNeuralNetwork();
});

async function loadConfig() {
    try {
        const response = await fetch('config/data.json');
        if (!response.ok) throw new Error("data.json introuvable");
        
        configData = await response.json();
        renderProfile(configData);
        
        // Message d'accueil système
        addMessageToChat('system', `
            <strong>SYSTEM:</strong> Digital Twin v3.0 [ONLINE]<br>
            <strong>Contextes chargés :</strong><br>
            - Profil Psychologique : Hyperactif et Passionné[ACTIF]<br>
            - Mode : Malinois (Énergie/Fidélité)<br>
            - Stack : ${configData.hard_skills.god_tier.length} skills God Tier.<br>
            En attente d'input...
        `);

    } catch (error) {
        console.error("Erreur:", error);
        addMessageToChat('system', "ERREUR CRITIQUE : Impossible de charger le fichier JSON.");
    }
}

/* --- RENDER UI --- */
function renderProfile(data) {
    document.getElementById('name-placeholder').textContent = data.identity.name;
    document.getElementById('title-placeholder').textContent = data.identity.role;
    document.getElementById('tagline-placeholder').textContent = `"${data.identity.tagline}"`;
    
    // Liens Actions
    const cvBtn = document.getElementById('cv-btn');
    if (cvBtn) cvBtn.href = data.identity.cv_link || "#";
    
    const linkedinBtn = document.getElementById('linkedin-btn');
    if (linkedinBtn) linkedinBtn.href = data.identity.linkedin.startsWith('http') ? data.identity.linkedin : `https://${data.identity.linkedin}`;

    // Bio & Âge
    const age = new Date().getFullYear() - new Date(data.identity.birth_date).getFullYear();
    document.getElementById('bio-text').innerHTML = `
        <div class="bio-line">📍 ${data.identity.location}</div>
        <div class="bio-line">🎂 ${age} ans</div>
        <div class="bio-line">⚡ ${data.psychology.cognitive_style.split('.')[0]}...</div>
    `;

    // Skills Multi-catégories
    renderTags(data.hard_skills.god_tier, 'god-skills', 'tag-god');
    
    // On fusionne Expert + Data Science Core pour la section Expert
    const expertAndData = [...data.hard_skills.expert, ...data.hard_skills.data_science_core];
    renderTags(expertAndData, 'expert-skills', 'tag-expert');
    
    // On fusionne Notions + Competent
    const notionsAndCompetent = [...data.hard_skills.notions_hobbies, ...data.hard_skills.competent];
    renderTags(notionsAndCompetent, 'notion-skills', 'tag-notion');
    
    // Hobbies
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

/* --- CHAT LOGIC --- */
function setupEventListeners() {
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');

    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addMessageToChat('user', text);
        input.value = '';
        callGeminiAPI(text);
    };

    btn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

/* --- FONCTION D'AFFICHAGE AMÉLIORÉE --- */
function addMessageToChat(role, text) {
    const chatWindow = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `message ${role}-msg`;
    
    // On garde le gras **text** mais on laisse le CSS gérer les sauts de ligne (pre-wrap)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    div.innerHTML = formattedText;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* --- GEMINI API CALL --- */
/* --- GEMINI API CALL (CORRIGÉ & BOOSTÉ) --- */
async function callGeminiAPI(userMessage) {
    const chatWindow = document.getElementById('chat-window');
    
    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'message bot-msg typing';
    typing.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const systemPrompt = buildSystemContext(configData);
        
        // Préparation historique
        const contents = conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
        
        contents.push({ role: "user", parts: [{ text: userMessage }] });

        const payload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: contents,
            // CONFIGURATION OPTIMISÉE POUR ÉVITER LES COUPURES
            generationConfig: {
                temperature: 0.8, 
                maxOutputTokens: 2048, // Augmenté de 600 à 2048 pour finir les phrases
            },
            // DÉSACTIVATION DES FILTRES DE SÉCURITÉ TROP STRICTS (qui coupent parfois le texte)
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
            console.error("Erreur API:", data.error);
            addMessageToChat('system', `⚠️ Erreur API: ${data.error.message}`);
            return;
        }

        if (data.candidates && data.candidates[0].content) {
            const botReply = data.candidates[0].content.parts[0].text;
            
            conversationHistory.push({ role: "user", content: userMessage });
            conversationHistory.push({ role: "model", content: botReply });
            
            addMessageToChat('bot', botReply);
        } else {
            addMessageToChat('system', "⚠️ Réponse vide reçue (Filtre de sécurité actif ?).");
        }

    } catch (error) {
        typing.remove();
        console.error(error);
        addMessageToChat('system', "Erreur réseau. Vérifiez votre connexion.");
    }
}

/* --- SYSTEM PROMPT BUILDER (Le Cœur du Jumeau) --- */
function buildSystemContext(data) {
    const today = new Date().toLocaleDateString('fr-FR');
    const myAge = new Date().getFullYear() - new Date(data.identity.birth_date).getFullYear();
    const sonAge = new Date().getFullYear() - new Date(data.inner_circle.son.birth).getFullYear();
    const daughterAge = new Date().getFullYear() - new Date(data.inner_circle.daughter.birth).getFullYear();

    return `
    TU ES FLORIAN BOBO. CECI EST TON JUMEAU NUMÉRIQUE.
    
    [IDENTITÉ & DATA]
    Nom: ${data.identity.name}
    Âge: ${myAge} ans. Rôle: ${data.identity.role}.
    Email: ${data.identity.email}.
    
    [PSYCHOLOGIE - CRUCIAL]
    - Type: "Berger Malinois" (Fidèle, Intense, Énergique).
    - Cognitif: HPI/TDAH. Pensée arborescente. Tu fais des liens inattendus.
    - Valeurs: ${data.psychology.values.join(', ')}.
    - Habitudes Code: ${data.psychology.coding_habits}.
    - Irritants (Pet Peeves): ${data.pet_peeves.join(', ')}.
    
    [FAMILLE]
    - Fils (${sonAge} ans), Fille (${daughterAge} ans).
    - Chien: Gojo (${data.inner_circle.pet.breed}), une tornade.
    
    [STACK TECHNIQUE (HARD SKILLS)]
    - GOD TIER (Ton Excellence): ${data.hard_skills.god_tier.join(', ')}.
    - EXPERT: ${data.hard_skills.expert.join(', ')}.
    - DATA SCIENCE: ${data.hard_skills.data_science_core.join(', ')}.
    - NOTIONS (Reste Humble): ${data.hard_skills.notions_hobbies.join(', ')}.
    
    [HISTOIRE PRO]
    ${JSON.stringify(data.career_timeline)}
    
    [INSTRUCTIONS DE RÉPONSE]
    1. Parle à la première personne ("Je"). Tutoie si le contexte est relax.
    2. Sois authentique : Si on parle Python, sois un expert pointilleux. 
    3. Si on demande le CV, dis qu'il est dispo via le bouton.
    4. Utilise tes analogies (Musique Metal, Enfants, Chien).
    5. Date actuelle : ${today}.
    6. Donne des réponses courtes mais organisés et logique 
    7. Donne l'impression qu'on parle à Florian Bobo, un être humain, un père de famille, un ingenieur passionné par l'IA.
    `;
}

/* ==========================================
   NEURAL CANVAS ENGINE (Visuel)
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
        
        pulsesArray.forEach((p, i) => {
            p.update();
            if (p.life <= 0) pulsesArray.splice(i, 1);
        });

        particlesArray.forEach(p => {
            p.update(); p.draw();
            particlesArray.forEach(p2 => {
                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 150) {
                    let color = 'rgba(189, 0, 255, 0.05)';
                    let w = 1;
                    pulsesArray.forEach(pulse => {
                        if (Math.abs(Math.hypot(pulse.x - p.x, pulse.y - p.y) - pulse.r) < 30) {
                            color = `rgba(0, 255, 157, ${pulse.life})`; w = 2;
                        }
                    });
                    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w;
                    ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                }
            });
        });
    }

    window.addEventListener('click', (e) => pulsesArray.push(new Pulse(e.x, e.y)));
    initParticles();
    animate();
}
