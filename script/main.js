/* ==========================================
   MAIN ORCHESTRATOR - OPTIMIZED
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialiser le visuel (Canvas)
    initNeuralNetwork();
    
    // 2. Charger la configuration globale UNE SEULE FOIS
    await loadGlobalConfig();
    
    // 3. Gérer le routing initial
    handleRouting();
    
    // 4. Ecouter les changements de hash (navigation)
    window.addEventListener('hashchange', handleRouting);
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        globalConfig = await response.json();
        console.log("✅ Config chargée");

        // Initialiser le module DigitalTwin s'il est présent
        if (window.DigitalTwin) {
            window.DigitalTwin.init(globalConfig);
        }
    } catch (e) {
        console.error("Erreur chargement config:", e);
    }
}

function handleRouting() {
    let hash = window.location.hash.substring(1) || 'home';
    
    // Sécurité : Vérifier si l'ID existe
    const targetSection = document.getElementById(hash);
    if (!targetSection) {
        hash = 'home';
    }

    // Gestion des onglets
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(hash).classList.add('active');

    // Gestion du menu
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        
        // Lazy Loading des modules
        const moduleName = activeLink.getAttribute('data-module');
        if (moduleName && window[moduleName] && typeof window[moduleName].init === 'function') {
            if (!window[moduleName].isInitialized && moduleName !== 'DigitalTwin') {
                // DigitalTwin est init au démarrage pour la sidebar, les autres au clic
                window[moduleName].init(globalConfig);
            }
        }
    }
}

/* ==========================================
   OPTIMIZED NEURAL NETWORK ANIMATION
   ========================================= */
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height, particles;
    
    // Configuration optimisée
    const config = {
        color: '189, 0, 255', // Purple
        count: window.innerWidth < 800 ? 60 : 120, // Moins de particules sur mobile
        dist: 130,
        speed: 0.3
    };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        config.count = width < 800 ? 60 : 120; // Ajustement dynamique
        createParticles();
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * config.speed;
            this.vy = (Math.random() - 0.5) * config.speed;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx; 
            this.y += this.vy;
            // Rebond simple
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${config.color}, 0.5)`;
            ctx.fill();
        }
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < config.count; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Boucle optimisée : Dessin + Liens
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();
            p.draw();

            // Comparaison uniquement avec les particules suivantes (évite les doublons)
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                // Astuce perf : dist^2 évite la racine carrée (Math.sqrt) couteuse
                const distSq = dx * dx + dy * dy;
                
                if (distSq < config.dist * config.dist) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${config.color}, ${1 - distSq / (config.dist * config.dist)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
}