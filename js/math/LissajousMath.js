/**
 * LissajousMath — Parametric Lissajous curve math
 * Drives both particle trajectories and synth modulation (honest coupling).
 *
 * Core equation:  x = A·sin(a·t + δ),  y = B·sin(b·t)
 * At rest: clean 3:2 Lissajous. As complexity rises, factorial modulation
 * warps the ratios for organic variation.
 */

// Factorial with memoization, clamped to 20
const FACT_CLAMP = 20;
const factCache = { 0: 1, 1: 1 };
function factorial(n) {
    n = Math.max(0, Math.min(FACT_CLAMP, Math.floor(n) || 0));
    if (factCache[n] !== undefined) return factCache[n];
    let r = factCache[n - 1] || 1;
    for (let i = Math.max(2, n - 1); i <= n; i++) r *= i;
    factCache[n] = r;
    return r;
}

export class LissajousMath {
    constructor() {
        this.freqA = 3;        // Clean base ratio
        this.freqB = 2;
        this.phase = 0;
        this.phaseSpeed = 0.2;
        this.factorN = 3;      // Starts low = clean
        this.time = 0;

        // Note-driven parameters
        this.noteFreqA = 0;
        this.noteFreqB = 0;
        this.notePhaseShift = 0;
        this.noteEnergy = 0;

        // Smoothed
        this._smoothNoteA = 0;
        this._smoothNoteB = 0;
        this._smoothNotePhase = 0;
        this._smoothNoteEnergy = 0;
    }

    step(dt, complexity, speed) {
        this.time += dt;
        this.phase += this.phaseSpeed * speed * dt;

        // Complexity only gently increases factorial influence
        this.factorN = Math.floor(2 + complexity * 6); // Max 8, not 16

        // Very gentle drift on base ratios
        const drift = Math.sin(this.time * 0.07) * complexity * 0.5;
        this.freqA = 3 + drift;
        this.freqB = 2 + drift * 0.3;

        // Smooth note influence
        const lerpRate = 1 - Math.pow(0.05, dt);
        this._smoothNoteA += (this.noteFreqA - this._smoothNoteA) * lerpRate;
        this._smoothNoteB += (this.noteFreqB - this._smoothNoteB) * lerpRate;
        this._smoothNotePhase += (this.notePhaseShift - this._smoothNotePhase) * lerpRate;
        this._smoothNoteEnergy += (this.noteEnergy - this._smoothNoteEnergy) * lerpRate;
    }

    getPosition(t, idx, amplitude, complexity) {
        const fv = factorial(this.factorN);
        // Gentle per-particle phase offset (spread particles along the curve)
        const seedPhase = ((fv + idx) % Math.max(1, 200)) / 200 * Math.PI * 2;

        // At low complexity: all particles trace the same clean curve
        // At high complexity: factorial modulation gives each particle different ratios
        const fx = ((Math.floor(this.factorN) + idx) % 5) + 2; // Range 2-6
        const fy = ((Math.floor(this.factorN) + idx + 2) % 4) + 2; // Range 2-5

        // complexity controls how much factorial disruption is mixed in
        const blend = complexity * complexity; // Quadratic: stays clean until high values
        let ax = this.freqA * (1 - blend) + fx * blend;
        let ay = this.freqB * (1 - blend) + fy * blend;

        // When notes play, their ratio reshapes the curve
        if (this._smoothNoteEnergy > 0.01) {
            const nb = this._smoothNoteEnergy * 0.5;
            ax = ax * (1 - nb) + this._smoothNoteA * nb;
            ay = ay * (1 - nb) + this._smoothNoteB * nb;
        }

        const totalPhase = this.phase + seedPhase + this._smoothNotePhase;
        const ampMod = 1.0 + 0.08 * Math.sin(this.time * 0.4 + idx * 0.02);
        const noteAmpBoost = 1.0 + this._smoothNoteEnergy * 0.15;

        const x = Math.sin(ax * t + totalPhase) * amplitude * ampMod * noteAmpBoost;
        const y = Math.sin(ay * t + seedPhase * 0.5) * amplitude * ampMod * noteAmpBoost * 0.85;

        return { x, y };
    }

    getAudioModulation() {
        const pos1 = this.getPosition(this.time * 0.3, 0, 1.0, 0.3);
        const pos2 = this.getPosition(this.time * 0.2, 5, 1.0, 0.3);

        return {
            filterMod: (pos1.x + 1) * 0.5,
            lfoRate: (pos1.y + 1) * 0.5,
            detuneMod: pos2.x * 0.2,
        };
    }
}
