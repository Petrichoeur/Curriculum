// --- CONFIGURATION ---
const API_KEY = "TA_CLE_API_ICI"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

let conversationHistory = [];
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- 1. PARTIE VISUELLE : CANVAS NEURAL NETWORK ---
const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');
let particlesArray;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.1; // Taille petite
        this.speedX = (Math.random() * 1.5) - 0.75;
        this.speedY = (Math.random() * 1.5) - 0.75;
        // Couleur un peu mystique (cyan/violet pâle)
        this.color = Math.random() > 0.5 ? 'rgba(0, 243, 255, 0.7)' : 'rgba(188, 19, 254, 0.7)';
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initCanvas() {
    particlesArray = [];
    const numberOfParticles = (canvas.height * canvas.width) / 15000; // Densité
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function animateCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
        connectParticles(i);
    }
    requestAnimationFrame(animateCanvas);
}

function connectParticles(a) {
    for (let b = a; b < particlesArray.length; b++) {
        let dx = particlesArray[a].x - particlesArray[b].x;
        let dy = particlesArray[a].y - particlesArray[b].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            ctx.strokeStyle = 'rgba(100, 100, 255, ' + (1 - distance/100) * 0.15 + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
        }
    }
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initCanvas();
});
initCanvas();
animateCanvas();


// --- 2. PARTIE LOGIQUE : CHARGEMENT DONNÉES & CHATBOT ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('config/data.json');
        const data = await response.json();
        
        // Remplissage UI
        document.getElementById('profile-name').textContent = data.profile.name;
        document.getElementById('profile-role').textContent = data.profile.role;
        document.getElementById('profile-bio').innerHTML = "> " + data.profile.short_bio; // Ajout du > style terminal
        document.getElementById('profile-img').src = data.profile.photo_url;
        document.getElementById('link-linkedin').href = data.profile.linkedin_url;
        document.getElementById('link-cv').href = data.profile.cv_file;

        initBot(data);
    } catch (error) {
        console.error("Erreur chargement:", error);
        appendMessage("SYSTEM ERROR: Failed to load profile data module.", "bot");
    }
});

function initBot(data) {
    const ctx = data.ai_context;
    
    // Prompt avec une légère teinte "personnalité tech"
    const systemPrompt = `
    Tu es l'IA Assistant de ${data.profile.name}.
    Ton ton est : ${ctx.tone}.
    Tu dois agir de manière très professionnelle mais avec une précision "chirurgicale" propre à un ingénieur expérimenté.
    Données :
    - Skills: ${ctx.skills.join(", ")}
    - Expériences: ${ctx.experience.join(". ")}
    - Projets: ${ctx.projects.join(". ")}
    - Motivation: ${ctx.motivation}
    `;

    conversationHistory.push({ role: "user", parts: [{ text: systemPrompt }] });
    conversationHistory.push({ role: "model", parts: [{ text: "System Online." }] });

    appendMessage(`> INITIALISATION COMPLETE.\n> Bonjour. Je suis l'interface virtuelle de Florian. Comment puis-je vous assister ?`, "bot");
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    const loadingId = appendMessage("Analying query...", 'bot', true); 

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
            appendMessage("ERROR: Neural Link unstable.", 'bot');
        }

    } catch (error) {
        removeMessage(loadingId);
        appendMessage("CRITICAL ERROR: Connection lost.", 'bot');
    }
}

function appendMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if(isLoading) msgDiv.id = "loading-msg";
    
    // Effet "Typewriter" très rapide pour le bot (optionnel, ici texte direct pour performance)
    msgDiv.innerText = text;
    
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
