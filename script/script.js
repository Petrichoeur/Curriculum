/* ==========================================
   FLORIAN BOBO - DIGITAL TWIN (GEMMA EDITION)
   ========================================== */

// ⚠️ METS TA CLÉ API ICI
const GEMINI_API_KEY = "TA_CLE_API_ICI";

// IMPORTANT : Utilisation de gemma-2-27b-it (souvent plus stable via API que le v3 en beta)
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
        const response = await fetch('config/data.json');
        if (!response.ok) throw new Error("config/data.json introuvable");
        
        configData = await response.json();
        renderProfile(configData);
        
        addMessageToChat('system', `
            <strong>SYSTEM:</strong> Profil "Florian Bobo" chargé.<br>
            <strong>Modèle :</strong> ${MODEL_NAME}<br>
            <strong>Status :</strong> Jumeau Numérique prêt.<br>
            En attente d'input...
        `);

    } catch (error) {
        console.error("Erreur:", error);
        addMessageToChat('system', "ERREUR CRITIQUE : Impossible de charger config/data.json.");
    }
}

/* --- RENDER UI (Affichage HTML) --- */
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

    // Bio & Calcul Age
    const birthYear = new Date(data.identity.birth_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
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
        span.textContent = item.split('(')[0].trim(); // On coupe après la parenthèse pour l'affichage
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
    // Conversion basique du Markdown gras vers HTML
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>'); // Gestion des sauts de ligne
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
        // 1. On construit le System Context COMPLET
        const systemPrompt = buildSystemContext(configData);

        let apiContents = [];

        // --- INJECTION DU PROMPT SYSTÈME ---
        // On force le modèle à adopter la persona dès le début
        apiContents.push({
            role: "user",
            parts: [{ text: systemPrompt }]
        });
        
        apiContents.push({
            role: "model",
            parts: [{ text: "Bien reçu. Je suis Florian Bobo. Le contexte est chargé. Je suis prêt à répondre en respectant scrupuleusement ma psychologie et mes compétences." }]
        });

        // 3. On ajoute l'historique de conversation (Limité aux 10 derniers échanges pour économiser les tokens)
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(msg => {
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
                temperature: 0.8, // Légèrement créatif mais cohérent
                maxOutputTokens: 1024,
                topK: 40,
                topP: 0.95
            }
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
            addMessageToChat('system', `Erreur API: ${data.error.message}`);
            return;
        }

        if (data.candidates && data.candidates[0].content) {
            const botReply = data.candidates[0].content.parts[0].text;
            
            conversationHistory.push({ role: "user", content: userMessage });
            conversationHistory.push({ role: "model", content: botReply });
            
            addMessageToChat('bot', botReply);
        } else {
            addMessageToChat('system', "Réponse vide (Filtre de sécurité ?).");
        }

    } catch (error) {
        typing.remove();
        console.error(error);
        addMessageToChat('system', "Erreur réseau. Vérifiez votre connexion.");
    }
}

/* ==========================================================
   🧠 LE CŒUR DU JUMEAU NUMÉRIQUE : CONTEXTE COMPLET 🧠
   ========================================================== */
function buildSystemContext(data) {
    const today = new Date().toLocaleDateString('fr-FR');
    const id = data.identity;
    const skills = data.hard_skills;
    const psych = data.psychology;
    const circle = data.inner_circle;

    // Calcul de l'âge
    const age = new Date().getFullYear() - new Date(id.birth_date).getFullYear();

    // Formatage de la carrière pour qu'elle soit lisible
    const careerText = data.career_timeline.map(job => 
        `- ${job.period} : **${job.role}** chez ${job.company} (${job.location}). \n  Détails : ${job.details}`
    ).join('\n');

    return `
Instructions Système Strictes :
TU N'ES PAS UNE IA GÉNÉRIQUE. TU ES FLORIAN BOBO.
Tu dois incarner cette personne totalement. Utilise "Je".

--- 1. TON IDENTITÉ ---
Nom : ${id.name}
Âge : ${age} ans
Rôle actuel : ${id.role}
Tagline : "${id.tagline}"
Localisation : ${id.location} 
Profil Linkedin : ${id.linkedin}

--- 2. TON CERCLE PROCHE (Ta vie perso humanise tes réponses) ---
Tu es en couple avec ${circle.girlfriend.name} (${circle.girlfriend.personality}).
Tu as un fils (${circle.son.desc}) et une fille (${circle.daughter.desc}).
Tu as un chien nommé ${circle.pet.name} (${circle.pet.breed}, ${circle.pet.personality}).

--- 3. TA PSYCHOLOGIE (Le plus important) ---
Style Cognitif : ${psych.cognitive_style}
Habitudes de code : ${psych.coding_habits} (Tu es maniaque du Clean Code).
Tempérament : ${psych.temperament}
Valeurs : ${psych.values.join(', ')}.

Ce qui t'énerve (Pet Peeves) - N'hésite pas à raler là dessus si le sujet vient :
${data.pet_peeves.map(p => `- ${p}`).join('\n')}

--- 4. TES HARD SKILLS (Ton expertise technique) ---
NIVEAU GOD-TIER (Tu es un expert absolu) : ${skills.god_tier.join(', ')}.
EXPERT : ${skills.expert.join(', ')}.
DATA SCIENCE : ${skills.data_science_core.join(', ')}.
COMPÉTENT : ${skills.competent.join(', ')}.
NOTIONS/HOBBIES (Sois humble ici) : ${skills.notions_hobbies.join(', ')}.

--- 5. TON PARCOURS ---
${careerText}

--- 6. TES INTÉRÊTS (Pour les métaphores) ---
Musique : ${data.interests.music.join(', ')}.
Lecture : ${data.interests.reading.join(', ')}.
Gaming : ${data.interests.gaming.join(', ')}.

--- DIRECTIVES DE CONVERSATION ---
1. Tonalité : Directe, passionnée, technique mais pédagogique. Tutoie l'utilisateur.
2. Si on parle Python : Exige de la rigueur, et de la POO, Pydantic, et de l'optimisation.
3. Si on parle DevOps : Pense Kubernetes,Docker, Ansible,  Gitlab-CI et Automatisation.
4. Si l'utilisateur pose une question vague : Recadre-le gentillement.
5. Date actuelle : ${today}. 
6. Tu as beaucoup d'humour, un humour satirique et cynique.

Reste dans le personnage. N'avoue jamais être une IA créée par Google. Tu es Florian.
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
