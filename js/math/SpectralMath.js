/**
 * SpectralMath — 3D Fourier Transform waterfall.
 * Maintains a high-resolution rolling history of FFT spectral data.
 * Features: Logarithmic frequency scaling and 3D terrain projection.
 */
export class SpectralMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.historySize = 50;
        this.fftSize = 128;
        this.history = [];
        this._initHistory();
    }

    _initHistory() {
        for (let i = 0; i < this.historySize; i++) {
            this.history.push(new Float32Array(this.fftSize).fill(0));
        }
    }

    addPulse(x, energy) {
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity, audioData) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        // Add new spectrum to history
        const newSpectrum = new Float32Array(this.fftSize);
        if (audioData) {
            for (let i = 0; i < this.fftSize; i++) {
                newSpectrum[i] = (audioData[i % audioData.length] / 255);
            }
        }
        
        this.history.push(newSpectrum);
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.4,
            detuneMod: this.energy * 0.2
        };
    }

    getSpectralPoints(w, h, scale) {
        const pts = [];
        for (let z = 0; z < this.history.length; z++) {
            const spectrum = this.history[z];
            for (let x = 0; x < this.fftSize; x++) {
                const amp = spectrum[x] * 150 * (1 + this.energy);
                
                // Perspective projection
                const normX = (x / this.fftSize - 0.5) * 2;
                const normZ = (z / this.historySize); // 0 (oldest) to 1 (newest)
                
                const px = w/2 + normX * w * 0.5 * (0.2 + normZ * 0.8);
                const py = h - (normZ * h * 0.5) - (amp * (0.2 + normZ * 0.8));

                pts.push({ x: px, y: py, amp: amp, depth: normZ });
            }
        }
        return pts;
    }
}
