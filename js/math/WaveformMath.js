/**
 * WaveformMath — Pseudo-3D Waveform Terrain
 * Ported and adapted for Harmonia.
 * Generates multiple rows of oscillating waves with perspective scaling.
 */
export class WaveformMath {
    constructor() {
        this.time = 0;
        this.perm = new Uint8Array(512);
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        for (let i = 0; i < 256; i++) this.perm[i] = this.perm[i + 256] = p[i];
    }

    noise(x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (a, b, t) => a + (b - a) * t;
        const grad = (hash, x, y, z) => {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        };
        const u = fade(x), v = fade(y), w = fade(z);
        const A = this.perm[X] + Y, AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y, BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z;
        return lerp(lerp(lerp(grad(this.perm[AA], x, y, z), grad(this.perm[BA], x - 1, y, z), u), lerp(grad(this.perm[AB], x, y - 1, z), grad(this.perm[BB], x - 1, y - 1, z), u), v), lerp(lerp(grad(this.perm[AA + 1], x, y, z - 1), grad(this.perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(this.perm[AB + 1], x, y - 1, z - 1), grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }

    generatePoints(w, h, p, t) {
        const rows = [];
        const mouseX = 0.5; // Will be passed from render
        const mouseY = 0.5;

        for (let r = p.rows; r >= 0; r--) {
            const rowProgress = r / p.rows;
            const yBase = h * 0.3 + r * (h * 0.6 / p.rows);
            const scale = 1 - rowProgress * p.perspective * 0.7;
            const alpha = 1 - rowProgress * 0.8;
            
            const points = [];
            for (let x = 0; x <= w; x += 16) {
                const xNorm = x / w;
                const wave1 = Math.sin(xNorm * Math.PI * p.frequency * 2 + t + r * 0.1) * p.amplitude;
                const wave2 = Math.sin(xNorm * Math.PI * p.frequency * 4 + t * 1.5 - r * 0.05) * p.amplitude * 0.3;
                const wave3 = this.noise(xNorm * 3, r * 0.1, t * 0.3) * p.amplitude * 0.8;

                const waveY = (wave1 + wave2 + wave3) * scale;
                const finalY = yBase + waveY;
                points.push({ x, y: finalY });
            }
            rows.push({ points, yBase, scale, alpha, hueOffset: r * 3 });
        }
        return rows;
    }
}
