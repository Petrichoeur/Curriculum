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
            smStates: new Array(16).fill(0), // 0: idle, 1: busy, 2: stalled (divergence)
            pcieProgress: 0, // 0..1 Progression du transfert initial Host-to-Device via PCIe
            isTransferringPcie: false,
            divergenceRate: 0,
            timeMs: 0
        };

        this.cpuProgressFloat = 0;
        this.gpuProgressFloat = 0;
        this.gpuProgressInWave = 0;

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
        const targetW = Math.round(this.canvas.clientWidth) || 320;
        const targetH = Math.round(this.canvas.clientHeight) || 380;
        const isMobile = targetW < 640;
        // Plafonnement DPR : 1.5 sur mobile pour éliminer la saturation GPU, 2 sur desktop
        const dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);

        const physicalW = Math.round(targetW * dpr);
        const physicalH = Math.round(targetH * dpr);

        if (this.canvas.width !== physicalW || this.canvas.height !== physicalH) {
            this.canvas.width = physicalW;
            this.canvas.height = physicalH;
        }

        // Échelle haute résolution Retina / HiDPI
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;

        this.logicalWidth = targetW;
        this.logicalHeight = targetH;
    }

    setupUI() {
        // Explications pédagogiques détaillées pour chaque use case
        this.workloadExplanations = {
            gemm: {
                winner: 'Vainqueur : GPU (Parallélisme massif SIMT)',
                speedup: '~8x à 10x plus rapide',
                badgeClass: 'tag-gpu',
                reason: "La multiplication matricielle (C = A × B) est un cas idéal de parallélisme massif : chaque coefficient est le produit scalaire indépendant de lignes et colonnes.",
                architecture: "Le GPU mobilise 256 cœurs SIMT alimentés à 3000 Go/s par sa VRAM HBM3. Attention au goulot PCIe (32 Go/s) : les matrices doivent d'abord être transférées de la RAM vers la VRAM, d'où l'obligation de regrouper en gros batchs."
            },
            pixel: {
                winner: 'Vainqueur : GPU (Indépendance spatiale)',
                speedup: '~6x à 8x plus rapide',
                badgeClass: 'tag-gpu',
                reason: "Chaque pixel d'une image ou fragment de shader est calculé indépendamment de ses voisins (filtrage 2D, seuillage, convolutions, ray tracing).",
                architecture: "Les textures sont copiées de la RAM vers la VRAM via le bus PCIe 5.0 (32 Go/s). Une fois chargées, les 256 cœurs appliquent le shader en parallèle sans jamais re-solliciter la mémoire centrale."
            },
            branch: {
                winner: 'Vainqueur : CPU (Latence & Spéculation)',
                speedup: '~3x à 4x plus rapide',
                badgeClass: 'tag-cpu',
                reason: "Le code décisionnel avec embranchements conditionnels imprévisibles (if / else) casse l'exécution synchrone du GPU et provoque de la 'Warp Divergence'.",
                architecture: "Le CPU opère directement en RAM (80 Go/s) et L3 (10ns) sans aucun transfert PCIe et anticipe les tests à 96%. Le GPU subit la double peine : latence du transfert PCIe + sérialisation SIMT (50% de cœurs gelés)."
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
                if (this.canvas) {
                    if (this.viewMode === 'split') {
                        this.canvas.classList.remove('single-view');
                    } else {
                        this.canvas.classList.add('single-view');
                    }
                }
                this.resizeCanvas();
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
        this.cpu.coreStates = [0, 0, 0, 0];
        this.cpu.timeMs = 0;
        this.cpuProgressFloat = 0;

        this.gpu.completed = 0;
        this.gpu.smStates.fill(0);
        this.gpu.pcieProgress = 0;
        this.gpu.isTransferringPcie = false;
        this.gpu.timeMs = 0;
        this.gpuProgressFloat = 0;
        this.gpuProgressInWave = 0;

        this.updateTelemetry();
        this.draw();
    }

    startSimulation() {
        this.resetSimulation();
        this.isRunning = true;
        this.isPaused = false;
        this.gpu.isTransferringPcie = true;
        this.gpu.pcieProgress = 0;
    }

    update(dt) {
        if (!this.isRunning || this.isPaused) return;

        const speed = Math.max(0.2, this.clockMultiplier);
        const simDt = dt * speed;

        // 1. CPU Update (Séquentiel / 4 Cœurs rapides à 4.5 GHz)
        if (this.cpu.completed < this.batchSize) {
            this.cpu.timeMs += simDt * 1000;

            // Durée de simulation totale du CPU (en secondes réelles à 1.0x)
            // GEMM : 3.0s | Pixel : 2.8s | Branch : 1.3s (victoire CPU grâce au Branch Predictor à 96%)
            const cpuTotalDuration = this.workload === 'branch' ? 1.3 : (this.workload === 'pixel' ? 2.8 : 3.0);
            const cpuRate = this.batchSize / cpuTotalDuration;
            this.cpuProgressFloat = (this.cpuProgressFloat || 0) + cpuRate * simDt;
            this.cpu.completed = Math.min(this.batchSize, Math.floor(this.cpuProgressFloat));

            for (let c = 0; c < this.cpu.cores; c++) {
                if (this.cpu.completed < this.batchSize) {
                    this.cpu.coreStates[c] = (this.animTime * 6 + c * 0.25) % 1.0;
                } else {
                    this.cpu.coreStates[c] = 0;
                }
            }
        } else {
            this.cpu.coreStates = [0, 0, 0, 0];
        }

        // 2. GPU Update (SIMT 256 Cœurs à 1.8 GHz)
        if (this.gpu.completed < this.batchSize) {
            this.gpu.timeMs += simDt * 1000;

            // Phase 1 : Transfert initial Host-to-Device via PCIe 5.0 (32 Go/s)
            // Matérialise le goulot d'étranglement : VRAM en cours de chargement depuis la RAM
            const pcieDuration = 0.45; // 450ms de transfert initial
            if (this.gpu.pcieProgress < 1) {
                this.gpu.isTransferringPcie = true;
                this.gpu.pcieProgress = Math.min(1, this.gpu.pcieProgress + (simDt / pcieDuration));
                this.gpu.smStates.fill(0);
            } else {
                this.gpu.isTransferringPcie = false;

                if (this.workload === 'gemm' || this.workload === 'pixel') {
                    // Parallélisme massif SIMT : calcul rapide en 0.75s à 0.85s (Total GPU = 1.2s à 1.3s)
                    const gpuComputeDuration = this.workload === 'gemm' ? 0.75 : 0.85;
                    const gpuRate = this.batchSize / gpuComputeDuration;
                    this.gpuProgressFloat = (this.gpuProgressFloat || 0) + gpuRate * simDt;
                    this.gpu.completed = Math.min(this.batchSize, Math.floor(this.gpuProgressFloat));

                    this.gpu.smStates.fill(1);
                    this.gpuProgressInWave = (this.animTime * 4) % 1.0;
                } else {
                    // Warp Divergence : calcul ralenti à 2.5s (Total GPU = ~2.95s, CPU gagne en 1.3s)
                    const gpuComputeDuration = 2.5;
                    const gpuRate = this.batchSize / gpuComputeDuration;
                    this.gpuProgressFloat = (this.gpuProgressFloat || 0) + gpuRate * simDt;
                    this.gpu.completed = Math.min(this.batchSize, Math.floor(this.gpuProgressFloat));

                    this.gpuProgressInWave = (this.animTime * 2.5) % 1.0;
                    const isFirstBranch = this.gpuProgressInWave < 0.5;
                    for (let i = 0; i < this.gpu.numSMs; i++) {
                        const isEven = (i % 2 === 0);
                        this.gpu.smStates[i] = (isFirstBranch ? isEven : !isEven) ? 1 : 2;
                    }
                }

                if (this.gpu.completed >= this.batchSize) {
                    this.gpu.smStates.fill(0);
                }
            }
        } else {
            this.gpu.isTransferringPcie = false;
            this.gpu.smStates.fill(0);
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
            if (this.gpu.isTransferringPcie) {
                gpuActiveEl.textContent = 'Goulot PCIe (32 Go/s)...';
            } else if (this.isRunning && this.gpu.completed < this.batchSize) {
                gpuActiveEl.textContent = this.workload === 'branch' ? '128 / 256 (Warp Divergence)' : '256 / 256 (Plein régime)';
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
                if (this.gpu.isTransferringPcie) {
                    verdictEl.innerHTML = `<span style="color:#ffaa00;">TRANSFERT PCIe 5.0 (32 Go/s)</span> — Copie mémoire RAM vers VRAM en cours. Le CPU calcule déjà à 4.5 GHz...`;
                } else {
                    verdictEl.textContent = "Calcul en cours...";
                }
            } else {
                verdictEl.textContent = "Prêt à lancer la simulation.";
            }
        }
    }

    startRenderLoop() {
        let lastTime = performance.now();
        const loop = (now) => {
            const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
            lastTime = now;
            const section = document.getElementById('hardware-lab');
            const isVisible = section && section.classList.contains('active');
            if (isVisible) {
                this.animTime += (this.isRunning && !this.isPaused ? 1.4 * this.clockMultiplier * dt : 0.5 * dt);
                // Redimensionnement uniquement en cas de changement effectif de dimension
                if (this.canvas) {
                    const cw = Math.round(this.canvas.clientWidth);
                    const ch = Math.round(this.canvas.clientHeight);
                    if (cw > 0 && ch > 0 && (cw !== this.logicalWidth || ch !== this.logicalHeight)) {
                        this.resizeCanvas();
                    }
                }
                this.update(dt);
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
            const topY = 100;
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
                ram: { x: cx - 55, y: 44, r: 16 },
                l3: { x: cx + 55, y: 44, r: 17 },
                busY: 74,
                cores: cores
            };
        }

        if (stacked) {
            // Mode empilé mobile : CPU en haut (y: 10 à 240)
            const cx = w * 0.5;
            const topY = 74;
            const coreH = 166;
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
                x: 15, y: 12, w: w - 30, h: 232,
                ram: { x: cx - 50, y: 40, r: 13 },
                l3: { x: cx + 50, y: 40, r: 14 },
                busY: 62,
                cores: cores
            };
        }

        // Split standard (côte à côte desktop)
        const cpuW = w * 0.475;
        const cx = 15 + cpuW * 0.5;
        const topY = 105;
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
            ram: { x: cx - 45, y: 44, r: 16 },
            l3: { x: cx + 45, y: 44, r: 17 },
            busY: 76,
            cores: cores
        };
    }

    getGpuCoordinates() {
        const w = this.logicalWidth;
        const h = this.logicalHeight;
        const stacked = this.isStacked();

        if (this.viewMode === 'gpu') {
            const cx = w * 0.5;
            const vram = { x: cx - 60, y: 44, r: 17 };
            const disp = { x: cx + 60, y: 44, r: 16 };
            const topY = 105;
            const bottomY = h - 25;
            const gridW = Math.min(w - 50, 580);
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
                vram, disp, smNodes,
                dieX: gridX, dieY: topY, dieW: gridW, dieH: gridH
            };
        }

        if (stacked) {
            // Mode empilé mobile : GPU en bas (y: 300 à 580)
            const cx = w * 0.5;
            const gpuTopY = 304;
            const vram = { x: cx - 50, y: gpuTopY + 28, r: 13 };
            const disp = { x: cx + 50, y: gpuTopY + 28, r: 13 };
            const smGridY = gpuTopY + 54;
            const smBottomY = h - 26;
            const gridW = w - 30;
            const gridH = smBottomY - smGridY;
            const smW = (gridW - 3 * 5) / 4;
            const smH = (gridH - 3 * 5) / 4;
            const smNodes = [];
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    smNodes.push({
                        x: 15 + c * (smW + 5),
                        y: smGridY + r * (smH + 5),
                        w: smW,
                        h: smH,
                        index: r * 4 + c
                    });
                }
            }
            return {
                x: 15, y: gpuTopY, w: gridW, h: h - gpuTopY,
                vram, disp, smNodes,
                dieX: 15, dieY: smGridY, dieW: gridW, dieH: gridH
            };
        }

        // Split standard (côte à côte desktop)
        const left = w * 0.525;
        const gpuW = w * 0.46;
        const cx = left + gpuW * 0.5;
        const vram = { x: cx - 45, y: 44, r: 16 };
        const disp = { x: cx + 45, y: 44, r: 16 };
        const topY = 105;
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
            vram, disp, smNodes,
            dieX: left + 8, dieY: topY, dieW: gridW, dieH: gridH
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
        ctx.fillStyle = 'rgba(8, 7, 16, 0.98)';
        ctx.fillRect(0, 0, w, h);

        // Grille cybernétique discrète (1 seul stroke pour 60fps fluide)
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.025)';
        ctx.lineWidth = 1;
        const gridSize = 28;
        ctx.beginPath();
        for (let x = 0; x < w; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        if (this.viewMode === 'split') {
            if (this.isStacked()) {
                this.drawCpu(ctx);
                this.drawPcieBridge(ctx);
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
                this.drawPcieBridge(ctx);
            }
        } else if (this.viewMode === 'cpu') {
            this.drawCpu(ctx);
        } else if (this.viewMode === 'gpu') {
            this.drawPcieBridge(ctx);
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

    drawGlassNode(ctx, node, label, sublabel, color, isActive, isStalled) {
        const { x, y, r } = node;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        if (isActive && !isStalled) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.18;
            ctx.beginPath();
            ctx.arc(x, y, r + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(14, 18, 32, 0.96)' : 'rgba(8, 8, 18, 0.92)';
        ctx.fill();

        ctx.lineWidth = isActive ? 1.6 : 1;
        ctx.strokeStyle = isStalled ? '#ffaa00' : color;
        if (isStalled) {
            ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

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

        if (sublabel && r >= 12) {
            ctx.fillStyle = isStalled ? 'rgba(255, 170, 0, 0.8)' : (isActive ? color : 'rgba(255, 255, 255, 0.45)');
            ctx.font = `6.5px ${fontMono}`;
            ctx.textBaseline = 'top';
            ctx.fillText(sublabel, x, y + 2);
        }

        ctx.restore();
    }

    /* ==========================================
       RENDU DU CPU // RING BUS + 4 CŒURS
       ========================================== */
    drawCpu(ctx) {
        const c = this.getCpuCoordinates();
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';
        const isSmall = this.logicalWidth < 500;

        // En-tête CPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 9.5px ' + fontMono;
        ctx.fillStyle = '#00f3ff';
        const cpuTitle = isSmall ? 'CPU // 4 CŒURS @ 4.5 GHz' : 'CPU // 4 CŒURS SUPERSCALAIRES @ 4.5 GHz';
        ctx.fillText(cpuTitle, c.x, c.y);

        // 1. Enregistrement des nœuds mémoire
        this._renderedNodes.push({ x: c.ram.x, y: c.ram.y, r: c.ram.r, type: 'cpu-ram' });
        this._renderedNodes.push({ x: c.l3.x, y: c.l3.y, r: c.l3.r, type: 'cpu-l3' });

        // Bus mémoire RAM <-> L3
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(c.ram.x + c.ram.r, c.ram.y);
        ctx.lineTo(c.l3.x - c.l3.r, c.l3.y);
        ctx.stroke();
        ctx.restore();

        // 2. Ring Interconnect Bus (Architecture authentique Intel/AMD)
        // Ligne horizontale distribuant les instructions vers les 4 cœurs
        const firstCore = c.cores[0];
        const lastCore = c.cores[3];
        const busLeftX = firstCore.x + firstCore.w * 0.5;
        const busRightX = lastCore.x + lastCore.w * 0.5;
        const busY = c.busY;

        ctx.save();
        // Trace principale du Ring Bus
        ctx.strokeStyle = this.isRunning ? '#00f3ff' : 'rgba(0, 243, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(busLeftX, busY);
        ctx.lineTo(busRightX, busY);
        ctx.stroke();

        // Descente depuis le Cache L3 vers le Ring Bus
        ctx.beginPath();
        ctx.moveTo(c.l3.x, c.l3.y + c.l3.r);
        ctx.lineTo(c.l3.x, busY);
        ctx.stroke();

        // 3. Raccordement et dessin des 4 cœurs
        for (let i = 0; i < 4; i++) {
            const core = c.cores[i];
            const coreCenterX = core.x + core.w * 0.5;

            // Ligne de descente feeder vers le cœur
            ctx.beginPath();
            ctx.moveTo(coreCenterX, busY);
            ctx.lineTo(coreCenterX, core.y);
            ctx.stroke();

            this._renderedNodes.push({
                x: core.x,
                y: core.y,
                w: core.w,
                h: core.h,
                type: 'cpu-core',
                index: i
            });

            const prog = this.cpu.coreStates[i];
            const isBusy = this.isRunning && (this.cpu.completed < this.batchSize) && prog > 0;

            // Paquet d'instruction en transit sur le feeder
            if (isBusy && prog < 0.35) {
                const t = prog / 0.35;
                const py = busY + (core.y - busY) * t;
                ctx.fillStyle = '#00f3ff';
                ctx.beginPath();
                ctx.arc(coreCenterX, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(coreCenterX, py, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Dessin du pod du cœur
            this.drawCpuCorePod(ctx, core, i, prog, isBusy);
        }
        ctx.restore();

        // 4. Rendu des puces RAM et L3
        const isBranch = this.workload === 'branch';
        this.drawGlassNode(ctx, c.ram, 'RAM', 'DDR5', '#00f3ff', this.isRunning, false);
        this.drawGlassNode(ctx, c.l3, isBranch ? 'PRED' : 'L3', isBranch ? '96%' : '32M', isBranch ? '#00ffaa' : '#00f3ff', this.isRunning, false);

        if (isBranch) {
            ctx.font = 'bold 7px ' + fontMono;
            ctx.fillStyle = '#00ffaa';
            ctx.textAlign = 'center';
            const branchPredTxt = this.logicalWidth < 400 ? 'PRED: 96% HIT' : 'BRANCH PREDICTOR : 96% HIT (0 BULLE)';
            ctx.fillText(branchPredTxt, c.l3.x, c.l3.y + c.l3.r + 8);
        }
    }

    drawCpuCorePod(ctx, core, index, prog, isBusy) {
        const { x, y, w, h } = core;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        // Boîtier silicon dark glass
        this.drawRoundedRect(ctx, x, y, w, h, 6);
        ctx.fillStyle = isBusy ? 'rgba(10, 18, 30, 0.96)' : 'rgba(8, 12, 20, 0.92)';
        ctx.fill();

        ctx.lineWidth = isBusy ? 1.5 : 1;
        ctx.strokeStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.25)';
        ctx.stroke();

        // En-tête Cœur
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px ' + fontMono;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`CŒUR ${index}`, x + w * 0.5, y + 4);

        ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(0, 243, 255, 0.45)';
        ctx.font = '6.5px ' + fontMono;
        ctx.fillText('4.5 GHz', x + w * 0.5, y + 14);

        // Étage 1 : Queue d'instructions (Fetch & Decode)
        const qY = y + 25;
        const qH = Math.min(20, Math.max(14, h * 0.12));
        ctx.fillStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.strokeRect(x + 4, qY, w - 8, qH);
        ctx.fillRect(x + 4, qY, w - 8, qH);

        // Micro-indicateurs de décodage
        ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(255, 255, 255, 0.35)';
        ctx.font = '6.5px ' + fontMono;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DÉCODE', x + w * 0.5, qY + qH * 0.5);

        // Étage 2 : Cellule ALU 64-bit (Rendu propre haute technologie)
        const aluY = qY + qH + 5;
        const aluH = Math.min(48, Math.max(28, h * 0.28));
        this.drawRoundedRect(ctx, x + 4, aluY, w - 8, aluH, 4);
        ctx.fillStyle = isBusy ? 'rgba(0, 243, 255, 0.08)' : 'rgba(5, 8, 15, 0.85)';
        ctx.fill();
        ctx.strokeStyle = isBusy ? 'rgba(0, 243, 255, 0.7)' : 'rgba(0, 243, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (isBusy) {
            // Barre d'énergie laser active
            const pulseW = (w - 16) * ((Math.sin(this.animTime * 14 + index) + 1) * 0.5);
            ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
            ctx.fillRect(x + 8, aluY + aluH * 0.5 - 3, pulseW, 6);

            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(x + 8, aluY + aluH * 0.5 - 1.5, pulseW, 3);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px ' + fontMono;
            ctx.fillText('ALU 64-BIT', x + w * 0.5, aluY + aluH - 4);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '6.5px ' + fontMono;
            ctx.fillText('ALU 64-BIT', x + w * 0.5, aluY + aluH * 0.5);
        }

        // Étage 3 : Cache privé L1/L2 SRAM
        const l1Y = aluY + aluH + 5;
        const l1H = Math.min(18, Math.max(12, h * 0.1));
        if (l1Y + l1H < y + h - 16) {
            ctx.fillStyle = 'rgba(0, 243, 255, 0.03)';
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
            ctx.strokeRect(x + 4, l1Y, w - 8, l1H);
            ctx.fillRect(x + 4, l1Y, w - 8, l1H);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '6px ' + fontMono;
            ctx.fillText('L1/L2 SRAM', x + w * 0.5, l1Y + l1H * 0.5);
        }

        // Étage 4 : Jauge d'activité
        const barY = y + h - 12;
        const barW = w - 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x + 4, barY, barW, 3.5);

        if (isBusy) {
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(x + 4, barY, barW * prog, 3.5);
        }

        ctx.font = 'bold 6.5px ' + fontMono;
        ctx.fillStyle = isBusy ? '#00f3ff' : 'rgba(255, 255, 255, 0.3)';
        ctx.textBaseline = 'bottom';
        ctx.fillText(isBusy ? 'ACTIF' : 'ATTENTE', x + w * 0.5, barY - 2);

        ctx.restore();
    }

    /* ==========================================
       PONT DE CONNEXION PCIe 5.0 (RAM -> VRAM)
       Matérialisation du goulot d'étranglement Host-to-Device
       ========================================== */
    drawPcieBridge(ctx) {
        const w = this.logicalWidth;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';
        const isTransferring = this.isRunning && this.gpu.isTransferringPcie;
        const pcieProg = Math.min(1, Math.max(0, this.gpu.pcieProgress || 0));

        if (this.viewMode === 'split') {
            if (this.isStacked()) {
                // Mode empilé mobile : Canal horizontal dédié au centre (y: 260 à 288)
                // Se situe STRICTEMENT entre le CPU (fini à y:240) et le GPU (commence à y:300)
                const channelY = 270;
                const channelH = 22;
                const startX = 20;
                const endX = w - 20;
                const channelW = endX - startX;

                ctx.save();
                // Conduit de bus PCIe horizontal
                this.drawRoundedRect(ctx, startX, channelY - channelH * 0.5, channelW, channelH, 4);
                ctx.fillStyle = isTransferring ? 'rgba(32, 20, 8, 0.95)' : 'rgba(16, 12, 10, 0.85)';
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = isTransferring ? '#ffaa00' : 'rgba(255, 170, 0, 0.4)';
                ctx.stroke();

                // Lignes de rail internes
                ctx.strokeStyle = isTransferring ? 'rgba(255, 170, 0, 0.45)' : 'rgba(255, 170, 0, 0.18)';
                ctx.beginPath();
                ctx.moveTo(startX + 4, channelY - 3);
                ctx.lineTo(endX - 4, channelY - 3);
                ctx.moveTo(startX + 4, channelY + 3);
                ctx.lineTo(endX - 4, channelY + 3);
                ctx.stroke();

                // Paquets dorés en streaming Host-to-Device
                if (isTransferring) {
                    for (let p = 0; p < 5; p++) {
                        const t = (this.animTime * 2.5 + p * 0.2) % 1.0;
                        const px = startX + channelW * t;
                        ctx.fillStyle = '#ffaa00';
                        ctx.beginPath();
                        ctx.arc(px, channelY, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(px, channelY, 1.4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Badge central
                const badgeW = Math.min(220, channelW - 30);
                const badgeH = 18;
                const badgeX = (w * 0.5) - badgeW * 0.5;
                const badgeY = channelY - badgeH * 0.5;

                this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
                ctx.fillStyle = 'rgba(12, 9, 6, 0.96)';
                ctx.fill();
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = isTransferring ? '#ffaa00' : 'rgba(255, 170, 0, 0.5)';
                ctx.stroke();

                ctx.font = 'bold 7px ' + fontMono;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (isTransferring) {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillText('PCIe 5.0 // TRANSFERT H2D...', w * 0.5, channelY - 3);
                    const barW = badgeW - 14;
                    ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
                    ctx.fillRect((w * 0.5) - barW * 0.5, channelY + 3.5, barW, 2);
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect((w * 0.5) - barW * 0.5, channelY + 3.5, barW * pcieProg, 2);
                } else {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillText('BUS PCIe 5.0 // 32 Go/s (GOULOT H2D)', w * 0.5, channelY);
                }

                this._renderedNodes.push({ x: badgeX, y: badgeY, w: badgeW, h: badgeH, type: 'pcie-bus' });
                this._renderedNodes.push({ x: startX, y: channelY - 10, w: channelW, h: 20, type: 'pcie-bus' });
                ctx.restore();
            } else {
                // Mode côte à côte standard desktop
                const c = this.getCpuCoordinates();
                const g = this.getGpuCoordinates();
                const startX = c.ram.x + c.ram.r;
                const endX = g.vram.x - g.vram.r;
                const y = c.ram.y;
                const midX = w * 0.495;
                const trackW = Math.max(10, endX - startX);
                const trackY = y - 9;

                ctx.save();
                this.drawRoundedRect(ctx, startX, trackY, trackW, 18, 4);
                ctx.fillStyle = isTransferring ? 'rgba(32, 20, 8, 0.95)' : 'rgba(16, 12, 10, 0.85)';
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = isTransferring ? 'rgba(255, 170, 0, 0.9)' : 'rgba(255, 170, 0, 0.35)';
                ctx.stroke();

                // Lignes de bus
                ctx.strokeStyle = isTransferring ? 'rgba(255, 170, 0, 0.5)' : 'rgba(255, 170, 0, 0.18)';
                ctx.beginPath();
                ctx.moveTo(startX + 4, y - 3);
                ctx.lineTo(endX - 4, y - 3);
                ctx.moveTo(startX + 4, y + 3);
                ctx.lineTo(endX - 4, y + 3);
                ctx.stroke();

                if (isTransferring) {
                    for (let p = 0; p < 5; p++) {
                        const t = (this.animTime * 2.4 + p * 0.2) % 1.0;
                        const px = startX + trackW * t;
                        ctx.fillStyle = '#ffaa00';
                        ctx.beginPath();
                        ctx.arc(px, y, 3.2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(px, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Badge PCIe central
                const badgeW = Math.min(150, Math.max(120, trackW * 0.55));
                const badgeH = 20;
                const badgeX = midX - badgeW * 0.5;
                const badgeY = y - badgeH * 0.5;

                this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
                ctx.fillStyle = 'rgba(15, 11, 7, 0.96)';
                ctx.fill();
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = isTransferring ? '#ffaa00' : 'rgba(255, 170, 0, 0.5)';
                ctx.stroke();

                ctx.font = 'bold 7px ' + fontMono;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (isTransferring) {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillText('PCIe 5.0 // TRANSFERT H2D...', midX, y - 3);
                    const barW = badgeW - 14;
                    ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
                    ctx.fillRect(midX - barW * 0.5, y + 4, barW, 2);
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillRect(midX - barW * 0.5, y + 4, barW * pcieProg, 2);
                } else {
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillText('PCIe 5.0 // 32 Go/s (GOULOT)', midX, y);
                }

                this._renderedNodes.push({ x: badgeX, y: badgeY, w: badgeW, h: badgeH, type: 'pcie-bus' });
                this._renderedNodes.push({ x: startX, y: trackY, w: trackW, h: 18, type: 'pcie-bus' });
                ctx.restore();
            }
        } else if (this.viewMode === 'gpu') {
            // Vue GPU isolée : entrée Host RAM -> PCIe -> VRAM
            const g = this.getGpuCoordinates();
            const hostRam = { x: 50, y: g.vram.y, r: 15 };
            const startX = hostRam.x + hostRam.r;
            const endX = g.vram.x - g.vram.r;
            const y = g.vram.y;
            const trackW = Math.max(10, endX - startX);
            const midX = (startX + endX) * 0.5;

            ctx.save();
            this.drawGlassNode(ctx, hostRam, 'RAM', 'HOST', '#00f3ff', this.isRunning, false);
            this._renderedNodes.push({ x: hostRam.x, y: hostRam.y, r: hostRam.r, type: 'cpu-ram' });

            this.drawRoundedRect(ctx, startX, y - 9, trackW, 18, 4);
            ctx.fillStyle = isTransferring ? 'rgba(32, 20, 8, 0.95)' : 'rgba(16, 12, 10, 0.85)';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = isTransferring ? '#ffaa00' : 'rgba(255, 170, 0, 0.35)';
            ctx.stroke();

            if (isTransferring) {
                for (let p = 0; p < 4; p++) {
                    const t = (this.animTime * 2.2 + p * 0.25) % 1.0;
                    const px = startX + trackW * t;
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(px, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(px, y, 1.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            const badgeW = 135;
            const badgeH = 18;
            const badgeX = midX - badgeW * 0.5;
            const badgeY = y - badgeH * 0.5;

            this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
            ctx.fillStyle = 'rgba(15, 11, 7, 0.96)';
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = isTransferring ? '#ffaa00' : 'rgba(255, 170, 0, 0.5)';
            ctx.stroke();

            ctx.font = 'bold 7px ' + fontMono;
            ctx.fillStyle = '#ffaa00';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isTransferring ? 'PCIe // TRANSFERT H2D...' : 'PCIe 5.0 (32 Go/s)', midX, y);

            this._renderedNodes.push({ x: badgeX, y: badgeY, w: badgeW, h: badgeH, type: 'pcie-bus' });
            this._renderedNodes.push({ x: startX, y: y - 9, w: trackW, h: 18, type: 'pcie-bus' });
            ctx.restore();
        }
    }

    /* ==========================================
       RENDU DU GPU // 16 STREAMING MULTIPROCESSORS (256 CŒURS)
       ========================================== */
    drawGpu(ctx) {
        const g = this.getGpuCoordinates();
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';
        const isSmall = this.logicalWidth < 500;

        // En-tête GPU
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 9.5px ' + fontMono;
        ctx.fillStyle = '#e879f9';
        const gpuTitle = isSmall ? 'GPU // 16 SMs (256 CŒURS)' : 'GPU // 16 STREAMING MULTIPROCESSORS (256 CŒURS)';
        ctx.fillText(gpuTitle, g.x, g.y);

        // 1. Enregistrement VRAM & Dispatcher
        this._renderedNodes.push({ x: g.vram.x, y: g.vram.y, r: g.vram.r, type: 'gpu-vram' });
        this._renderedNodes.push({ x: g.disp.x, y: g.disp.y, r: g.disp.r, type: 'gpu-disp' });

        // Bus mémoire ultra-large VRAM <-> Warp Scheduler (3000 Go/s)
        ctx.save();
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(g.vram.x + g.vram.r, g.vram.y);
        ctx.lineTo(g.disp.x - g.disp.r, g.disp.y);
        ctx.stroke();

        if (this.isRunning && this.gpu.completed < this.batchSize && !this.gpu.isTransferringPcie) {
            const pt = (this.animTime * 3) % 1.0;
            const px = (g.vram.x + g.vram.r) + (g.disp.x - g.disp.r - (g.vram.x + g.vram.r)) * pt;
            ctx.fillStyle = '#e879f9';
            ctx.beginPath();
            ctx.arc(px, g.vram.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 2. Colonne de distribution SIMT (Architecture propre orthogonale)
        // Relie le Warp Scheduler aux 4 rangées de SMs
        const isBranch = this.workload === 'branch';
        const waveProg = this.gpuProgressInWave || 0;
        const isFirstBranch = waveProg < 0.5;

        // 3. Rendu des 16 SMs avec leurs 256 micro-cœurs
        for (let k = 0; k < g.smNodes.length; k++) {
            const sm = g.smNodes[k];
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
            const isStalled = isBranch && this.isRunning && (this.gpu.completed < this.batchSize) && !isActive && !this.gpu.isTransferringPcie;
            const isSmActive = this.isRunning && (this.gpu.completed < this.batchSize) && (!isBranch || isActive) && !this.gpu.isTransferringPcie;

            this.drawSmPod(ctx, sm, k, isSmActive, isStalled);
        }

        // 4. Rendu des nœuds VRAM & Warp Scheduler
        this.drawGlassNode(ctx, g.vram, 'VRAM', 'HBM3', '#e879f9', this.isRunning, false);
        this.drawGlassNode(ctx, g.disp, 'WARP', 'SCHED', '#bd00ff', this.isRunning, false);

        // 5. Bannière d'état HUD au bas du GPU
        if (this.isRunning && this.gpu.completed < this.batchSize) {
            ctx.font = 'bold 7.5px ' + fontMono;
            ctx.textAlign = 'center';
            const bannerCx = this.isStacked() ? (this.logicalWidth * 0.5) : (g.x + g.w * 0.5);
            const bannerY = this.isStacked() ? (this.logicalHeight - 9) : (g.y + g.h - 4);
            const isNarrow = this.logicalWidth < 440;

            if (this.gpu.isTransferringPcie) {
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(isNarrow ? 'GOULOT PCIe // CHARGEMENT VRAM (32 Go/s)...' : 'GOULOT PCIe 5.0 // CHARGEMENT DE LA VRAM (32 Go/s)...', bannerCx, bannerY);
            } else if (isBranch) {
                ctx.fillStyle = '#ffaa00';
                const branchTxt = isFirstBranch ? 'PHASE 1 : IF (128 CŒURS OFF)' : 'PHASE 2 : ELSE (128 CŒURS OFF)';
                ctx.fillText(isNarrow ? `DIVERGENCE // ${branchTxt}` : `WARP DIVERGENCE // ${branchTxt}`, bannerCx, bannerY);
            } else {
                ctx.fillStyle = '#00ffaa';
                ctx.fillText(isNarrow ? 'SIMT // 256 CŒURS EN PARALLÈLE' : 'SIMT LOCKSTEP // 16 SMs × 16 ALUs = 256 CŒURS', bannerCx, bannerY);
            }
        }
    }

    drawSmPod(ctx, sm, index, isSmActive, isStalled) {
        const { x, y, w, h } = sm;
        const fontMono = 'ui-monospace, "Space Mono", "SF Mono", Consolas, monospace';

        ctx.save();

        // Boîtier silicon SM
        this.drawRoundedRect(ctx, x, y, w, h, 4);
        ctx.fillStyle = isSmActive ? 'rgba(14, 24, 38, 0.95)' : (isStalled ? 'rgba(28, 16, 12, 0.94)' : 'rgba(12, 10, 22, 0.92)');
        ctx.fill();

        ctx.lineWidth = isSmActive || isStalled ? 1.4 : 1;
        ctx.strokeStyle = isStalled ? '#ffaa00' : (isSmActive ? '#00ffaa' : 'rgba(217, 70, 239, 0.3)');
        if (isStalled) {
            ctx.setLineDash([2, 2]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // En-tête SM
        ctx.font = 'bold 6.5px ' + fontMono;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isStalled ? '#ffaa00' : (isSmActive ? '#00ffaa' : '#e879f9');
        const smLabel = `SM-${index < 10 ? '0' + index : index}`;
        ctx.fillText(smLabel, x + 3.5, y + 2.5);

        ctx.font = 'bold 6px ' + fontMono;
        ctx.textAlign = 'right';
        if (isStalled) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText('STALL', x + w - 3.5, y + 2.5);
        } else if (isSmActive) {
            ctx.fillStyle = '#00ffaa';
            ctx.fillText('16 ALUs', x + w - 3.5, y + 2.5);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('16 ALUs', x + w - 3.5, y + 2.5);
        }

        // Matrice 4x4 des 16 micro-cœurs SIMT (16 micro-cœurs x 16 SMs = 256 cœurs au total)
        const padX = x + 3.5;
        const padY = y + 12;
        const innerW = w - 7;
        const innerH = h - 14;
        const cellW = innerW / 4;
        const cellH = innerH / 4;
        const microR = Math.max(1.5, Math.min(2.8, cellW * 0.26, cellH * 0.26));

        if (isSmActive) {
            // Passe 1 : Halo lumineux vert néon
            ctx.fillStyle = 'rgba(0, 255, 170, 0.28)';
            ctx.beginPath();
            for (let mr = 0; mr < 4; mr++) {
                for (let mc = 0; mc < 4; mc++) {
                    const cx = padX + (mc + 0.5) * cellW;
                    const cy = padY + (mr + 0.5) * cellH;
                    ctx.moveTo(cx + microR * 1.4, cy);
                    ctx.arc(cx, cy, microR * 1.4, 0, Math.PI * 2);
                }
            }
            ctx.fill();

            // Passe 2 : Cœur émeraude
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            for (let mr = 0; mr < 4; mr++) {
                for (let mc = 0; mc < 4; mc++) {
                    const cx = padX + (mc + 0.5) * cellW;
                    const cy = padY + (mr + 0.5) * cellH;
                    ctx.moveTo(cx + microR, cy);
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                }
            }
            ctx.fill();

            // Passe 3 : Centre blanc chaud
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let mr = 0; mr < 4; mr++) {
                for (let mc = 0; mc < 4; mc++) {
                    const cx = padX + (mc + 0.5) * cellW;
                    const cy = padY + (mr + 0.5) * cellH;
                    ctx.moveTo(cx + microR * 0.45, cy);
                    ctx.arc(cx, cy, microR * 0.45, 0, Math.PI * 2);
                }
            }
            ctx.fill();
        } else if (isStalled) {
            ctx.fillStyle = 'rgba(255, 170, 0, 0.22)';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let mr = 0; mr < 4; mr++) {
                for (let mc = 0; mc < 4; mc++) {
                    const cx = padX + (mc + 0.5) * cellW;
                    const cy = padY + (mr + 0.5) * cellH;
                    ctx.moveTo(cx + microR, cy);
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                }
            }
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(217, 70, 239, 0.25)';
            ctx.beginPath();
            for (let mr = 0; mr < 4; mr++) {
                for (let mc = 0; mc < 4; mc++) {
                    const cx = padX + (mc + 0.5) * cellW;
                    const cy = padY + (mr + 0.5) * cellH;
                    ctx.moveTo(cx + microR, cy);
                    ctx.arc(cx, cy, microR, 0, Math.PI * 2);
                }
            }
            ctx.fill();
        }

        ctx.restore();
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
                // Pod rectangulaire (cpu-core ou gpu-sm ou pcie-bus)
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
            } else if (closestNode.type === 'pcie-bus') {
                html = `
                    <h4>Bus PCIe 5.0 <span>Host-to-Device (H2D)</span></h4>
                    <p>Bande passante : <span class="val">32 Go/s (vs 3000 Go/s VRAM)</span></p>
                    <p>Rôle : <span class="val">Transfert cudaMemcpy (RAM vers VRAM)</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Goulot d'étranglement : Avant de pouvoir calculer, le GPU doit impérativement copier matrices ou données depuis la RAM centrale via le bus PCIe. Sans un lot de calcul suffisant (batch), cette copie neutralise le gain du GPU.</p>
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
