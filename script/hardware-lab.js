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
        this.batchSize = 256;       // 64, 128, 256, 512
        this.clockMultiplier = 1.0; // 0.5x, 1x, 1.5x, 2x, 2.5x
        this.viewMode = 'split';    // 'split' | 'cpu' | 'gpu'

        // État d'exécution
        this.isRunning = false;
        this.isPaused = false;
        this.animRaf = null;

        // État CPU (4 cœurs haute fréquence, orienté latence)
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

        // Canvas & Contexte
        this.canvas = null;
        this.ctx = null;
        this.tooltip = null;
        this.logicalWidth = 800;
        this.logicalHeight = 420;
        this.animTime = 0;
        this._renderedNodes = [];
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
        if (!this.canvas || !this.ctx) return;
        const rect = this.canvas.getBoundingClientRect();
        const targetW = Math.round(rect.width) || 320;
        const targetH = Math.round(rect.height) || 380;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        const physicalW = Math.round(targetW * dpr);
        const physicalH = Math.round(targetH * dpr);

        if (this.canvas.width !== physicalW || this.canvas.height !== physicalH) {
            this.canvas.width = physicalW;
            this.canvas.height = physicalH;
        }

        // Échelle haute résolution Retina / HiDPI
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.logicalWidth = targetW;
        this.logicalHeight = targetH;
    }

    setupUI() {
        // Explications pedagogiques detaillees pour chaque use case
        this.workloadExplanations = {
            gemm: {
                winner: 'Vainqueur : GPU (Parallélisme massif SIMT)',
                speedup: '~8x à 10x plus rapide',
                badgeClass: 'tag-gpu',
                reason: "La multiplication matricielle (C = A × B) est un cas idéal de parallélisme massif : chaque coefficient est le produit scalaire indépendant de lignes et colonnes.",
                architecture: "Le GPU mobilise 256 cœurs SIMT (16 SMs × 16 ALUs) alimentés à 3000 Go/s par sa VRAM HBM3. Le CPU, avec 4 cœurs et 80 Go/s de RAM, doit empiler des boucles séquentielles lentes."
            },
            pixel: {
                winner: 'Vainqueur : GPU (Indépendance spatiale)',
                speedup: '~6x à 8x plus rapide',
                badgeClass: 'tag-gpu',
                reason: "Chaque pixel d'une image ou fragment de shader est calculé indépendamment de ses voisins (filtrage 2D, seuillage, convolutions, ray tracing).",
                architecture: "Le GPU traite la grille de pixels en une seule passe globale sur ses 256 cœurs SIMT. Le CPU, même avec AVX, traite les pixels par petits paquets et sature ses pipelines."
            },
            branch: {
                winner: 'Vainqueur : CPU (Latence & Spéculation)',
                speedup: '~3x à 4x plus rapide',
                badgeClass: 'tag-cpu',
                reason: "Le code décisionnel avec embranchements conditionnels imprévisibles (if / else) casse l'exécution synchrone du GPU et provoque de la 'Warp Divergence'.",
                architecture: "Le CPU dispose d'un Branch Predictor (96% de réussite) et d'un cache L3 (10ns) qui exécutent les instructions sans arrêt à 4.5 GHz. Le GPU ne pouvant avoir deux pointeurs d'instruction par Warp, il gèle 50% de ses cœurs pour exécuter le IF, puis gèle l'autre moitié pour le ELSE."
            }
        };

        // Sélecteurs de workload
        const workloadBtns = document.querySelectorAll('.hw-workload-btn');
        workloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                workloadBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.workload = btn.dataset.workload;
                this.updateWorkloadUI();
                this.resetSimulation();
            });
        });

        this.updateWorkloadUI();

        // Mode d'affichage (Split / CPU / GPU)
        const viewBtns = document.querySelectorAll('.hw-view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.viewMode = btn.dataset.view;
                this.draw();
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

        // Boutons Start / Reset
        const startBtn = document.getElementById('hw-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!this.isRunning) {
                    this.startSimulation();
                    startBtn.textContent = 'PAUSE';
                } else if (this.isPaused) {
                    this.isPaused = false;
                    startBtn.textContent = 'PAUSE';
                } else {
                    this.isPaused = true;
                    startBtn.textContent = 'REPRENDRE';
                }
            });
        }

        const resetBtn = document.getElementById('hw-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSimulation();
                if (startBtn) startBtn.textContent = 'LANCER';
            });
        }
    }

    updateWorkloadUI() {
        if (!this.workloadExplanations) return;
        const expl = this.workloadExplanations[this.workload];
        if (!expl) return;

        const badge = document.getElementById('hw-why-badge');
        const speedup = document.getElementById('hw-why-speedup');
        const reason = document.getElementById('hw-why-reason');
        const tech = document.getElementById('hw-why-tech');
        const guide = document.getElementById('hw-workload-guide');

        if (badge) {
            badge.textContent = expl.winner;
            badge.className = `why-badge ${expl.badgeClass}`;
        }
        if (speedup) speedup.textContent = expl.speedup;
        if (reason) reason.textContent = expl.reason;
        if (tech) tech.textContent = expl.architecture;
        if (guide) guide.textContent = expl.reason;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });

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

        this.updateTelemetry();
        this.draw();
    }

    startSimulation() {
        this.resetSimulation();
        this.isRunning = true;
        this.isPaused = false;

        this.remainingCpuTasks = this.batchSize;
        this.remainingGpuTasks = this.batchSize;
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        const speed = this.clockMultiplier;

        // 1. CPU Update (Séquentiel / 4 Cœurs rapides à 4.5 GHz)
        if (this.cpu.completed < this.batchSize) {
            this.cpu.timeMs += 16 * speed;
            // En branchements : Branch Predictor très véloce
            // En GEMM/Pixel : chaque cœur traite 1 tâche scalaire
            const taskDuration = this.workload === 'branch' ? 8 : (this.workload === 'pixel' ? 14 : 16);

            for (let c = 0; c < this.cpu.cores; c++) {
                if (this.remainingCpuTasks > 0 || this.cpu.coreStates[c] > 0) {
                    if (this.cpu.coreStates[c] === 0 && this.remainingCpuTasks > 0) {
                        this.remainingCpuTasks--;
                        this.cpu.coreStates[c] = 0.01;
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

        // 2. GPU Update (SIMT / 256 Cœurs à 1.8 GHz)
        if (this.gpu.completed < this.batchSize) {
            this.gpu.timeMs += 16 * speed;

            if (this.workload === 'gemm' || this.workload === 'pixel') {
                // Parallélisme massif : Le GPU traite 64 calculs par vague de balayage SIMT
                const waveDuration = this.workload === 'gemm' ? 42 : 46;
                for (let i = 0; i < this.gpu.numSMs; i++) {
                    this.gpu.smStates[i] = 1; // Actif (vert)
                }

                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;

                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    const processed = Math.min(64, this.batchSize - this.gpu.completed);
                    this.gpu.completed += processed;

                    if (this.gpu.completed >= this.batchSize) {
                        this.gpu.smStates.fill(0);
                    }
                }
            } else {
                // Branchements conditionnels : WARP DIVERGENCE & SÉRIALISATION FORCÉE
                const waveDuration = 65;
                for (let i = 0; i < this.gpu.numSMs; i++) {
                    this.gpu.smStates[i] = (i % 2 === 0) ? 1 : 2; // 2 = Stalled
                }

                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;

                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    const processed = Math.min(16, this.batchSize - this.gpu.completed);
                    this.gpu.completed += processed;

                    if (this.gpu.completed >= this.batchSize) {
                        this.gpu.smStates.fill(0);
                    }
                }
            }
        }

        this.updateTelemetry();

        // Fin de simulation
        if (this.cpu.completed >= this.batchSize && this.gpu.completed >= this.batchSize) {
            this.isRunning = false;
            const startBtn = document.getElementById('hw-start-btn');
            if (startBtn) startBtn.textContent = 'RELANCER';
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
        if (cpuVal) cpuVal.textContent = `${Math.floor(cpuProg)}%`;
        if (gpuVal) gpuVal.textContent = `${Math.floor(gpuProg)}%`;

        const cpuTimeEl = document.getElementById('hw-cpu-time');
        const gpuTimeEl = document.getElementById('hw-gpu-time');
        const cpuQueueEl = document.getElementById('hw-cpu-queue');
        const gpuActiveEl = document.getElementById('hw-gpu-active');
        const verdictEl = document.getElementById('hw-verdict');

        if (cpuTimeEl) cpuTimeEl.textContent = `${(this.cpu.timeMs / 1000).toFixed(2)}s`;
        if (gpuTimeEl) gpuTimeEl.textContent = `${(this.gpu.timeMs / 1000).toFixed(2)}s`;

        if (cpuQueueEl) {
            cpuQueueEl.textContent = `${this.batchSize - this.cpu.completed} tâches`;
        }

        if (gpuActiveEl) {
            if (this.isRunning && this.gpu.completed < this.batchSize) {
                gpuActiveEl.textContent = this.workload === 'branch' ? '12 / 256 (Warp Divergence)' : '256 / 256 (Plein régime)';
            } else {
                gpuActiveEl.textContent = '0 / 256 (Inactif)';
            }
        }

        if (verdictEl) {
            if (this.cpu.completed === this.batchSize && this.gpu.completed === this.batchSize) {
                if (this.workload === 'gemm') {
                    const ratio = (this.cpu.timeMs / Math.max(1, this.gpu.timeMs)).toFixed(1);
                    verdictEl.innerHTML = `<span style="color:var(--neon-purple);">VAINQUEUR : GPU (${ratio}x plus rapide)</span> — Les 256 cœurs SIMT ont calculé les tenseurs en parallèle sur bus HBM3 3000 Go/s, tandis que le CPU a empilé des boucles séquentielles 4 par 4.`;
                } else if (this.workload === 'pixel') {
                    const ratio = (this.cpu.timeMs / Math.max(1, this.gpu.timeMs)).toFixed(1);
                    verdictEl.innerHTML = `<span style="color:var(--neon-purple);">VAINQUEUR : GPU (${ratio}x plus rapide)</span> — Pixels mappés directement sur les 256 cœurs sans dépendance de données, surpassant le streaming séquentiel du CPU.`;
                } else {
                    const ratio = (this.gpu.timeMs / Math.max(1, this.cpu.timeMs)).toFixed(1);
                    verdictEl.innerHTML = `<span style="color:var(--neon-cyan);">VAINQUEUR : CPU (${ratio}x plus rapide)</span> — Le Branch Predictor CPU (96% succès) n'a subi aucune bulle de pipeline, tandis que le GPU a divisé son débit par deux (Warp Divergence : 50% de cœurs gelés).`;
                }
            } else if (this.cpu.completed === this.batchSize && this.gpu.completed < this.batchSize) {
                verdictEl.innerHTML = `<span style="color:var(--neon-cyan);">CPU TERMINE 1ER !</span> Le GPU est pénalisé par la Warp Divergence (moitié des cœurs masqués)...`;
            } else if (this.gpu.completed === this.batchSize && this.cpu.completed < this.batchSize) {
                verdictEl.innerHTML = `<span style="color:var(--neon-purple);">GPU TERMINE 1ER !</span> Les 256 cœurs SIMT ont liquidé le lot, le CPU vide sa file 4 par 4...`;
            } else if (this.isRunning) {
                verdictEl.textContent = "Calcul en cours...";
            } else {
                verdictEl.textContent = "Prêt à lancer la simulation.";
            }
        }
    }

    startRenderLoop() {
        const loop = () => {
            const section = document.getElementById('hardware-lab');
            const isVisible = section && section.classList.contains('active');
            if (isVisible) {
                this.animTime += (this.isRunning && !this.isPaused ? 0.04 * this.clockMultiplier : 0.015);
                this.resizeCanvas();
                this.update();
                this.draw();
            }
            this.animRaf = requestAnimationFrame(loop);
        };
        this.animRaf = requestAnimationFrame(loop);
    }

    /* ==========================================
       DÉTERMINATION DES COORDONNÉES ADAPTATIVES
       ========================================== */
    isStacked() {
        return this.viewMode === 'split' && this.logicalWidth < 640;
    }

    getCpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const stacked = this.isStacked();

        if (this.viewMode === 'cpu') {
            const cx = w * 0.5;
            const topY = 115;
            const coreH = h - topY - 25;
            const coreW = (w - 60 - 3 * 10) / 4;
            const cores = [];
            for (let i = 0; i < 4; i++) {
                cores.push({
                    x: 30 + i * (coreW + 10),
                    y: topY,
                    w: coreW,
                    h: coreH,
                    index: i
                });
            }
            return {
                x: 20, y: 15, w: w - 40, h: h - 30,
                ram: { x: cx, y: 44, r: 18 },
                l3: { x: cx, y: 88, r: 20 },
                cores: cores
            };
        }

        if (stacked) {
            const stackH = h * 0.48;
            const cx = w * 0.5;
            const topY = 56;
            const coreH = stackH - topY - 8;
            const coreW = (w - 30 - 3 * 6) / 4;
            const cores = [];
            for (let i = 0; i < 4; i++) {
                cores.push({
                    x: 15 + i * (coreW + 6),
                    y: topY,
                    w: coreW,
                    h: coreH,
                    index: i
                });
            }
            return {
                x: 15, y: 10, w: w - 30, h: stackH,
                ram: { x: cx - 52, y: 28, r: 13 },
                l3: { x: cx + 52, y: 28, r: 14 },
                cores: cores
            };
        }

        // Split standard (côte à côte)
        const cpuW = w * 0.475;
        const cx = 15 + cpuW * 0.5;
        const topY = 115;
        const coreH = h - topY - 25;
        const coreW = (cpuW - 20 - 3 * 8) / 4;
        const cores = [];
        for (let i = 0; i < 4; i++) {
            cores.push({
                x: 15 + i * (coreW + 8),
                y: topY,
                w: coreW,
                h: coreH,
                index: i
            });
        }
        return {
            x: 15, y: 15, w: cpuW, h: h - 30,
            ram: { x: cx, y: 44, r: 17 },
            l3: { x: cx, y: 88, r: 19 },
            cores: cores
        };
    }

    getGpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const stacked = this.isStacked();

        if (this.viewMode === 'gpu') {
            const cx = w * 0.5;
            const vram = { x: cx, y: 44, r: 18 };
            const disp = { x: cx, y: 88, r: 17 };
            const topY = 118;
            const bottomY = h - 25;
            const gridW = Math.min(w - 60, 560);
            const gridX = cx - gridW * 0.5;
            const gridH = bottomY - topY;
            const smW = (gridW - 3 * 8) / 4;
            const smH = (gridH - 3 * 8) / 4;
            const smNodes = [];
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    smNodes.push({
                        x: gridX + c * (smW + 8),
                        y: topY + r * (smH + 8),
                        w: smW,
                        h: smH,
                        index: r * 4 + c
                    });
                }
            }
            return {
                x: 20, y: 15, w: w - 40, h: h - 30,
                vram, disp, smNodes
            };
        }

        if (stacked) {
            const topY = h * 0.52;
            const stackH = h * 0.46;
            const cx = w * 0.5;
            const vram = { x: cx - 52, y: topY + 22, r: 13 };
            const disp = { x: cx + 52, y: topY + 22, r: 13 };
            const smGridY = topY + 44;
            const smBottomY = h - 10;
            const gridW = w - 30;
            const smW = (gridW - 3 * 6) / 4;
            const smH = (smBottomY - smGridY - 3 * 4) / 4;
            const smNodes = [];
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    smNodes.push({
                        x: 15 + c * (smW + 6),
                        y: smGridY + r * (smH + 4),
                        w: smW,
                        h: smH,
                        index: r * 4 + c
                    });
                }
            }
            return {
                x: 15, y: topY, w: gridW, h: stackH,
                vram, disp, smNodes
            };
        }

        // Split standard (côte à côte)
        const left = w * 0.525;
        const gpuW = w * 0.46;
        const cx = left + gpuW * 0.5;
        const vram = { x: cx, y: 44, r: 17 };
        const disp = { x: cx, y: 88, r: 16 };
        const topY = 118;
        const bottomY = h - 25;
        const gridW = gpuW - 16;
        const gridH = bottomY - topY;
        const smW = (gridW - 3 * 6) / 4;
        const smH = (gridH - 3 * 6) / 4;
        const smNodes = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                smNodes.push({
                    x: left + 8 + c * (smW + 6),
                    y: topY + r * (smH + 6),
                    w: smW,
                    h: smH,
                    index: r * 4 + c
                });
            }
        }
        return {
            x: left, y: 15, w: gpuW, h: h - 30,
            vram, disp, smNodes
        };
    }

    /* ==========================================
       RENDU DU CANVAS
       ========================================== */
    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        this._renderedNodes = [];
        ctx.clearRect(0, 0, w, h);

        // Fond sombre cybernétique
        ctx.fillStyle = 'rgba(8, 8, 18, 0.96)';
        ctx.fillRect(0, 0, w, h);

        // Grille cybernétique discrète
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 28;
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

        if (this.viewMode === 'split') {
            if (this.isStacked()) {
                const midY = h * 0.495;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(15, midY);
                ctx.lineTo(w - 15, midY);
                ctx.stroke();
                ctx.setLineDash([]);

                this.drawCpu(ctx);
                this.drawGpu(ctx);
            } else {
                const midX = w * 0.495;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(midX, 10);
                ctx.lineTo(midX, h - 10);
                ctx.stroke();
                ctx.setLineDash([]);

                // Badge VS cybernétique
                ctx.fillStyle = 'rgba(12, 10, 24, 0.96)';
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(midX, h * 0.5, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px ui-monospace, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('VS', midX, h * 0.5);

                this.drawCpu(ctx);
                this.drawGpu(ctx);
            }
        } else if (this.viewMode === 'cpu') {
            this.drawCpu(ctx);
        } else if (this.viewMode === 'gpu') {
            this.drawGpu(ctx);
        }
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    getBezierPoint(a, b, t) {
        const mt = 1 - t;
        const cpy = (a.y + b.y) / 2;
        const px = mt * mt * mt * a.x + 3 * mt * mt * t * a.x + 3 * mt * t * t * b.x + t * t * t * b.x;
        const py = mt * mt * mt * a.y + 3 * mt * mt * t * cpy + 3 * mt * t * t * cpy + t * t * t * b.y;
        return { x: px, y: py };
    }

    drawSynapse(ctx, a, b, color, width = 1, alpha = 0.35, dashed = false) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const cpy = (a.y + b.y) / 2;
        ctx.bezierCurveTo(a.x, cpy, b.x, cpy, b.x, b.y);
        if (dashed) {
            ctx.setLineDash([4, 4]);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.restore();
    }

    drawPulse(ctx, a, b, t, color, radius = 3.5) {
        if (t < 0 || t > 1) return;
        const pt = this.getBezierPoint(a, b, t);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawGlassNode(ctx, node, label, sublabel, color, isActive, isStalled, pulseAura) {
        const { x, y, r } = node;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        if (isActive && !isStalled) {
            ctx.shadowColor = color;
            ctx.shadowBlur = pulseAura ? 16 : 8;
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(12, 16, 30, 0.96)' : 'rgba(8, 8, 18, 0.92)';
        ctx.fill();

        ctx.lineWidth = isActive ? 1.8 : 1;
        ctx.strokeStyle = isStalled ? '#ffaa00' : color;
        if (isStalled) {
            ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        if (isActive) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, r * 0.28), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, r * 0.14), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = isStalled ? '#ffaa00' : (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)');
        const mainFontSize = Math.max(7, Math.min(9.5, r * 0.58));
        ctx.font = `bold ${mainFontSize}px ${fontMono}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = sublabel ? 'bottom' : 'middle';
        const labelY = sublabel ? y - 1 : y;
        ctx.fillText(label, x, labelY);

        if (sublabel && r >= 13) {
            ctx.fillStyle = isStalled ? 'rgba(255, 170, 0, 0.7)' : (isActive ? color : 'rgba(255, 255, 255, 0.4)');
            ctx.font = `6.5px ${fontMono}`;
            ctx.textBaseline = 'top';
            ctx.fillText(sublabel, x, y + 2);
        }

        ctx.restore();
    }

    drawCpuCorePod(ctx, core, index, prog, isBusy, animTime) {
        const { x, y, w, h } = core;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        // 1. Pod Glass Container
        if (isBusy) {
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 8;
        }
        this.drawRoundedRect(ctx, x, y, w, h, 6);
        ctx.fillStyle = isBusy ? 'rgba(12, 18, 32, 0.95)' : 'rgba(8, 12, 22, 0.92)';
        ctx.fill();

        ctx.lineWidth = isBusy ? 1.5 : 1;
        ctx.strokeStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.3)';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Pod Header: CŒUR X · 4.5 GHz
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px ' + fontMono;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`CŒUR ${index}`, x + w * 0.5, y + 5);

        ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.5)';
        ctx.font = '7px ' + fontMono;
        ctx.fillText('4.5 GHz', x + w * 0.5, y + 16);

        // 3. Instruction Decode / Queue Stage
        const qY = y + 27;
        const qH = Math.min(24, Math.max(16, h * 0.11));
        ctx.fillStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.strokeStyle = isBusy && prog <= 0.45 ? '#00f3ff' : 'rgba(0, 243, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, qY, w - 8, qH);
        ctx.fillRect(x + 4, qY, w - 8, qH);

        ctx.fillStyle = isBusy && prog <= 0.45 ? '#00f3ff' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '6.5px ' + fontMono;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DÉCODE', x + w * 0.5, qY + qH * 0.5);

        // 4. Superscalar 64-bit ALU Stage with High-Speed Oscillator
        const aluY = qY + qH + 5;
        const aluH = Math.min(52, Math.max(30, h * 0.24));
        ctx.fillStyle = 'rgba(5, 8, 18, 0.9)';
        ctx.strokeStyle = isBusy && prog > 0.4 ? 'rgba(0, 243, 255, 0.7)' : 'rgba(0, 243, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, aluY, w - 8, aluH);
        ctx.fillRect(x + 4, aluY, w - 8, aluH);

        if (isBusy && prog > 0.4) {
            ctx.beginPath();
            ctx.strokeStyle = '#00f3ff';
            ctx.shadowColor = '#00f3ff';
            ctx.shadowBlur = 6;
            ctx.lineWidth = 1.5;
            const midAluY = aluY + aluH * 0.48;
            const amp = aluH * 0.32;
            for (let px = x + 6; px <= x + w - 6; px += 2) {
                const py = midAluY + Math.sin((px - x) * 0.45 + animTime * 24 + index) * amp;
                if (px === x + 6) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px ' + fontMono;
            ctx.textAlign = 'center';
            ctx.fillText('ALU 64-BIT', x + w * 0.5, aluY + aluH - 5);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '6.5px ' + fontMono;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ALU 64-BIT', x + w * 0.5, aluY + aluH * 0.5);
        }

        // 5. Private L1/L2 SRAM Cache Unit
        const l1Y = aluY + aluH + 5;
        const l1H = Math.min(22, Math.max(14, h * 0.1));
        if (l1Y + l1H < y + h - 16) {
            ctx.fillStyle = 'rgba(0, 243, 255, 0.04)';
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.18)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 4, l1Y, w - 8, l1H);
            ctx.fillRect(x + 4, l1Y, w - 8, l1H);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '6px ' + fontMono;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('L1/L2 SRAM', x + w * 0.5, l1Y + l1H * 0.5);
        }

        // 6. Scalar Progress Bar & Status
        const barY = y + h - 13;
        const barW = w - 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x + 4, barY, barW, 4);

        if (prog > 0) {
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(x + 4, barY, barW * prog, 4);
        }

        ctx.font = 'bold 6.5px ' + fontMono;
        ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(isBusy ? 'ACTIF' : 'ATTENTE', x + w * 0.5, barY - 2);

        ctx.restore();
    }

    drawSmPod(ctx, sm, index, isSmActive, isStalled, isFirstBranch, waveProg, animTime) {
        const { x, y, w, h } = sm;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        // 1. Pod Glass Container
        if (isSmActive) {
            ctx.shadowColor = '#00ffaa';
            ctx.shadowBlur = 8;
        }
        this.drawRoundedRect(ctx, x, y, w, h, 5);
        ctx.fillStyle = isSmActive ? 'rgba(16, 22, 38, 0.95)' : (isStalled ? 'rgba(26, 18, 14, 0.94)' : 'rgba(12, 10, 24, 0.92)');
        ctx.fill();

        ctx.lineWidth = isSmActive || isStalled ? 1.5 : 1;
        ctx.strokeStyle = isStalled ? '#ffaa00' : (isSmActive ? '#00ffaa' : 'rgba(217, 70, 239, 0.35)');
        if (isStalled) {
            ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // 2. Pod Header: SM-XX et indicateur 16 ALUs / STALL
        ctx.font = 'bold 7px ' + fontMono;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isStalled ? '#ffaa00' : (isSmActive ? '#00ffaa' : '#e879f9');
        const smLabel = `SM-${index < 10 ? '0' + index : index}`;
        ctx.fillText(smLabel, x + 4, y + 3);

        ctx.font = 'bold 6px ' + fontMono;
        ctx.textAlign = 'right';
        if (isStalled) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText('STALL', x + w - 4, y + 3);
        } else if (isSmActive) {
            ctx.fillStyle = '#00ffaa';
            ctx.fillText('16 ALUs', x + w - 4, y + 3);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillText('16 ALUs', x + w - 4, y + 3);
        }

        // Ligne de démarcation interne
        ctx.strokeStyle = isStalled ? 'rgba(255, 170, 0, 0.2)' : (isSmActive ? 'rgba(0, 255, 170, 0.2)' : 'rgba(217, 70, 239, 0.15)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 13);
        ctx.lineTo(x + w - 3, y + 13);
        ctx.stroke();

        // 3. Les 16 Micro-Cœurs SIMT (Matrice 4x4 interne = 256 cœurs au total sur le GPU)
        const padX = x + 4;
        const padY = y + 15;
        const innerW = w - 8;
        const innerH = h - 18;
        const cellW = innerW / 4;
        const cellH = innerH / 4;
        const microR = Math.max(1.6, Math.min(3.0, cellW * 0.28, cellH * 0.28));

        for (let mr = 0; mr < 4; mr++) {
            for (let mc = 0; mc < 4; mc++) {
                const cx = padX + (mc + 0.5) * cellW;
                const cy = padY + (mr + 0.5) * cellH;

                if (isSmActive) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                    ctx.fillStyle = '#00ffaa';
                    ctx.shadowColor = '#00ffaa';
                    ctx.shadowBlur = 5;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(cx, cy, microR * 0.45, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else if (isStalled) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 170, 0, 0.25)';
                    ctx.fill();
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(217, 70, 239, 0.35)';
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    drawCpu(ctx) {
        const c = this.getCpuCoordinates();
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        // En-tête CPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 10px ' + fontMono;
        ctx.fillStyle = '#00f3ff';
        ctx.fillText('CPU // 4 CŒURS SUPERSCALAIRES @ 4.5 GHz', c.x, c.y);

        // 1. Nœuds RAM et Cache L3
        this._renderedNodes.push({ x: c.ram.x, y: c.ram.y, r: c.ram.r, type: 'cpu-ram' });
        this._renderedNodes.push({ x: c.l3.x, y: c.l3.y, r: c.l3.r, type: 'cpu-l3' });

        // Synapse RAM -> L3
        this.drawSynapse(ctx, c.ram, c.l3, '#00f3ff', 1.5, 0.4);

        // 2. Synapses L3 -> Pods Cœurs
        for (let i = 0; i < 4; i++) {
            const core = c.cores[i];
            const coreTop = { x: core.x + core.w * 0.5, y: core.y };
            this._renderedNodes.push({
                x: core.x,
                y: core.y,
                w: core.w,
                h: core.h,
                type: 'cpu-core',
                index: i
            });

            const prog = this.cpu.coreStates[i];
            const isBusy = prog > 0;
            const lineColor = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.2)';
            this.drawSynapse(ctx, c.l3, coreTop, lineColor, isBusy ? 1.5 : 1, isBusy ? 0.6 : 0.2);

            // Propagation du paquet d'instruction
            if (this.isRunning && prog > 0) {
                if (prog <= 0.22) {
                    const t = prog / 0.22;
                    this.drawPulse(ctx, c.ram, c.l3, t, '#00f3ff', 3.2);
                } else if (prog <= 0.45) {
                    const t = (prog - 0.22) / 0.23;
                    this.drawPulse(ctx, c.l3, coreTop, t, '#00f3ff', 3.2);
                }
            }

            // Dessin du pod exécutif du cœur
            this.drawCpuCorePod(ctx, core, i, prog, isBusy, this.animTime);
        }

        // 3. Rendu des nœuds mémoire RAM et L3 / Predictor
        const isBranch = this.workload === 'branch';
        this.drawGlassNode(ctx, c.ram, 'RAM', 'DDR5', '#00f3ff', this.isRunning, false, false);
        this.drawGlassNode(ctx, c.l3, isBranch ? 'PRED' : 'L3', isBranch ? '96%' : '32M', isBranch ? '#00ffaa' : '#00f3ff', this.isRunning, false, isBranch && this.isRunning);

        // Indicateur prédiction sous le L3 en mode branche
        if (isBranch) {
            ctx.font = 'bold 7px ' + fontMono;
            ctx.fillStyle = '#00ffaa';
            ctx.textAlign = 'center';
            ctx.fillText('BRANCH PREDICTOR : 96% HIT (0 BULLE)', c.l3.x, c.l3.y + c.l3.r + 9);
        }
    }

    drawGpu(ctx) {
        const g = this.getGpuCoordinates();
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        // En-tête GPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 10px ' + fontMono;
        ctx.fillStyle = '#e879f9';
        ctx.fillText('GPU // 16 STREAMING MULTIPROCESSORS (256 CŒURS)', g.x, g.y);

        // 1. Enregistrement VRAM & Dispatcher
        this._renderedNodes.push({ x: g.vram.x, y: g.vram.y, r: g.vram.r, type: 'gpu-vram' });
        this._renderedNodes.push({ x: g.disp.x, y: g.disp.y, r: g.disp.r, type: 'gpu-disp' });

        // Bus large VRAM -> Dispatcher (3 traces parallèles)
        [-5, 0, 5].forEach(dx => {
            const a = { x: g.vram.x + dx, y: g.vram.y };
            const b = { x: g.disp.x + dx, y: g.disp.y };
            this.drawSynapse(ctx, a, b, '#e879f9', 1.2, 0.35);
        });

        // Pulsations continues VRAM -> Dispatcher
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            const pulseT = (this.animTime * 3) % 1.0;
            this.drawPulse(ctx, g.vram, g.disp, pulseT, '#e879f9', 3.0);
        }

        // 2. Rendu des 16 SMs (chacun avec 16 micro-ALUs = 256 cœurs)
        const isBranch = this.workload === 'branch';
        const waveProg = this.gpuProgressInWave || 0;
        const isFirstBranch = waveProg < 0.5;

        for (let k = 0; k < g.smNodes.length; k++) {
            const sm = g.smNodes[k];
            const smTop = { x: sm.x + sm.w * 0.5, y: sm.y };
            this._renderedNodes.push({
                x: sm.x,
                y: sm.y,
                w: sm.w,
                h: sm.h,
                type: 'gpu-sm',
                index: k
            });

            const isEven = (k % 2 === 0);
            const isActive = !isBranch || (isFirstBranch && isEven) || (!isFirstBranch && !isEven);
            const isStalled = isBranch && this.isRunning && (this.gpu.completed < this.batchSize) && !isActive;
            const isSmActive = this.isRunning && (this.gpu.completed < this.batchSize) && (!isBranch || isActive);

            // Synapse Dispatcher -> SM pod
            let synColor = 'rgba(217, 70, 239, 0.2)';
            let synWidth = 1;
            let synAlpha = 0.25;
            let isDashed = false;

            if (isStalled) {
                synColor = '#ff005a';
                synWidth = 1.2;
                synAlpha = 0.45;
                isDashed = true;
            } else if (isSmActive) {
                synColor = '#00ffaa';
                synWidth = 1.4;
                synAlpha = 0.55;
            }

            this.drawSynapse(ctx, g.disp, smTop, synColor, synWidth, synAlpha, isDashed);

            // Pulsation d'activation SIMT
            if (isSmActive) {
                const branchT = isBranch ? (isFirstBranch ? (waveProg / 0.5) : ((waveProg - 0.5) / 0.5)) : waveProg;
                const smT = ((branchT * 1.5) - (k % 4) * 0.08) % 1.0;
                if (smT >= 0 && smT <= 0.88) {
                    this.drawPulse(ctx, g.disp, smTop, smT / 0.88, '#00ffaa', 2.4);
                }
            }

            // Dessin du pod SM avec ses 16 micro-cœurs internes
            this.drawSmPod(ctx, sm, k, isSmActive, isStalled, isFirstBranch, waveProg, this.animTime);
        }

        // 3. Rendu des nœuds VRAM & Dispatcher
        this.drawGlassNode(ctx, g.vram, 'VRAM', 'HBM3', '#e879f9', this.isRunning, false, false);
        this.drawGlassNode(ctx, g.disp, 'WARP', 'SCHED', '#bd00ff', this.isRunning, false, false);

        // 4. Bannière d'état HUD au bas du GPU
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            ctx.font = 'bold 8px ' + fontMono;
            ctx.textAlign = 'center';
            if (isBranch) {
                ctx.fillStyle = '#ffaa00';
                const branchTxt = isFirstBranch ? 'PHASE 1 : BRANCHE IF (128 CŒURS MASQUÉS)' : 'PHASE 2 : BRANCHE ELSE (128 CŒURS MASQUÉS)';
                ctx.fillText(`WARP DIVERGENCE // ${branchTxt}`, g.disp.x, g.y + g.h - 4);
            } else {
                ctx.fillStyle = '#00ffaa';
                ctx.fillText('SIMT LOCKSTEP // 16 SMs × 16 ALUs = 256 CŒURS EN PARALLÈLE', g.disp.x, g.y + g.h - 4);
            }
        }
    }

    /* ==========================================
       GESTION DU TOOLTIP SURVOL RAYCAST
       ========================================== */
    handleMouseMove(e) {
        if (!this.canvas || !this.tooltip) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.logicalWidth / rect.width;
        const scaleY = this.logicalHeight / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        let closestNode = null;
        let minDist = 24;

        for (let node of this._renderedNodes) {
            if (node.w && node.h) {
                // Pod rectangulaire (cpu-core ou gpu-sm)
                if (cx >= node.x - 3 && cx <= node.x + node.w + 3 && cy >= node.y - 3 && cy <= node.y + node.h + 3) {
                    closestNode = node;
                    break;
                }
            } else if (node.r) {
                // Nœud circulaire (ram, l3, vram, disp)
                const d = Math.hypot(node.x - cx, node.y - cy);
                if (d < Math.max(node.r + 6, minDist)) {
                    minDist = d;
                    closestNode = node;
                }
            }
        }

        if (closestNode) {
            let html = '';
            if (closestNode.type === 'cpu-ram') {
                html = `
                    <h4>RAM DDR5 <span>Bus 64-bit</span></h4>
                    <p>Débit : <span class="val">80 Go/s</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Mémoire centrale optimisée pour les flux séquentiels et accès scalaires rapides.</p>
                `;
            } else if (closestNode.type === 'cpu-l3') {
                const isBranch = this.workload === 'branch';
                html = `
                    <h4>Cache L3 &amp; Spéculation <span>SRAM</span></h4>
                    <p>Latence : <span class="val">~10 ns</span></p>
                    <p>Précision Predictor : <span class="val">96%</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>${isBranch ? 'Anticipation spéculative : exécute le if/else sans aucune bulle de pipeline à 4.5 GHz.' : 'Tampon haute vitesse évitant les allers-retours vers la RAM DDR5.'}</p>
                `;
            } else if (closestNode.type === 'cpu-core') {
                const prog = this.cpu.coreStates[closestNode.index];
                const isBusy = prog > 0;
                html = `
                    <h4>Cœur CPU ${closestNode.index} <span>Superscalaire 64-bit</span></h4>
                    <p>Fréquence : <span class="val">4.5 GHz (Latence minimale)</span></p>
                    <p>Architecture : <span class="val">Out-of-Order + Caches L1/L2</span></p>
                    <p>État : <span class="val">${isBusy ? 'Calcul ALU actif (4.5 GHz)' : 'Attente file'}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Conçu pour maximiser la vitesse unitaire de chaque instruction grâce à une fréquence très haute.</p>
                `;
            } else if (closestNode.type === 'gpu-vram') {
                html = `
                    <h4>VRAM HBM3 <span>Bus 4096-bit</span></h4>
                    <p>Bande passante : <span class="val">3000 Go/s</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Bus ultra-large alimentant simultanément les 256 cœurs SIMT en coefficients matriciels.</p>
                `;
            } else if (closestNode.type === 'gpu-disp') {
                html = `
                    <h4>Warp Scheduler <span>SIMT Hub</span></h4>
                    <p>Granularité : <span class="val">32 threads / warp</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Distribue les instructions identiques en lockstep sur l'ensemble des 16 multiprocesseurs.</p>
                `;
            } else if (closestNode.type === 'gpu-sm') {
                const k = closestNode.index;
                const isBranch = this.workload === 'branch';
                const isEven = k % 2 === 0;
                const isFirstBranch = (this.gpuProgressInWave || 0) < 0.5;
                const isActive = !isBranch || (isFirstBranch && isEven) || (!isFirstBranch && !isEven);
                const statusText = !this.isRunning ? 'Prêt (16 cœurs ALUs)' : (isBranch ? (isActive ? 'Branche active (16 ALUs)' : 'Stalled / Masqué (16 ALUs gelés)') : 'SIMT Lockstep (16 ALUs)');

                html = `
                    <h4>Streaming Multiprocessor <span>SM-${k < 10 ? '0' + k : k}</span></h4>
                    <p>Micro-cœurs : <span class="val">16 ALUs SIMT (Total GPU : 256 cœurs)</span></p>
                    <p>Statut : <span class="val">${statusText}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>${isBranch ? (isActive ? 'Exécute la branche active sans interruption.' : 'Warp Divergence : 16 cœurs suspendus par le masque d\'exécution (sérialisation forcée).') : '16 micro-cœurs exécutant l\'instruction matricielle en parallèle synchrone.'}</p>
                `;
            }

            this.tooltip.innerHTML = html;
            this.tooltip.classList.add('visible');
            this.tooltip.style.left = `${Math.min(window.innerWidth - 240, e.clientX + 16)}px`;
            this.tooltip.style.top = `${e.clientY + 16}px`;
            this.canvas.style.cursor = 'pointer';
        } else {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.classList.remove('visible');
        if (this.canvas) this.canvas.style.cursor = 'default';
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.HardwareLab = new HardwareLabApp();
});
