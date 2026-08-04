/* ==========================================
   MODULE: MLP STUDIO V2 — CORRECTED
   Deep Neural Network with proper Backpropagation
   Architecture: 1 → 8 → 8 → 1
   Activation: tanh (hidden), Linear (output)
   Init: Xavier
   Normalization: MinMax to [-1, 1] on TRAINING range
   ========================================== */

const MLPStudio = {
    isInitialized: false,

    // Dataset
    rawData: [],   // {x, y} — training points (x in [0,10])
    normData: [],  // {x, y} — scaled to [-1, 1]

    // Normalization params (computed from TRAINING data only)
    trainScaleX: { min: 0, max: 10 },
    trainScaleY: { min: 0, max: 1 },

    // Chart range (extends beyond training for extrapolation demo)
    chartXMax: 20,

    // Network topology: 1 → 8 → 8 → 1
    nn: {
        h1Size: 8,
        h2Size: 8,
        // Layer 1: input(1) → hidden1(8)
        W1: [], B1: [],
        // Layer 2: hidden1(8) → hidden2(8)
        W2: [], B2: [],
        // Layer 3: hidden2(8) → output(1)
        W3: [], B3: []
    },

    isTraining: false,
    totalEpochs: 0,
    currentLoss: 0,
    funcString: "f(x) = ...",

    // Cache for term evaluation during chart drawing
    _cachedTerms: [],

    init: function(config) {
        if (this.isInitialized) return;
        console.log("🧠 MLP Studio V2 (Corrected) — Init");

        this.buildTermUI();
        this.setupUI();
        this.generateData();

        setTimeout(() => {
            this.initNetwork();
            this.drawNetwork();
            this.drawChart();
        }, 100);

        window.addEventListener('resize', () => {
            if (document.getElementById('mlp-studio') &&
                document.getElementById('mlp-studio').classList.contains('active')) {
                this.drawNetwork();
                this.drawChart();
            }
        });

        this.isInitialized = true;
    },

    /* ==========================================================
       FUNCTION BUILDER
       ========================================================== */

    buildTermUI: function() {
        const container = document.getElementById('mlp-terms-container');
        if (!container) return;
        container.innerHTML = '';

        const funcs = [
            { val: 'x',     label: 'x' },
            { val: 'x2',    label: 'x²' },
            { val: 'x3',    label: 'x³' },
            { val: 'sqrt',  label: '√x' },
            { val: 'sin',   label: 'sin(x)' },
            { val: 'cos',   label: 'cos(x)' },
            { val: 'inv',   label: '1/(x+1)' },
            { val: 'const', label: '1 (const)' }
        ];

        const defaults = [
            { c: 2,   f: 'sin' },
            { c: 0.1, f: 'x2' },
            { c: 0,   f: 'x' },
            { c: 0,   f: 'x' }
        ];

        for (let i = 0; i < 4; i++) {
            const div = document.createElement('div');
            div.className = 'mlp-term';
            let options = funcs.map(f =>
                `<option value="${f.val}" ${defaults[i].f === f.val ? 'selected' : ''}>${f.label}</option>`
            ).join('');
            div.innerHTML = `
                <input type="number" class="term-coef" value="${defaults[i].c}" step="0.1">
                <span class="term-mul">×</span>
                <select class="term-func">${options}</select>
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
        for (let i = 0; i < this._cachedTerms.length; i++) {
            y += this._cachedTerms[i].c * this.evalTerm(this._cachedTerms[i].f, x);
        }
        return y;
    },

    termLabel: function(type) {
        const map = { x:'x', x2:'x²', x3:'x³', sqrt:'√x', sin:'sin(x)', cos:'cos(x)', inv:'1/(x+1)', const:'' };
        return map[type] || '';
    },

    generateData: function() {
        // Read terms from UI
        this._cachedTerms = [];
        document.querySelectorAll('.mlp-term').forEach(el => {
            this._cachedTerms.push({
                c: parseFloat(el.querySelector('.term-coef').value) || 0,
                f: el.querySelector('.term-func').value
            });
        });

        // Build display string
        let parts = [];
        this._cachedTerms.forEach(t => {
            if (t.c !== 0) {
                let lbl = this.termLabel(t.f);
                parts.push(`${t.c}${lbl ? '·' + lbl : ''}`);
            }
        });
        this.funcString = parts.length > 0 ? "f(x) = " + parts.join(' + ') : "f(x) = 0";
        document.getElementById('mlp-func-display').textContent = this.funcString;

        // Sample 200 training points on x ∈ [0, 10]
        this.rawData = [];
        let minY = Infinity, maxY = -Infinity;

        for (let i = 0; i <= 200; i++) {
            let x = (i / 200) * 10; // x from 0 to 10
            let y = this.evalFunc(x);
            this.rawData.push({ x, y });
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        // Also scan extrapolation range for chart Y scaling
        for (let x = 10; x <= 20; x += 0.1) {
            let y = this.evalFunc(x);
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        let yRange = maxY - minY;
        if (yRange < 1e-6) yRange = 1;

        this.trainScaleX = { min: 0, max: 10 };
        this.trainScaleY = { min: minY - yRange * 0.1, max: maxY + yRange * 0.1 };

        this.normalizeData();
        this.initNetwork();
        this.drawChart();
    },

    // Normalize to [-1, 1] based on TRAINING range
    normalizeX: function(x) {
        return 2 * (x - this.trainScaleX.min) / (this.trainScaleX.max - this.trainScaleX.min) - 1;
    },
    normalizeY: function(y) {
        return 2 * (y - this.trainScaleY.min) / (this.trainScaleY.max - this.trainScaleY.min) - 1;
    },
    denormalizeY: function(ny) {
        return (ny + 1) / 2 * (this.trainScaleY.max - this.trainScaleY.min) + this.trainScaleY.min;
    },

    normalizeData: function() {
        this.normData = this.rawData.map(d => ({
            x: this.normalizeX(d.x),
            y: this.normalizeY(d.y)
        }));
    },

    /* ==========================================================
       NEURAL NETWORK — MATH ENGINE
       Activation: tanh (hidden layers), Linear (output)
       Init: Xavier (sqrt(2/fan_in))
       Loss: MSE
       Optimizer: Batch Gradient Descent
       ========================================================== */

    xavier: function(fanIn) {
        // Xavier/Glorot init scaled by sqrt(2/fan_in)
        let scale = Math.sqrt(2.0 / fanIn);
        return (Math.random() * 2 - 1) * scale;
    },

    initNetwork: function() {
        let h1 = this.nn.h1Size;
        let h2 = this.nn.h2Size;

        // Layer 1: 1 input → h1 hidden (fan_in = 1)
        this.nn.W1 = Array.from({ length: h1 }, () => this.xavier(1));
        this.nn.B1 = new Array(h1).fill(0);

        // Layer 2: h1 → h2 (fan_in = h1)
        this.nn.W2 = Array.from({ length: h2 }, () =>
            Array.from({ length: h1 }, () => this.xavier(h1))
        );
        this.nn.B2 = new Array(h2).fill(0);

        // Layer 3: h2 → 1 output (fan_in = h2)
        this.nn.W3 = Array.from({ length: h2 }, () => this.xavier(h2));
        this.nn.B3 = [0];

        this.totalEpochs = 0;
        this.currentLoss = 0;
        this.updateStatus();
    },

    // Activation: tanh and its derivative
    act: function(x) {
        return Math.tanh(x);
    },
    dact: function(y) {
        // y = tanh(x), dtanh/dx = 1 - tanh²(x) = 1 - y²
        return 1 - y * y;
    },

    forward: function(x) {
        let h1 = this.nn.h1Size;
        let h2 = this.nn.h2Size;

        // Hidden layer 1
        let a1 = new Array(h1);
        for (let i = 0; i < h1; i++) {
            a1[i] = this.act(x * this.nn.W1[i] + this.nn.B1[i]);
        }

        // Hidden layer 2
        let a2 = new Array(h2);
        for (let i = 0; i < h2; i++) {
            let z = this.nn.B2[i];
            for (let j = 0; j < h1; j++) {
                z += a1[j] * this.nn.W2[i][j];
            }
            a2[i] = this.act(z);
        }

        // Output (linear activation)
        let out = this.nn.B3[0];
        for (let i = 0; i < h2; i++) {
            out += a2[i] * this.nn.W3[i];
        }

        return { a1, a2, out };
    },

    trainStep: function(data, lr) {
        let h1 = this.nn.h1Size;
        let h2 = this.nn.h2Size;
        let m = data.length;
        let totalLoss = 0;

        // Gradient accumulators
        let gW1 = new Array(h1).fill(0);
        let gB1 = new Array(h1).fill(0);

        let gW2 = Array.from({ length: h2 }, () => new Array(h1).fill(0));
        let gB2 = new Array(h2).fill(0);

        let gW3 = new Array(h2).fill(0);
        let gB3 = 0;

        for (let s = 0; s < m; s++) {
            let x = data[s].x;
            let target = data[s].y;

            // ---- Forward ----
            let { a1, a2, out } = this.forward(x);

            // ---- Loss (MSE) ----
            let err = out - target;
            totalLoss += err * err;

            // ---- Backward ----

            // δ_out = dLoss/dOut = 2*(out - target)/m → simplified to (out - target)
            let delta_out = err;

            // Gradients for Layer 3 (a2 → out, linear)
            gB3 += delta_out;
            for (let i = 0; i < h2; i++) {
                gW3[i] += delta_out * a2[i];
            }

            // δ for hidden layer 2
            let delta2 = new Array(h2);
            for (let i = 0; i < h2; i++) {
                delta2[i] = delta_out * this.nn.W3[i] * this.dact(a2[i]);
            }

            // Gradients for Layer 2 (a1 → a2)
            for (let i = 0; i < h2; i++) {
                gB2[i] += delta2[i];
                for (let j = 0; j < h1; j++) {
                    gW2[i][j] += delta2[i] * a1[j];
                }
            }

            // δ for hidden layer 1
            let delta1 = new Array(h1);
            for (let j = 0; j < h1; j++) {
                let sum = 0;
                for (let i = 0; i < h2; i++) {
                    sum += delta2[i] * this.nn.W2[i][j];
                }
                delta1[j] = sum * this.dact(a1[j]);
            }

            // Gradients for Layer 1 (x → a1)
            for (let j = 0; j < h1; j++) {
                gB1[j] += delta1[j];
                gW1[j] += delta1[j] * x;
            }
        }

        // ---- Update weights (SGD) ----
        let scale = lr / m;

        for (let i = 0; i < h1; i++) {
            this.nn.W1[i] -= scale * gW1[i];
            this.nn.B1[i] -= scale * gB1[i];
        }
        for (let i = 0; i < h2; i++) {
            this.nn.B2[i] -= scale * gB2[i];
            for (let j = 0; j < h1; j++) {
                this.nn.W2[i][j] -= scale * gW2[i][j];
            }
        }
        for (let i = 0; i < h2; i++) {
            this.nn.W3[i] -= scale * gW3[i];
        }
        this.nn.B3[0] -= scale * gB3;

        return totalLoss / m;
    },

    /* ==========================================================
       UI CONTROLS
       ========================================================== */

    setupUI: function() {
        document.getElementById('mlp-generate-btn').addEventListener('click', () => {
            this.generateData();
        });
        document.getElementById('mlp-train-btn').addEventListener('click', () => {
            if (this.isTraining) return;
            this.startTraining();
        });
    },

    updateStatus: function() {
        let ed = document.getElementById('mlp-epoch-display');
        let ld = document.getElementById('mlp-loss-display');
        if (ed) ed.textContent = this.totalEpochs;
        if (ld) ld.textContent = this.currentLoss.toFixed(6);
    },

    startTraining: function() {
        if (this.normData.length === 0) return;

        let epochsToRun = parseInt(document.getElementById('mlp-epochs').value) || 3000;
        let lr = parseFloat(document.getElementById('mlp-lr').value) || 0.1;

        this.isTraining = true;
        const btn = document.getElementById('mlp-train-btn');
        btn.textContent = 'ENTRAÎNEMENT EN COURS...';
        btn.classList.add('active');

        let done = 0;
        const batchSize = 30; // epochs per animation frame

        const loop = () => {
            for (let i = 0; i < batchSize && done < epochsToRun; i++) {
                this.currentLoss = this.trainStep(this.normData, lr);
                done++;
                this.totalEpochs++;
            }

            this.updateStatus();
            this.drawNetwork();
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
       CYBERPUNK NETWORK VISUALIZATION (Canvas)
       ========================================================== */

    drawNetwork: function() {
        const canvas = document.getElementById('mlp-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 350;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const mx = 40, my = 25;

        // 4 layer X positions
        const lx = [mx, mx + (w - 2 * mx) * 0.33, mx + (w - 2 * mx) * 0.66, w - mx];

        // Compute node positions
        const layers = [[], [], [], []];

        // Input
        layers[0].push({ x: lx[0], y: h / 2 });

        // Hidden 1
        let s1 = (h - 2 * my) / (this.nn.h1Size - 1);
        for (let i = 0; i < this.nn.h1Size; i++) {
            layers[1].push({ x: lx[1], y: my + i * s1 });
        }

        // Hidden 2
        let s2 = (h - 2 * my) / (this.nn.h2Size - 1);
        for (let i = 0; i < this.nn.h2Size; i++) {
            layers[2].push({ x: lx[2], y: my + i * s2 });
        }

        // Output
        layers[3].push({ x: lx[3], y: h / 2 });

        // Draw connections: Layer 1
        for (let i = 0; i < this.nn.h1Size; i++) {
            this.drawBezier(ctx, layers[0][0], layers[1][i], this.nn.W1[i]);
        }
        // Layer 2
        for (let i = 0; i < this.nn.h2Size; i++) {
            for (let j = 0; j < this.nn.h1Size; j++) {
                this.drawBezier(ctx, layers[1][j], layers[2][i], this.nn.W2[i][j]);
            }
        }
        // Layer 3
        for (let i = 0; i < this.nn.h2Size; i++) {
            this.drawBezier(ctx, layers[2][i], layers[3][0], this.nn.W3[i]);
        }

        // Draw nodes
        this.drawGlowNode(ctx, layers[0][0].x, layers[0][0].y, 'X', 0, true);
        for (let i = 0; i < this.nn.h1Size; i++) {
            this.drawGlowNode(ctx, layers[1][i].x, layers[1][i].y, '', this.nn.B1[i], false);
        }
        for (let i = 0; i < this.nn.h2Size; i++) {
            this.drawGlowNode(ctx, layers[2][i].x, layers[2][i].y, '', this.nn.B2[i], false);
        }
        this.drawGlowNode(ctx, layers[3][0].x, layers[3][0].y, 'Y', 0, true);
    },

    drawBezier: function(ctx, start, end, weight) {
        let absW = Math.abs(weight);
        if (absW < 0.01) return; // skip near-zero weights for perf

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        let cpx = (start.x + end.x) / 2;
        ctx.bezierCurveTo(cpx, start.y, cpx, end.y, end.x, end.y);

        ctx.lineWidth = Math.min(absW * 1.5, 5);
        let alpha = Math.min(absW * 0.6, 0.85);

        if (weight > 0) {
            ctx.strokeStyle = `rgba(0,255,255,${alpha})`;
            ctx.shadowColor = 'rgba(0,255,255,0.4)';
        } else {
            ctx.strokeStyle = `rgba(255,0,90,${alpha})`;
            ctx.shadowColor = 'rgba(255,0,90,0.4)';
        }

        ctx.shadowBlur = absW > 0.5 ? 4 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
    },

    drawGlowNode: function(ctx, x, y, label, bias, isIO) {
        let r = isIO ? 12 : 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0f';
        ctx.fill();

        let color = bias >= 0 ? '#00ffff' : '#ff005a';
        if (isIO) color = label === 'X' ? '#00f0ff' : '#00ffaa';

        ctx.strokeStyle = color;
        ctx.lineWidth = isIO ? 2 : 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (label) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        }
    },

    /* ==========================================================
       CHART: True function vs NN prediction
       ========================================================== */

    drawChart: function() {
        const canvas = document.getElementById('mlp-chart-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 350;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const px = 45, py = 25;
        const pw = w - 2 * px;
        const ph = h - 2 * py;

        let xMin = 0, xMax = this.chartXMax;
        let yMin = this.trainScaleY.min;
        let yMax = this.trainScaleY.max;

        // Map math coords to canvas coords
        const toCanvas = (mx, my) => ({
            cx: px + ((mx - xMin) / (xMax - xMin)) * pw,
            cy: (h - py) - ((my - yMin) / (yMax - yMin)) * ph
        });

        // Grid + Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Y axis
        ctx.moveTo(px, py);
        ctx.lineTo(px, h - py);
        // X axis at y=0 if visible, else at bottom
        let axisY = (yMin < 0 && yMax > 0) ? toCanvas(0, 0).cy : h - py;
        ctx.moveTo(px, axisY);
        ctx.lineTo(w - px, axisY);
        ctx.stroke();

        // Train boundary at x=10
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        let bx = toCanvas(10, 0).cx;
        ctx.moveTo(bx, py);
        ctx.lineTo(bx, h - py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px monospace';
        ctx.fillText('Train', bx - 15, py + 12);
        ctx.fillText('Extrapolation', bx + 5, py + 12);
        ctx.fillText('0', px - 5, axisY + 12);
        ctx.fillText('20', w - px - 10, axisY + 12);

        // Y scale labels
        ctx.fillText(yMax.toFixed(1), px - 5, py + 4);
        ctx.fillText(yMin.toFixed(1), px - 5, h - py + 12);

        // Draw True Function (Cyan)
        ctx.beginPath();
        let step = (xMax - xMin) / 200;
        let first = true;
        for (let x = xMin; x <= xMax; x += step) {
            let y = this.evalFunc(x);
            let pt = toCanvas(x, y);
            if (first) { ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { ctx.lineTo(pt.cx, pt.cy); }
        }
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0,255,255,0.3)';
        ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw NN Prediction (Magenta/Red)
        ctx.beginPath();
        first = true;
        for (let x = xMin; x <= xMax; x += step) {
            let normX = this.normalizeX(x);
            let { out } = this.forward(normX);
            let predY = this.denormalizeY(out);

            let pt = toCanvas(x, predY);
            if (first) { ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { ctx.lineTo(pt.cx, pt.cy); }
        }
        ctx.strokeStyle = '#ff003c';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,0,60,0.3)';
        ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
};

window.MLPStudio = MLPStudio;
