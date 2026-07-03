/**
 * FractalMath — Julia set fractal computation
 * Infinite zoom into fractal boundary. Notes morph the Julia constant
 * without resetting zoom. Automatically finds interesting boundary regions.
 */
export class FractalMath {
    constructor() {
        this.width = 640;
        this.height = 400;
        this.maxIter = 100;
        this.iterations = null;
        this.smooth = null; // Smooth iteration counts for anti-aliasing

        // Julia set constant
        this.cr = -0.4;
        this.ci = 0.6;

        // Viewport — zoom into a boundary arm
        this.centerX = 0;
        this.centerY = 0;
        this.zoom = 1.0;
        this.zoomSpeed = 0.15;

        // Smooth morphing targets
        this.targetCr = this.cr;
        this.targetCi = this.ci;
        this.time = 0;

        // Track whether we've found a good zoom target
        this._needsTarget = true;

        // Preset beautiful Julia constants
        this.juliaPresets = [
            { cr: -0.4, ci: 0.6 },
            { cr: 0.285, ci: 0.01 },
            { cr: -0.8, ci: 0.156 },
            { cr: -0.70176, ci: -0.3842 },
            { cr: 0.355, ci: 0.355 },
            { cr: -0.54, ci: 0.54 },
            { cr: -0.1, ci: 0.651 },
            { cr: 0.37, ci: 0.1 },
        ];

        this._init();
        this._findBoundaryTarget();
    }

    _init() {
        this.iterations = new Uint8Array(this.width * this.height);
        this.smooth = new Float32Array(this.width * this.height);
    }

    /**
     * Find a point on the fractal boundary to zoom into
     */
    _findBoundaryTarget() {
        // Sample the fractal at current constant to find boundary
        const samples = 500;
        let bestX = 0, bestY = 0;
        let bestScore = -1;

        for (let s = 0; s < samples; s++) {
            // Sample in the visible range
            const x = (Math.random() - 0.5) * 2.5;
            const y = (Math.random() - 0.5) * 2.0;

            let zr = x, zi = y;
            let iter = 0;
            while (iter < this.maxIter && zr * zr + zi * zi < 4) {
                const tmp = zr * zr - zi * zi + this.cr;
                zi = 2 * zr * zi + this.ci;
                zr = tmp;
                iter++;
            }

            // Score: boundary points (escaped but took many iterations) are most interesting
            // Sweet spot: 15-80% of max iterations
            const ratio = iter / this.maxIter;
            const score = ratio > 0.15 && ratio < 0.8 ? ratio * (1 - ratio) * 4 : 0;

            if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestY = y;
            }
        }

        this.centerX = bestX;
        this.centerY = bestY;
        this._needsTarget = false;
    }

    /**
     * Morph to a new Julia constant based on a note — NO zoom reset
     */
    onNote(normalizedPosition, velocity) {
        const idx = Math.floor(normalizedPosition * (this.juliaPresets.length - 0.01));
        const preset = this.juliaPresets[idx];
        this.targetCr = preset.cr + (Math.random() - 0.5) * velocity * 0.08;
        this.targetCi = preset.ci + (Math.random() - 0.5) * velocity * 0.08;
        // DON'T reset zoom — that's the whole point of fractal zoom
        // But do find a new boundary target for the new constant after it morphs
        this._needsTarget = true;
    }

    /**
     * Update — continuous zoom and smooth constant morphing
     */
    update(dt, complexity) {
        this.time += dt;

        // Continuous zoom — fractals zoom forever
        this.zoom *= 1 + this.zoomSpeed * dt;

        // At extreme zoom, float64 precision breaks down ~10^15
        // Seamlessly reset to a moderate zoom with a new boundary target
        if (this.zoom > 1e12) {
            this.zoom = 1.0;
            this._findBoundaryTarget();
        }

        // Smoothly morph Julia constant
        const morphSpeed = 0.008;
        this.cr += (this.targetCr - this.cr) * morphSpeed;
        this.ci += (this.targetCi - this.ci) * morphSpeed;

        // Once constant is close enough to target, find new boundary
        if (this._needsTarget) {
            const dr = Math.abs(this.targetCr - this.cr);
            const di = Math.abs(this.targetCi - this.ci);
            if (dr < 0.02 && di < 0.02) {
                this._findBoundaryTarget();
            }
        }

        // Very slow idle drift
        this.targetCr += Math.sin(this.time * 0.05) * dt * 0.001;
        this.targetCi += Math.cos(this.time * 0.07) * dt * 0.001;
    }

    /**
     * Compute Julia set with smooth iteration counts
     */
    compute() {
        const w = this.width;
        const h = this.height;
        const maxIter = this.maxIter;
        const cr = this.cr;
        const ci = this.ci;
        const zoom = this.zoom;
        const cx = this.centerX;
        const cy = this.centerY;

        const aspect = w / h;
        const scale = 3.0 / zoom;
        const log2 = Math.log(2);

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                let zr = (px / w - 0.5) * scale * aspect + cx;
                let zi = (py / h - 0.5) * scale + cy;

                let iter = 0;
                let zr2 = zr * zr;
                let zi2 = zi * zi;
                while (iter < maxIter && zr2 + zi2 < 256) { // escape radius 16 for smooth coloring
                    zi = 2 * zr * zi + ci;
                    zr = zr2 - zi2 + cr;
                    zr2 = zr * zr;
                    zi2 = zi * zi;
                    iter++;
                }

                const idx = py * w + px;
                this.iterations[idx] = Math.min(255, iter);

                // Smooth coloring using renormalization
                if (iter < maxIter) {
                    const log_zn = Math.log(zr2 + zi2) / 2;
                    const nu = Math.log(log_zn / log2) / log2;
                    this.smooth[idx] = iter + 1 - nu;
                } else {
                    this.smooth[idx] = maxIter;
                }
            }
        }
    }

    setZoomSpeed(speed) {
        this.zoomSpeed = Math.max(0.01, Math.min(1.0, speed));
    }

    getAudioModulation() {
        let totalIter = 0;
        const len = this.iterations.length;
        for (let i = 0; i < len; i += 8) {
            totalIter += this.iterations[i];
        }
        const avgIter = totalIter / (len / 8);
        const normalizedIter = avgIter / this.maxIter;
        const zoomMod = Math.min(1, Math.log(this.zoom + 1) / Math.log(200));

        return {
            filterMod: normalizedIter,
            detuneMod: zoomMod * 0.3,
            harmonics: Math.min(1, normalizedIter * 1.5),
        };
    }
}
