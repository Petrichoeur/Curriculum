import { NeuralNetwork } from './core/NeuralNetwork.js';
import { DataGenerator } from './core/DataGenerator.js';
import { NetworkRenderer } from './viz/NetworkRenderer.js';
import { ChartRenderer } from './viz/ChartRenderer.js';

class MLPStudioApp {
    constructor() {
        this.dataGen = new DataGenerator();
        // Architecture: 1 → 8 → 6 → 8 → 1
        this.nn = new NeuralNetwork([1, 8, 6, 8, 1]);
        
        this.networkViz = new NetworkRenderer('mlp-canvas', 'mlp-tooltip');
        this.chartViz = new ChartRenderer('mlp-chart-canvas');
        
        this.networkViz.setDependencies(this.nn, this.dataGen);
        this.chartViz.setDependencies(this.nn, this.dataGen);
        
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.buildTermUI();
        this.setupUI();
        this.generateData();

        setTimeout(() => {
            this.nn.initNetwork();
            this.chartViz.draw();
            this.startAnimLoop();
        }, 120);

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.chartViz.draw();
            }, 150);
        });

        this.isInitialized = true;
    }

    buildTermUI() {
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
    }

    setupUI() {
        document.getElementById('mlp-generate-btn').addEventListener('click', () => this.generateData());
        document.getElementById('mlp-train-btn').addEventListener('click', () => {
            if (!this.isTraining) this.startTraining();
        });
    }

    generateData() {
        this.dataGen.generateData();
        this.nn.initNetwork();
        this.updateMetrics();
        this.chartViz.draw();
    }

    updateStatus() {
        let ed = document.getElementById('mlp-epoch-display');
        let ld = document.getElementById('mlp-loss-display');
        if (ed) ed.textContent = this.nn.totalEpochs;
        if (ld) ld.textContent = this.nn.currentLoss.toFixed(6);
    }

    updateMetrics() {
        if (this.dataGen.valData.length === 0) return;

        let n = this.dataGen.valData.length;
        let sumAbsErr = 0;
        let maxErr = 0;
        let sumSqRes = 0;
        let sumY = 0;

        for (let i = 0; i < n; i++) sumY += this.dataGen.valData[i].y;
        let meanY = sumY / n;

        let sumSqTot = 0;
        for (let i = 0; i < n; i++) {
            let x = this.dataGen.valData[i].x;
            let normX = this.dataGen.normX(x);
            let predNorm = this.nn.forward(normX).A[this.nn.L.length - 1][0];
            let pred = this.dataGen.denormY(predNorm);
            
            let err = Math.abs(pred - this.dataGen.valData[i].y);
            sumAbsErr += err;
            if (err > maxErr) maxErr = err;
            sumSqRes += (pred - this.dataGen.valData[i].y) ** 2;
            sumSqTot += (this.dataGen.valData[i].y - meanY) ** 2;
        }

        let yRange = this.dataGen.sy.max - this.dataGen.sy.min;
        if (yRange < 1e-9) yRange = 1;

        let nmae = (sumAbsErr / n) / yRange;
        let r2 = sumSqTot > 0 ? 1 - sumSqRes / sumSqTot : 0;

        let el_nmae = document.getElementById('mlp-nmae');
        let el_r2 = document.getElementById('mlp-r2');
        let el_max = document.getElementById('mlp-maxerr');
        if (el_nmae) el_nmae.textContent = (nmae * 100).toFixed(2) + ' %';
        if (el_r2) el_r2.textContent = r2.toFixed(4);
        if (el_max) el_max.textContent = maxErr.toFixed(4);
    }

    startTraining() {
        if (this.dataGen.normTrain.length === 0) return;

        let epochsToRun = parseInt(document.getElementById('mlp-epochs').value) || 3000;
        let lr = parseFloat(document.getElementById('mlp-lr').value) || 0.05;

        this.isTraining = true;
        const btn = document.getElementById('mlp-train-btn');
        btn.textContent = 'ENTRAÎNEMENT EN COURS...';
        btn.classList.add('active');

        let done = 0;
        const batchSize = 20;

        const loop = () => {
            for (let i = 0; i < batchSize && done < epochsToRun; i++) {
                this.nn.currentLoss = this.nn.trainStep(this.dataGen.normTrain, lr);
                done++;
                this.nn.totalEpochs++;
            }

            this.updateStatus();
            this.updateMetrics();
            this.chartViz.draw();

            if (done < epochsToRun) {
                requestAnimationFrame(loop);
            } else {
                this.isTraining = false;
                btn.textContent = "ENTRAÎNER LE RÉSEAU_";
                btn.classList.remove('active');
            }
        };
        requestAnimationFrame(loop);
    }

    startAnimLoop() {
        const loop = () => {
            this.networkViz.draw(this.isTraining);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.MLPStudio = new MLPStudioApp();
});
