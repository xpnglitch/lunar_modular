/**
 * PendulumMath — Polyrhythmic pendulum wave physics
 * Each pendulum has a slightly different period, creating interference patterns.
 * Wall hits are detected and reported so the Mode can trigger notes.
 */
export class PendulumMath {
    constructor() {
        this.numPendulums = 15;
        this.baseSpeed = 0.5;  // Constant speed for all bobs
        this.vAngle = 0.35;    // V-shape spread, affects travel distance
        this.time = 0;

        // Each pendulum's previous position (for zero-crossing detection)
        this.prevPositions = [];
        // Edge-trigger flags: fire once per wall hit, reset when pendulum moves away
        this.hitFlags = []; // { hitRight: bool, hitLeft: bool }
        this.pendulums = [];
        this._buildPendulums();
    }

    _buildPendulums() {
        this.pendulums = [];
        this.prevPositions = [];
        this.hitFlags = [];
        
        // Base oscillations for the longest pendulum in one full system cycle.
        // Lower k = more dramatic wave spacing. k=12 is ideal for 15-20 pendulums.
        const k = 12; 
        const L0 = 0.85; // Maximum thread length (normalized 0-1)
        
        for (let i = 0; i < this.numPendulums; i++) {
            // For a pendulum wave to sync back to a line after time T:
            // The i-th pendulum must complete k + i oscillations.
            // Frequency fn = (k + i) / T
            // Period Pn = T / (k + i)
            // In our constant-speed model, Period P is proportional to threadLength L.
            // So Ln = L0 * (k / (k + i))
            const threadLength = L0 * (k / (k + i));
            
            // Period = distance / speed. Same speed for all bobs.
            // Total travel distance in one period = 2 * wall_distance = 2 * (threadLength * vAngle)
            const period = (threadLength * this.vAngle * 2) / this.baseSpeed;
            
            this.pendulums.push({ period, phase: 0, threadLength });
            this.prevPositions.push(0);
            this.hitFlags.push({ hitRight: false, hitLeft: false });
        }
    }

    /**
     * Dynamically change the number of pendulums
     */
    setNumPendulums(count) {
        this.numPendulums = Math.max(3, Math.min(50, count));
        this._buildPendulums();
    }

    /**
     * Get normalized position of pendulum i at time t
     * Returns [-1, 1] where ±1 = at the walls
     * Uses triangle wave for constant-speed motion with sharp wall bounces
     */
    getPosition(i, t, complexity) {
        if (i < 0 || i >= this.pendulums.length) return 0;
        const p = this.pendulums[i];
        // Triangle wave: linear motion, sharp reversal at walls
        const phase = (t / p.period + p.phase / (2 * Math.PI)) % 1;
        // Map 0-1 phase to triangle: 0→+1→0→-1→0
        const tri = 4 * Math.abs(phase - 0.5) - 1; // range [-1, 1]
        return tri;
    }

    /**
     * Step forward and detect wall hits.
     * Returns an array of { index, side, force } for each hit this frame.
     * side: -1 = left wall, +1 = right wall
     */
    step(dt, t, complexity) {
        this.time += dt;
        const hits = [];

        for (let i = 0; i < this.numPendulums; i++) {
            const pos = this.getPosition(i, t, complexity);
            const flags = this.hitFlags[i];

            // Edge-trigger: fire ONCE when entering extreme zone, reset when leaving
            // Right wall hit
            if (pos >= 0.92 && !flags.hitRight) {
                flags.hitRight = true;
                hits.push({ index: i, side: 1, force: Math.abs(pos) });
            }
            if (pos < 0.7) flags.hitRight = false;

            // Left wall hit
            if (pos <= -0.92 && !flags.hitLeft) {
                flags.hitLeft = true;
                hits.push({ index: i, side: -1, force: Math.abs(pos) });
            }
            if (pos > -0.7) flags.hitLeft = false;

            this.prevPositions[i] = pos;
        }

        return hits;
    }

    /**
     * Perturb phases (from keyboard note events — optional interaction)
     */
    perturb(velocity, normalizedPosition) {
        const targetIdx = Math.floor(normalizedPosition * this.numPendulums);
        for (let i = 0; i < this.numPendulums; i++) {
            const dist = Math.abs(i - targetIdx) / this.numPendulums;
            this.pendulums[i].phase += velocity * (1 - dist) * 0.5;
        }
    }

    /**
     * Audio modulation from pendulum phases
     */
    getAudioModulation() {
        let sum = 0;
        for (let i = 0; i < this.numPendulums; i++) {
            sum += this.prevPositions[i];
        }
        const normalizedSum = (sum / this.numPendulums + 1) * 0.5;
        return {
            filterMod: normalizedSum,
            lfoRate: 0.3,
            detuneMod: Math.sin(this.time * 0.7) * 0.1,
        };
    }
}
