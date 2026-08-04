export class DataGenerator {
    constructor() {
        this.trainData = [];
        this.valData = [];
        this.normTrain = [];
        this.normVal = [];
        this.sx = { min: 0, max: 10 };
        this.sy = { min: 0, max: 1 };
        this.terms = [];
    }

    readTermsFromUI() {
        this.terms = [];
        document.querySelectorAll('.mlp-term').forEach(el => {
            this.terms.push({
                c: parseFloat(el.querySelector('.term-coef').value) || 0,
                f: el.querySelector('.term-func').value
            });
        });

        // Display string
        let parts = [];
        this.terms.forEach(t => {
            if (t.c !== 0) {
                let lbl = this.termLabel(t.f);
                parts.push(`${t.c}${lbl ? '·' + lbl : ''}`);
            }
        });
        document.getElementById('mlp-func-display').textContent =
            parts.length > 0 ? "f(x) = " + parts.join(' + ') : "f(x) = 0";
    }

    termLabel(t) {
        const m = { x:'x', x2:'x²', x3:'x³', sqrt:'√x', sin:'sin(x)', cos:'cos(x)', inv:'1/(x+1)', const:'' };
        return m[t] || '';
    }

    evalTerm(type, x) {
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
    }

    evalFunc(x) {
        let y = 0;
        for (let i = 0; i < this.terms.length; i++) {
            y += this.terms[i].c * this.evalTerm(this.terms[i].f, x);
        }
        return y;
    }

    generateData() {
        this.readTermsFromUI();
        this.trainData = [];
        let minY = Infinity, maxY = -Infinity;
        
        for (let i = 0; i < 50; i++) {
            let x = (i / 49) * 10;
            let y = this.evalFunc(x);
            this.trainData.push({ x, y });
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

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
    }

    normX(x) { return 2 * (x - this.sx.min) / (this.sx.max - this.sx.min) - 1; }
    normY(y) { return 2 * (y - this.sy.min) / (this.sy.max - this.sy.min) - 1; }
    denormY(ny) { return (ny + 1) / 2 * (this.sy.max - this.sy.min) + this.sy.min; }

    normalizeData() {
        this.normTrain = this.trainData.map(d => ({ x: this.normX(d.x), y: this.normY(d.y) }));
        this.normVal = this.valData.map(d => ({ x: this.normX(d.x), y: this.normY(d.y) }));
    }
}
