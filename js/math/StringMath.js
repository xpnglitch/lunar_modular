/**
 * StringMath — Vibrating string harmonics math
 * Models standing waves on strings with overtone series.
 * The harmonic numbers that create visual modes are the same
 * harmonic ratios heard in the audio (honest coupling).
 */
export class StringMath {
    constructor() {
        this.strings = []; // Active vibrating strings
        this.time = 0;
        this.maxStrings = 8;
    }

    /**
     * Add a vibrating string (from a note)
     */
    addString(normalizedPosition, frequency, velocity = 0.8) {
        // Remove oldest if at max
        if (this.strings.length >= this.maxStrings) {
            this.strings.shift();
        }

        this.strings.push({
            position: normalizedPosition, // vertical slot position
            frequency,
            amplitude: velocity,
            phase: this.time,
            active: true,
            decayStart: -1,
            // Pluck position affects which harmonics are excited
            pluckPoint: 0.2 + Math.random() * 0.3,
        });
    }

    /**
     * Release a string (begin decay)
     */
    releaseString(normalizedPosition) {
        for (const s of this.strings) {
            if (Math.abs(s.position - normalizedPosition) < 0.02 && s.active) {
                s.active = false;
                s.decayStart = this.time;
            }
        }
    }

    /**
     * Sample the string displacement at point x (0-1) along the string
     * Returns the superposition of harmonics
     */
    sampleString(stringObj, x, complexity) {
        const numHarmonics = 3 + Math.floor(complexity * 12); // 3 to 15 harmonics
        let displacement = 0;

        for (let n = 1; n <= numHarmonics; n++) {
            // Harmonic amplitude depends on pluck point (Fourier coefficient)
            const pluckAmp = Math.sin(n * Math.PI * stringObj.pluckPoint) / (n * n);
            // Standing wave: sin(n*pi*x) * cos(n*omega*t)
            const spatial = Math.sin(n * Math.PI * x);
            const temporal = Math.cos(n * stringObj.frequency * 0.02 * (this.time - stringObj.phase));
            displacement += pluckAmp * spatial * temporal;
        }

        let amp = stringObj.amplitude;
        if (!stringObj.active) {
            const decay = this.time - stringObj.decayStart;
            amp *= Math.exp(-decay * 0.5);
        }

        return displacement * amp;
    }

    step(dt) {
        this.time += dt;
        // Clean up fully decayed strings
        this.strings = this.strings.filter(s => {
            if (!s.active && this.time - s.decayStart > 6) return false;
            return true;
        });
    }

    /**
     * Audio modulation from string harmonics
     */
    getAudioModulation() {
        if (this.strings.length === 0) {
            return { filterMod: 0.5, lfoRate: 0.2, detuneMod: 0 };
        }

        let totalAmp = 0;
        for (const s of this.strings) {
            let amp = s.amplitude;
            if (!s.active) amp *= Math.exp(-(this.time - s.decayStart) * 0.5);
            totalAmp += amp;
        }

        return {
            filterMod: Math.min(1, totalAmp / this.strings.length),
            lfoRate: 0.2 + this.strings.length * 0.08,
            detuneMod: Math.sin(this.time * 0.3) * 0.08 * this.strings.length,
        };
    }
}
