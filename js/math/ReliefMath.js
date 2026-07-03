/**
 * ReliefMath — FFT-driven vertex displacement.
 * Calculates heightmap and normals from real-time audio data.
 */
export class ReliefMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.gridSize = 32;
        this.heightMap = new Float32Array(this.gridSize * this.gridSize);
        this.normalMap = [];
    }

    addPulse(x, energy) {
        // Impact ripples on the relief
        const gx = Math.floor(x * this.gridSize);
        const gy = Math.floor(this.gridSize / 2);
        const idx = gy * this.gridSize + gx;
        if (this.heightMap[idx] !== undefined) {
            this.heightMap[idx] += energy * 2.0;
        }
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity, audioData) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.95;

        // Map audioData (FFT) to the heightmap
        if (audioData) {
            for (let i = 0; i < this.gridSize; i++) {
                // Front row is the live spectrum
                const val = (audioData[i % audioData.length] / 255) * (1 + this.energy);
                this.heightMap[i] = val;
            }
        }

        // Propagate waves backwards
        for (let y = this.gridSize - 1; y > 0; y--) {
            for (let x = 0; x < this.gridSize; x++) {
                const idx = y * this.gridSize + x;
                const prevIdx = (y - 1) * this.gridSize + x;
                this.heightMap[idx] = this.heightMap[idx] * 0.9 + this.heightMap[prevIdx] * 0.1;
                // Add some diffusion
                if (x > 0) this.heightMap[idx] += (this.heightMap[idx - 1] - this.heightMap[idx]) * 0.05;
                if (x < this.gridSize - 1) this.heightMap[idx] += (this.heightMap[idx + 1] - this.heightMap[idx]) * 0.05;
            }
        }
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.5,
            resonance: 1 + this.energy * 2
        };
    }

    getHeight(x, y) {
        const gx = Math.floor(x * this.gridSize);
        const gy = Math.floor(y * this.gridSize);
        return this.heightMap[gy * this.gridSize + gx] || 0;
    }
}
