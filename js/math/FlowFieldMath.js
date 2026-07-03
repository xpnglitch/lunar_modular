/**
 * FlowFieldMath — Perlin noise-based flow field
 * Generates angle vectors for particle movement.
 * The same noise values that drive particles also modulate the synth.
 */

// Simplex noise implementation (fast, no directional bias)
// Based on Stefan Gustavson's implementation
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

// Permutation table
const perm = new Uint8Array(512);
const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

// Seed the permutation table
function seedNoise(seed = 42) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with seed
    let s = seed;
    for (let i = 255; i > 0; i--) {
        s = (s * 16807 + 0) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
    }
}

seedNoise(42);

/**
 * 2D Simplex noise — returns value in [-1, 1]
 */
function simplex2(x, y) {
    let n0, n1, n2;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
        t0 *= t0;
        const gi0 = perm[ii + perm[jj]] % 12;
        n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
        t1 *= t1;
        const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
        n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
        t2 *= t2;
        const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;
        n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
}

/**
 * 3D Simplex noise for time-evolution
 */
function simplex3(x, y, z) {
    // Use 2D noise with z-offset trick for simplicity
    // (true 3D simplex is more complex but this sounds/looks fine)
    const n1 = simplex2(x + z * 31.7, y + z * 17.3);
    const n2 = simplex2(x + z * 13.1 + 100, y + z * 23.9 + 100);
    return (n1 + n2) * 0.5;
}

export class FlowFieldMath {
    constructor() {
        this.noiseScale = 0.003; // Controls how "zoomed in" the noise field is
        this.timeScale = 0.15;   // How fast the field evolves
    }

    /**
     * Get the flow angle at position (x, y) at time t
     * Returns angle in radians
     */
    getAngle(x, y, t, complexity = 0.3) {
        const scale = this.noiseScale * (1 + complexity * 2);
        const n = simplex3(x * scale, y * scale, t * this.timeScale);
        // Map noise [-1,1] to angle [0, 2π] with extra rotation from complexity
        return n * Math.PI * (1 + complexity);
    }

    /**
     * Get the flow magnitude at position (x, y)
     * Used for particle speed variation
     */
    getMagnitude(x, y, t, intensity = 0.3) {
        const n = simplex3(
            x * this.noiseScale * 1.5 + 500,
            y * this.noiseScale * 1.5 + 500,
            t * this.timeScale * 0.7
        );
        return 0.5 + n * 0.5 * (0.5 + intensity * 1.5);
    }

    /**
     * Sample the noise field at a position — for AUDIO modulation
     * Returns a value in [0, 1] that can modulate synth parameters
     * This is the HONEST COUPLING — same noise field, sampled for audio
     */
    getAudioModulation(t, complexity = 0.3) {
        // Sample at fixed positions to get consistent modulation
        const n1 = simplex3(100, 200, t * this.timeScale * 0.5);
        const n2 = simplex3(300, 400, t * this.timeScale * 0.3);
        return {
            filterMod: (n1 + 1) * 0.5,     // 0-1: modulates filter cutoff
            lfoRate: (n2 + 1) * 0.5,       // 0-1: modulates LFO speed
            detuneMod: simplex2(500, t * this.timeScale * 0.2) * complexity * 0.5,
        };
    }
}
