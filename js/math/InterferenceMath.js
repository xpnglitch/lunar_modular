/**
 * InterferenceMath — 2D wave equation solver
 * Each active note is a point source emitting circular ripples.
 * Solves the discrete wave equation on a grid: next = 2*curr - prev + c²Δt²∇²curr
 * The same wave amplitude data drives both visuals and audio modulation.
 */
export class InterferenceMath {
    constructor() {
        this.cols = 200;
        this.rows = 150;
        this.damping = 0.997;  // Energy loss per step (< 1 = waves decay)
        this.speed = 0.45;     // Wave propagation speed (c)

        // Triple-buffer for wave equation (previous, current, next)
        this.prev = null;
        this.curr = null;
        this.next = null;

        // Active wave sources: Map<sourceId, {col, row, frequency, phase, amplitude}>
        this.sources = new Map();
        this.time = 0;

        this._init();
    }

    _init() {
        const size = this.cols * this.rows;
        this.prev = new Float32Array(size);
        this.curr = new Float32Array(size);
        this.next = new Float32Array(size);
    }

    /**
     * Add a wave source (called on noteOn)
     */
    addSource(id, normalizedX, normalizedY, frequency, amplitude = 1.0) {
        const col = Math.floor(normalizedX * (this.cols - 1));
        const row = Math.floor(normalizedY * (this.rows - 1));
        this.sources.set(id, {
            col: Math.max(1, Math.min(this.cols - 2, col)),
            row: Math.max(1, Math.min(this.rows - 2, row)),
            frequency,
            phase: 0,
            amplitude,
        });
    }

    /**
     * Remove a wave source (called on noteOff)
     */
    removeSource(id) {
        this.sources.delete(id);
    }

    /**
     * Step the wave equation forward
     */
    step(dt, complexity = 0.3) {
        this.time += dt;
        // Clamp c² to maintain CFL stability condition (c²Δt² < 1 for the grid)
        const rawC2 = this.speed * this.speed * (1 + complexity * 2);
        const c2 = Math.min(rawC2, 0.4); // Hard cap to prevent blowup
        const cols = this.cols;
        const rows = this.rows;

        // Inject energy from active sources
        for (const [, src] of this.sources) {
            src.phase += dt * src.frequency * 0.05;
            const val = Math.sin(src.phase) * src.amplitude * 2.0;
            const idx = src.row * cols + src.col;
            this.curr[idx] = val;
        }

        // Solve wave equation: next = 2*curr - prev + c²(∇²curr)
        // Damping increases with complexity to keep energy bounded
        const damp = this.damping - complexity * 0.003;

        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = r * cols + c;
                const laplacian =
                    this.curr[idx - 1] + this.curr[idx + 1] +
                    this.curr[idx - cols] + this.curr[idx + cols] -
                    4 * this.curr[idx];

                let val = (2 * this.curr[idx] - this.prev[idx] + c2 * laplacian) * damp;
                // Clamp to prevent NaN/Infinity propagation
                if (val > 5) val = 5;
                else if (val < -5) val = -5;
                else if (val !== val) val = 0; // NaN check
                this.next[idx] = val;
            }
        }

        // Rotate buffers
        const tmp = this.prev;
        this.prev = this.curr;
        this.curr = this.next;
        this.next = tmp;
    }

    /**
     * Get the amplitude at a grid position (normalized 0-1 coords)
     */
    getAmplitudeAt(nx, ny) {
        const c = Math.floor(nx * (this.cols - 1));
        const r = Math.floor(ny * (this.rows - 1));
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return 0;
        return this.curr[r * this.cols + c];
    }

    /**
     * Get audio modulation — honest coupling from the wave field
     */
    getAudioModulation() {
        // Sample amplitude at screen center
        const centerIdx = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
        const centerAmp = Math.abs(this.curr[centerIdx]);

        // Average energy across the field
        let totalEnergy = 0;
        const len = this.curr.length;
        for (let i = 0; i < len; i += 4) { // Sample every 4th for perf
            totalEnergy += Math.abs(this.curr[i]);
        }
        const avgEnergy = totalEnergy / (len / 4);

        return {
            filterMod: Math.min(1, centerAmp * 0.5),
            detuneMod: Math.min(1, avgEnergy * 0.3),
            harmonics: Math.min(1, this.sources.size / 8),
        };
    }

    /**
     * Get the raw grid data for rendering
     */
    getGrid() {
        return this.curr;
    }

    /**
     * Reset the wave field
     */
    reset() {
        this.prev.fill(0);
        this.curr.fill(0);
        this.next.fill(0);
        this.sources.clear();
    }
}
