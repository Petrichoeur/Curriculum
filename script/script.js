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