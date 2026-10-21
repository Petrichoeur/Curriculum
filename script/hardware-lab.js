/* ==========================================
   MODULE: HARDWARE LAB // CPU vs GPU ARCHITECTURE
   Simulation interactive : Latence vs Débit,
   Propagation des données & Parallélisme SIMT
   ========================================== */

class HardwareLabApp {
    constructor() {
        this.isInitialized = false;

        // Configuration de la simulation
        this.workload = 'gemm';     // 'gemm' | 'pixel' | 'branch'
        this.batchSize = 256;       // 64, 256, 512, 1024
        this.clockMultiplier = 1.0; // 0.5x, 1x, 2x, 3x

        // État d'exécution
        this.isRunning = false;
        this.isPaused = false;
        this.animRaf = null;

        // État CPU (4 Cœurs haute fréquence, orienté latence)
        this.cpu = {
            cores: 4,
            clockHz: 4.5,
            completed: 0,
            inFlight: [],
            coreStates: [0, 0, 0, 0], // progression 0..1 par cœur
            branchHitRate: 96,
            timeMs: 0
        };

        // État GPU (16 SMs x 16 micro-cœurs = 256 cœurs SIMT, orienté débit)
        this.gpu = {
            numSMs: 16,
            coresPerSM: 16,
            totalCores: 256,
            clockHz: 1.8,
            completed: 0,
            activeWarps: [],
            smStates: new Array(16).fill(0), // 0: idle, 1: busy, 2: stalled (divergence)
            divergenceRate: 0,
            timeMs: 0
        };

        // Particules animées pour la visualisation de propagation
        this.particles = [];

        // Canvas & Contexte
        this.canvas = null;
        this.ctx = null;
        this.tooltip = null;

        // Données d'information survolée
        this.hoveredEntity = null;
    }

    init() {
        if (this.isInitialized) return;

        this.canvas = document.getElementById('hardware-canvas');
        this.tooltip = document.getElementById('hw-tooltip');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        this.setupUI();
        this.setupEventListeners();
        this.resetSimulation();
        this.startRenderLoop();

        this.isInitialized = true;
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = (rect.width || 800) * dpr;
        this.canvas.height = (rect.height || 480) * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.logicalWidth = rect.width || 800;
        this.logicalHeight = rect.height || 480;
    }

