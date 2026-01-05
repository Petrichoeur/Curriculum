/* ==========================================
   MAIN.JS - ORCHESTRATOR & NEURAL CORE
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialiser le Cerveau Numérique (Nouvelle version)
    initNeuralNetwork();

    // 2. Initialiser les effets de Glitch sur la navbar
    initGlitchEffect();

    // 3. Charger config & Routing
    await loadGlobalConfig();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
});

async function loadGlobalConfig() {
    try {
        const response = await fetch('config/data.json');
        globalConfig = await response.json();
        
        if (window.DigitalTwin) {
            window.DigitalTwin.config = globalConfig;
            window.DigitalTwin.renderProfile();
        }
    } catch (e) {
        console.error("Erreur config:", e);
    }
}

function handleRouting() {
    let hash = window.location.hash.substring(1) || 'home';
    const targetSection = document.getElementById(hash);
    if (!targetSection) hash = 'home';

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    document.getElementById(hash).classList.add('active');
    
    const activeLink = document.querySelector(`.nav-link[href="#${hash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        const moduleName = activeLink.getAttribute('data-module');
        if (moduleName && window[moduleName] && typeof window[moduleName].init === 'function') {
            if (!window[moduleName].isInitialized) {
                window[moduleName].init(globalConfig);
                window[moduleName].isInitialized = true;
            }
        }
    }
}

function initGlitchEffect() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            link.classList.add('glitch-effect');
            setTimeout(() => { link.classList.remove('glitch-effect'); }, 300);
        });
    });
}

/* ==========================================
   VISUAL FX: ORGANIC NEURAL NETWORK (WAVE EDITION)
   ========================================= */
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    
    // Configuration "Spectaculaire"
    const config = {
        particleCount: 160,       // Plus dense
        connectionDist: 140,      // Distance de connexion
        mouseRadius: 250,         // Rayon de l'onde autour de la souris
        baseAlpha: 0.15,          // Opacité de repos (faible)
        activeAlpha: 1,           // Opacité quand activé
        decay: 0.03,              // Vitesse de disparition de l'onde (Plus petit = trainée plus longue)
        speed: 0.4                // Vitesse très lente pour l'effet "Ordonné/Structure"
    };

    // Suivi de la souris
    let mouse = { x: null, y: null };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    // Reset souris quand on sort de la fenêtre
    window.addEventListener('mouseout', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            // Vitesse lente et direction constante pour l'aspect "Ordonné"
            this.vx = (Math.random() - 0.5) * config.speed; 
            this.vy = (Math.random() - 0.5) * config.speed; 
            this.size = Math.random() * 2 + 1;
            
            // "Energy" gère l'effet d'onde. 0 = repos, 1 = illuminé à fond
            this.energy = 0; 
        }

        update() {
            // Mouvement
            this.x += this.vx;
            this.y += this.vy;

            // Rebond sur les bords (Keep order)
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

            // LOGIQUE DE L'ONDE (Interaction Souris)
            // Calcul distance souris
            if (mouse.x != undefined) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);

                if (distance < config.mouseRadius) {
                    // Si on est dans le rayon, on charge l'énergie au max
                    this.energy = 1;
                }
            }

            // Décroissance de l'énergie (Fade out effect)
            if (this.energy > 0) {
                this.energy -= config.decay;
            } else {
                this.energy = 0;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            // La couleur dépend de l'énergie.
            // Repos = Violet Sombre / Activé = Cyan Brillant
            if (this.energy > 0.1) {
                ctx.fillStyle = `rgba(0, 243, 255, ${this.energy})`; // Cyan
                ctx.shadowBlur = 15 * this.energy;
                ctx.shadowColor = `rgba(0, 243, 255, ${this.energy})`;
            } else {
                ctx.fillStyle = `rgba(189, 0, 255, ${config.baseAlpha})`; // Violet
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset pour perf
        }
    }

    function init() {
        particles = [];
        // Densité calculée selon la taille écran pour éviter la surcharge sur mobile
        const density = (canvas.width * canvas.height) / 9000; 
        for (let i = 0; i < density; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            // GESTION DES CONNEXIONS (Lignes)
            // On ne dessine les lignes que si l'une des particules a de l'énergie
            // Cela économise les ressources et crée l'effet "Zone Active"
            if (particles[i].energy <= 0) continue; 

            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connectionDist) {
                    ctx.beginPath();
                    
                    // L'opacité du lien dépend de l'énergie combinée des deux neurones
                    // Cela crée le gradient lumineux demandé
                    const opacity = Math.min(particles[i].energy, particles[j].energy || 0.1); // On prend le min ou une base
                    
                    if (opacity > 0.05) {
                        ctx.strokeStyle = `rgba(189, 0, 255, ${opacity})`; // Violet de base
                        
                        // Si très actif -> Devient Cyan et plus épais
                        if (opacity > 0.6) {
                            ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
                            ctx.lineWidth = 1.5;
                        } else {
                            ctx.lineWidth = 0.5;
                        }

                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        requestAnimationFrame(animate);
    }

    // Gestion redimensionnement
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        init();
    });

    init();
    animate();
}