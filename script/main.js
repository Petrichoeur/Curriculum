/* ==========================================
   MAIN.JS - ORCHESTRATOR & VISUAL CORE (SHADOWRUN EDITION)
   ========================================== */

let globalConfig = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialiser le fond interactif
    initInteractiveNetwork();

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
        
        // Force le rendu Sidebar immédiat
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

/* ==========================================
   EFFECT: GLITCH ON CLICK
   ========================================== */
function initGlitchEffect() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // Ajoute la classe glitch
            link.classList.add('glitch-effect');
            
            // La retire après 300ms (court instant TV static)
            setTimeout(() => {
                link.classList.remove('glitch-effect');
            }, 300);
        });
    });
}

/* ==========================================
   VISUAL FX: INTERACTIVE PULSE NETWORK
   ========================================= */
function initInteractiveNetwork() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    let pulses = []; // Stocke les ondes de choc

    // Config couleurs violettes / épurées
    const config = {
        bgParticles: 'rgba(100, 0, 255, 0.3)', // Particules calmes
        highlightColor: 'rgba(0, 243, 255, 1)', // Cyan quand activé
        lineBase: 'rgba(189, 0, 255, 0.05)',    // Liens très sombres par défaut
        lineActive: 'rgba(189, 0, 255, 0.8)',   // Liens brillants quand touchés
        pulseSpeed: 4,
        pulseFade: 0.02
    };

    // Gestion du clic pour lancer une onde
    window.addEventListener('click', (e) => {
        pulses.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            alpha: 1
        });
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5; // Mouvement lent
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
            this.highlight = 0; // 0 = normal, 1 = illuminé
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            
            // Diminue l'illumination progressivement
            if (this.highlight > 0) this.highlight -= 0.02;
            if (this.highlight < 0) this.highlight = 0;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            // Si illuminé, devient Cyan, sinon Violet sombre
            if(this.highlight > 0.1) {
                ctx.fillStyle = config.highlightColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = config.highlightColor;
            } else {
                ctx.fillStyle = config.bgParticles;
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
        }
    }

    function init() {
        particles = [];
        const nbParticles = (canvas.width * canvas.height) / 12000;
        for (let i = 0; i < nbParticles; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. GESTION DES ONDES (PULSES)
        for (let i = pulses.length - 1; i >= 0; i--) {
            let p = pulses[i];
            p.radius += config.pulseSpeed; // L'onde s'agrandit
            p.alpha -= config.pulseFade;   // L'onde disparait

            // Cercle visuel de l'onde (optionnel, très subtil)
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(189, 0, 255, ${p.alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (p.alpha <= 0) pulses.splice(i, 1);
        }

        // 2. PARTICULES & CONNECTIONS
        particles.forEach(pt => {
            // Vérifie si une onde touche cette particule
            pulses.forEach(pulse => {
                const dx = pt.x - pulse.x;
                const dy = pt.y - pulse.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Si la particule est sur le bord de l'onde (zone active)
                if (Math.abs(dist - pulse.radius) < 30) {
                    pt.highlight = 1; // ACTIVATION !
                }
            });

            pt.update();
            pt.draw();
        });

        // 3. DESSIN DES LIGNES
        // On ne dessine les lignes brillantes que si les deux points sont actifs
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i];
                const b = particles[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);

                    // Si les deux points sont illuminés par l'onde -> Ligne brillante
                    if (a.highlight > 0.1 && b.highlight > 0.1) {
                        ctx.strokeStyle = `rgba(0, 243, 255, ${Math.min(a.highlight, b.highlight)})`;
                        ctx.lineWidth = 1.5;
                    } else {
                        // Sinon ligne très discrète (presque invisible)
                        ctx.strokeStyle = config.lineBase;
                        ctx.lineWidth = 0.5;
                    }
                    ctx.stroke();
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