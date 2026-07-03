/**
 * WaveMath — Wave superposition and interference
 * Create concentric waves from note positions.
 * Visual wave frequency = audio frequency (literally the same number).
 */
export class WaveMath {
    constructor() {
        this.waves = []; // Active wave sources
        this.time = 0;
    }

    /**
     * Add a wave source (from a note)
     */
    addWave(normalizedPosition, frequency, velocity = 0.8) {
        this.waves.push({
            x: normalizedPosition,
            frequency: frequency,
            amplitude: velocity,
            phase: this.time,
            active: true,
            decayStart: -1,
        });
    }

    /**
     * Release a wave (begin decay)
     */
    releaseWave(normalizedPosition) {
        for (const wave of this.waves) {
            if (Math.abs(wave.x - normalizedPosition) < 0.02 && wave.active) {
                wave.active = false;
                wave.decayStart = this.time;
            }
        }
    }

    /**
     * Step time forward and clean up dead waves
     */
    step(dt) {
        this.time += dt;

        // Remove fully decayed waves and cap at 8
        this.waves = this.waves.filter(w => {
            if (!w.active && this.time - w.decayStart > 4) return false;
            return true;
        });
        // Keep only the 8 most recent waves for performance
        if (this.waves.length > 8) {
            this.waves = this.waves.slice(-8);
        }
    }

    /**
     * Calculate interference value at a point
     * Returns -1 to 1, representing the superposition of all active waves
     */
    sample(px, py, canvasWidth, canvasHeight, complexity = 0.3) {
        if (this.waves.length === 0) return 0;

        let sum = 0;
        const waveSpeed = 200 + complexity * 300;
        const halfH = canvasHeight * 0.5;
        const time = this.time;

        for (let i = 0; i < this.waves.length; i++) {
            const wave = this.waves[i];
            const wx = wave.x * canvasWidth;
            const dx = px - wx;
            const dy = py - halfH;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const visualFreq = wave.frequency * 0.01 * (0.5 + complexity * 1.5);
            const phase = dist * visualFreq * 0.01 - time * waveSpeed * 0.01 + wave.phase;

            let amp = wave.amplitude / (1 + dist * 0.003);
            if (!wave.active) {
                amp *= Math.exp(-(time - wave.decayStart) * 0.7);
            }

            sum += Math.sin(phase) * amp;
        }

        return sum > 1 ? 1 : sum < -1 ? -1 : sum;
    }

    /**
     * Audio modulation — interference pattern statistics
     */
    getAudioModulation() {
        if (this.waves.length === 0) {
            return { filterMod: 0.5, lfoRate: 0.3, detuneMod: 0 };
        }

        // Average wave amplitude as filter mod
        let totalAmp = 0;
        for (const wave of this.waves) {
            let amp = wave.amplitude;
            if (!wave.active) {
                amp *= Math.exp(-(this.time - wave.decayStart) * 0.7);
            }
            totalAmp += amp;
        }
        const avgAmp = totalAmp / this.waves.length;

        return {
            filterMod: avgAmp,
            lfoRate: 0.3 + this.waves.length * 0.05,
            detuneMod: Math.sin(this.time * 0.5) * 0.1 * this.waves.length,
        };
    }
}
