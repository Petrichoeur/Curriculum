/* ==========================================
   MODULE: MLP STUDIO V2 (Deep Learning Vanilla JS)
   ========================================== */

const MLPStudio = {
    isInitialized: false,
    
    // Dataset & Scaling
    rawData: [], // {x, y}
    normData: [], // {x, y} scaled
    scaleX: { min: 0, max: 20 }, // Plot up to 20
    scaleY: { min: 0, max: 1 },

    // Neural Network State (1 -> 8 -> 8 -> 1)
    nn: {
        inputSize: 1,
        hiddenSize1: 8,
        hiddenSize2: 8,
        outputSize: 1,
        W1: [], B1: [],
        W2: [], B2: [],
        W3: [], B3: []
    },

    isTraining: false,
    totalEpochs: 0,
    currentLoss: 0,
    funcString: "f(x) = 0",

    init: function (config) {
        if (this.isInitialized) return;
        console.log("🧠 Module MLP Studio V2 : Initialisation...");

        this.buildTermUI();
        this.setupUI();
        this.generateData(); 
        
        setTimeout(() => {
            this.initNetwork();
            this.drawNetwork();
            this.drawChart();
        }, 100);

        // Responsive canvas resize
        window.addEventListener('resize', () => {
            if(document.getElementById('mlp-studio').classList.contains('active')) {
                this.drawNetwork();
                this.drawChart();
            }
        });

        this.isInitialized = true;
    },

    /* ================= FUNCTION BUILDER ================= */

    buildTermUI: function() {
        const container = document.getElementById('mlp-terms-container');
        if(!container) return;
        container.innerHTML = '';

        const funcs = [
            {val: 'x', label: 'x'},
            {val: 'x2', label: 'x²'},
            {val: 'x3', label: 'x³'},
            {val: 'sqrt', label: '√x'},
            {val: 'sin', label: 'sin(x)'},
            {val: 'cos', label: 'cos(x)'},
            {val: 'inv', label: '1/(x+1)'},
            {val: 'const', label: '1 (const)'}
        ];

        const defaults = [
            {c: 2, f: 'sin'},
            {c: 0.1, f: 'x2'},
            {c: 0, f: 'x'},
            {c: 0, f: 'x'}
        ];

        for(let i=0; i<4; i++) {
            const div = document.createElement('div');
            div.className = 'mlp-term';
            let options = funcs.map(f => `<option value="${f.val}" ${defaults[i].f === f.val ? 'selected' : ''}>${f.label}</option>`).join('');
            div.innerHTML = `
                <input type="number" class="term-coef" value="${defaults[i].c}" step="0.1">
                <span class="term-mul">×</span>
                <select class="term-func">${options}</select>
            `;
            container.appendChild(div);
        }
    },

    evaluateTerm: function(funcType, x) {
        switch(funcType) {
            case 'x': return x;
            case 'x2': return x*x;
            case 'x3': return x*x*x;
            case 'sqrt': return Math.sqrt(Math.max(0, x));
            case 'sin': return Math.sin(x);
            case 'cos': return Math.cos(x);
            case 'inv': return 1 / (x + 1);
            case 'const': return 1;
            default: return 0;
        }
    },

    getFunctionLabel: function(funcType) {
        switch(funcType) {
            case 'x': return 'x';
            case 'x2': return 'x²';
            case 'x3': return 'x³';
            case 'sqrt': return '√x';
            case 'sin': return 'sin(x)';
            case 'cos': return 'cos(x)';
            case 'inv': return '1/(x+1)';
            case 'const': return '';
            default: return '';
        }
    },

    generateData: function() {
        const terms = [];
        document.querySelectorAll('.mlp-term').forEach(el => {
            const c = parseFloat(el.querySelector('.term-coef').value) || 0;
            const f = el.querySelector('.term-func').value;
            terms.push({c, f});
        });

        let strParts = [];
        terms.forEach(t => {
            if(t.c !== 0) {
                let lbl = this.getFunctionLabel(t.f);
                strParts.push(`${t.c}${lbl ? '*'+lbl : ''}`);
            }
        });
        this.funcString = strParts.length > 0 ? "f(x) = " + strParts.join(' + ') : "f(x) = 0";
        document.getElementById('mlp-func-display').textContent = this.funcString;

        let globalMinY = Infinity, globalMaxY = -Infinity;
        this.rawData = [];
        
        for(let x = 0; x <= 20; x += 0.1) {
            let y = 0;
            terms.forEach(t => y += t.c * this.evaluateTerm(t.f, x));
            if(y < globalMinY) globalMinY = y;
            if(y > globalMaxY) globalMaxY = y;
            
            // Training data only from 0 to 10
            if (x <= 10.05) {
                this.rawData.push({x, y});
            }
        }

        let yRange = globalMaxY - globalMinY;
        if(yRange === 0) yRange = 1;
        this.scaleY = { 
            min: globalMinY - yRange*0.1, 
            max: globalMaxY + yRange*0.1 
        };

        this.normalizeData();
        this.initNetwork();
        this.drawChart();
    },

    normalizeData: function() {
        this.normData = this.rawData.map(d => ({
            x: (d.x - this.scaleX.min) / (this.scaleX.max - this.scaleX.min), 
            y: (d.y - this.scaleY.min) / (this.scaleY.max - this.scaleY.min)
        }));
    },

    /* ================= DEEP NEURAL NETWORK ================= */

    initNetwork: function() {
        const r = () => (Math.random() * 2) - 1;

        this.nn.W1 = Array.from({length: this.nn.hiddenSize1}, () => r());
        this.nn.B1 = Array.from({length: this.nn.hiddenSize1}, () => r());
        
        this.nn.W2 = Array.from({length: this.nn.hiddenSize2}, () => Array.from({length: this.nn.hiddenSize1}, () => r()));
        this.nn.B2 = Array.from({length: this.nn.hiddenSize2}, () => r());

        this.nn.W3 = Array.from({length: this.nn.hiddenSize2}, () => r());
        this.nn.B3 = [r()];

        this.totalEpochs = 0;
        this.currentLoss = 0;
        this.updateStatus();
    },

    sigmoid: function(x) { return 1 / (1 + Math.exp(-x)); },
    dsigmoid: function(y) { return y * (1 - y); },

    forward: function(x) {
        let h1 = [];
        for(let i=0; i<this.nn.hiddenSize1; i++) {
            h1.push(this.sigmoid(x * this.nn.W1[i] + this.nn.B1[i]));
        }

        let h2 = [];
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            let z = this.nn.B2[i];
            for(let j=0; j<this.nn.hiddenSize1; j++) z += h1[j] * this.nn.W2[i][j];
            h2.push(this.sigmoid(z));
        }

        let out = this.nn.B3[0];
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            out += h2[i] * this.nn.W3[i];
        }

        return { h1, h2, out };
    },

    trainStep: function(data, lr) {
        let totalLoss = 0;
        
        let dW1 = new Array(this.nn.hiddenSize1).fill(0);
        let dB1 = new Array(this.nn.hiddenSize1).fill(0);
        
        let dW2 = Array.from({length: this.nn.hiddenSize2}, () => new Array(this.nn.hiddenSize1).fill(0));
        let dB2 = new Array(this.nn.hiddenSize2).fill(0);
        
        let dW3 = new Array(this.nn.hiddenSize2).fill(0);
        let dB3 = 0;

        for (let i = 0; i < data.length; i++) {
            let x = data[i].x;
            let target = data[i].y;

            let { h1, h2, out } = this.forward(x);
            let err = out - target;
            totalLoss += err * err;

            let dLoss_dOut = err;

            dB3 += dLoss_dOut;
            for(let j=0; j<this.nn.hiddenSize2; j++) dW3[j] += dLoss_dOut * h2[j];

            let dLoss_dH2 = new Array(this.nn.hiddenSize2).fill(0);
            for(let j=0; j<this.nn.hiddenSize2; j++) {
                dLoss_dH2[j] = dLoss_dOut * this.nn.W3[j];
                let dZ2 = dLoss_dH2[j] * this.dsigmoid(h2[j]);
                dB2[j] += dZ2;
                for(let k=0; k<this.nn.hiddenSize1; k++) {
                    dW2[j][k] += dZ2 * h1[k];
                }
            }

            let dLoss_dH1 = new Array(this.nn.hiddenSize1).fill(0);
            for(let k=0; k<this.nn.hiddenSize1; k++) {
                for(let j=0; j<this.nn.hiddenSize2; j++) {
                    let dZ2 = dLoss_dH2[j] * this.dsigmoid(h2[j]);
                    dLoss_dH1[k] += dZ2 * this.nn.W2[j][k];
                }
                let dZ1 = dLoss_dH1[k] * this.dsigmoid(h1[k]);
                dB1[k] += dZ1;
                dW1[k] += dZ1 * x;
            }
        }

        let m = data.length;
        for(let i=0; i<this.nn.hiddenSize1; i++) {
            this.nn.W1[i] -= lr * (dW1[i] / m);
            this.nn.B1[i] -= lr * (dB1[i] / m);
        }
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            this.nn.B2[i] -= lr * (dB2[i] / m);
            for(let j=0; j<this.nn.hiddenSize1; j++) {
                this.nn.W2[i][j] -= lr * (dW2[i][j] / m);
            }
        }
        this.nn.B3[0] -= lr * (dB3 / m);
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            this.nn.W3[i] -= lr * (dW3[i] / m);
        }

        return totalLoss / m;
    },

    /* ================= UI CONTROLS ================= */

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
        if(this.normData.length === 0) return;

        let epochsToRun = parseInt(document.getElementById('mlp-epochs').value) || 3000;
        let lr = parseFloat(document.getElementById('mlp-lr').value) || 0.1;
        
        this.isTraining = true;
        const btn = document.getElementById('mlp-train-btn');
        btn.textContent = 'ENTRAÎNEMENT EN COURS...';
        btn.classList.add('active');

        let currentBatch = 0;
        const batchSize = 50; 

        const loop = () => {
            for(let i=0; i<batchSize && currentBatch < epochsToRun; i++) {
                this.currentLoss = this.trainStep(this.normData, lr);
                currentBatch++;
                this.totalEpochs++;
            }

            this.updateStatus();
            this.drawNetwork();
            this.drawChart();

            if(currentBatch < epochsToRun) {
                requestAnimationFrame(loop);
            } else {
                this.isTraining = false;
                btn.textContent = "ENTRAÎNER LE RÉSEAU_";
                btn.classList.remove('active');
            }
        };
        requestAnimationFrame(loop);
    },

    /* ================= CYBERPUNK NETWORK VIZ ================= */

    drawNetwork: function() {
        const canvas = document.getElementById('mlp-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 350;
        
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const marginX = 40;
        const marginY = 30;
        
        const layerXs = [
            marginX, 
            marginX + (w - marginX*2)*0.33, 
            marginX + (w - marginX*2)*0.66, 
            w - marginX
        ];
        
        const nodes = [[], [], [], []];
        nodes[0].push({x: layerXs[0], y: h/2, label: 'X', val: 0});
        
        let spacing1 = (h - marginY * 2) / (this.nn.hiddenSize1 - 1);
        for(let i=0; i<this.nn.hiddenSize1; i++) {
            nodes[1].push({x: layerXs[1], y: marginY + i*spacing1, label: '', val: this.nn.B1[i]});
        }
        
        let spacing2 = (h - marginY * 2) / (this.nn.hiddenSize2 - 1);
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            nodes[2].push({x: layerXs[2], y: marginY + i*spacing2, label: '', val: this.nn.B2[i]});
        }
        
        nodes[3].push({x: layerXs[3], y: h/2, label: 'Y', val: this.nn.B3[0]});

        // Bezier connections
        for(let i=0; i<this.nn.hiddenSize1; i++) {
            this.drawBezier(ctx, nodes[0][0], nodes[1][i], this.nn.W1[i]);
        }
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            for(let j=0; j<this.nn.hiddenSize1; j++) {
                this.drawBezier(ctx, nodes[1][j], nodes[2][i], this.nn.W2[i][j]);
            }
        }
        for(let i=0; i<this.nn.hiddenSize2; i++) {
            this.drawBezier(ctx, nodes[2][i], nodes[3][0], this.nn.W3[i]);
        }

        nodes.forEach(layer => {
            layer.forEach(n => this.drawGlowNode(ctx, n.x, n.y, n.label, n.val));
        });
    },

    drawBezier: function(ctx, start, end, weight) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        let cp1x = start.x + (end.x - start.x)/2;
        let cp1y = start.y;
        let cp2x = start.x + (end.x - start.x)/2;
        let cp2y = end.y;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        
        let absW = Math.abs(weight);
        ctx.lineWidth = Math.min(Math.max(absW * 1.5, 0.2), 6);
        
        if(weight > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${Math.min(absW, 0.8)})`;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        } else {
            ctx.strokeStyle = `rgba(255, 0, 90, ${Math.min(absW, 0.8)})`;
            ctx.shadowColor = 'rgba(255, 0, 90, 0.5)';
        }
        
        ctx.shadowBlur = absW > 1 ? 5 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
    },

    drawGlowNode: function(ctx, x, y, label, biasVal) {
        ctx.beginPath();
        ctx.arc(x, y, label ? 12 : 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0f';
        ctx.fill();
        
        let color = biasVal > 0 ? '#00ffff' : '#ff005a';
        ctx.strokeStyle = color;
        ctx.lineWidth = label ? 2 : 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if(label) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        }
    },

    /* ================= CHART VIZ ================= */

    drawChart: function() {
        const canvas = document.getElementById('mlp-chart-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 400;
        canvas.height = rect.height || 350;
        
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const padX = 40;
        const padY = 30;
        const plotW = w - padX*2;
        const plotH = h - padY*2;

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Y axis
        ctx.moveTo(padX, padY);
        ctx.lineTo(padX, h - padY);
        // X axis
        let zeroY = h - padY;
        if(this.scaleY.min < 0 && this.scaleY.max > 0) {
            zeroY = h - padY - (0 - this.scaleY.min)/(this.scaleY.max - this.scaleY.min) * plotH;
        }
        ctx.moveTo(padX, zeroY);
        ctx.lineTo(w - padX, zeroY);
        // Train boundary X=10
        let midX = padX + (10 - this.scaleX.min)/(this.scaleX.max - this.scaleX.min) * plotW;
        ctx.moveTo(midX, padY);
        ctx.lineTo(midX, h - padY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px monospace';
        ctx.fillText('x=10 (Train end)', midX + 5, padY + 10);
        ctx.fillText('x=20', w - padX - 25, zeroY - 5);

        const mapXY = (mx, my) => {
            let cx = padX + ((mx - this.scaleX.min)/(this.scaleX.max - this.scaleX.min)) * plotW;
            let cy = (h - padY) - ((my - this.scaleY.min)/(this.scaleY.max - this.scaleY.min)) * plotH;
            return {cx, cy};
        };

        // True Function
        ctx.beginPath();
        let first = true;
        for(let x=0; x<=20; x+=0.2) {
            let terms = [];
            document.querySelectorAll('.mlp-term').forEach(el => {
                terms.push({
                    c: parseFloat(el.querySelector('.term-coef').value)||0, 
                    f: el.querySelector('.term-func').value
                });
            });
            let y = 0;
            terms.forEach(t => y += t.c * this.evaluateTerm(t.f, x));
            
            let pt = mapXY(x, y);
            if(first) { ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { ctx.lineTo(pt.cx, pt.cy); }
        }
        ctx.strokeStyle = '#00ffff'; // Cyan
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pred Function
        ctx.beginPath();
        first = true;
        for(let x=0; x<=20; x+=0.2) {
            let normX = (x - this.scaleX.min)/(this.scaleX.max - this.scaleX.min);
            let { out } = this.forward(normX);
            let predY = out * (this.scaleY.max - this.scaleY.min) + this.scaleY.min;
            
            let pt = mapXY(x, predY);
            if(first) { ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { ctx.lineTo(pt.cx, pt.cy); }
        }
        ctx.strokeStyle = '#ff003c'; // Neon Red/Magenta
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

window.MLPStudio = MLPStudio;
