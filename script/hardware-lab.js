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
            // En branchements : le Branch Predictor (96%) et la haute fréquence rendent le CPU ultra véloce !
            // En GEMM/Pixel : chaque cœur traite 1 tâche scalaire séquentielle
            const taskDuration = this.workload === 'branch' ? 3.5 : (this.workload === 'pixel' ? 6 : 8);

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
                // Parallélisme massif : Le GPU traite jusqu'à 256 calculs par vague
                const waveDuration = this.workload === 'gemm' ? 24 : 28;
                for (let i = 0; i < this.gpu.numSMs; i++) {
                    this.gpu.smStates[i] = 1; // Actif (vert)
                }

                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;

                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    const processed = Math.min(this.gpu.totalCores, this.batchSize - this.gpu.completed);
                    this.gpu.completed += processed;

                    if (this.gpu.completed >= this.batchSize) {
                        this.gpu.smStates.fill(0);
                    }
                }
            } else {
                // Branchements conditionnels : WARP DIVERGENCE & SÉRIALISATION FORCÉE
                // Les threads d'un même Warp divergent : l'écrasante majorité des cœurs est mise en pause !
                const waveDuration = 55;
                for (let i = 0; i < this.gpu.numSMs; i++) {
                    // La plupart des SMs sont bloqués ou attendent l'exécution de la branche opposée
                    this.gpu.smStates[i] = (i % 3 === 0) ? 1 : 2; // 2 = Stalled (orange)
                }

                this.gpuProgressInWave = (this.gpuProgressInWave || 0) + (1 / waveDuration) * speed;

                if (this.gpuProgressInWave >= 1) {
                    this.gpuProgressInWave = 0;
                    // Seulement une fraction de tâches est retirée par vague (divergence sérialisée)
                    const processed = Math.min(12, this.batchSize - this.gpu.completed);
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
        return this.viewMode === 'split' && this.logicalWidth < 620;
    }

    getCpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        if (this.viewMode === 'cpu') {
            const ramW = w - 40;
            return {
                x: 20, y: 15, w: ramW, h: h - 30,
                ramX: 20, ramY: 35, ramW: ramW, ramH: 30,
                l3X: 20, l3Y: 80, l3W: ramW, l3H: 45,
                coreX: 20, coreY: 150, coreW: (ramW - 30) / 4, coreH: h - 170, coreGap: 10
            };
        }

        if (this.isStacked()) {
            // Stacked : CPU prend la moitié haute
            const stackH = h * 0.46;
            const ramW = w - 30;
            return {
                x: 15, y: 10, w: ramW, h: stackH,
                ramX: 15, ramY: 28, ramW: ramW, ramH: 22,
                l3X: 15, l3Y: 58, l3W: ramW, l3H: 30,
                coreX: 15, coreY: 100, coreW: (ramW - 24) / 4, coreH: stackH - 95, coreGap: 8
            };
        }

        // Split standard (côte à côte)
        const cpuW = w * 0.47;
        const ramW = cpuW - 30;
        return {
            x: 15, y: 15, w: cpuW, h: h - 30,
            ramX: 15, ramY: 45, ramW: ramW, ramH: 30,
            l3X: 15, l3Y: 95, l3W: ramW, l3H: 45,
            coreX: 15, coreY: h * 0.52, coreW: (ramW - 30) / 4, coreH: h * 0.4, coreGap: 10
        };
    }

    getGpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        if (this.viewMode === 'gpu') {
            const vramW = w - 40;
            return {
                x: 20, y: 15, w: vramW, h: h - 30,
                vramX: 20, vramY: 35, vramW: vramW, vramH: 30,
                gridX: 20, gridY: 85, gridW: vramW, gridH: h - 105,
                smCols: 4, smRows: 4, padding: 8,
                smW: (vramW - 5 * 8) / 4, smH: (h - 105 - 20 - 5 * 8) / 4
            };
        }

        if (this.isStacked()) {
            // Stacked : GPU prend la moitié basse
            const topY = h * 0.53;
            const stackH = h * 0.45;
            const vramW = w - 30;
            const gridH = stackH - 35;
            return {
                x: 15, y: topY, w: vramW, h: stackH,
                vramX: 15, vramY: topY + 18, vramW: vramW, vramH: 22,
                gridX: 15, gridY: topY + 46, gridW: vramW, gridH: gridH,
                smCols: 8, smRows: 2, padding: 4,
                smW: (vramW - 9 * 4) / 8, smH: (gridH - 14 - 3 * 4) / 2
            };
        }

        // Split standard (côte à côte)
        const left = w * 0.52;
        const gpuW = w * 0.46;
        const vramW = gpuW - 30;
        const gridH = h - 140;
        return {
            x: left, y: 15, w: gpuW, h: h - 30,
            vramX: left, vramY: 45, vramW: vramW, vramH: 30,
            gridX: left, gridY: 95, gridW: vramW, gridH: gridH,
            smCols: 4, smRows: 4, padding: 6,
            smW: (vramW - 5 * 6) / 4, smH: (gridH - 22 - 5 * 6) / 4
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

        ctx.clearRect(0, 0, w, h);

        // Fond technique sombre
        ctx.fillStyle = 'rgba(7, 3, 15, 0.96)';
        ctx.fillRect(0, 0, w, h);

        // Grille de repères cybernétiques
        ctx.strokeStyle = 'rgba(189, 0, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 25;
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
                // Ligne de démarcation horizontale
                const midY = h * 0.49;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(15, midY);
                ctx.lineTo(w - 15, midY);
                ctx.stroke();
                ctx.setLineDash([]);

                this.drawCpu(ctx);
                this.drawGpu(ctx);
            } else {
                // Ligne de démarcation verticale
                const midX = w * 0.495;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(midX, 10);
                ctx.lineTo(midX, h - 10);
                ctx.stroke();
                ctx.setLineDash([]);

                // Badge VS
                ctx.fillStyle = 'rgba(15, 10, 25, 0.95)';
                ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(midX, h * 0.5, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px "Courier New", monospace';
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

    drawCpu(ctx) {
        const c = this.getCpuCoordinates();
        const isCompact = this.isStacked();

        const fontUi = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const fontMono = 'ui-monospace, "SF Mono", Consolas, monospace';

        // En-tête CPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11px ' + fontUi;
        ctx.fillStyle = '#00f3ff';
        ctx.fillText('CPU // FAIBLE LATENCE (4 CŒURS @ 4.5 GHz)', c.x, c.y);

        // 1. RAM Système DDR5
        ctx.fillStyle = 'rgba(20, 20, 35, 0.85)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c.ramX, c.ramY, c.ramW, c.ramH);
        ctx.fillRect(c.ramX, c.ramY, c.ramW, c.ramH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px ' + fontUi;
        ctx.fillText('RAM SYSTÈME DDR5 · BUS ÉTROIT 64-BIT (80 Go/s)', c.ramX + 8, c.ramY + (isCompact ? 5 : 8));

        // 2. Cache L3 Partagé & Prédiction de branche
        ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c.l3X, c.l3Y, c.l3W, c.l3H);
        ctx.fillRect(c.l3X, c.l3Y, c.l3W, c.l3H);

        ctx.fillStyle = '#00f3ff';
        ctx.font = 'bold 10px ' + fontUi;
        ctx.fillText('CACHE L3 (32 Mo) + BRANCH PREDICTOR', c.l3X + 8, c.l3Y + (isCompact ? 4 : 8));

        if (!isCompact) {
            ctx.font = '9px ' + fontUi;
            if (this.workload === 'branch') {
                ctx.fillStyle = '#00ff88';
                ctx.fillText('Branch Predictor 96% : Pipeline plein régime sans arrêt', c.l3X + 8, c.l3Y + 24);
            } else {
                ctx.fillStyle = '#c7d2fe';
                ctx.fillText('Anticipation spéculative · Latence unitaire ~10ns', c.l3X + 8, c.l3Y + 24);
            }
        }

        // 3. Les 4 Conduits Pipelines (RAM -> L3 -> Cores)
        const busTopY = c.ramY + c.ramH;
        const busCoreY = c.coreY;

        for (let i = 0; i < 4; i++) {
            const cx = c.coreX + i * (c.coreW + c.coreGap) + c.coreW * 0.5;

            // Conduit de bus passif
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx, busTopY);
            ctx.lineTo(cx, busCoreY);
            ctx.stroke();

            // Conduit central lumineux
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, busTopY);
            ctx.lineTo(cx, busCoreY);
            ctx.stroke();

            // Paquet d'instruction en transit le long du bus séquentiel
            const prog = this.cpu.coreStates[i];
            if (this.isRunning && prog > 0 && prog < 0.45) {
                const t = prog / 0.45;
                const packetY = busTopY + (busCoreY - busTopY) * t;

                // Traînée de vitesse fluide
                const tailLen = Math.min(18, (busCoreY - busTopY) * t);
                const tailGrad = ctx.createLinearGradient(cx, packetY - tailLen, cx, packetY);
                tailGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
                tailGrad.addColorStop(1, 'rgba(0, 243, 255, 0.45)');
                ctx.strokeStyle = tailGrad;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx, packetY - tailLen);
                ctx.lineTo(cx, packetY);
                ctx.stroke();

                // Capsule de données (Instruction scalaire)
                const pW = Math.min(22, c.coreW - 6);
                const pH = 6;
                ctx.fillStyle = '#00f3ff';
                this.drawRoundedRect(ctx, cx - pW * 0.5, packetY - pH * 0.5, pW, pH, 2);
                ctx.fill();

                // Cœur blanc haute densité
                ctx.fillStyle = '#ffffff';
                this.drawRoundedRect(ctx, cx - pW * 0.25, packetY - 1, pW * 0.5, 2, 1);
                ctx.fill();
            }
        }

        // 4. Les 4 Cœurs CPU
        for (let i = 0; i < 4; i++) {
            const coreX = c.coreX + i * (c.coreW + c.coreGap);
            const prog = this.cpu.coreStates[i];
            const isBusy = prog > 0;

            // Bloc Cœur
            ctx.fillStyle = isBusy ? 'rgba(0, 243, 255, 0.12)' : 'rgba(15, 15, 25, 0.95)';
            ctx.strokeStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.35)';
            ctx.lineWidth = isBusy ? 1.5 : 1;

            ctx.strokeRect(coreX, c.coreY, c.coreW, c.coreH);
            ctx.fillRect(coreX, c.coreY, c.coreW, c.coreH);

            // Titre Cœur
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px ' + fontUi;
            ctx.textAlign = 'center';
            ctx.fillText(`CŒUR ${i}`, coreX + c.coreW * 0.5, c.coreY + 6);

            // Oscillogramme Fréquence Horloge ALU (4.5 GHz)
            const aluW = Math.max(20, c.coreW - 10);
            const aluH = isCompact ? 22 : 32;
            const aluY = c.coreY + (isCompact ? 18 : 26);
            const aluX = coreX + 5;

            ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
            ctx.fillRect(aluX, aluY, aluW, aluH);
            ctx.strokeStyle = isBusy ? 'rgba(0, 243, 255, 0.6)' : 'rgba(0, 243, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(aluX, aluY, aluW, aluH);

            if (isBusy && prog >= 0.4) {
                // Onde oscillatoire continue (Fréquence de calcul haute vitesse)
                ctx.beginPath();
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 1.5;
                const midAluY = aluY + aluH * 0.5;
                const amp = aluH * 0.32;
                for (let px = aluX + 2; px <= aluX + aluW - 2; px += 2) {
                    const py = midAluY + Math.sin((px - aluX) * 0.4 + this.animTime * 22) * amp;
                    if (px === aluX + 2) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 8px ' + fontMono;
                ctx.fillText('4.5 GHz', coreX + c.coreW * 0.5, aluY + aluH - 6);
            } else {
                ctx.fillStyle = '#666';
                ctx.font = 'bold 10px ' + fontMono;
                ctx.fillText('ALU', coreX + c.coreW * 0.5, aluY + aluH * 0.5 + 3);
            }

            // Barre de progression dans le cœur
            const pBarH = isCompact ? 4 : 5;
            const pBarY = c.coreY + c.coreH - (isCompact ? 14 : 20);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(coreX + 4, pBarY, c.coreW - 8, pBarH);
            if (prog > 0) {
                ctx.fillStyle = '#00f3ff';
                ctx.fillRect(coreX + 4, pBarY, (c.coreW - 8) * prog, pBarH);
            }

            // Statut texte
            ctx.font = 'bold 8px ' + fontMono;
            ctx.fillStyle = isBusy ? '#00f3ff' : '#555';
            ctx.fillText(isBusy ? '4.5 GHz SÉQ' : 'ATTENTE', coreX + c.coreW * 0.5, c.coreY + c.coreH - (isCompact ? 8 : 10));
        }
    }

    drawGpu(ctx) {
        const g = this.getGpuCoordinates();
        const isCompact = this.isStacked();
        const fontUi = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const fontMono = 'ui-monospace, "SF Mono", Consolas, monospace';

        // En-tête GPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11px ' + fontUi;
        ctx.fillStyle = '#e879f9';
        ctx.fillText('GPU // HAUT DÉBIT SIMT (256 CŒURS @ 1.8 GHz)', g.x, g.y);

        // 1. VRAM HBM3
        ctx.fillStyle = 'rgba(25, 10, 35, 0.85)';
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(g.vramX, g.vramY, g.vramW, g.vramH);
        ctx.fillRect(g.vramX, g.vramY, g.vramW, g.vramH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px ' + fontUi;
        ctx.fillText('VRAM HBM3 · BUS 4096-BIT (3000 Go/s)', g.vramX + 8, g.vramY + (isCompact ? 5 : 8));

        // 2. Bus Ultra-Large VRAM -> SMs (4096-bit)
        const busVramY1 = g.vramY + g.vramH;
        const busVramY2 = g.gridY;
        if (busVramY2 > busVramY1) {
            ctx.fillStyle = 'rgba(217, 70, 239, 0.1)';
            ctx.fillRect(g.vramX + 6, busVramY1, g.vramW - 12, busVramY2 - busVramY1);
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(g.vramX + 6, busVramY1, g.vramW - 12, busVramY2 - busVramY1);

            // 16 Traces de données parallèles dans le bus large
            const numTraces = isCompact ? 8 : 16;
            for (let t = 0; t < numTraces; t++) {
                const tx = g.vramX + 10 + (t + 0.5) * ((g.vramW - 20) / numTraces);
                ctx.strokeStyle = 'rgba(217, 70, 239, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx, busVramY1);
                ctx.lineTo(tx, busVramY2);
                ctx.stroke();
            }
        }

        // 3. Matrice de Streaming Multiprocessors (SM)
        ctx.fillStyle = 'rgba(189, 0, 255, 0.05)';
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(g.gridX, g.gridY, g.gridW, g.gridH);
        ctx.fillRect(g.gridX, g.gridY, g.gridW, g.gridH);

        ctx.fillStyle = '#e879f9';
        ctx.font = 'bold 9px ' + fontUi;
        ctx.textAlign = 'left';
        ctx.fillText('16 STREAMING MULTIPROCESSORS (256 CŒURS SIMT)', g.gridX + 8, g.gridY + 4);

        // Progression de vague SIMT
        const waveProg = this.gpuProgressInWave || 0;
        const waveY = g.gridY + 16 + (g.gridH - 16) * waveProg;

        // Rendu des 16 SMs
        for (let r = 0; r < g.smRows; r++) {
            for (let col = 0; col < g.smCols; col++) {
                const smIndex = r * g.smCols + col;
                const smX = g.gridX + g.padding + col * (g.smW + g.padding);
                const smY = g.gridY + 16 + r * (g.smH + g.padding);

                if (this.workload === 'branch') {
                    // MODE BRANCHE : WARP DIVERGENCE (Sérialisation flagrante)
                    const isEven = (smIndex % 2 === 0);
                    const isFirstBranch = waveProg < 0.5;
                    const isActive = (isFirstBranch && isEven) || (!isFirstBranch && !isEven);

                    if (this.isRunning && this.gpu.completed < this.batchSize) {
                        if (isActive) {
                            ctx.strokeStyle = '#00ff88';
                            ctx.fillStyle = 'rgba(0, 255, 136, 0.18)';
                        } else {
                            // SM Stalled : Orange divergence avec hachures
                            ctx.strokeStyle = '#ffaa00';
                            ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
                        }
                    } else {
                        ctx.strokeStyle = 'rgba(189, 0, 255, 0.25)';
                        ctx.fillStyle = 'rgba(20, 10, 30, 0.7)';
                    }

                    ctx.lineWidth = 1;
                    ctx.strokeRect(smX, smY, g.smW, g.smH);
                    ctx.fillRect(smX, smY, g.smW, g.smH);

                    // Si bloqué par divergence : hachures diagonales d'attente
                    if (this.isRunning && this.gpu.completed < this.batchSize && !isActive) {
                        ctx.strokeStyle = 'rgba(255, 170, 0, 0.25)';
                        ctx.lineWidth = 1;
                        for (let lx = -g.smH; lx < g.smW; lx += 8) {
                            ctx.beginPath();
                            ctx.moveTo(Math.max(smX, smX + lx), smY);
                            ctx.lineTo(Math.min(smX + g.smW, smX + lx + g.smH), smY + g.smH);
                            ctx.stroke();
                        }
                    }

                    // Micro-cœurs
                    const microW = Math.max(2, (g.smW - 8) / 4);
                    const microH = Math.max(2, (g.smH - 8) / 4);
                    for (let mr = 0; mr < 4; mr++) {
                        for (let mc = 0; mc < 4; mc++) {
                            const mX = smX + 1 + mc * (microW + 1);
                            const mY = smY + 1 + mr * (microH + 1);
                            ctx.fillStyle = (this.isRunning && isActive) ? '#00ff88' : ((this.isRunning && !isActive) ? '#ffaa00' : 'rgba(189, 0, 255, 0.25)');
                            ctx.fillRect(mX, mY, microW, microH);
                        }
                    }
                } else {
                    // MODE PARALLÈLE MASSIF : GEMM & PIXEL (Front d'onde SIMT unifié)
                    let strokeColor = 'rgba(189, 0, 255, 0.25)';
                    let fillColor = 'rgba(20, 10, 30, 0.7)';
                    let isWaveInside = false;

                    if (this.isRunning && this.gpu.completed < this.batchSize) {
                        if (waveY >= smY && waveY <= smY + g.smH + 18) {
                            // En plein calcul par le front d'onde
                            isWaveInside = true;
                            strokeColor = '#00ff88';
                            fillColor = 'rgba(0, 255, 136, 0.25)';
                        } else if (waveY > smY + g.smH + 18) {
                            // Vague passée : actif prêt
                            strokeColor = 'rgba(217, 70, 239, 0.5)';
                            fillColor = 'rgba(189, 0, 255, 0.12)';
                        } else {
                            strokeColor = 'rgba(189, 0, 255, 0.25)';
                            fillColor = 'rgba(20, 10, 30, 0.7)';
                        }
                    }

                    ctx.strokeStyle = strokeColor;
                    ctx.fillStyle = fillColor;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(smX, smY, g.smW, g.smH);
                    ctx.fillRect(smX, smY, g.smW, g.smH);

                    // Dessin des 16 micro-cœurs
                    const microW = Math.max(2, (g.smW - 8) / 4);
                    const microH = Math.max(2, (g.smH - 8) / 4);
                    for (let mr = 0; mr < 4; mr++) {
                        for (let mc = 0; mc < 4; mc++) {
                            const mX = smX + 1 + mc * (microW + 1);
                            const mY = smY + 1 + mr * (microH + 1);
                            ctx.fillStyle = isWaveInside ? '#00ff88' : (strokeColor === 'rgba(217, 70, 239, 0.5)' ? '#e879f9' : 'rgba(189, 0, 255, 0.3)');
                            ctx.fillRect(mX, mY, microW, microH);
                        }
                    }
                }
            }
        }

        // 4. Le Rayon du Front d'Onde SIMT (Balayage unifié des 256 threads)
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            if (this.workload === 'gemm' || this.workload === 'pixel') {
                // Faisceau lumineux horizontal traversant toute la largeur du GPU
                const beamH = isCompact ? 16 : 24;
                const waveGrad = ctx.createLinearGradient(0, waveY - beamH * 0.5, 0, waveY + beamH * 0.5);
                waveGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
                waveGrad.addColorStop(0.5, 'rgba(0, 255, 136, 0.45)');
                waveGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');

                ctx.fillStyle = waveGrad;
                ctx.fillRect(g.gridX + 2, waveY - beamH * 0.5, g.gridW - 4, beamH);

                // Ligne laser de front d'onde
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(g.gridX + 4, waveY);
                ctx.lineTo(g.gridX + g.gridW - 4, waveY);
                ctx.stroke();

                // Indicateur Front d'onde
                ctx.fillStyle = '#00ff88';
                ctx.font = 'bold 8px ' + fontMono;
                ctx.textAlign = 'right';
                ctx.fillText('◄ FRONT D\'ONDE SIMT : 256 THREADS ►', g.gridX + g.gridW - 6, Math.max(g.gridY + 14, waveY - 4));
            } else {
                // Indicateur Warp Divergence
                ctx.fillStyle = '#ffaa00';
                ctx.font = 'bold 8px ' + fontMono;
                ctx.textAlign = 'right';
                const branchActive = waveProg < 0.5 ? 'BRANCHE IF' : 'BRANCHE ELSE';
                ctx.fillText(`⚠ WARP DIVERGENCE : ${branchActive} (50% STALL)`, g.gridX + g.gridW - 6, g.gridY + 12);
            }
        }
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

        if (this.isStacked()) {
            if (y < h * 0.48) {
                // Zone CPU
                if (y < 50) {
                    info = '<strong>RAM DDR5</strong> : Bande passante modérée (~80 Go/s), bus 64-bit adapté aux flux séquentiels.';
                } else if (y < 95) {
                    info = '<strong>Cache L3 & Branch Predictor</strong> : SRAM ultra-rapide et spéculation prédisant les embranchements (if/else).';
                } else {
                    info = '<strong>Cœurs CPU</strong> : Fréquence très haute (4.5 GHz) pour minimiser la latence unitaire de calcul.';
                }
            } else {
                // Zone GPU
                if (y < h * 0.62) {
                    info = '<strong>VRAM HBM3</strong> : Bande passante colossale (3000 Go/s) sur bus 4096-bit pour alimenter les tenseurs IA.';
                } else {
                    info = '<strong>16 SMs (256 cœurs)</strong> : Parallélisme SIMT. Calcule des matrices massives simultanément.';
                }
            }
        } else {
            // Split horizontal ou vues focus
            const isCpuZone = this.viewMode === 'cpu' || (this.viewMode === 'split' && x < w * 0.5);
            const isGpuZone = this.viewMode === 'gpu' || (this.viewMode === 'split' && x >= w * 0.5);

            if (isCpuZone) {
                if (y < 85) {
                    info = '<strong>RAM DDR5</strong> : Bande passante modérée (~80 Go/s), bus 64-bit adapté aux flux séquentiels.';
                } else if (y < 145) {
                    info = '<strong>Cache L3 & Branch Predictor</strong> : SRAM ultra-rapide (~10ns) et prédiction des tests logiques.';
                } else {
                    info = '<strong>Cœurs CPU Superscalaires</strong> : Conçus pour exécuter le code séquentiel avec latence minimale.';
                }
            } else if (isGpuZone) {
                if (y < 85) {
                    info = '<strong>VRAM HBM3</strong> : Bande passante de 3000 Go/s sur bus 4096-bit pour charger les poids de LLM.';
                } else {
                    info = '<strong>Matrice de Streaming Multiprocessors</strong> : 256 cœurs SIMT exécutant la même opération en parallèle.';
                }
            }
        }

        if (info) {
            this.tooltip.innerHTML = info;
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = `${Math.min(window.innerWidth - 220, e.clientX + 15)}px`;
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
