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
        // Sélecteurs de workload
        const workloadBtns = document.querySelectorAll('.hw-workload-btn');
        const guideBanner = document.getElementById('hw-workload-guide');

        const guides = {
            gemm: "256 calculs simultanés sur GPU contre 4 par 4 sur CPU.",
            pixel: "Chaque pixel est filtré indépendamment en parallèle sur GPU.",
            branch: "Le Branch Predictor CPU gagne ; le GPU bloque (Warp Divergence)."
        };

        workloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                workloadBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.workload = btn.dataset.workload;
                if (guideBanner && guides[this.workload]) {
                    guideBanner.textContent = guides[this.workload];
                }
                this.resetSimulation();
            });
        });

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
                    verdictEl.innerHTML = `<span style="color:var(--neon-purple);">VAINQUEUR : GPU (${ratio}x plus rapide)</span> — 256 calculs simultanés.`;
                } else if (this.workload === 'pixel') {
                    const ratio = (this.cpu.timeMs / Math.max(1, this.gpu.timeMs)).toFixed(1);
                    verdictEl.innerHTML = `<span style="color:var(--neon-purple);">VAINQUEUR : GPU (${ratio}x plus rapide)</span> — Shaders 2D en parallèle.`;
                } else {
                    const ratio = (this.gpu.timeMs / Math.max(1, this.cpu.timeMs)).toFixed(1);
                    verdictEl.innerHTML = `<span style="color:var(--neon-cyan);">VAINQUEUR : CPU (${ratio}x plus rapide)</span> — Branch Predictor vs Warp Divergence.`;
                }
            } else if (this.cpu.completed === this.batchSize && this.gpu.completed < this.batchSize) {
                verdictEl.innerHTML = `<span style="color:var(--neon-cyan);">CPU TERMINE 1ER !</span> GPU ralenti (Warp Divergence)...`;
            } else if (this.gpu.completed === this.batchSize && this.cpu.completed < this.batchSize) {
                verdictEl.innerHTML = `<span style="color:var(--neon-purple);">GPU TERMINE 1ER !</span> CPU vide sa file séquentielle...`;
            } else if (this.isRunning) {
                verdictEl.textContent = "Calcul en cours...";
            } else {
                verdictEl.textContent = "Prêt à lancer.";
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
            const coreY = h - 65;
            const cores = [];
            const coreW = (w - 80) / 4;
            for (let i = 0; i < 4; i++) {
                cores.push({
                    x: 40 + (i + 0.5) * coreW,
                    y: coreY,
                    r: Math.min(26, coreW * 0.32),
                    index: i
                });
            }
            return {
                x: 20, y: 15, w: w - 40, h: h - 30,
                ram: { x: cx, y: 50, r: 20 },
                l3: { x: cx, y: 125, r: 24 },
                cores: cores
            };
        }

        if (stacked) {
            const stackH = h * 0.48;
            const cx = w * 0.5;
            const coreY = stackH - 28;
            const cores = [];
            const coreW = (w - 40) / 4;
            for (let i = 0; i < 4; i++) {
                cores.push({
                    x: 20 + (i + 0.5) * coreW,
                    y: coreY,
                    r: Math.min(16, coreW * 0.3),
                    index: i
                });
            }
            return {
                x: 15, y: 10, w: w - 30, h: stackH,
                ram: { x: cx, y: 34, r: 14 },
                l3: { x: cx, y: 76, r: 17 },
                cores: cores
            };
        }

        // Split standard (côte à côte)
        const cpuW = w * 0.475;
        const cx = 15 + cpuW * 0.5;
        const coreY = h - 60;
        const cores = [];
        const coreW = (cpuW - 24) / 4;
        for (let i = 0; i < 4; i++) {
            cores.push({
                x: 15 + (i + 0.5) * coreW,
                y: coreY,
                r: Math.min(20, coreW * 0.32),
                index: i
            });
        }
        return {
            x: 15, y: 15, w: cpuW, h: h - 30,
            ram: { x: cx, y: 50, r: 18 },
            l3: { x: cx, y: 120, r: 21 },
            cores: cores
        };
    }

    getGpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const stacked = this.isStacked();

        if (this.viewMode === 'gpu') {
            const cx = w * 0.5;
            const vram = { x: cx, y: 50, r: 20 };
            const disp = { x: cx, y: 115, r: 18 };
            const topY = 165;
            const bottomY = h - 40;
            const gridW = Math.min(w - 60, 520);
            const gridX = cx - gridW * 0.5;
            const gridH = bottomY - topY;
            const smNodes = [];
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    smNodes.push({
                        x: gridX + (c + 0.5) * (gridW / 4),
                        y: topY + (r + 0.5) * (gridH / 4),
                        r: Math.min(18, gridW / 14, gridH / 14),
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
            const vram = { x: cx, y: topY + 28, r: 14 };
            const disp = { x: cx, y: topY + 62, r: 13 };
            const smGridY = topY + 92;
            const smBottomY = h - 22;
            const gridW = w - 30;
            const smNodes = [];
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 8; c++) {
                    smNodes.push({
                        x: 15 + (c + 0.5) * (gridW / 8),
                        y: smGridY + (r + 0.5) * ((smBottomY - smGridY) / 2),
                        r: Math.min(11, gridW / 26),
                        index: r * 8 + c
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
        const vram = { x: cx, y: 50, r: 18 };
        const disp = { x: cx, y: 110, r: 16 };
        const smGridY = 150;
        const smBottomY = h - 45;
        const gridW = gpuW - 20;
        const gridH = smBottomY - smGridY;
        const smNodes = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                smNodes.push({
                    x: left + 10 + (c + 0.5) * (gridW / 4),
                    y: smGridY + (r + 0.5) * (gridH / 4),
                    r: Math.min(14, gridW / 13, gridH / 13),
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

        // Aura lumineuse
        if (isActive && !isStalled) {
            ctx.shadowColor = color;
            ctx.shadowBlur = pulseAura ? 16 : 8;
        }

        // Corps en verre sombre
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(12, 14, 28, 0.96)' : 'rgba(8, 8, 18, 0.92)';
        ctx.fill();

        // Bordure
        ctx.lineWidth = isActive ? 1.8 : 1;
        ctx.strokeStyle = isStalled ? '#ffaa00' : color;
        if (isStalled) {
            ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Noyau intérieur
        if (isStalled) {
            ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - r * 0.35, y - r * 0.35);
            ctx.lineTo(x + r * 0.35, y + r * 0.35);
            ctx.moveTo(x + r * 0.35, y - r * 0.35);
            ctx.lineTo(x - r * 0.35, y + r * 0.35);
            ctx.stroke();
        } else if (isActive) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(2, r * 0.32), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, r * 0.16), 0, Math.PI * 2);
            ctx.fill();
        }

        // Libellé
        ctx.fillStyle = isStalled ? '#ffaa00' : (isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)');
        const mainFontSize = Math.max(7, Math.min(10, r * 0.6));
        ctx.font = `bold ${mainFontSize}px ${fontMono}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = sublabel ? 'bottom' : 'middle';
        const labelY = sublabel ? y - 1 : y;
        ctx.fillText(label, x, labelY);

        if (sublabel && r >= 14) {
            ctx.fillStyle = isStalled ? 'rgba(255, 170, 0, 0.7)' : (isActive ? color : 'rgba(255, 255, 255, 0.4)');
            ctx.font = `6.5px ${fontMono}`;
            ctx.textBaseline = 'top';
            ctx.fillText(sublabel, x, y + 2);
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
        ctx.fillText('CPU // FAIBLE LATENCE (4 CŒURS @ 4.5 GHz)', c.x, c.y);

        // 1. Nœuds RAM et Cache L3
        this._renderedNodes.push({ x: c.ram.x, y: c.ram.y, r: c.ram.r, type: 'cpu-ram' });
        this._renderedNodes.push({ x: c.l3.x, y: c.l3.y, r: c.l3.r, type: 'cpu-l3' });

        // Synapse RAM -> L3
        this.drawSynapse(ctx, c.ram, c.l3, '#00f3ff', 1.5, 0.4);

        // 2. Synapses L3 -> Cœurs
        for (let i = 0; i < 4; i++) {
            const core = c.cores[i];
            this._renderedNodes.push({ x: core.x, y: core.y, r: core.r, type: 'cpu-core', index: i });
            const prog = this.cpu.coreStates[i];
            const isBusy = prog > 0;
            const lineColor = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.2)';
            this.drawSynapse(ctx, c.l3, core, lineColor, isBusy ? 1.5 : 1, isBusy ? 0.6 : 0.2);
        }

        // 3. Propagation des paquets de données & Oscillations
        for (let i = 0; i < 4; i++) {
            const core = c.cores[i];
            const prog = this.cpu.coreStates[i];

            if (this.isRunning && prog > 0) {
                if (prog <= 0.22) {
                    const t = prog / 0.22;
                    this.drawPulse(ctx, c.ram, c.l3, t, '#00f3ff', 3.5);
                } else if (prog <= 0.45) {
                    const t = (prog - 0.22) / 0.23;
                    this.drawPulse(ctx, c.l3, core, t, '#00f3ff', 3.5);
                } else {
                    // Calcul actif dans le cœur : anneau orbital 4.5 GHz
                    ctx.save();
                    const angle = this.animTime * 18 + i * (Math.PI / 2);
                    ctx.beginPath();
                    ctx.arc(core.x, core.y, core.r + 4, angle, angle + Math.PI * 1.1);
                    ctx.strokeStyle = '#00f3ff';
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = '#00f3ff';
                    ctx.shadowBlur = 8;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // 4. Rendu des nœuds de verre
        const isBranch = this.workload === 'branch';
        this.drawGlassNode(ctx, c.ram, 'RAM', 'DDR5', '#00f3ff', this.isRunning, false, false);
        this.drawGlassNode(ctx, c.l3, isBranch ? 'PRED' : 'L3', isBranch ? '96%' : '32M', isBranch ? '#00ffaa' : '#00f3ff', this.isRunning, false, isBranch && this.isRunning);

        for (let i = 0; i < 4; i++) {
            const core = c.cores[i];
            const prog = this.cpu.coreStates[i];
            const isBusy = prog > 0;
            this.drawGlassNode(ctx, core, `C${i}`, '4.5G', '#00f3ff', isBusy, false, prog > 0.45);

            // Statut textuel sous le cœur
            ctx.font = 'bold 7px ' + fontMono;
            ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(255, 255, 255, 0.3)';
            ctx.textAlign = 'center';
            ctx.fillText(isBusy ? 'ACTIF' : 'ATTENTE', core.x, core.y + core.r + 10);
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
        ctx.fillText('GPU // HAUT DÉBIT SIMT (256 CŒURS @ 1.8 GHz)', g.x, g.y);

        // 1. Enregistrement VRAM & Dispatcher
        this._renderedNodes.push({ x: g.vram.x, y: g.vram.y, r: g.vram.r, type: 'gpu-vram' });
        this._renderedNodes.push({ x: g.disp.x, y: g.disp.y, r: g.disp.r, type: 'gpu-disp' });

        // Bus VRAM -> Dispatcher (3 synapses parallèles représentant le bus large 4096-bit)
        [-5, 0, 5].forEach(dx => {
            const a = { x: g.vram.x + dx, y: g.vram.y };
            const b = { x: g.disp.x + dx, y: g.disp.y };
            this.drawSynapse(ctx, a, b, '#e879f9', 1.2, 0.35);
        });

        // Pulsations VRAM -> Dispatcher en continu pendant le calcul
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            const pulseT = (this.animTime * 3) % 1.0;
            this.drawPulse(ctx, g.vram, g.disp, pulseT, '#e879f9', 3.0);
        }

        // 2. Synapses et nœuds des 16 SMs
        const isBranch = this.workload === 'branch';
        const waveProg = this.gpuProgressInWave || 0;
        const isFirstBranch = waveProg < 0.5;

        for (let k = 0; k < g.smNodes.length; k++) {
            const sm = g.smNodes[k];
            this._renderedNodes.push({ x: sm.x, y: sm.y, r: sm.r, type: 'gpu-sm', index: k });

            const isEven = (k % 2 === 0);
            const isActive = !isBranch || (isFirstBranch && isEven) || (!isFirstBranch && !isEven);
            const isStalled = isBranch && this.isRunning && (this.gpu.completed < this.batchSize) && !isActive;
            const isSmActive = this.isRunning && (this.gpu.completed < this.batchSize) && (!isBranch || isActive);

            // Dessin de la synapse Dispatcher -> SM
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

            this.drawSynapse(ctx, g.disp, sm, synColor, synWidth, synAlpha, isDashed);

            // Pulsation d'activation SIMT
            if (isSmActive) {
                const branchT = isBranch ? (isFirstBranch ? (waveProg / 0.5) : ((waveProg - 0.5) / 0.5)) : waveProg;
                const smT = ((branchT * 1.5) - (k % 4) * 0.08) % 1.0;
                if (smT >= 0 && smT <= 0.88) {
                    this.drawPulse(ctx, g.disp, sm, smT / 0.88, '#00ffaa', 2.4);
                }
            }

            // Dessin du nœud de verre SM
            const label = k < 10 ? '0' + k : '' + k;
            const sublabel = isStalled ? 'WAIT' : (isSmActive ? (isBranch ? (isFirstBranch ? 'IF' : 'ELSE') : 'SIMT') : null);
            const nodeColor = isStalled ? '#ffaa00' : (isSmActive ? '#00ffaa' : '#e879f9');
            this.drawGlassNode(ctx, sm, label, sublabel, nodeColor, isSmActive, isStalled, isSmActive);
        }

        // 3. Rendu des nœuds VRAM & Dispatcher
        this.drawGlassNode(ctx, g.vram, 'VRAM', 'HBM3', '#e879f9', this.isRunning, false, false);
        this.drawGlassNode(ctx, g.disp, 'WARP', 'SCHED', '#bd00ff', this.isRunning, false, false);

        // 4. Bannière d'état HUD
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            ctx.font = 'bold 8px ' + fontMono;
            ctx.textAlign = 'center';
            if (isBranch) {
                ctx.fillStyle = '#ffaa00';
                const branchTxt = isFirstBranch ? 'PHASE 1 : BRANCHE IF (50% SMs EN PAUSE)' : 'PHASE 2 : BRANCHE ELSE (50% SMs EN PAUSE)';
                ctx.fillText(`WARP DIVERGENCE // ${branchTxt}`, g.disp.x, g.y + g.h - 4);
            } else {
                ctx.fillStyle = '#00ffaa';
                ctx.fillText('SIMT LOCKSTEP // 256 THREADS PARALLÈLES (PLEIN RÉGIME)', g.disp.x, g.y + g.h - 4);
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
        let minDist = 22;

        for (let node of this._renderedNodes) {
            const d = Math.hypot(node.x - cx, node.y - cy);
            if (d < Math.max(node.r + 6, minDist)) {
                minDist = d;
                closestNode = node;
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
                    <p>${isBranch ? 'Anticipe les conditions if/else sans bloquer le pipeline.' : 'Tampon haute vitesse évitant les allers-retours vers la RAM.'}</p>
                `;
            } else if (closestNode.type === 'cpu-core') {
                const prog = this.cpu.coreStates[closestNode.index];
                const isBusy = prog > 0;
                html = `
                    <h4>Cœur CPU ${closestNode.index} <span>Superscalaire</span></h4>
                    <p>Fréquence : <span class="val">4.5 GHz</span></p>
                    <p>État : <span class="val">${isBusy ? 'Calcul ALU actif' : 'En attente'}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Exécution out-of-order minimisant la latence unitaire de chaque tâche.</p>
                `;
            } else if (closestNode.type === 'gpu-vram') {
                html = `
                    <h4>VRAM HBM3 <span>Bus 4096-bit</span></h4>
                    <p>Bande passante : <span class="val">3000 Go/s</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Bus ultra-large alimentant les matrices de poids et tenseurs en continu.</p>
                `;
            } else if (closestNode.type === 'gpu-disp') {
                html = `
                    <h4>Warp Scheduler <span>SIMT Hub</span></h4>
                    <p>Granularité : <span class="val">32 threads / warp</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Distribue les instructions identiques sur l'ensemble de la grille de calcul.</p>
                `;
            } else if (closestNode.type === 'gpu-sm') {
                const k = closestNode.index;
                const isBranch = this.workload === 'branch';
                const isEven = k % 2 === 0;
                const isFirstBranch = (this.gpuProgressInWave || 0) < 0.5;
                const isActive = !isBranch || (isFirstBranch && isEven) || (!isFirstBranch && !isEven);
                const statusText = !this.isRunning ? 'Prêt' : (isBranch ? (isActive ? 'Branche active' : 'Stalled (Divergence)') : 'SIMT Lockstep');

                html = `
                    <h4>Streaming Multiprocessor <span>SM-${k < 10 ? '0' + k : k}</span></h4>
                    <p>Micro-cœurs : <span class="val">16 ALU / FP32</span></p>
                    <p>Statut : <span class="val">${statusText}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>${isBranch ? (isActive ? 'Exécute la condition sans interruption.' : 'Suspendu par le masque d\'exécution (sérialisation SIMT).') : 'Exécute la même instruction mathématique sur 16 données en parallèle.'}</p>
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
