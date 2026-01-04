// Configuration globale
let configData = {};
let conversationHistory = []; // La mémoire vive du jumeau

document.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    setupEventListeners();
});

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        configData = await response.json();
        
        // 1. Initialisation Visuelle (Profil)
        renderProfile(configData);
        
        // 2. Initialisation Cognitive (Prompt Système)
        // On construit un prompt système ultra-détaillé qui sera invisible pour l'utilisateur
        // mais qui conditionne toutes les réponses futures.
        const systemMessage = buildSystemPrompt(configData);
        conversationHistory.push({ role: "system", content: systemMessage });

        console.log("Système Neural Florian Bobo : INITIALISÉ.");
    } catch (error) {
        console.error("Erreur chargement config:", error);
    }
}

function buildSystemPrompt(data) {
    const today = new Date();
    const age = calculateAge(data.identity.birth_date);
    const sonAge = calculateAge(data.inner_circle.son.birth);
    const daughterAge = calculateAge(data.inner_circle.daughter.birth);

    // On transforme le JSON en texte narratif dense pour l'IA
    return `${data.system_prompt_narrative}

    [DONNÉES TEMPORELLES ACTUELLES]
    Nous sommes le ${today.toLocaleDateString('fr-FR')}.
    J'ai ${age} ans.
    Mon fils a ${sonAge} ans (né fév 2017).
    Ma fille a ${daughterAge} ans (née déc 2020).
    Mon chien Gojo (Labrador/Braque) est né en sept 2025.

    [MON PARCOURS PRO - DÉTAILS CRITIQUES]
    Actuellement : Tech Lead @ ${data.career_timeline[0].company}. Projet GPU-as-a-Service.
    Avant : ${data.career_timeline[1].company} (AutoDevOps, AIOps).
    Avant : ${data.career_timeline[2].company} (Industrie 4.0).
    Début : Prof de Maths (2016-2019).

    [MES COMPETENCES TECHNIQUES]
    TOP NIVEAU : ${data.hard_skills.god_tier.join(', ')}.
    EXPERT : ${data.hard_skills.expert.join(', ')}.
    NOTIONS (Être humble) : ${data.hard_skills.notions_hobbies.join(', ')}.

    [DIRECTIVE MÉMOIRE]
    Prends en compte TOUT l'historique de la conversation ci-dessous pour répondre. Sois cohérent.`;
}

function renderProfile(data) {
    // Remplissage simple du DOM (Nom, Titre, Bio...)
    document.getElementById('tagline-placeholder').textContent = `"${data.identity.tagline}"`;
    document.getElementById('name-placeholder').textContent = data.identity.name;
    document.getElementById('title-placeholder').textContent = data.identity.role;
    
    // Bio "Vibe"
    const bioHTML = `
        <div class="bio-line">📍 ${data.identity.location}</div>
        <div class="bio-line">⚡ ${data.psychology.cognitive_style.split('(')[0]}</div>
        <div class="bio-line">🐶 Maître de Gojo</div>
    `;
    document.getElementById('bio-text').innerHTML = bioHTML;

    // Skills
    renderTags(data.hard_skills.god_tier, 'expert-skills', 'tag-god');
    renderTags(data.hard_skills.expert, 'expert-skills', 'tag-expert');
    renderTags(data.hard_skills.notions_hobbies, 'notion-skills', 'tag-notion');
    
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
    items.forEach(item => {
        const span = document.createElement('span');
        span.className = `tag ${className}`;
        span.textContent = item.split('(')[0].trim(); // On affiche court
        span.title = item; // Info-bulle avec le détail
        container.appendChild(span);
    });
}

// --- LOGIQUE DE DISCUSSION ---

function setupEventListeners() {
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');

    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;

        // 1. Afficher User Msg
        addMessageToChat('user', text);
        input.value = '';

        // 2. Mettre à jour la mémoire
        conversationHistory.push({ role: "user", content: text });

        // 3. Appeler l'intelligence
        simulateAIResponse();
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
    div.innerHTML = text.replace(/\n/g, '<br>');
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function simulateAIResponse() {
    // Indicateur de frappe
    const chatWindow = document.getElementById('chat-window');
    const typing = document.createElement('div');
    typing.className = 'message bot-msg typing';
    typing.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // ICI : Simulation de l'appel API (à remplacer par ton fetch vers OpenAI/Mistral)
    // On enverrait : JSON.stringify({ messages: conversationHistory })
    
    setTimeout(() => {
        typing.remove();
        
        // Logique de réponse simulée basée sur les mots clés ET l'historique
        const lastUserMsg = conversationHistory[conversationHistory.length - 1].content.toLowerCase();
        let reply = "";

        // EXEMPLES DE RÉPONSES CONTEXTUELLES (Simulation)
        if (lastUserMsg.includes("parcours") || lastUserMsg.includes("expérience")) {
            reply = "C'est un chemin un peu atypique ! J'ai commencé **Prof de Maths** (2016-2019), ce qui m'a appris la pédagogie. \n\nEnsuite, grand saut dans la Data chez **Axens** (Industrie 4.0) et **Pôle Emploi** où j'ai monté de l'AIOps. Aujourd'hui, je suis Tech Lead chez **CA-GIP**, je bosse sur du GPU-as-a-Service et de l'IA Générative. C'est intense mais passionnant.";
        }
        else if (lastUserMsg.includes("python")) {
            reply = "Python, c'est mon couteau suisse absolu. 🐍\n\nJe ne l'utilise pas juste pour scripter, je vais chercher la perf avec **Cython** ou de l'async. C'est indispensable pour faire du MLOps propre. Tu as une question précise sur du code ?";
        }
        else if (lastUserMsg.includes("rust") || lastUserMsg.includes("go")) {
            reply = "Alors Rust et Go... J'ai des notions, je respecte énormément ces langages pour leur efficacité (surtout Rust pour la mémoire). Mais pour être honnête, je ne suis pas expert. Je préfère optimiser du Python que de me battre avec le borrow checker de Rust pour l'instant ! 😉";
        }
        else if (lastUserMsg.includes("famille") || lastUserMsg.includes("perso")) {
            reply = "Côté perso, c'est rythmé ! Entre mon fils (2017), ma fille (2020) et **Gojo**, mon chiot Labrador/Braque qui vient d'arriver (né en 2025), je ne m'ennuie pas. Je compense avec beaucoup de musique (Metal/Synthwave) et de lecture.";
        }
        else {
            reply = "Yes, je vois. Avec mon profil un peu 'TDAH', ça me fait penser à plusieurs choses à la fois. 🤔\n\nTu veux qu'on creuse l'aspect technique ou plutôt la vision produit/MLOps de ça ?";
        }

        conversationHistory.push({ role: "assistant", content: reply });
        addMessageToChat('bot', reply);

    }, 1500); // Délai de réflexion
}

function calculateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}