    setupUI() {
        // Sélecteurs de workload
        const workloadBtns = document.querySelectorAll('.hw-workload-btn');
        workloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                workloadBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.workload = btn.dataset.workload;
                this.resetSimulation();
            });
        });

        // Sliders
        const batchSlider = document.getElementById('hw-batch-size');
        const batchVal = document.getElementById('hw-batch-val');
        if (batchSlider && batchVal) {
            batchSlider.addEventListener('input', (e) => {
                this.batchSize = parseInt(e.target.value, 10);
                batchVal.textContent = this.batchSize;
                this.resetSimulation();
            });
        }

        const speedSlider = document.getElementById('hw-speed');
        const speedVal = document.getElementById('hw-speed-val');
        if (speedSlider && speedVal) {
            speedSlider.addEventListener('input', (e) => {
                this.clockMultiplier = parseFloat(e.target.value);
                speedVal.textContent = `${this.clockMultiplier.toFixed(1)}x`;
            });
        }

        // Boutons Start / Pause / Reset
        const startBtn = document.getElementById('hw-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!this.isRunning) {
                    this.startSimulation();
                    startBtn.textContent = 'PAUSE_';
                } else if (this.isPaused) {
                    this.isPaused = false;
                    startBtn.textContent = 'PAUSE_';
                } else {
                    this.isPaused = true;
                    startBtn.textContent = 'REPRENDRE_';
                }
            });
        }

        const resetBtn = document.getElementById('hw-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSimulation();
                if (startBtn) startBtn.textContent = 'LANCER LE CALCUL_';
            });
        }

        // Onglets Théoriques
        const tabBtns = document.querySelectorAll('.hw-tab-btn');
        const tabPanes = document.querySelectorAll('.hw-tab-pane');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = document.getElementById(`tab-${target}`);
                if (pane) pane.classList.add('active');
            });
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });

        // Tooltip interactif au survol du canvas
        if (this.canvas) {
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
        }
    }

    resetSimulation() {
        this.isRunning = false;
        this.isPaused = false;

        this.cpu.completed = 0;
        this.cpu.inFlight = [];
        this.cpu.coreStates = [0, 0, 0, 0];
        this.cpu.timeMs = 0;

        this.gpu.completed = 0;
        this.gpu.activeWarps = [];
        this.gpu.smStates.fill(0);
        this.gpu.timeMs = 0;

        this.particles = [];
        this.updateTelemetry();
        this.draw();
    }

    startSimulation() {
        this.resetSimulation();
        this.isRunning = true;
        this.isPaused = false;

        // Générer les tâches pour le flux de simulation
        this.remainingCpuTasks = this.batchSize;
        this.remainingGpuTasks = this.batchSize;
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        const speed = this.clockMultiplier;

        // 1. MISE A JOUR CPU (Séquentiel / 4 Cœurs rapides)
        if (this.cpu.completed < this.batchSize) {
            this.cpu.timeMs += 16 * speed;

            // Paramètres selon le workload
            // En calcul matriciel / pixels : 1 cycle par tâche, 4 tâches en parallèle
            // En branchements : le CPU a un branch predictor ultra efficace (96%), il ne ralentit presque pas !
            const taskDuration = this.workload === 'branch' ? 14 : 10;

            for (let c = 0; c < this.cpu.cores; c++) {
                if (this.remainingCpuTasks > 0 || this.cpu.coreStates[c] > 0) {
                    if (this.cpu.coreStates[c] === 0 && this.remainingCpuTasks > 0) {
                        this.remainingCpuTasks--;
                        this.cpu.coreStates[c] = 0.01;

                        // Spawn particule de données RAM -> L3 -> Core
                        this.spawnCpuParticle(c);
                    } else if (this.cpu.coreStates[c] > 0) {
                        this.cpu.coreStates[c] += (1 / taskDuration) * speed;
                        if (this.cpu.coreStates[c] >= 1) {
                            this.cpu.coreStates[c] = 0;
                            this.cpu.completed++;
                        }
                    }
                }
            }
        }

        // 2. MISE A JOUR GPU (Massivement Parallèle / 256 Cœurs SIMT)
        if (this.gpu.completed < this.batchSize) {
            this.gpu.timeMs += 16 * speed;

            if (this.workload === 'gemm' || this.workload === 'pixel') {
                // GEMM & Pixel : Parallélisme parfait. Le GPU utilise tous ses 256 cœurs simultanément !
                // Chaque vague traite jusqu'à 256 éléments en même temps.
                const waveDuration = 45; // Latence d'un calcul individuel plus longue qu'en CPU, mais massivement collective
                const tasksInWave = Math.min(this.gpu.totalCores, this.batchSize - this.gpu.completed);

                // Activer tous les SMs
                for (let i = 0; i < this.gpu.numSMs; i++) {
                    this.gpu.smStates[i] = 1; // 1 = busy/active
                }

                // Faire progresser la vague
                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;
                if (Math.random() < 0.3 * speed) {
                    this.spawnGpuParticle();
                }

                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    this.gpu.completed += tasksInWave;
                    if (this.gpu.completed >= this.batchSize) {
                        this.gpu.completed = this.batchSize;
                        this.gpu.smStates.fill(0);
                    }
                }
            } else if (this.workload === 'branch') {
                // Logique conditionnelle / Branchements imprévisibles : WARP DIVERGENCE !
                // Les threads d'un même warp divergent : la moitié est obligée d'attendre l'autre branche.
                // Cela sérialise le traitement et réduit drastiquement l'efficacité GPU.
                const waveDuration = 180; // Beaucoup plus lent à cause des stalls de divergence !
                const activeBatch = Math.min(64, this.batchSize - this.gpu.completed);

                for (let i = 0; i < this.gpu.numSMs; i++) {
                    // Alternance entre actif et stalled pour illustrer la divergence
                    this.gpu.smStates[i] = (i % 2 === 0) ? 1 : 2; // 2 = stalled/attente
                }

                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;
                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    this.gpu.completed += activeBatch;
                    if (this.gpu.completed >= this.batchSize) {
                        this.gpu.completed = this.batchSize;
                        this.gpu.smStates.fill(0);
                    }
                }
            }
        }

        // Fin de simulation
        if (this.cpu.completed >= this.batchSize && this.gpu.completed >= this.batchSize) {
            this.isRunning = false;
            const startBtn = document.getElementById('hw-start-btn');
            if (startBtn) startBtn.textContent = 'TERMINÉ_';
        }

        // Mettre à jour les particules animées
        this.updateParticles();

        // Mettre à jour les compteurs et métriques
        this.updateTelemetry();
    }

    spawnCpuParticle(coreIndex) {
        if (this.particles.length > 80) return;
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const cpuWidth = w * 0.46;

        // Position de départ : RAM (en haut)
        const startX = cpuWidth * 0.5 + (Math.random() * 40 - 20);
        const startY = 40;

        // Cible : un des 4 cœurs
        const targetX = (cpuWidth / 5) * (coreIndex + 1);
        const targetY = h * 0.72;

        this.particles.push({
            type: 'cpu',
            x: startX,
            y: startY,
            targetX,
            targetY,
            progress: 0,
            speed: 0.04 * this.clockMultiplier,
            color: '#00f3ff'
        });
    }

    spawnGpuParticle() {
        if (this.particles.length > 120) return;
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const gpuLeft = w * 0.54;
        const gpuWidth = w * 0.46;

        // Position départ : VRAM HBM (en haut)
        const startX = gpuLeft + Math.random() * (gpuWidth - 40) + 20;
        const startY = 40;

        // Cible : un des SMs
        const smIdx = Math.floor(Math.random() * 16);
        const row = Math.floor(smIdx / 4);
        const col = smIdx % 4;

        const gridX = gpuLeft + 30 + col * ((gpuWidth - 60) / 4);
        const gridY = h * 0.48 + row * 45;

        this.particles.push({
            type: 'gpu',
            x: startX,
            y: startY,
            targetX: gridX + 15,
            targetY: gridY + 15,
            progress: 0,
            speed: 0.06 * this.clockMultiplier,
            color: this.workload === 'branch' ? '#ff9900' : '#bd00ff'
        });
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.progress += p.speed;
            p.x += (p.targetX - p.x) * 0.15;
            p.y += (p.targetY - p.y) * 0.15;

            if (p.progress >= 1) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateTelemetry() {
        const cpuProg = Math.min(100, (this.cpu.completed / this.batchSize) * 100);
        const gpuProg = Math.min(100, (this.gpu.completed / this.batchSize) * 100);

        const cpuFill = document.getElementById('hw-cpu-progress-fill');
        const gpuFill = document.getElementById('hw-gpu-progress-fill');
        const cpuVal = document.getElementById('hw-cpu-progress-val');
        const gpuVal = document.getElementById('hw-gpu-progress-val');

        if (cpuFill) cpuFill.style.width = `${cpuProg}%`;
        if (gpuFill) gpuFill.style.width = `${gpuProg}%`;
        if (cpuVal) cpuVal.textContent = `${Math.floor(cpuProg)}% (${this.cpu.completed}/${this.batchSize})`;
        if (gpuVal) gpuVal.textContent = `${Math.floor(gpuProg)}% (${this.gpu.completed}/${this.batchSize})`;

        const cpuTimeEl = document.getElementById('hw-cpu-time');
        const gpuTimeEl = document.getElementById('hw-gpu-time');
        const throughputEl = document.getElementById('hw-throughput');
        const verdictEl = document.getElementById('hw-verdict');

        if (cpuTimeEl) cpuTimeEl.textContent = `${(this.cpu.timeMs / 1000).toFixed(2)}s`;
        if (gpuTimeEl) gpuTimeEl.textContent = `${(this.gpu.timeMs / 1000).toFixed(2)}s`;

        if (throughputEl) {
            if (this.isRunning && this.gpu.timeMs > 0) {
                const totalOps = this.cpu.completed + this.gpu.completed;
                const totalSec = Math.max(0.1, Math.max(this.cpu.timeMs, this.gpu.timeMs) / 1000);
                const opsPerSec = Math.round(totalOps / totalSec);
                throughputEl.textContent = `${opsPerSec} Ops / sec`;
            } else if (!this.isRunning && this.cpu.completed === this.batchSize) {
                throughputEl.textContent = `Calcul achevé`;
            } else {
                throughputEl.textContent = `—`;
            }
        }

        if (verdictEl) {
            if (this.cpu.completed === this.batchSize && this.gpu.completed === this.batchSize) {
                if (this.workload === 'gemm') {
                    const ratio = (this.cpu.timeMs / Math.max(1, this.gpu.timeMs)).toFixed(1);
                    verdictEl.textContent = `GPU gagne : ${ratio}x plus rapide (Tenseurs parallèles)`;
                    verdictEl.style.color = 'var(--neon-purple)';
                } else if (this.workload === 'pixel') {
                    const ratio = (this.cpu.timeMs / Math.max(1, this.gpu.timeMs)).toFixed(1);
                    verdictEl.textContent = `GPU gagne : ${ratio}x plus rapide (Traitement 2D SIMT)`;
                    verdictEl.style.color = 'var(--neon-purple)';
                } else {
                    const ratio = (this.gpu.timeMs / Math.max(1, this.cpu.timeMs)).toFixed(1);
                    verdictEl.textContent = `CPU gagne : ${ratio}x plus rapide (Warp divergence évitée)`;
                    verdictEl.style.color = 'var(--neon-cyan)';
                }
            } else {
                verdictEl.textContent = this.workload === 'branch' 
                    ? 'Le CPU domine sur les tests conditionnels' 
                    : 'Le GPU sature les calculs matriciels';
                verdictEl.style.color = '#ddd';
            }
        }
    }

    startRenderLoop() {
        const loop = () => {
            const section = document.getElementById('hardware-lab');
            const isVisible = section && section.classList.contains('active');
            if (isVisible) {
                if (!this.logicalWidth || this.logicalWidth < 50) {
                    this.resizeCanvas();
                }
                this.update();
                this.draw();
            }
            this.animRaf = requestAnimationFrame(loop);
        };
        this.animRaf = requestAnimationFrame(loop);
    }

    /* ==========================================
       RENDU GRAPHIQUE CANVAS HAUTE FIDÉLITÉ
       ========================================== */
    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        ctx.clearRect(0, 0, w, h);

        // Fond sombre technique
        ctx.fillStyle = 'rgba(7, 3, 15, 0.95)';
        ctx.fillRect(0, 0, w, h);

        // Grille de fond cybernétique subtile
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Ligne de démarcation centrale "VS"
        const midX = w * 0.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(midX, 10);
        ctx.lineTo(midX, h - 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge VS central
        ctx.fillStyle = 'rgba(15, 10, 25, 0.9)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(midX, h * 0.5, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', midX, h * 0.5);

        // 1. DESSIN CÔTE GAUCHE : ARCHITECTURE CPU
        this.drawCpuArchitecture(ctx, w * 0.46, h);

        // 2. DESSIN CÔTE DROIT : ARCHITECTURE GPU
        this.drawGpuArchitecture(ctx, w * 0.54, w * 0.46, h);

        // 3. DESSIN DES PARTICULES EN TRANSIT
        this.drawParticles(ctx);
    }

    drawCpuArchitecture(ctx, width, height) {
        // En-tête CPU
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#00f3ff';
        ctx.fillText('CPU // FAIBLE LATENCE (4 CORES @ 4.5 GHz)', 20, 25);

        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('Optimisé pour la logique séquentielle & le branching', 20, 40);

        // 1. RAM DDR5 (Haut)
        const ramW = width - 40;
        ctx.fillStyle = 'rgba(20, 20, 35, 0.8)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 55, ramW, 35);
        ctx.fillRect(20, 55, ramW, 35);

        ctx.fillStyle = '#00f3ff';
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText('RAM SYSTÈME (DDR5 ~80 GB/s) · BUS 64-BIT', 30, 72);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`File d'attente : ${this.batchSize - this.cpu.completed} tâches`, 30, 84);

        // Bus de données RAM -> L3 Cache
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20 + ramW * 0.5, 90);
        ctx.lineTo(20 + ramW * 0.5, 115);
        ctx.stroke();

        // 2. Cache L3 Partagé (Massif)
        const l3Y = 115;
        const l3H = 50;
        ctx.fillStyle = 'rgba(0, 243, 255, 0.06)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, l3Y, ramW, l3H);
        ctx.fillRect(20, l3Y, ramW, l3H);

        ctx.fillStyle = '#00f3ff';
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillText('CACHE L3 PARTAGÉ (32 MB) · LATENCE ~10ns', 30, l3Y + 20);
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = '#88f';
        ctx.fillText('Prédiction de branchement active (Branch Predictor 96%)', 30, l3Y + 38);

        // 3. Caches L2/L1 & 4 Gros Cœurs CPU
        const coreW = (ramW - 30) / 4;
        const coreY = height * 0.55;
        const coreH = height * 0.36;

        for (let i = 0; i < 4; i++) {
            const coreX = 20 + i * (coreW + 10);
            const isBusy = this.cpu.coreStates[i] > 0;

            // Ligne de liaison L3 -> L1/L2 -> Cœur
            ctx.strokeStyle = isBusy ? 'rgba(0, 243, 255, 0.8)' : 'rgba(0, 243, 255, 0.2)';
            ctx.lineWidth = isBusy ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(coreX + coreW * 0.5, l3Y + l3H);
            ctx.lineTo(coreX + coreW * 0.5, coreY);
            ctx.stroke();

            // Bloc Cœur CPU
            ctx.fillStyle = isBusy ? 'rgba(0, 243, 255, 0.15)' : 'rgba(15, 15, 25, 0.9)';
            ctx.strokeStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.3)';
            ctx.lineWidth = isBusy ? 2 : 1;

            if (isBusy) {
                ctx.shadowColor = '#00f3ff';
                ctx.shadowBlur = 10;
            }

            ctx.strokeRect(coreX, coreY, coreW, coreH);
            ctx.fillRect(coreX, coreY, coreW, coreH);
            ctx.shadowBlur = 0;

            // Étiquette Cœur
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`CORE ${i}`, coreX + coreW * 0.5, coreY + 18);

            // Symbole ALU
            ctx.fillStyle = isBusy ? '#00f3ff' : '#666';
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillText('ALU', coreX + coreW * 0.5, coreY + 45);

            // Barre de progression interne au cœur
            const prog = this.cpu.coreStates[i];
            const pBarH = 6;
            const pBarY = coreY + coreH - 20;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(coreX + 8, pBarY, coreW - 16, pBarH);
            if (prog > 0) {
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(coreX + 8, pBarY, (coreW - 16) * prog, pBarH);
            }

            // Statut texte
            ctx.font = '9px "Courier New", monospace';
            ctx.fillStyle = isBusy ? '#00ff88' : '#777';
            ctx.fillText(isBusy ? 'EXEC' : 'IDLE', coreX + coreW * 0.5, coreY + coreH - 6);
        }
    }

    drawGpuArchitecture(ctx, left, width, height) {
        // En-tête GPU
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#bd00ff';
        ctx.fillText('GPU // HAUT DÉBIT (SIMT / 256 CORES @ 1.8 GHz)', left, 25);

        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('Optimisé pour le parallélisme massif & les tenseurs IA', left, 40);

        // 1. VRAM HBM3 / GDDR6X (Haut)
        const vramW = width - 40;
        ctx.fillStyle = 'rgba(25, 10, 35, 0.8)';
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left, 55, vramW, 35);
        ctx.fillRect(left, 55, vramW, 35);

        ctx.fillStyle = '#bd00ff';
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText('VRAM HBM3 (~3000 GB/s) · BUS LARGE 4096-BIT', left + 10, 72);
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Diffusion par lot (Warps de 32 threads)`, left + 10, 84);

        // Bus géant vers la matrice de cœurs
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(left + vramW * 0.5, 90);
        ctx.lineTo(left + vramW * 0.5, 115);
        ctx.stroke();

        // 2. Grille matricielle de 16 Streaming Multiprocessors (SMs)
        const gridY = 115;
        const gridW = vramW;
        const gridH = height - gridY - 20;

        ctx.fillStyle = 'rgba(189, 0, 255, 0.04)';
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left, gridY, gridW, gridH);
        ctx.fillRect(left, gridY, gridW, gridH);

        ctx.fillStyle = '#bd00ff';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.fillText('MATRICE DE CALCUL : 16 STREAMING MULTIPROCESSORS (SM)', left + 10, gridY + 16);

        // 16 Blocs SM (Grille 4 x 4)
        const smCols = 4;
        const smRows = 4;
        const padding = 8;
        const smW = (gridW - (smCols + 1) * padding) / smCols;
        const smH = (gridH - 30 - (smRows + 1) * padding) / smRows;

        for (let r = 0; r < smRows; r++) {
            for (let c = 0; c < smCols; c++) {
                const smIndex = r * smCols + c;
                const smX = left + padding + c * (smW + padding);
                const smY = gridY + 24 + padding + r * (smH + padding);

                const state = this.gpu.smStates[smIndex]; // 0: idle, 1: busy, 2: stalled

                let strokeColor = 'rgba(189, 0, 255, 0.25)';
                let fillColor = 'rgba(20, 10, 30, 0.7)';

                if (state === 1) {
                    strokeColor = '#00ff88';
                    fillColor = 'rgba(0, 255, 136, 0.15)';
                } else if (state === 2) {
                    strokeColor = '#ffaa00';
                    fillColor = 'rgba(255, 170, 0, 0.2)';
                }

                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = fillColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(smX, smY, smW, smH);
                ctx.fillRect(smX, smY, smW, smH);

                // Dessiner les 16 micro-cœurs (grille 4x4) à l'intérieur du SM
                const microW = (smW - 10) / 4;
                const microH = (smH - 12) / 4;
                for (let mr = 0; mr < 4; mr++) {
                    for (let mc = 0; mc < 4; mc++) {
                        const mX = smX + 2 + mc * (microW + 2);
                        const mY = smY + 4 + mr * (microH + 2);

                        ctx.fillStyle = (state === 1) ? '#00ff88' : (state === 2 ? '#ffaa00' : 'rgba(189, 0, 255, 0.3)');
                        ctx.fillRect(mX, mY, microW, microH);
                    }
                }

                // Petit label
                ctx.fillStyle = '#aaa';
                ctx.font = '8px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`SM${smIndex}`, smX + smW * 0.5, smY + smH - 2);
            }
        }
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.type === 'gpu' ? 2.5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    /* ==========================================
       GESTION DU TOOLTIP SURVOL
       ========================================== */
    handleMouseMove(e) {
        if (!this.canvas || !this.tooltip) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        let info = null;

        if (x < w * 0.46) {
            // Zone CPU
            if (y > 55 && y < 90) {
                info = '<strong>RAM DDR5 Système</strong><br>Bande passante modérée (~80 GB/s), bus étroit 64-bit. Conçue pour transférer des instructions et petits volumes séquentiels.';
            } else if (y > 115 && y < 165) {
                info = '<strong>Cache L3 Partagé & Branch Predictor</strong><br>32 Mo de mémoire SRAM ultra-rapide (~10ns) et unité de prédiction de branchement pour anticiper les blocs conditionnels (if/else).';
            } else if (y > h * 0.55) {
                info = '<strong>Cœur CPU (ALU Large)</strong><br>Fréquence d\'horloge très élevée (4.5 GHz). Capable d\'exécuter des instructions complexes et imprévisibles avec une latence unitaire minime.';
            }
        } else if (x > w * 0.54) {
            // Zone GPU
            if (y > 55 && y < 90) {
                info = '<strong>VRAM HBM3 / GDDR6X</strong><br>Bande passante gigantesque (jusqu\'à 3000 GB/s) sur un bus ultra-large (4096-bit). Cruciale pour acheminer les matrices de poids d\'un LLM.';
            } else if (y > 115) {
                info = '<strong>Streaming Multiprocessors (SM)</strong><br>Contient des dizaines de Tensor Cores et cœurs CUDA. Exécute la même instruction sur 32 threads simultanément (Warp). Sensible à la divergence conditionnelle.';
            }
        }

        if (info) {
            this.tooltip.innerHTML = info;
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = `${e.clientX + 15}px`;
            this.tooltip.style.top = `${e.clientY + 15}px`;
        } else {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.style.display = 'none';
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.HardwareLab = new HardwareLabApp();
});
