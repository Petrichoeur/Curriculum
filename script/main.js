/* ==========================================
   MAIN ORCHESTRATOR & VISUAL CORE
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialiser le visuel (Canvas Aurora)
    initNeuralNetwork();
    
    // 2. Charger la configuration
    await loadGlobalConfig();
    
    // 3. Gérer le routing
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        globalConfig = await response.json();
        
        if (window.DigitalTwin) {
            window.DigitalTwin.init(globalConfig);
        }
    } catch (e) {
        console.error("Erreur chargement config:", e);
    }
}

function handleRouting() {
    let hash = window.location.hash.substring(1) || 'home';
    const targetSection = document.getElementById(hash);
    if (!targetSection) hash = 'home';

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(hash).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    
    if (activeLink) {
        activeLink.classList.add('active');
        const moduleName = activeLink.getAttribute('data-module');
        if (moduleName && window[moduleName] && typeof window[moduleName].init === 'function') {
            if (!window[moduleName].isInitialized && moduleName !== 'DigitalTwin') {
                window[moduleName].init(globalConfig);
            }
        }
    }
}

/* ==========================================
   VISUAL FX: AURORA NEURAL NETWORK (INTERACTIVE)
   ========================================= */
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let particles = [];
    let globalHue = 0; // Pour la rotation des couleurs
    let mouse = { x: null, y: null };

    // Configuration
    const config = {
        count: window.innerWidth < 1200 ? 80 : 130, // Adaptatif mobile/desktop
        connectionDist: 140,
        mouseRadius: 300,    // Rayon d'interaction souris
        baseAlpha: 0.15,     // Opacité au repos
        activeAlpha: 0.8,    // Opacité quand activé
        speed: 0.4,
        hueSpeed: 0.3        // Vitesse changement couleur
    };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        config.count = width < 1200 ? 80 : 130;
        initParticles();
    }

    // Tracking Souris
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x; mouse.y = e.y;
    });
    window.addEventListener('mouseout', () => {
        mouse.x = null; mouse.y = null;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * config.speed;
            this.vy = (Math.random() - 0.5) * config.speed;
            this.size = Math.random() * 2 + 1;
            this.baseHue = Math.random() * 360; // Chaque particule a sa teinte de base
            this.energy = 0; // Energie liée à la souris
        }

        update() {
            this.x += this.vx; 
            this.y += this.vy;

            // Rebond bords
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            // Interaction Souris
            if (mouse.x != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < config.mouseRadius) {
                    // L'énergie augmente si proche de la souris
                    this.energy = Math.min(this.energy + 0.05, 1);
                } else {
                    this.energy = Math.max(this.energy - 0.02, 0);
                }
            } else {
                this.energy = Math.max(this.energy - 0.02, 0);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            // Calcul Couleur Dynamique
            // Hue = teinte base + rotation globale
            const currentHue = (this.baseHue + globalHue) % 360;
            // Luminosité : plus y'a d'énergie, plus c'est blanc/lumineux
            const lightness = 30 + (this.energy * 50); 
            // Opacité
            const alpha = config.baseAlpha + (this.energy * (config.activeAlpha - config.baseAlpha));

            ctx.fillStyle = `hsla(${currentHue}, 80%, ${lightness}%, ${alpha})`;
            
            // Effet Glow si proche souris
            if (this.energy > 0.1) {
                ctx.shadowBlur = 15 * this.energy;
                ctx.shadowColor = `hsla(${currentHue}, 80%, 60%, 0.8)`;
            } else {
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset pour les lignes
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < config.count; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        globalHue += config.hueSpeed; // Rotation couleur globale

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();
            p.draw();

            // Dessin des connexions
            // On ne vérifie que les particules suivantes pour éviter doublons (opti perf)
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distSq = dx * dx + dy * dy; // Distance au carré (plus rapide)

                if (distSq < config.connectionDist * config.connectionDist) {
                    // L'opacité du lien dépend de l'énergie moyenne des 2 particules
                    const combinedEnergy = (p.energy + p2.energy) / 2;
                    
                    // Si on est loin de la souris, on dessine très peu ou pas les traits
                    if (combinedEnergy > 0.01 || distSq < 50*50) {
                        ctx.beginPath();
                        
                        // Couleur moyenne
                        const avgHue = ((p.baseHue + p2.baseHue) / 2 + globalHue) % 360;
                        const opacity = (1 - distSq / (config.connectionDist**2)) * (config.baseAlpha + combinedEnergy);

                        ctx.strokeStyle = `hsla(${avgHue}, 70%, 50%, ${opacity})`;
                        ctx.lineWidth = 0.5 + combinedEnergy; // Trait plus épais si énergie
                        
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
        }
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();
}