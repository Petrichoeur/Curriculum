export class NeuralNetwork {
    constructor(architecture) {
        this.L = architecture;
        this.W = [];
        this.B = [];
        this.mW = [];
        this.vW = [];
        this.mB = [];
        this.vB = [];
        this._stepCount = 0;
        this.totalEpochs = 0;
        this.currentLoss = 0;
        
        this.initNetwork();
    }

    xavier(fanIn) {
        return (Math.random() * 2 - 1) * Math.sqrt(2.0 / fanIn);
    }

    initNetwork() {
        this.W = [];
        this.B = [];
        this.mW = []; 
        this.vW = []; 
        this.mB = []; 
        this.vB = []; 
        this._stepCount = 0;
        
        for (let l = 0; l < this.L.length - 1; l++) {
            let fanIn = this.L[l];
            let fanOut = this.L[l + 1];
            
            this.W.push(Array.from({ length: fanOut }, () =>
                Array.from({ length: fanIn }, () => this.xavier(fanIn))
            ));
            this.B.push(new Array(fanOut).fill(0));
            
            this.mW.push(Array.from({ length: fanOut }, () => new Array(fanIn).fill(0)));
            this.vW.push(Array.from({ length: fanOut }, () => new Array(fanIn).fill(0)));
            this.mB.push(new Array(fanOut).fill(0));
            this.vB.push(new Array(fanOut).fill(0));
        }
        this.totalEpochs = 0;
        this.currentLoss = 0;
    }

    act(z) { 
        return z / (1 + Math.exp(-z)); 
    }
    
    dact(z) { 
        let sig = 1 / (1 + Math.exp(-z));
        let swish = z * sig;
        return swish + sig * (1 - swish);
    }

    forward(input) {
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
    }

    trainStep(data, lr) {
        let numLayers = this.L.length;
        let m = data.length;
        let totalLoss = 0;

        let gW = [];
        let gB = [];
        for (let l = 0; l < numLayers - 1; l++) {
            gW.push(Array.from({ length: this.L[l + 1] }, () => new Array(this.L[l]).fill(0)));
            gB.push(new Array(this.L[l + 1]).fill(0));
        }

        for (let s = 0; s < m; s++) {
            let fwd = this.forward(data[s].x);
            let A = fwd.A;
            let Z = fwd.Z;
            let out = A[numLayers - 1][0];

            let err = out - data[s].y;
            totalLoss += err * err;

            let deltas = new Array(numLayers);
            deltas[numLayers - 1] = [err];

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

        this._stepCount++;
        let t = this._stepCount;
        let beta1 = 0.9;
        let beta2 = 0.999;
        let epsilon = 1e-8;
        
        let adamLr = lr * 0.1; 
        
        for (let l = 0; l < numLayers - 1; l++) {
            let fanOut = this.L[l + 1];
            let fanIn = this.L[l];
            for (let i = 0; i < fanOut; i++) {
                
                let gradB = gB[l][i] / m;
                this.mB[l][i] = beta1 * this.mB[l][i] + (1 - beta1) * gradB;
                this.vB[l][i] = beta2 * this.vB[l][i] + (1 - beta2) * gradB * gradB;
                let mB_hat = this.mB[l][i] / (1 - Math.pow(beta1, t));
                let vB_hat = this.vB[l][i] / (1 - Math.pow(beta2, t));
                this.B[l][i] -= adamLr * mB_hat / (Math.sqrt(vB_hat) + epsilon);

                for (let j = 0; j < fanIn; j++) {
                    let w = this.W[l][i][j];
                    if (w === 0) continue; 
                    
                    let gradW = gW[l][i][j] / m;
                    gradW += 0.001 * w; 

                    this.mW[l][i][j] = beta1 * this.mW[l][i][j] + (1 - beta1) * gradW;
                    this.vW[l][i][j] = beta2 * this.vW[l][i][j] + (1 - beta2) * gradW * gradW;
                    let mW_hat = this.mW[l][i][j] / (1 - Math.pow(beta1, t));
                    let vW_hat = this.vW[l][i][j] / (1 - Math.pow(beta2, t));
                    
                    this.W[l][i][j] = w - adamLr * mW_hat / (Math.sqrt(vW_hat) + epsilon);
                }
            }
        }

        // Systematic Pruning Elegant
        if (t % 10 === 0) {
            for (let l = 1; l < numLayers - 1; l++) { 
                let numNodes = this.L[l];

                let strengths = Array.from({length: numNodes}, (_, i) => {
                    let sum = 0;
                    for (let j = 0; j < this.L[l-1]; j++) sum += Math.abs(this.W[l-1][i][j]);
                    for (let k = 0; k < this.L[l+1]; k++) sum += Math.abs(this.W[l][k][i]);
                    return { i, sum };
                });

                strengths.sort((a, b) => b.sum - a.sum);
                let top3 = new Set(strengths.slice(0, 3).map(n => n.i));

                for (let {i, sum} of strengths) {
                    let isProtected = (sum > 0.3) || (top3.has(i) && sum >= 0.1); 
                    
                    if (!isProtected) {
                        for (let j = 0; j < this.L[l-1]; j++) {
                            if (Math.abs(this.W[l-1][i][j]) < 0.05) this.W[l-1][i][j] = 0;
                        }
                        for (let k = 0; k < this.L[l+1]; k++) {
                            if (Math.abs(this.W[l][k][i]) < 0.05) this.W[l][k][i] = 0;
                        }
                    }
                }
            }
        }

        return totalLoss / m;
    }
}
