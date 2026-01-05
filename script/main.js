/* ==========================================
   MAIN.JS - ORCHESTRATOR & VISUAL CORE
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialiser le fond "Neuronal Lightning" tout de suite
    initLightningNetwork();

    // 2. Charger la config et l'interface
    await loadGlobalConfig();

    // 3. Lancer le Router
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        globalConfig = await response.json();
        console.log("✅ Config chargée");

        // --- CORRECTION DU BUG SIDEBAR ---
        // On force le rendu du profil IMMÉDIATEMENT, sans attendre le clic sur l'onglet
        if (window.DigitalTwin) {
            window.DigitalTwin.config = globalConfig; // On injecte la data
            window.DigitalTwin.renderProfile();       // On force l'affichage
        }

    } catch (e) {
        console.error("Erreur config:", e);
    }
}

function handleRouting() {
    let hash = window.location.hash.substring(1) || 'home';
    const targetSection = document.getElementById(hash);
    if (!targetSection) hash = 'home';

    // UI Update
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    document.getElementById(hash).classList.add('active');
    
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        
        // Init module dynamique
        const moduleName = activeLink.getAttribute('data-module');
        if (moduleName && window[moduleName] && typeof window[moduleName].init === 'function') {
            if (!window[moduleName].isInitialized) {
                window[moduleName].init(globalConfig);
                window[moduleName].isInitialized = true;
            }
        }
    }
}

/* ==========================================
   VISUAL FX: LIGHTNING NEURAL NETWORK
   ========================================== */
function initLightningNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    
    // Configuration Cyberpunk
    const config = {
        particleColor: 'rgba(0, 255, 157, 0.5)', // Neon Green
        lineColor: 'rgba(0, 243, 255, 0.15)',    // Cyan dim
        lightningColor: 'rgba(255, 0, 255, 0.8)', // Magenta Flash
        particleCount: 60,
        connectionDistance: 150
    };

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 1.5; // Plus rapide
            this.vy = (Math.random() - 0.5) * 1.5;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            // Rebond sur les bords
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = config.particleColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        particles = [];
        for (let i = 0; i < config.particleCount; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Mise à jour des particules
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // 2. Création des connexions (Neurones)
        particles.forEach((a, index) => {
            for (let j = index + 1; j < particles.length; j++) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connectionDistance) {
                    ctx.beginPath();
                    ctx.strokeStyle = config.lineColor;
                    ctx.lineWidth = 1;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        });

        // 3. L'EFFET "ÉCLAIR" (Le Waouw Effect)
        // De temps en temps, on trace un éclair violent entre plusieurs points aléatoires
        if (Math.random() > 0.96) { // 4% de chance par frame
            const p1 = particles[Math.floor(Math.random() * particles.length)];
            const p2 = particles[Math.floor(Math.random() * particles.length)];
            const p3 = particles[Math.floor(Math.random() * particles.length)];

            ctx.beginPath();
            ctx.strokeStyle = '#fff'; // Coeur blanc
            ctx.shadowBlur = 20;
            ctx.shadowColor = config.lightningColor; // Glow Magenta/Cyan
            ctx.lineWidth = 2;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.stroke();
            
            // Reset shadow pour ne pas affecter le reste
            ctx.shadowBlur = 0;
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
    });

    init();
    animate();
}