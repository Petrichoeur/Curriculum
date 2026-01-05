/* ==========================================
   MAIN.JS - ROUTER & ORCHESTRATOR
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Charger la config globale
    await loadGlobalConfig();

    // 2. Initialiser le fond animé
    if (typeof initNeuralNetwork === 'function') initNeuralNetwork();

    // 3. Lancer le Router (Gestion des URL)
    handleRouting();

    // 4. Écouter les changements d'URL (clic sur précèdent/suivant ou onglets)
    window.addEventListener('hashchange', handleRouting);
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        globalConfig = await response.json();
        console.log("✅ Config chargée");
    } catch (e) {
        console.error("Erreur config:", e);
    }
}

/* --- LE SYSTÈME DE ROUTING --- */
function handleRouting() {
    // Récupère le hash (ex: "#digital-twin") ou met "home" par défaut
    let hash = window.location.hash.substring(1) || 'home';

    // Sécurité : Vérifie que la section existe, sinon renvoie vers home
    const targetSection = document.getElementById(hash);
    if (!targetSection) {
        hash = 'home';
    }

    console.log(`🧭 Navigation vers : ${hash}`);

    // A. GESTION UI (Afficher/Cacher)
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    document.getElementById(hash).classList.add('active');
    
    // Active le lien dans le menu qui correspond au hash
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        
        // B. CHARGEMENT DYNAMIQUE DU MODULE JS
        // On regarde l'attribut "data-module" du lien (ex: data-module="DigitalTwin")
        const moduleName = activeLink.getAttribute('data-module');
        
        // Si un objet global existe avec ce nom (ex: window.DigitalTwin), on l'initie
        if (moduleName && window[moduleName] && typeof window[moduleName].init === 'function') {
            // On vérifie si on doit l'initier (pour ne pas le faire 2 fois)
            if (!window[moduleName].isInitialized) {
                window[moduleName].init(globalConfig);
                window[moduleName].isInitialized = true; // Marqueur pour éviter doublon
            }
        }
    }
}

/* --- Effet Neural (Raccourci pour l'exemple) --- */
function initNeuralNetwork() { /* ... ton code canvas ... */ }
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
