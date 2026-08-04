/* ==========================================
   MODULE: MLP STUDIO V3
   Deep Neural Network — Backpropagation from scratch
   Architecture: 1 → 12 → 10 → 8 → 1
   Activation: Leaky ReLU (α=0.01)
   Init: Xavier (sqrt(2/fan_in))
   Loss: MSE
   Normalization: MinMax → [-1, 1] on training range
   ========================================== */

const MLPStudio = {
    isInitialized: false,

    // Datasets
    trainData: [],  // 100 points {x, y}
    valData: [],    // 50 points {x, y}
    normTrain: [],  // normalized
    normVal: [],    // normalized

    // Normalization params (from training data)
    sx: { min: 0, max: 10 },
    sy: { min: 0, max: 1 },

    // Architecture: 1 → 8 → 6 → 8 → 1
    L: [1, 8, 6, 8, 1],

    // Weights and biases per layer transition
    W: [],  // W[l][i][j] = weight from layer l node j to layer l+1 node i
    B: [],  // B[l][i]    = bias of node i in layer l+1

    isTraining: false,
    totalEpochs: 0,
    currentLoss: 0,

    _terms: [],
    _particles: [], // Dynamic flow particles
    _renderedEdges: [], // Stored for hit detection

    init: function(config) {
        if (this.isInitialized) return;
        console.log("🧠 MLP Studio V3 — Init");

        this.buildTermUI();
        this.setupUI();
        this.generateData();

        setTimeout(() => {
            this.initNetwork();
            this.drawChart();
            this.startAnimLoop();
            this.setupTooltip();
        }, 120);

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.drawChart();
            }, 150);
        });

        this.isInitialized = true;
    },

    setupTooltip: function() {
        const canvas = document.getElementById('mlp-canvas');
        const tooltip = document.getElementById('mlp-tooltip');
        if (!canvas || !tooltip) return;

        // On active le hover et le clic
        const handleInteraction = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Facteur de scale au cas où la taille CSS diffère de la résolution du canvas
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;

            let closestEdge = null;
            let minDist = 15; // hitbox de 15 pixels

            // Raycasting très simple : distance point-courbe discrétisée
            for (let edge of this._renderedEdges) {
                // On vérifie le bounding box d'abord pour optimiser
                let minX = Math.min(edge.a.x, edge.b.x) - 15;
                let maxX = Math.max(edge.a.x, edge.b.x) + 15;
                let minY = Math.min(edge.a.y, edge.b.y) - 15;
                let maxY = Math.max(edge.a.y, edge.b.y) + 15;

                if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;

                // Évaluation de 10 points sur la courbe de Bézier
                let cpx = (edge.a.x + edge.b.x) / 2;
                for (let t = 0.1; t < 1; t += 0.1) {
                    let mt = 1 - t;
                    let px = mt*mt*mt*edge.a.x + 3*mt*mt*t*cpx + 3*mt*t*t*cpx + t*t*t*edge.b.x;
                    let py = mt*mt*mt*edge.a.y + 3*mt*mt*t*edge.a.y + 3*mt*t*t*edge.b.y + t*t*t*edge.b.y;
                    
                    let d = Math.hypot(px - cx, py - cy);
                    if (d < minDist) {
                        minDist = d;
                        closestEdge = edge;
                    }
                }
            }

            if (closestEdge) {
                // Calcul de l'activation (forward passe avec une valeur de test : x=5 normalisé)
                let testNormX = this.normX(5);
                let A = this.forward(testNormX);
                let activationResult = A[closestEdge.l + 1][closestEdge.i];

                tooltip.innerHTML = `
                    <h4>Synapse <span>${closestEdge.w > 0 ? '(Excitatrice)' : '(Inhibitrice)'}</span></h4>
                    <p>Poids : <span class="val">${closestEdge.w.toFixed(4)}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p style="color:#00ffff">Neurone Cible H${closestEdge.l+1}-${closestEdge.i}</p>
                    <p>Biais : <span class="val">${closestEdge.bias.toFixed(4)}</span></p>
                    <p>Formule : <code>z / (1 + exp(-z))</code></p>
                    <p>Sortie (x=5) : <span class="val">${activationResult.toFixed(4)}</span></p>
                `;
                tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                tooltip.style.top = (e.clientY - rect.top + 15) + 'px';
                tooltip.classList.add('visible');
                
                // Mettre en évidence la ligne survolée
                canvas.style.cursor = 'pointer';
            } else {
                tooltip.classList.remove('visible');
                canvas.style.cursor = 'default';
            }
        };

        canvas.addEventListener('click', handleInteraction);
        canvas.addEventListener('mousemove', handleInteraction);
        canvas.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
    },

    startAnimLoop: function() {
        const loop = () => {
            this.drawNetwork();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    /* ==========================================================
       FUNCTION BUILDER
       ========================================================== */

    buildTermUI: function() {
        const container = document.getElementById('mlp-terms-container');
        if (!container) return;
        container.innerHTML = '';

        const funcs = [
            { val: 'x', label: 'x' },
            { val: 'x2', label: 'x²' },
            { val: 'x3', label: 'x³' },
            { val: 'sqrt', label: '√x' },
            { val: 'sin', label: 'sin(x)' },
            { val: 'cos', label: 'cos(x)' },
            { val: 'inv', label: '1/(x+1)' },
            { val: 'const', label: '1 (const)' }
        ];

        const defaults = [
            { c: 2, f: 'sin' },
            { c: 0.1, f: 'x2' },
            { c: 0, f: 'x' },
            { c: 0, f: 'x' }
        ];

        for (let i = 0; i < 4; i++) {
            const div = document.createElement('div');
            div.className = 'mlp-term';
            let opts = funcs.map(f =>
                `<option value="${f.val}" ${defaults[i].f === f.val ? 'selected' : ''}>${f.label}</option>`
            ).join('');
            div.innerHTML = `
                <input type="number" class="term-coef" value="${defaults[i].c}" step="0.1">
                <span class="term-mul">×</span>
                <select class="term-func">${opts}</select>
            `;
            container.appendChild(div);
        }
    },

    evalTerm: function(type, x) {
        switch (type) {
            case 'x':     return x;
            case 'x2':    return x * x;
            case 'x3':    return x * x * x;
            case 'sqrt':  return Math.sqrt(Math.max(0, x));
            case 'sin':   return Math.sin(x);
            case 'cos':   return Math.cos(x);
            case 'inv':   return 1 / (x + 1);
            case 'const': return 1;
            default:      return 0;
        }
    },

    evalFunc: function(x) {
        let y = 0;
        for (let i = 0; i < this._terms.length; i++) {
            y += this._terms[i].c * this.evalTerm(this._terms[i].f, x);
        }
        return y;
    },

    termLabel: function(t) {
        const m = { x:'x', x2:'x²', x3:'x³', sqrt:'√x', sin:'sin(x)', cos:'cos(x)', inv:'1/(x+1)', const:'' };
        return m[t] || '';
    },

    generateData: function() {
        // Read terms from UI
        this._terms = [];
        document.querySelectorAll('.mlp-term').forEach(el => {
            this._terms.push({
                c: parseFloat(el.querySelector('.term-coef').value) || 0,
                f: el.querySelector('.term-func').value
            });
        });

        // Display string
        let parts = [];
        this._terms.forEach(t => {
            if (t.c !== 0) {
                let lbl = this.termLabel(t.f);
                parts.push(`${t.c}${lbl ? '·' + lbl : ''}`);
            }
        });
        document.getElementById('mlp-func-display').textContent =
            parts.length > 0 ? "f(x) = " + parts.join(' + ') : "f(x) = 0";

        // Generate 50 evenly-spaced TRAINING points on [0, 10]
        this.trainData = [];
        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < 50; i++) {
            let x = (i / 49) * 10;
            let y = this.evalFunc(x);
            this.trainData.push({ x, y });
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // Generate 25 VALIDATION points (random x in [0, 10])
        this.valData = [];
        for (let i = 0; i < 25; i++) {
            let x = Math.random() * 10;
            let y = this.evalFunc(x);
            this.valData.push({ x, y });
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        let yRange = maxY - minY;
        if (yRange < 1e-6) yRange = 1;
        this.sy = { min: minY - yRange * 0.1, max: maxY + yRange * 0.1 };

        this.normalizeData();
        this.initNetwork();
        this.updateMetrics();
        this.drawChart();
    },

    normX: function(x) { return 2 * (x - this.sx.min) / (this.sx.max - this.sx.min) - 1; },
    normY: function(y) { return 2 * (y - this.sy.min) / (this.sy.max - this.sy.min) - 1; },
    denormY: function(ny) { return (ny + 1) / 2 * (this.sy.max - this.sy.min) + this.sy.min; },

    normalizeData: function() {
        this.normTrain = this.trainData.map(d => ({ x: this.normX(d.x), y: this.normY(d.y) }));
        this.normVal = this.valData.map(d => ({ x: this.normX(d.x), y: this.normY(d.y) }));
    },

    /* ==========================================================
       NEURAL NETWORK ENGINE
       Generalized for L.length-1 layer transitions
       ========================================================== */

    xavier: function(fanIn) {
        return (Math.random() * 2 - 1) * Math.sqrt(2.0 / fanIn);
    },

    initNetwork: function() {
        this.W = [];
        this.B = [];
        for (let l = 0; l < this.L.length - 1; l++) {
            let fanIn = this.L[l];
            let fanOut = this.L[l + 1];
            // W[l] is fanOut x fanIn
            this.W.push(Array.from({ length: fanOut }, () =>
                Array.from({ length: fanIn }, () => this.xavier(fanIn))
            ));
            this.B.push(new Array(fanOut).fill(0));
        }
        this.totalEpochs = 0;
        this.currentLoss = 0;
        this.updateStatus();
    },

    // Swish (SiLU) Activation
    act: function(z) { 
        return z / (1 + Math.exp(-z)); 
    },
    dact: function(z) { 
        let sig = 1 / (1 + Math.exp(-z));
        let swish = z * sig;
        return swish + sig * (1 - swish);
    },

    forward: function(input) {
        let activations = [[input]]; 
        let preActivations = [[input]];

        for (let l = 0; l < this.L.length - 1; l++) {
            let prev = activations[l];
            let fanOut = this.L[l + 1];
            let fanIn = this.L[l];
            let currA = new Array(fanOut);
            let currZ = new Array(fanOut);

            let isLast = (l === this.L.length - 2);

            for (let i = 0; i < fanOut; i++) {
                let z = this.B[l][i];
                for (let j = 0; j < fanIn; j++) {
                    z += prev[j] * this.W[l][i][j];
                }
                currZ[i] = z;
                currA[i] = isLast ? z : this.act(z);
            }
            activations.push(currA);
            preActivations.push(currZ);
        }

        return { A: activations, Z: preActivations };
    },

    trainStep: function(data, lr) {
        let numLayers = this.L.length;
        let m = data.length;
        let totalLoss = 0;

        // Gradient accumulators
        let gW = [];
        let gB = [];
        for (let l = 0; l < numLayers - 1; l++) {
            gW.push(Array.from({ length: this.L[l + 1] }, () => new Array(this.L[l]).fill(0)));
            gB.push(new Array(this.L[l + 1]).fill(0));
        }

        for (let s = 0; s < m; s++) {
            // Forward
            let fwd = this.forward(data[s].x);
            let A = fwd.A;
            let Z = fwd.Z;
            let out = A[numLayers - 1][0];

            let err = out - data[s].y;
            totalLoss += err * err;

            // Backward — compute deltas per layer
            let deltas = new Array(numLayers);
            // Output layer delta (linear activation: dact = 1)
            deltas[numLayers - 1] = [err];

            // Hidden layers (right to left)
            for (let l = numLayers - 2; l >= 1; l--) {
                let size = this.L[l];
                let nextSize = this.L[l + 1];
                deltas[l] = new Array(size);
                for (let j = 0; j < size; j++) {
                    let sum = 0;
                    for (let i = 0; i < nextSize; i++) {
                        sum += deltas[l + 1][i] * this.W[l][i][j];
                    }
                    deltas[l][j] = sum * this.dact(Z[l][j]);
                }
            }

            // Accumulate gradients
            for (let l = 0; l < numLayers - 1; l++) {
                let fanOut = this.L[l + 1];
                let fanIn = this.L[l];
                for (let i = 0; i < fanOut; i++) {
                    gB[l][i] += deltas[l + 1][i];
                    for (let j = 0; j < fanIn; j++) {
                        gW[l][i][j] += deltas[l + 1][i] * A[l][j];
                    }
                }
            }
        }

        // Update weights (SGD) + L1 Pruning (Dropout equivalent)
        let scale = lr / m;
        let l1 = 0.002; // Regularization factor to push weights to 0

        for (let l = 0; l < numLayers - 1; l++) {
            let fanOut = this.L[l + 1];
            let fanIn = this.L[l];
            for (let i = 0; i < fanOut; i++) {
                this.B[l][i] -= scale * gB[l][i];
                for (let j = 0; j < fanIn; j++) {
                    let w = this.W[l][i][j];
                    
                    // Gradient descent step
                    w -= scale * gW[l][i][j];
                    
                    // L1 Penalty (forces unused weights towards 0)
                    w -= scale * l1 * Math.sign(w);
                    
                    // Hard Pruning: if weight is close to 0, "drop" it completely for elegance
                    if (Math.abs(w) < 0.08) w = 0;
                    
                    this.W[l][i][j] = w;
                }
            }
        }

        return totalLoss / m;
    },

    /* ==========================================================
       METRICS
       ========================================================== */

    predict: function(x) {
        let fwd = this.forward(this.normX(x));
        return this.denormY(fwd.A[this.L.length - 1][0]);
    },

    updateMetrics: function() {
        if (this.valData.length === 0) return;

        let n = this.valData.length;
        let sumAbsErr = 0;
        let maxErr = 0;
        let sumSqRes = 0;
        let sumY = 0;

        for (let i = 0; i < n; i++) {
            sumY += this.valData[i].y;
        }
        let meanY = sumY / n;

        let sumSqTot = 0;
        for (let i = 0; i < n; i++) {
            let pred = this.predict(this.valData[i].x);
            let err = Math.abs(pred - this.valData[i].y);
            sumAbsErr += err;
            if (err > maxErr) maxErr = err;
            sumSqRes += (pred - this.valData[i].y) ** 2;
            sumSqTot += (this.valData[i].y - meanY) ** 2;
        }

        let yRange = this.sy.max - this.sy.min;
        if (yRange < 1e-9) yRange = 1;

        // NMAE: MAE normalized by Y range
        let nmae = (sumAbsErr / n) / yRange;
        // R²: Coefficient of determination
        let r2 = sumSqTot > 0 ? 1 - sumSqRes / sumSqTot : 0;

        let el_nmae = document.getElementById('mlp-nmae');
        let el_r2 = document.getElementById('mlp-r2');
        let el_max = document.getElementById('mlp-maxerr');
        if (el_nmae) el_nmae.textContent = (nmae * 100).toFixed(2) + ' %';
        if (el_r2) el_r2.textContent = r2.toFixed(4);
        if (el_max) el_max.textContent = maxErr.toFixed(4);
    },

    /* ==========================================================
       UI CONTROLS
       ========================================================== */

    setupUI: function() {
        document.getElementById('mlp-generate-btn').addEventListener('click', () => this.generateData());
        document.getElementById('mlp-train-btn').addEventListener('click', () => {
            if (!this.isTraining) this.startTraining();
        });
    },

    updateStatus: function() {
        let ed = document.getElementById('mlp-epoch-display');
        let ld = document.getElementById('mlp-loss-display');
        if (ed) ed.textContent = this.totalEpochs;
        if (ld) ld.textContent = this.currentLoss.toFixed(6);
    },

    startTraining: function() {
        if (this.normTrain.length === 0) return;

        let epochsToRun = parseInt(document.getElementById('mlp-epochs').value) || 3000;
        let lr = parseFloat(document.getElementById('mlp-lr').value) || 0.05;

        this.isTraining = true;
        const btn = document.getElementById('mlp-train-btn');
        btn.textContent = 'ENTRAÎNEMENT EN COURS...';
        btn.classList.add('active');

        let done = 0;
        const batchSize = 20; // Keep rendering smooth with deeper network

        const loop = () => {
            for (let i = 0; i < batchSize && done < epochsToRun; i++) {
                this.currentLoss = this.trainStep(this.normTrain, lr);
                done++;
                this.totalEpochs++;
            }

            this.updateStatus();
            this.updateMetrics();
            this.drawChart();

            if (done < epochsToRun) {
                requestAnimationFrame(loop);
            } else {
                this.isTraining = false;
                btn.textContent = "ENTRAÎNER LE RÉSEAU_";
                btn.classList.remove('active');
            }
        };
        requestAnimationFrame(loop);
    },

    /* ==========================================================
       NETWORK VISUALIZATION (Canvas)
       ========================================================== */

    drawNetwork: function() {
        const canvas = document.getElementById('mlp-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width || 500;
            canvas.height = rect.height || 380;
        }
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);

        // Additive blending for WOW glowing effect
        ctx.globalCompositeOperation = 'lighter';

        let nL = this.L.length;
        let mx = 55, my = 25;
        let layerLabels = ['In', 'H1 (8)', 'H2 (6)', 'H3 (8)', 'Out'];

        // X positions
        let lx = [];
        for (let l = 0; l < nL; l++) lx.push(mx + l * ((w - 2 * mx) / (nL - 1)));

        // Y positions
        let nodes = [];
        for (let l = 0; l < nL; l++) {
            let n = this.L[l], pos = [];
            if (n === 1) {
                pos.push({ x: lx[l], y: h / 2 });
            } else {
                let sp = (h - 2 * my - 20) / (n - 1);
                let startY = my + 10;
                for (let i = 0; i < n; i++) pos.push({ x: lx[l], y: startY + i * sp });
            }
            nodes.push(pos);
        }

        // Layer labels
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        for (let l = 0; l < nL; l++) ctx.fillText(layerLabels[l] || '', lx[l], 12);

        // Détection des noeuds morts
        let isNodeAlive = Array.from({length: nL}, (_, l) => new Array(this.L[l]).fill(false));
        isNodeAlive[0][0] = true; // Input toujours vivant
        isNodeAlive[nL - 1][0] = true; // Output toujours vivant

        this._renderedEdges = []; // Reset for hit detection
        for (let l = 0; l < nL - 1; l++) {
            for (let i = 0; i < this.L[l + 1]; i++) {
                let bias = this.B[l][i];
                for (let j = 0; j < this.L[l]; j++) {
                    let wVal = this.W[l][i][j];
                    if (wVal !== 0) {
                        isNodeAlive[l][j] = true;
                        isNodeAlive[l + 1][i] = true;
                        this.drawEdge(ctx, nodes[l][j], nodes[l + 1][i], wVal);
                        this._renderedEdges.push({
                            a: nodes[l][j], 
                            b: nodes[l + 1][i], 
                            w: wVal, 
                            l, i, j, bias
                        });
                    }
                }
            }
        }

        // Spawner des particules aléatoirement sur les connexions actives
        if (this.isTraining && Math.random() < 0.6) {
            let l = Math.floor(Math.random() * (nL - 1));
            let i = Math.floor(Math.random() * this.L[l + 1]);
            let j = Math.floor(Math.random() * this.L[l]);
            let wVal = this.W[l][i][j];
            if (Math.abs(wVal) > 0.05) {
                this._particles.push({
                    l, i, j, t: 0, speed: 0.01 + Math.random() * 0.015, wVal, 
                    trail: [] // On ajoute un trail
                });
            }
        }

        // Mettre à jour et dessiner les particules (Trails lumineux)
        for (let p = this._particles.length - 1; p >= 0; p--) {
            let pt = this._particles[p];
            pt.t += pt.speed;
            
            // Supprimer si arrivé au bout ou si le poids a été pruned
            if (pt.t >= 1 || this.W[pt.l][pt.i][pt.j] === 0) {
                this._particles.splice(p, 1);
                continue;
            }

            let a = nodes[pt.l][pt.j];
            let b = nodes[pt.l + 1][pt.i];
            let cpx = (a.x + b.x) / 2;
            
            // Calcul position Bézier cubique
            let mt = 1 - pt.t;
            let px = mt*mt*mt*a.x + 3*mt*mt*pt.t*cpx + 3*mt*pt.t*pt.t*cpx + pt.t*pt.t*pt.t*b.x;
            let py = mt*mt*mt*a.y + 3*mt*mt*pt.t*a.y + 3*mt*pt.t*pt.t*b.y + pt.t*pt.t*pt.t*b.y;

            pt.trail.push({x: px, y: py});
            if (pt.trail.length > 8) pt.trail.shift(); // Longueur du trail

            // Dessin du trail
            if (pt.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(pt.trail[0].x, pt.trail[0].y);
                for(let k = 1; k < pt.trail.length; k++) {
                    ctx.lineTo(pt.trail[k].x, pt.trail[k].y);
                }
                ctx.strokeStyle = pt.wVal > 0 ? '#00ffff' : '#ff005a';
                ctx.lineWidth = 3 + Math.abs(pt.wVal) * 1.5;
                ctx.shadowColor = ctx.strokeStyle;
                ctx.shadowBlur = 12;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.abs(pt.wVal)*1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; // Noyau blanc étincelant
            ctx.shadowColor = pt.wVal > 0 ? '#00ffff' : '#ff005a';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Revenir en mode normal pour dessiner les noeuds et labels
        ctx.globalCompositeOperation = 'source-over';

        // Draw active nodes only
        this.drawNode(ctx, nodes[0][0], 'x', null, 16, true);
        for (let l = 1; l < nL - 1; l++) {
            for (let i = 0; i < this.L[l]; i++) {
                if (isNodeAlive[l][i]) {
                    let b = this.B[l - 1][i];
                    this.drawNode(ctx, nodes[l][i], b.toFixed(1), b, 10, false);
                }
            }
        }
        this.drawNode(ctx, nodes[nL - 1][0], 'ŷ', null, 16, true);
    },

    drawEdge: function(ctx, a, b, weight) {
        let absW = Math.abs(weight);
        
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        let cpx = (a.x + b.x) / 2;
        ctx.bezierCurveTo(cpx, a.y, cpx, b.y, b.x, b.y);

        // Traits plus épais et plus opaques pour une meilleure lisibilité
        ctx.lineWidth = Math.min(absW * 1.5 + 0.5, 5);
        let alpha = Math.min(absW * 0.5 + 0.3, 0.95);

        ctx.strokeStyle = weight > 0
            ? `rgba(0,255,255,${alpha})`
            : `rgba(255,0,90,${alpha})`;
        ctx.stroke();
    },

    drawNode: function(ctx, pos, label, bias, r, isIO) {
        let color;
        if (isIO) {
            color = label === 'x' ? '#00d4ff' : '#00ffaa';
        } else {
            let t = bias !== null ? Math.min(Math.abs(bias), 2) / 2 : 0;
            color = bias >= 0
                ? `rgba(0,${Math.round(200 + 55*t)},255,1)`
                : `rgba(255,${Math.round(40 + 60*(1-t))},${Math.round(100 + 50*(1-t))},1)`;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,8,15,0.9)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isIO ? 2 : 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = isIO ? 12 : 5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isIO ? '#fff' : 'rgba(255,255,255,0.85)';
        ctx.font = isIO ? 'bold 11px monospace' : '7.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(label), pos.x, pos.y);
    },

    /* ==========================================================
       CHART: Training dots + Validation dots + NN smooth curve
       ========================================================== */

    drawChart: function() {
        const canvas = document.getElementById('mlp-chart-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 500;
        canvas.height = rect.height || 380;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        let px = 45, py = 25;
        let pw = w - 2 * px;
        let ph = h - 2 * py;

        let xMin = 0, xMax = 10;
        let yMin = this.sy.min;
        let yMax = this.sy.max;

        const toC = (mx, my) => ({
            cx: px + ((mx - xMin) / (xMax - xMin)) * pw,
            cy: (h - py) - ((my - yMin) / (yMax - yMin)) * ph
        });

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= 10; gx += 2) {
            let pt = toC(gx, 0);
            ctx.beginPath();
            ctx.moveTo(pt.cx, py);
            ctx.lineTo(pt.cx, h - py);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, h - py); // Y axis
        let axY = (yMin < 0 && yMax > 0) ? toC(0, 0).cy : h - py;
        ctx.moveTo(px, axY);
        ctx.lineTo(w - px, axY); // X axis
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px monospace';
        ctx.fillText('0', px - 3, axY + 12);
        ctx.fillText('10', w - px - 10, axY + 12);
        ctx.fillText(yMax.toFixed(1), 2, py + 4);
        ctx.fillText(yMin.toFixed(1), 2, h - py + 10);

        // NN Prediction: thick semi-transparent curve (300 pts)
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 300; i++) {
            let x = (i / 300) * 10;
            let pred = this.predict(x);
            let pt = toC(x, pred);
            if (first) { ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { ctx.lineTo(pt.cx, pt.cy); }
        }
        ctx.strokeStyle = 'rgba(255,0,60,0.6)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(255,0,60,0.35)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Training dots (Cyan, small)
        ctx.fillStyle = 'rgba(0,255,255,0.85)';
        for (let i = 0; i < this.trainData.length; i++) {
            let pt = toC(this.trainData[i].x, this.trainData[i].y);
            ctx.beginPath();
            ctx.arc(pt.cx, pt.cy, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Validation dots (Gold, small)
        ctx.fillStyle = 'rgba(255,215,0,0.85)';
        for (let i = 0; i < this.valData.length; i++) {
            let pt = toC(this.valData[i].x, this.valData[i].y);
            ctx.beginPath();
            ctx.arc(pt.cx, pt.cy, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

window.MLPStudio = MLPStudio;
