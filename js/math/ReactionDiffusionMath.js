/**
 * ReactionDiffusionMath — Gray-Scott reaction-diffusion model
 * Two chemicals (U, V) react and diffuse across a grid.
 * Feed/kill rates determine the emergent pattern (spots, stripes, spirals).
 * Rendered at 1/4 resolution for performance.
 */
export class ReactionDiffusionMath {
    constructor() {
        this.width = 240;
        this.height = 135;
        this.u = null;  // Chemical U concentration
        this.v = null;  // Chemical V concentration
        this.uNext = null;
        this.vNext = null;
        this.time = 0;

        // Gray-Scott parameters
        this.feed = 0.037;   // Feed rate
        this.kill = 0.06;    // Kill rate
        this.du = 0.21;      // Diffusion rate of U
        this.dv = 0.105;     // Diffusion rate of V
        this.dt = 1.0;       // Time step

        // Gray-Scott named parameter regions
        this.presets = {
            // ── Original 5 ───────────────────────────────────────────────
            spots:      { feed: 0.037, kill: 0.060 },
            stripes:    { feed: 0.040, kill: 0.060 },
            spirals:    { feed: 0.014, kill: 0.045 },
            coral:      { feed: 0.055, kill: 0.062 },
            mitosis:    { feed: 0.028, kill: 0.062 },
            // ── Extended set ─────────────────────────────────────────────
            maze:       { feed: 0.029, kill: 0.057 },
            worms:      { feed: 0.046, kill: 0.063 },
            fingerprints:{ feed: 0.037, kill: 0.059 },
            bubbles:    { feed: 0.098, kill: 0.057 },
            uskate:     { feed: 0.062, kill: 0.061 },
            solitons:   { feed: 0.030, kill: 0.057 },
            lambda:     { feed: 0.026, kill: 0.059 },
            bacteria:   { feed: 0.016, kill: 0.050 },
            pulsating:  { feed: 0.025, kill: 0.060 },
            traveling:  { feed: 0.014, kill: 0.054 },
            epsilon:    { feed: 0.026, kill: 0.051 },
            gamma:      { feed: 0.022, kill: 0.051 },
            turing:     { feed: 0.055, kill: 0.067 },
            holes:      { feed: 0.060, kill: 0.062 },
            stargate:   { feed: 0.039, kill: 0.058 },
        };

        this._init();
    }

    _init() {
        const size = this.width * this.height;
        this.u = new Float32Array(size).fill(1.0);
        this.v = new Float32Array(size).fill(0.0);
        this.uNext = new Float32Array(size);
        this.vNext = new Float32Array(size);

        // Seed some initial V concentration in the center
        this._seedCenter();
    }

    _seedCenter() {
        const cx = Math.floor(this.width / 2);
        const cy = Math.floor(this.height / 2);
        const r = 8;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const idx = y * this.width + x;
                        this.v[idx] = 0.5 + Math.random() * 0.25;
                        this.u[idx] = 0.25 + Math.random() * 0.25;
                    }
                }
            }
        }
    }

    /**
     * Seed V at a specific position (from note event)
     */
    seedAt(nx, ny, energy) {
        const cx = Math.floor(nx * (this.width - 1));
        const cy = Math.floor(ny * (this.height - 1));
        const r = 3 + Math.floor(energy * 4);

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const idx = y * this.width + x;
                        this.v[idx] = Math.min(1, this.v[idx] + 0.3 + energy * 0.3);
                        this.u[idx] = Math.max(0, this.u[idx] - 0.2);
                    }
                }
            }
        }
    }

    /**
     * Set pattern preset
     */
    setPreset(name) {
        const p = this.presets[name];
        if (p) {
            this.feed = p.feed;
            this.kill = p.kill;
            this.reset(); // start fresh so the new chemistry grows clean
        }
    }

    /**
     * Step the simulation
     */
    step(iterations = 4) {
        const w = this.width;
        const h = this.height;
        const f = this.feed;
        const k = this.kill;
        const du = this.du;
        const dv = this.dv;

        for (let iter = 0; iter < iterations; iter++) {
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    const uVal = this.u[idx];
                    const vVal = this.v[idx];

                    // Laplacian (5-point stencil)
                    const lapU = this.u[idx - 1] + this.u[idx + 1] +
                        this.u[idx - w] + this.u[idx + w] -
                        4 * uVal;
                    const lapV = this.v[idx - 1] + this.v[idx + 1] +
                        this.v[idx - w] + this.v[idx + w] -
                        4 * vVal;

                    const uvv = uVal * vVal * vVal;

                    this.uNext[idx] = uVal + (du * lapU - uvv + f * (1 - uVal)) * this.dt;
                    this.vNext[idx] = vVal + (dv * lapV + uvv - (f + k) * vVal) * this.dt;

                    // Clamp
                    this.uNext[idx] = Math.max(0, Math.min(1, this.uNext[idx]));
                    this.vNext[idx] = Math.max(0, Math.min(1, this.vNext[idx]));
                }
            }

            // Swap buffers
            [this.u, this.uNext] = [this.uNext, this.u];
            [this.v, this.vNext] = [this.vNext, this.v];
        }

        this.time += iterations;
    }

    /**
     * Reset the simulation
     */
    reset() {
        this.u.fill(1.0);
        this.v.fill(0.0);
        this._seedCenter();
    }

    /**
     * Audio modulation from pattern state
     */
    getAudioModulation() {
        // Sample average V concentration
        let totalV = 0;
        const len = this.v.length;
        for (let i = 0; i < len; i += 8) {
            totalV += this.v[i];
        }
        const avgV = totalV / (len / 8);

        return {
            filterMod: Math.min(1, avgV * 3),
            detuneMod: Math.min(1, avgV * 1.5),
            harmonics: Math.min(1, avgV * 2),
        };
    }
}
