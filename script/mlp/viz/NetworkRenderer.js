export class NetworkRenderer {
    constructor(canvasId, tooltipId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.tooltip = document.getElementById(tooltipId);
        
        this._particles = [];
        this._renderedEdges = [];
        this._renderedNodes = [];
        
        this.setupTooltip();
    }

    setDependencies(nn, dataGen) {
        this.nn = nn;
        this.dataGen = dataGen;
    }

    setupTooltip() {
        if (!this.canvas || !this.tooltip) return;

        const handleInteraction = (e) => {
            if (!this.nn || !this.dataGen) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;

            let closestEdge = null;
            let closestNode = null;
            let minDistEdge = 25; 
            let minDistNode = 18; 

            // 1. Raycasting Nodes
            for (let node of this._renderedNodes) {
                let d = Math.hypot(node.x - cx, node.y - cy);
                if (d < minDistNode) {
                    minDistNode = d;
                    closestNode = node;
                }
            }

            // 2. Raycasting Edges
            if (!closestNode) {
                for (let edge of this._renderedEdges) {
                    let minX = Math.min(edge.a.x, edge.b.x) - 20;
                    let maxX = Math.max(edge.a.x, edge.b.x) + 20;
                    let minY = Math.min(edge.a.y, edge.b.y) - 20;
                    let maxY = Math.max(edge.a.y, edge.b.y) + 20;

                    if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;

                    let cpx = (edge.a.x + edge.b.x) / 2;
                    for (let t = 0.1; t < 1; t += 0.1) {
                        let mt = 1 - t;
                        let px = mt*mt*mt*edge.a.x + 3*mt*mt*t*cpx + 3*mt*t*t*cpx + t*t*t*edge.b.x;
                        let py = mt*mt*mt*edge.a.y + 3*mt*mt*t*edge.a.y + 3*mt*t*t*edge.b.y + t*t*t*edge.b.y;
                        
                        let d = Math.hypot(px - cx, py - cy);
                        if (d < minDistEdge) {
                            minDistEdge = d;
                            closestEdge = edge;
                        }
                    }
                }
            }

            let testNormX = this.dataGen.normX(5);
            let A = this.nn.forward(testNormX).A;

            if (closestNode) {
                let activationResult = A[closestNode.l][closestNode.i];
                this.tooltip.innerHTML = `
                    <h4>Neurone <span>H${closestNode.l}-${closestNode.i}</span></h4>
                    <p>Biais : <span class="val">${closestNode.bias.toFixed(4)}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p>Activation : <code>Swish (SiLU)</code></p>
                    <p>Sortie actuelle (x=5) : <span class="val">${activationResult.toFixed(4)}</span></p>
                `;
                this.tooltip.style.left = (e.clientX - rect.left + 20) + 'px';
                this.tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
                this.tooltip.classList.add('visible');
                this.canvas.style.cursor = 'pointer';
            } else if (closestEdge) {
                let activationResult = A[closestEdge.l + 1][closestEdge.i];
                this.tooltip.innerHTML = `
                    <h4>Synapse <span>${closestEdge.w > 0 ? '(Excitatrice)' : '(Inhibitrice)'}</span></h4>
                    <p>Poids : <span class="val">${closestEdge.w.toFixed(4)}</span></p>
                    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                    <p style="color:#00ffff">Cible : H${closestEdge.l+1}-${closestEdge.i}</p>
                    <p>Sortie cible (x=5) : <span class="val">${activationResult.toFixed(4)}</span></p>
                `;
                this.tooltip.style.left = (e.clientX - rect.left + 20) + 'px';
                this.tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
                this.tooltip.classList.add('visible');
                this.canvas.style.cursor = 'pointer';
            } else {
                this.tooltip.classList.remove('visible');
                this.canvas.style.cursor = 'default';
            }
        };

        this.canvas.addEventListener('click', handleInteraction);
        this.canvas.addEventListener('mousemove', handleInteraction);
        this.canvas.addEventListener('mouseleave', () => this.tooltip.classList.remove('visible'));
    }

    draw(isTraining) {
        if (!this.nn) return;
        const rect = this.canvas.getBoundingClientRect();
        if (this.canvas.width !== rect.width || this.canvas.height !== rect.height) {
            this.canvas.width = rect.width || 500;
            this.canvas.height = rect.height || 380;
        }
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.globalCompositeOperation = 'lighter';

        let nL = this.nn.L.length;
        let mx = 55, my = 25;
        let layerLabels = ['In', 'H1 (8)', 'H2 (6)', 'H3 (8)', 'Out'];

        let lx = [];
        for (let l = 0; l < nL; l++) lx.push(mx + l * ((w - 2 * mx) / (nL - 1)));

        let nodes = [];
        for (let l = 0; l < nL; l++) {
            let n = this.nn.L[l], pos = [];
            if (n === 1) {
                pos.push({ x: lx[l], y: h / 2 });
            } else {
                let sp = (h - 2 * my - 20) / (n - 1);
                let startY = my + 10;
                for (let i = 0; i < n; i++) pos.push({ x: lx[l], y: startY + i * sp });
            }
            nodes.push(pos);
        }

        this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        for (let l = 0; l < nL; l++) this.ctx.fillText(layerLabels[l] || '', lx[l], 12);

        // Reachability analysis
        let reachIn = Array.from({length: nL}, (_, l) => new Array(this.nn.L[l]).fill(false));
        let reachOut = Array.from({length: nL}, (_, l) => new Array(this.nn.L[l]).fill(false));
        
        reachIn[0][0] = true;
        for (let l = 0; l < nL - 1; l++) {
            for (let i = 0; i < this.nn.L[l + 1]; i++) {
                for (let j = 0; j < this.nn.L[l]; j++) {
                    if (this.nn.W[l][i][j] !== 0 && reachIn[l][j]) {
                        reachIn[l+1][i] = true;
                    }
                }
            }
        }

        reachOut[nL-1][0] = true;
        for (let l = nL - 1; l >= 1; l--) {
            for (let j = 0; j < this.nn.L[l - 1]; j++) {
                for (let i = 0; i < this.nn.L[l]; i++) {
                    if (this.nn.W[l-1][i][j] !== 0 && reachOut[l][i]) {
                        reachOut[l-1][j] = true;
                    }
                }
            }
        }
        
        let isNodeAlive = Array.from({length: nL}, (_, l) => new Array(this.nn.L[l]).fill(false));
        for (let l = 0; l < nL; l++) {
            for (let i = 0; i < this.nn.L[l]; i++) {
                isNodeAlive[l][i] = reachIn[l][i] && reachOut[l][i];
            }
        }

        this._renderedEdges = []; 
        for (let l = 0; l < nL - 1; l++) {
            for (let i = 0; i < this.nn.L[l + 1]; i++) {
                let bias = this.nn.B[l][i];
                for (let j = 0; j < this.nn.L[l]; j++) {
                    let wVal = this.nn.W[l][i][j];
                    if (wVal !== 0 && isNodeAlive[l][j] && isNodeAlive[l + 1][i]) {
                        this.drawEdge(nodes[l][j], nodes[l + 1][i], wVal);
                        this._renderedEdges.push({
                            a: nodes[l][j], b: nodes[l + 1][i], w: wVal, l, i, j, bias
                        });
                    }
                }
            }
        }

        if (isTraining && Math.random() < 0.6) {
            let l = Math.floor(Math.random() * (nL - 1));
            let i = Math.floor(Math.random() * this.nn.L[l + 1]);
            let j = Math.floor(Math.random() * this.nn.L[l]);
            let wVal = this.nn.W[l][i][j];
            if (Math.abs(wVal) > 0.05) {
                this._particles.push({
                    l, i, j, t: 0, speed: 0.01 + Math.random() * 0.015, wVal, trail: [] 
                });
            }
        }

        for (let p = this._particles.length - 1; p >= 0; p--) {
            let pt = this._particles[p];
            pt.t += pt.speed;
            
            if (pt.t >= 1 || this.nn.W[pt.l][pt.i][pt.j] === 0) {
                this._particles.splice(p, 1);
                continue;
            }

            let a = nodes[pt.l][pt.j];
            let b = nodes[pt.l + 1][pt.i];
            let cpx = (a.x + b.x) / 2;
            
            let mt = 1 - pt.t;
            let px = mt*mt*mt*a.x + 3*mt*mt*pt.t*cpx + 3*mt*pt.t*pt.t*cpx + pt.t*pt.t*pt.t*b.x;
            let py = mt*mt*mt*a.y + 3*mt*mt*pt.t*a.y + 3*mt*pt.t*pt.t*b.y + pt.t*pt.t*pt.t*b.y;

            pt.trail.push({x: px, y: py});
            if (pt.trail.length > 8) pt.trail.shift(); 

            if (pt.trail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(pt.trail[0].x, pt.trail[0].y);
                for(let k = 1; k < pt.trail.length; k++) {
                    this.ctx.lineTo(pt.trail[k].x, pt.trail[k].y);
                }
                this.ctx.strokeStyle = pt.wVal > 0 ? '#00ffff' : '#ff005a';
                this.ctx.lineWidth = 3 + Math.abs(pt.wVal) * 1.5;
                this.ctx.shadowColor = this.ctx.strokeStyle;
                this.ctx.shadowBlur = 12;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }

            this.ctx.beginPath();
            this.ctx.arc(px, py, 2 + Math.abs(pt.wVal)*1.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff'; 
            this.ctx.shadowColor = pt.wVal > 0 ? '#00ffff' : '#ff005a';
            this.ctx.shadowBlur = 15;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        this.ctx.globalCompositeOperation = 'source-over';
        this._renderedNodes = []; 

        this.drawNode(nodes[0][0], 'x', null, 16, true);
        this._renderedNodes.push({x: nodes[0][0].x, y: nodes[0][0].y, l: 0, i: 0, bias: 0});

        for (let l = 1; l < nL - 1; l++) {
            for (let i = 0; i < this.nn.L[l]; i++) {
                if (isNodeAlive[l][i]) {
                    let b = this.nn.B[l - 1][i];
                    this.drawNode(nodes[l][i], b.toFixed(1), b, 10, false);
                    this._renderedNodes.push({x: nodes[l][i].x, y: nodes[l][i].y, l, i, bias: b});
                }
            }
        }
        this.drawNode(nodes[nL - 1][0], 'ŷ', null, 16, true);
        this._renderedNodes.push({x: nodes[nL - 1][0].x, y: nodes[nL - 1][0].y, l: nL - 1, i: 0, bias: this.nn.B[nL - 2][0]});
    }

    drawEdge(a, b, weight) {
        let absW = Math.abs(weight);
        this.ctx.beginPath();
        this.ctx.moveTo(a.x, a.y);
        let cpx = (a.x + b.x) / 2;
        this.ctx.bezierCurveTo(cpx, a.y, cpx, b.y, b.x, b.y);

        this.ctx.lineWidth = Math.min(absW * 1.5 + 0.5, 5);
        let alpha = Math.min(absW * 0.5 + 0.3, 0.95);

        this.ctx.strokeStyle = weight > 0
            ? `rgba(0,255,255,${alpha})`
            : `rgba(255,0,90,${alpha})`;
        this.ctx.stroke();
    }

    drawNode(pos, label, bias, r, isIO) {
        let color;
        if (isIO) {
            color = label === 'x' ? '#00d4ff' : '#00ffaa';
        } else {
            let t = bias !== null ? Math.min(Math.abs(bias), 2) / 2 : 0;
            color = bias >= 0
                ? `rgba(0,${Math.round(200 + 55*t)},255,1)`
                : `rgba(255,${Math.round(40 + 60*(1-t))},${Math.round(100 + 50*(1-t))},1)`;
        }

        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(8,8,15,0.9)';
        this.ctx.fill();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = isIO ? 2 : 1;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = isIO ? 12 : 5;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = isIO ? '#fff' : 'rgba(255,255,255,0.85)';
        this.ctx.font = isIO ? 'bold 11px monospace' : '7.5px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(label), pos.x, pos.y);
    }
}
