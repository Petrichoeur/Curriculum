export class ChartRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    setDependencies(nn, dataGen) {
        this.nn = nn;
        this.dataGen = dataGen;
    }

    draw() {
        if (!this.nn || !this.dataGen) return;

        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width || 500;
        this.canvas.height = rect.height || 380;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        let px = 45, py = 25;
        let pw = w - 2 * px;
        let ph = h - 2 * py;

        let xMin = 0, xMax = 10;
        let yMin = this.dataGen.sy.min;
        let yMax = this.dataGen.sy.max;

        const toC = (mx, my) => ({
            cx: px + ((mx - xMin) / (xMax - xMin)) * pw,
            cy: (h - py) - ((my - yMin) / (yMax - yMin)) * ph
        });

        // Grid lines
        this.ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        this.ctx.lineWidth = 1;
        for (let gx = 0; gx <= 10; gx += 2) {
            let pt = toC(gx, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(pt.cx, py);
            this.ctx.lineTo(pt.cx, h - py);
            this.ctx.stroke();
        }

        // Axes
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px, h - py); // Y axis
        let axY = (yMin < 0 && yMax > 0) ? toC(0, 0).cy : h - py;
        this.ctx.moveTo(px, axY);
        this.ctx.lineTo(w - px, axY); // X axis
        this.ctx.stroke();

        // Axis labels
        this.ctx.fillStyle = 'rgba(255,255,255,0.35)';
        this.ctx.font = '9px monospace';
        this.ctx.fillText('0', px - 3, axY + 12);
        this.ctx.fillText('10', w - px - 10, axY + 12);
        this.ctx.fillText(yMax.toFixed(1), 2, py + 4);
        this.ctx.fillText(yMin.toFixed(1), 2, h - py + 10);

        // NN Prediction: thick semi-transparent curve (300 pts)
        this.ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 300; i++) {
            let x = (i / 300) * 10;
            let normX = this.dataGen.normX(x);
            let fwd = this.nn.forward(normX);
            let predNorm = fwd.A[this.nn.L.length - 1][0];
            let pred = this.dataGen.denormY(predNorm);
            
            let pt = toC(x, pred);
            if (first) { this.ctx.moveTo(pt.cx, pt.cy); first = false; }
            else { this.ctx.lineTo(pt.cx, pt.cy); }
        }
        this.ctx.strokeStyle = 'rgba(255,0,60,0.6)';
        this.ctx.lineWidth = 3.5;
        this.ctx.shadowColor = 'rgba(255,0,60,0.35)';
        this.ctx.shadowBlur = 6;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Training dots (Cyan)
        this.ctx.fillStyle = 'rgba(0,255,255,0.85)';
        for (let i = 0; i < this.dataGen.trainData.length; i++) {
            let pt = toC(this.dataGen.trainData[i].x, this.dataGen.trainData[i].y);
            this.ctx.beginPath();
            this.ctx.arc(pt.cx, pt.cy, 1.8, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Validation dots (Gold)
        this.ctx.fillStyle = 'rgba(255,215,0,0.85)';
        for (let i = 0; i < this.dataGen.valData.length; i++) {
            let pt = toC(this.dataGen.valData[i].x, this.dataGen.valData[i].y);
            this.ctx.beginPath();
            this.ctx.arc(pt.cx, pt.cy, 2.2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}
