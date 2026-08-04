/* ==========================================
   MODULE: MLP STUDIO (Vanilla JS Neural Net)
   ========================================== */

const MLPStudio = {
    isInitialized: false,
    
    // Neural Network State
    nn: {
        inputSize: 1,
        hiddenSize: 5,
        outputSize: 1,
        W1: [], // 1x5
        B1: [], // 5
        W2: [], // 5x1
        B2: [], // 1
    },

    // Training state
    isTraining: false,
    totalEpochs: 0,
    currentLoss: 0,

    init: function (config) {
        if (this.isInitialized) return;
        console.log("🧠 Module MLP Studio : Initialisation...");

        this.initNetwork();
        this.setupUI();
        this.populateTable(this.getDefaultData());
        this.drawNetwork();

        this.isInitialized = true;
    },

    initNetwork: function() {
        // Initialize weights randomly between -1 and 1
        this.nn.W1 = Array.from({length: this.nn.hiddenSize}, () => (Math.random() * 2) - 1);
        this.nn.B1 = Array.from({length: this.nn.hiddenSize}, () => (Math.random() * 2) - 1);
        
        this.nn.W2 = Array.from({length: this.nn.hiddenSize}, () => (Math.random() * 2) - 1);
        this.nn.B2 = [(Math.random() * 2) - 1];

        this.totalEpochs = 0;
        this.currentLoss = 0;
        this.updateStatus();
    },

    sigmoid: function(x) {
        return 1 / (1 + Math.exp(-x));
    },
    
    dsigmoid: function(y) { // where y = sigmoid(x)
        return y * (1 - y);
    },

    forward: function(x) {
        // Hidden layer
        let hidden = [];
        for (let i = 0; i < this.nn.hiddenSize; i++) {
            let z = x * this.nn.W1[i] + this.nn.B1[i];
            hidden.push(this.sigmoid(z));
        }

        // Output layer (Linear activation for regression)
        let output = this.nn.B2[0];
        for (let i = 0; i < this.nn.hiddenSize; i++) {
            output += hidden[i] * this.nn.W2[i];
        }

        return { hidden, output };
    },

    trainStep: function(data, lr) {
        let totalLoss = 0;

        // Arrays to accumulate gradients (Batch Gradient Descent)
        let dW1 = new Array(this.nn.hiddenSize).fill(0);
        let dB1 = new Array(this.nn.hiddenSize).fill(0);
        let dW2 = new Array(this.nn.hiddenSize).fill(0);
        let dB2 = 0;

        for (let i = 0; i < data.length; i++) {
            let x = data[i].x;
            let target = data[i].y;

            // Forward
            let { hidden, output } = this.forward(x);

            // Loss (MSE)
            let error = output - target;
            totalLoss += error * error;

            // Backward
            let dLoss_dOut = error; // derivative of 0.5 * (out - target)^2

            // Gradients for Output Layer
            dB2 += dLoss_dOut;
            for (let j = 0; j < this.nn.hiddenSize; j++) {
                dW2[j] += dLoss_dOut * hidden[j];
            }

            // Gradients for Hidden Layer
            for (let j = 0; j < this.nn.hiddenSize; j++) {
                let dLoss_dHidden = dLoss_dOut * this.nn.W2[j];
                let dHidden_dZ = this.dsigmoid(hidden[j]);
                let dLoss_dZ = dLoss_dHidden * dHidden_dZ;

                dW1[j] += dLoss_dZ * x;
                dB1[j] += dLoss_dZ;
            }
        }

        // Update weights
        for (let j = 0; j < this.nn.hiddenSize; j++) {
            this.nn.W1[j] -= lr * (dW1[j] / data.length);
            this.nn.B1[j] -= lr * (dB1[j] / data.length);
            this.nn.W2[j] -= lr * (dW2[j] / data.length);
        }
        this.nn.B2[0] -= lr * (dB2 / data.length);

        return totalLoss / data.length;
    },

    /* ================= UI AND INTERACTION ================= */

    getDefaultData: function() {
        // y = x^2 approx (-1 to 1)
        let data = [];
        for(let x = -1; x <= 1; x += 0.25) {
            data.push({ x: parseFloat(x.toFixed(2)), y: parseFloat((x*x).toFixed(2)) });
        }
        return data;
    },

    populateTable: function(data) {
        const tbody = document.getElementById('mlp-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach((d, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="number" class="mlp-data-x" value="${d.x}" step="0.1"></td>
                <td><input type="number" class="mlp-data-y" value="${d.y}" step="0.1"></td>
            `;
            tbody.appendChild(tr);
        });
    },

    getTableData: function() {
        let rows = document.querySelectorAll('#mlp-tbody tr');
        let data = [];
        rows.forEach(row => {
            let x = parseFloat(row.querySelector('.mlp-data-x').value);
            let y = parseFloat(row.querySelector('.mlp-data-y').value);
            if (!isNaN(x) && !isNaN(y)) data.push({x, y});
        });
        return data;
    },

    setupUI: function() {
        document.getElementById('mlp-reset-data').addEventListener('click', () => {
            this.initNetwork();
            this.populateTable(this.getDefaultData());
            this.drawNetwork();
        });

        document.getElementById('mlp-train-btn').addEventListener('click', () => {
            if (this.isTraining) return;
            this.startTraining();
        });

        document.getElementById('mlp-predict-btn').addEventListener('click', () => {
            let x = parseFloat(document.getElementById('mlp-test-x').value);
            let { output } = this.forward(x);
            document.getElementById('mlp-pred-display').textContent = output.toFixed(4);
        });
    },

    updateStatus: function() {
        let ed = document.getElementById('mlp-epoch-display');
        let ld = document.getElementById('mlp-loss-display');
        if (ed) ed.textContent = this.totalEpochs;
        if (ld) ld.textContent = this.currentLoss.toFixed(6);
    },

    startTraining: function() {
        const data = this.getTableData();
        if(data.length === 0) return;

        let epochsToRun = parseInt(document.getElementById('mlp-epochs').value) || 1000;
        let lr = parseFloat(document.getElementById('mlp-lr').value) || 0.1;
        
        this.isTraining = true;
        const btn = document.getElementById('mlp-train-btn');
        btn.textContent = 'ENTRAÎNEMENT EN COURS...';
        btn.classList.add('active');

        // Async loop to avoid freezing UI
        let currentBatch = 0;
        const batchSize = 50; // Train 50 epochs per frame

        const loop = () => {
            for(let i=0; i<batchSize && currentBatch < epochsToRun; i++) {
                this.currentLoss = this.trainStep(data, lr);
                currentBatch++;
                this.totalEpochs++;
            }

            this.updateStatus();
            this.drawNetwork(); // Animate weights

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

    /* ================= CANVAS VIZ ================= */

    drawNetwork: function() {
        const canvas = document.getElementById('mlp-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const marginX = 60;
        const marginY = 40;
        
        // Node coordinates
        const inputNode = { x: marginX, y: h / 2 };
        const outputNode = { x: w - marginX, y: h / 2 };
        
        const hiddenNodes = [];
        const hiddenSpacing = (h - marginY * 2) / (this.nn.hiddenSize - 1);
        for(let i=0; i<this.nn.hiddenSize; i++) {
            hiddenNodes.push({ x: w / 2, y: marginY + i * hiddenSpacing });
        }

        // Draw connections W1
        for(let i=0; i<this.nn.hiddenSize; i++) {
            this.drawConnection(ctx, inputNode, hiddenNodes[i], this.nn.W1[i]);
        }

        // Draw connections W2
        for(let i=0; i<this.nn.hiddenSize; i++) {
            this.drawConnection(ctx, hiddenNodes[i], outputNode, this.nn.W2[i]);
        }

        // Draw Nodes
        this.drawNode(ctx, inputNode.x, inputNode.y, 'X', '#00f0ff');
        for(let i=0; i<this.nn.hiddenSize; i++) {
            let bias = this.nn.B1[i];
            let color = bias > 0 ? '#ff003c' : '#a000ff'; // Color reflects bias
            this.drawNode(ctx, hiddenNodes[i].x, hiddenNodes[i].y, `H${i+1}`, color);
        }
        this.drawNode(ctx, outputNode.x, outputNode.y, 'Y', '#00ffaa');
    },

    drawConnection: function(ctx, start, end, weight) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        
        // Thickness based on absolute weight
        let absW = Math.abs(weight);
        ctx.lineWidth = Math.min(Math.max(absW * 2, 0.5), 10);
        
        // Color based on sign (blue-ish for pos, red-ish for neg)
        if(weight > 0) {
            ctx.strokeStyle = `rgba(0, 240, 255, ${Math.min(absW, 1)})`;
        } else {
            ctx.strokeStyle = `rgba(255, 0, 60, ${Math.min(absW, 1)})`;
        }
        
        ctx.stroke();
    },

    drawNode: function(ctx, x, y, label, color) {
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }
};

window.MLPStudio = MLPStudio;
