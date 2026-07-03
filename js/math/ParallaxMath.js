/**
 * ParallaxMath — Multi-octave FBM noise and parallax state.
 * Implements the procedural noise logic from 'gtest' shader.js.
 * Features: 6-octave FBM, audio-driven scale, and light direction.
 */
export class ParallaxMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.size = 256;
        this.heightData = new Float32Array(this.size * this.size);
        this._initNoise();
    }

    _initNoise() {
        // Pre-calculate base heightmap with FBM (Fractal Brownian Motion)
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                this.heightData[y * this.size + x] = this._fbm(x / this.size * 6, y / this.size * 6, 4);
            }
        }
    }

    _smoothNoise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        
        const hash = (nx, ny) => {
            let n = nx * 157 + ny * 113;
            n = (n << 13) ^ n;
            return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
        };

        const a = hash(ix, iy), b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    _fbm(x, y, oct) {
        let sum = 0, amp = 1.0, freq = 1.0, ma = 0;
        for (let i = 0; i < oct; i++) {
            sum += amp * this._smoothNoise(x * freq, y * freq);
            ma += amp; amp *= 0.5; freq *= 2.0;
        }
        return sum / ma;
    }

    addPulse(x, energy) {
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.5,
            resonance: 1 + this.energy * 2
        };
    }

    getHeight(u, v) {
        const x = Math.floor((u % 1 + 1) % 1 * this.size);
        const y = Math.floor((v % 1 + 1) % 1 * this.size);
        return this.heightData[y * this.size + x] || 0.5;
    }
}
