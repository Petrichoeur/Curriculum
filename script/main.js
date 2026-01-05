/* ==========================================
   MAIN.JS - ORCHESTRATOR
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", () => {
    loadGlobalConfig();
    initTabs();
    initNeuralNetwork(); // Le fond animé reste global
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        if (!response.ok) throw new Error("Config introuvable");
        globalConfig = await response.json();

        console.log("✅ Config chargée.");

        // --- INITIALISATION DES MODULES ---
        // On passe la config à chaque module une fois chargée
        
        if (typeof DigitalTwin !== 'undefined') DigitalTwin.init(globalConfig);
        if (typeof Challenges !== 'undefined') Challenges.init(globalConfig);
        if (typeof Projects !== 'undefined') Projects.init(globalConfig);
        // ... Idem pour les autres si besoin

    } catch (error) {
        console.error("Erreur Main:", error);
    }
}

/* --- GESTION DES ONGLETS --- */
function initTabs() {
    const buttons = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            buttons.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
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
