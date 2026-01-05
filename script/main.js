/* ==========================================
   MAIN.JS - ORCHESTRATOR & NEURAL CORE
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    initNeuralNetwork(); // Le nouveau réseau coloré
    initGlitchEffect();
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
   VISUAL FX: MULTICOLOR AURORA NETWORK (SOFT & WAOUW)
   ========================================= */
function initNeuralNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    // Variable pour faire tourner les couleurs globalement
    let globalHue = 0; 
    
    const config = {
        particleCount: 150,
        connectionDist: 140,
        mouseRadius: 280,    // Rayon d'activation un peu plus large
        baseAlpha: 0.12,     // Repos très discret
        activeAlpha: 0.7,    // Max opacité réduite (c'était 1.0 avant) pour la douceur
        decay: 0.025,        // Traînée plus longue
        speed: 0.35,         // Mouvement lent
        hueSpeed: 0.2,       // Vitesse de changement de couleur global
        glowStrength: 8      // Force du halo réduite (c'était 15)
    };

    let mouse = { x: null, y: null };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x; mouse.y = e.y;
    });
    window.addEventListener('mouseout', () => {
        mouse.x = undefined; mouse.y = undefined;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * config.speed; 
            this.vy = (Math.random() - 0.5) * config.speed; 
            this.size = Math.random() * 2 + 1.2;
            this.energy = 0; 
            // Chaque particule a sa propre teinte de départ
            this.baseHue = Math.random() * 360; 
        }

        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

            if (mouse.x != undefined) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                if (distance < config.mouseRadius) {
                    this.energy = 1;
                }
            }
            this.energy = this.energy > 0 ? this.energy - config.decay : 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            // Calcul de la couleur HSL
            // La teinte est un mélange de sa base + la rotation globale
            const currentHue = (this.baseHue + globalHue) % 360;
            // La luminosité augmente avec l'énergie (de sombre à pastel lumineux)
            const lightness = 30 + (this.energy * 40); 
            // L'opacité dépend de l'énergie
            const alpha = config.baseAlpha + (this.energy * (config.activeAlpha - config.baseAlpha));

            if (this.energy > 0.05) {
                // ACTIVE : Couleur HSL dynamique + Halo doux
                ctx.fillStyle = `hsla(${currentHue}, 80%, ${lightness}%, ${alpha})`;
                ctx.shadowBlur = config.glowStrength * this.energy;
                // Le halo est de la même couleur mais plus transparent
                ctx.shadowColor = `hsla(${currentHue}, 80%, 60%, ${alpha * 0.5})`;
            } else {
                // REPOS : Reste sur le thème violet sombre de base pour le fond
                ctx.fillStyle = `rgba(189, 0, 255, ${config.baseAlpha})`;
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function init() {
        particles = [];
        const density = (canvas.width * canvas.height) / 10000; 
        for (let i = 0; i < density; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // On fait tourner la roue des couleurs doucement à chaque frame
        globalHue += config.hueSpeed;

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            if (particles[i].energy <= 0.05) continue; 

            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connectionDist) {
                    // Énergie combinée des deux points
                    const combinedEnergy = (particles[i].energy + particles[j].energy) / 2;
                    
                    if (combinedEnergy > 0.05) {
                        ctx.beginPath();
                        
                        // Moyenne des teintes des deux particules pour la ligne
                        const avgHue = ((particles[i].baseHue + particles[j].baseHue) / 2 + globalHue) % 360;
                        const lightness = 30 + (combinedEnergy * 40);
                        const opacity = combinedEnergy * config.activeAlpha;

                        // Ligne HSL multicolore
                        ctx.strokeStyle = `hsla(${avgHue}, 70%, ${lightness}%, ${opacity})`;
                        // Épaisseur variable selon l'énergie, mais reste fine
                        ctx.lineWidth = 0.5 + combinedEnergy;

                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
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