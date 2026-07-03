/**
 * SolarFlareMath — Note-spawned flame columns.
 * 
 * Each note creates a unique flame that rises from its position.
 * No notes = no fire. Each flame has its own noise seed so they
 * look distinct, not windows into a shared texture.
 */
export class SolarFlareMath {
    constructor() {
        this.time = 0;
        this.flames = [];
        this.maxFlames = 30;

        // Permutation table for noise
        this.perm = new Uint8Array(512);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    reset() {
        this.time = 0;
        this.flames = [];
    }

    addFlame(nx, vel) {
        this.flames.push({
            x: nx,                          // horizontal center
            baseY: 0.9,                     // bottom origin
            energy: 0.4 + vel * 0.6,
            life: 1.0,
            decay: 0.06 + Math.random() * 0.06,
            width: 0.08 + vel * 0.12,       // base width
            height: 0.3 + vel * 0.5,        // how far up the flame reaches
            seed: Math.random() * 200,       // unique noise offset
            twistSeed: Math.random() * 100   // unique curl offset
        });
        if (this.flames.length > this.maxFlames) this.flames.shift();
    }

    step(dt, complexity, speed, intensity) {
        this.time += dt * speed;

        for (let i = this.flames.length - 1; i >= 0; i--) {
            const f = this.flames[i];
            f.life -= dt * f.decay;
            if (f.life <= 0) this.flames.splice(i, 1);
        }
    }

    /**
     * Sample fire at (nx, ny). Sums contributions from all active flames.
     * Each flame is a vertical column with its own unique noise.
     */
    sample(nx, ny, complexity, intensity) {
        if (this.flames.length === 0) return 0;

        const t = this.time;
        let totalHeat = 0;

        for (const flame of this.flames) {
            // How far is this pixel from the flame's center column?
            const dx = nx - flame.x;

            // Vertical position within the flame (0 = base, 1 = tip)
            const flameTop = flame.baseY - flame.height * flame.life;
            if (ny < flameTop || ny > flame.baseY + 0.05) continue;

            const verticalT = (flame.baseY - ny) / (flame.height * flame.life);
            const clampedVT = Math.max(0, Math.min(1, verticalT));

            // Width tapers going up (wide at base, narrow at tip)
            const widthAtHeight = flame.width * (1.0 - clampedVT * 0.7);

            // Horizontal falloff
            const hFalloff = 1.0 - Math.abs(dx) / widthAtHeight;
            if (hFalloff <= 0) continue;

            // --- Per-flame noise (each flame looks unique via seed offset) ---
            const scrollY = ny + t * 0.3;
            const sx = flame.seed;
            const tx = flame.twistSeed;

            // Domain warp using this flame's unique seeds
            const warpStr = 0.2 + complexity * 0.35;
            const wx = this._noise(nx * 4 + t * 0.12 + sx, scrollY * 2 + sx) * warpStr;
            const wy = this._noise(nx * 4 + 50 + tx, scrollY * 2 + t * 0.08 + tx) * warpStr;
            const wx2 = this._noise((nx + wx) * 3 + t * 0.07 + sx, (scrollY + wy) * 2 + 30 + sx) * warpStr * 0.5;
            const wy2 = this._noise((nx + wx) * 3 + 80 + tx, (scrollY + wy) * 2 + t * 0.05 + tx) * warpStr * 0.5;

            const warpedX = nx + wx + wx2;
            const warpedY = scrollY + wy + wy2;

            // Noise value for this flame
            const noiseScale = 7 + complexity * 4;
            let nval = 0;
            nval += this._noise(warpedX * noiseScale + sx, warpedY * noiseScale * 0.35 + sx) * 1.0;
            nval += this._noise(warpedX * noiseScale * 2 + 5 + sx, warpedY * noiseScale * 0.7 + t * 0.3 + sx) * 0.5;
            nval += this._noise(warpedX * noiseScale * 4 + 11 + sx, warpedY * noiseScale * 1.4 + t * 0.5 + sx) * 0.25;

            // Normalize
            nval = (nval + 1.2) / 3.0;

            // Sigmoid contrast
            nval = nval * 1.5 - 0.2;
            nval = 1.0 / (1.0 + Math.exp(-10 * (nval - 0.45)));

            // Combine: noise × horizontal falloff × vertical shape × energy
            const verticalShape = Math.pow(hFalloff, 1.2);
            const tipFade = 1.0 - Math.pow(clampedVT, 1.5); // fade at tip
            const heat = nval * verticalShape * tipFade * flame.energy * flame.life;

            totalHeat += heat;
        }

        return Math.max(0, Math.min(1, totalHeat));
    }

    _noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
        const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X + 1] + Y];
        const bb = this.perm[this.perm[X + 1] + Y + 1];
        const lerpA = this._grad(aa, xf, yf) + u * (this._grad(ba, xf - 1, yf) - this._grad(aa, xf, yf));
        const lerpB = this._grad(ab, xf, yf - 1) + u * (this._grad(bb, xf - 1, yf - 1) - this._grad(ab, xf, yf - 1));
        return lerpA + v * (lerpB - lerpA);
    }

    _grad(hash, x, y) {
        const h = hash & 3;
        return (h === 0 ? x + y : h === 1 ? -x + y : h === 2 ? x - y : -x - y);
    }

    getAudioModulation() {
        const energySum = this.flames.reduce((s, f) => s + f.energy * f.life, 0);
        return {
            filterMod: 0.3 + energySum * 0.15,
            detuneMod: energySum * 0.1
        };
    }
}