/* ==========================================
   MOTEUR NEURAL - EFFET VISUEL MYSTIQUE
   ========================================== */

const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');
let particlesArray;
let pulsesArray = []; // Pour stocker les ondes de clic

// Configuration de l'effet
const configNeural = {
    particleColor: 'rgba(0, 210, 255, 0.3)', // Cyan très discret
    lineColor: 'rgba(189, 0, 255, 0.05)',   // Violet presque invisible (repos)
    activeColor: 'rgba(0, 255, 157, 0.8)',  // Vert "Green IT" pour l'activation
    particleCount: 80, // Nombre de neurones (ajuster selon puissance PC)
    connectionDistance: 150,
    pulseRadius: 200, // Rayon d'activation au clic
    pulseSpeed: 3
};

// Gestion de la taille
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
});

// Classe Neurone (Particule)
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.directionX = (Math.random() * 0.4) - 0.2; // Mouvement très lent
        this.directionY = (Math.random() * 0.4) - 0.2;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        // Mouvement fluide
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
        this.x += this.directionX;
        this.y += this.directionY;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = configNeural.particleColor;
        ctx.fill();
    }
}

// Classe Impulsion (Onde de choc au clic)
class Pulse {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.life = 1; // Opacité de vie
        this.maxRadius = configNeural.pulseRadius;
    }

    update() {
        this.radius += configNeural.pulseSpeed;
        this.life -= 0.02; // Disparaît doucement
    }

    draw() {
        // Optionnel : dessiner l'onde elle-même (cercle fin)
        if (this.life > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.strokeStyle = `rgba(0, 255, 157, ${this.life * 0.2})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

function initParticles() {
    particlesArray = [];
    // Densité responsive
    let numberOfParticles = (canvas.height * canvas.width) / 15000;
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

// Moteur de rendu principal
function animateNeuralNetwork() {
    requestAnimationFrame(animateNeuralNetwork);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gérer les impulsions (clics)
    for (let i = 0; i < pulsesArray.length; i++) {
        pulsesArray[i].update();
        pulsesArray[i].draw();
        if (pulsesArray[i].life <= 0) {
            pulsesArray.splice(i, 1);
            i--;
        }
    }

    // 2. Gérer les particules et connexions
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();

        // Connecter les particules proches
        for (let j = i; j < particlesArray.length; j++) {
            const dx = particlesArray[i].x - particlesArray[j].x;
            const dy = particlesArray[i].y - particlesArray[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < configNeural.connectionDistance) {
                // Par défaut : lien sombre
                let opacity = 1 - (distance / configNeural.connectionDistance);
                let color = configNeural.lineColor;
                let lineWidth = 1;

                // EFFET TRANSCENDANT : Vérifier si une impulsion est proche
                for (let p = 0; p < pulsesArray.length; p++) {
                    const pulse = pulsesArray[p];
                    // Distance entre la connexion et l'impulsion
                    const distToPulse = Math.sqrt(Math.pow(pulse.x - particlesArray[i].x, 2) + Math.pow(pulse.y - particlesArray[i].y, 2));
                    
                    // Si la particule est touchée par l'onde
                    if (Math.abs(distToPulse - pulse.radius) < 30) {
                        color = `rgba(0, 255, 157, ${pulse.life})`; // Vert électrique
                        lineWidth = 2; // Épaissir le lien
                        ctx.beginPath(); // Petit flash sur la particule aussi
                        ctx.arc(particlesArray[i].x, particlesArray[i].y, particlesArray[i].size * 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(0, 255, 157, ${pulse.life})`;
                        ctx.fill();
                    }
                }

                ctx.beginPath();
                ctx.strokeStyle = (color === configNeural.lineColor) ? `rgba(189, 0, 255, ${opacity * 0.1})` : color;
                ctx.lineWidth = lineWidth;
                ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                ctx.stroke();
            }
        }
    }
}

// Écouteur de clic global pour déclencher l'effet
window.addEventListener('click', (e) => {
    // On ajoute une impulsion aux coordonnées de la souris
    pulsesArray.push(new Pulse(e.x, e.y));
});

// Lancement
initParticles();
animateNeuralNetwork();