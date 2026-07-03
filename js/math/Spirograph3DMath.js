/**
 * Spirograph3DMath — Chromeograph Physics.
 * Parametric 3-axis Lissajous harmonograph with multiple frequency-ratio layers.
 * Generates closed figures each frame — no path-history decay issues.
 */
export class Spirograph3DMath {
    constructor() {
        this.time        = 0;
        this.energy      = 0;
        this.resonance   = 0;
        this._phaseShift = 0;

        // Each layer: integer frequency ratios so the figure closes in t = [0, 2π]
        // (GCD of fx/fy/fz = 1 guarantees one clean period)
        this.layers = [
            { fx: 3, fy: 4, fz: 5, px: 0,           py: Math.PI * 0.25, pz: Math.PI * 0.5  },
            { fx: 5, fy: 7, fz: 4, px: Math.PI * 0.5, py: 0,            pz: Math.PI * 0.33 },
        ];
    }

    addPulse(normalizedX, velocity) {
        this.energy      = Math.min(2.0, this.energy     + velocity * 1.2);
        this.resonance   = Math.min(1.0, this.resonance  + velocity * 0.6);
        this._phaseShift += velocity * 0.8;
        // Gently perturb phases to shift the interference pattern
        for (const l of this.layers) {
            l.px += (Math.random() - 0.5) * velocity * 0.6;
            l.py += (Math.random() - 0.5) * velocity * 0.6;
            l.pz += (Math.random() - 0.5) * velocity * 0.4;
        }
    }

    // Called by the visual mode each frame
    update(dt, complexity, speed) {
        this.time        += dt * (speed  || 1.0) * 0.35;
        this.energy      *= 0.97;
        this.resonance   *= 0.985;
        this._phaseShift *= 0.992;
    }

    /**
     * Parametric sweep: returns the full closed Lissajous curve for one layer.
     * t sweeps [0, 2π] — sufficient for any layer whose GCD(fx,fy,fz) = 1.
     * Points have x,y,z ∈ [-1, 1] and frac ∈ [0, 1].
     */
    generateCurve(layerIdx, numPoints) {
        const l     = this.layers[layerIdx];
        const T     = Math.PI * 2;
        const drift = this.time * 0.15;           // slow phase drift morphs the figure
        const eMod  = this.energy * 0.07;          // audio energy warps the geometry
        const pts   = [];

        for (let i = 0; i <= numPoints; i++) {
            const t = (i / numPoints) * T;
            const x = Math.sin(l.fx * t + l.px + drift       + Math.sin(t * 0.28) * eMod);
            const y = Math.sin(l.fy * t + l.py + drift * 0.6 + Math.cos(t * 0.37) * eMod);
            const z = Math.sin(l.fz * t + l.pz + drift * 0.4);
            pts.push({ x, y, z, frac: i / numPoints });
        }
        return pts;
    }

    /** Current pen position (layer 0, phase locked to this.time). */
    currentPoint() {
        const l     = this.layers[0];
        const T     = Math.PI * 2;
        const t     = (this.time * 1.8) % T;
        const drift = this.time * 0.15;
        const eMod  = this.energy * 0.07;
        return {
            x: Math.sin(l.fx * t + l.px + drift       + Math.sin(t * 0.28) * eMod),
            y: Math.sin(l.fy * t + l.py + drift * 0.6 + Math.cos(t * 0.37) * eMod),
            z: Math.sin(l.fz * t + l.pz + drift * 0.4),
        };
    }

    getAudioModulation() {
        return {
            vibrato:       Math.min(1, this.energy * 0.5),
            resonance:     this.resonance,
            harmonicSpace: 0.5,
        };
    }
}
