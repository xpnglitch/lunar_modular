import { GranularSandMath } from '../math/GranularSandMath.js';

/**
 * GranularSandMode — Falling sand physics with dune formations.
 * 
 * Columns of sand grains fall and pile up, creating dune-like
 * formations. Notes disturb existing piles and launch sand upward.
 * Sand color shifts with the hue dial creating desert/snow/volcanic ash.
 */
export class GranularSandMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new GranularSandMath();
        this.grains = [];
        this.piles = new Float32Array(200); // height map
        this._initGrains();
    }

    _initGrains() {
        for (let i = 0; i < 500; i++) {
            this.grains.push({
                x: Math.random(),
                y: Math.random() * 0.6,
                vy: 0.01 + Math.random() * 0.03,
                vx: (Math.random() - 0.5) * 0.005,
                settled: false,
                size: 1 + Math.random() * 2,
                shade: 0.7 + Math.random() * 0.3
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Disturb piles near note position
        const col = Math.floor(noteInfo.normalizedPosition * this.piles.length);
        const radius = 5 + Math.floor(noteInfo.velocity * 15);
        for (let c = col - radius; c <= col + radius; c++) {
            if (c >= 0 && c < this.piles.length) {
                const dist = Math.abs(c - col) / radius;
                const eject = this.piles[c] * (1 - dist) * noteInfo.velocity * 0.6;
                this.piles[c] -= eject;
                if (this.piles[c] < 0) this.piles[c] = 0;
                // Launch grains upward
                const count = Math.floor(eject * 3);
                for (let g = 0; g < count && this.grains.length < 1000; g++) {
                    this.grains.push({
                        x: c / this.piles.length + (Math.random() - 0.5) * 0.02,
                        y: 1 - this.piles[c] / 200,
                        vy: -(0.05 + Math.random() * 0.15 * noteInfo.velocity),
                        vx: (Math.random() - 0.5) * 0.04,
                        settled: false,
                        size: 1 + Math.random() * 2.5,
                        shade: 0.6 + Math.random() * 0.4
                    });
                }
            }
        }
        // Spawn new falling grains
        for (let i = 0; i < 30; i++) {
            this.grains.push({
                x: noteInfo.normalizedPosition + (Math.random() - 0.5) * 0.2,
                y: Math.random() * 0.1,
                vy: 0.02 + Math.random() * 0.05,
                vx: (Math.random() - 0.5) * 0.01,
                settled: false,
                size: 1 + Math.random() * 2,
                shade: 0.7 + Math.random() * 0.3
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;

        // Background — solid black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Continuous sand rain
        if (this.grains.length < 600 && Math.random() < 0.3) {
            this.grains.push({
                x: Math.random(),
                y: -0.02,
                vy: 0.015 + Math.random() * 0.025,
                vx: (Math.random() - 0.5) * 0.003,
                settled: false,
                size: 1 + Math.random() * 1.5,
                shade: 0.7 + Math.random() * 0.3
            });
        }

        const cols = this.piles.length;
        const colW = w / cols;

        // Draw pile terrain
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let c = 0; c < cols; c++) {
            const px = c * colW + colW * 0.5;
            const py = h - this.piles[c] * (h * 0.003);
            if (c === 0) ctx.moveTo(0, py);
            ctx.lineTo(px, py);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const pileGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
        pileGrad.addColorStop(0, `hsla(${hue + 30}, 45%, 50%, 1)`);
        pileGrad.addColorStop(0.5, `hsla(${hue + 25}, 40%, 35%, 1)`);
        pileGrad.addColorStop(1, `hsla(${hue + 20}, 30%, 20%, 1)`);
        ctx.fillStyle = pileGrad;
        ctx.fill();

        // Highlight the surface of the dunes
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
            const px = c * colW + colW * 0.5;
            const py = h - this.piles[c] * (h * 0.003);
            if (c === 0) ctx.moveTo(0, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${hue + 35}, 60%, 70%, 0.8)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Update and render grains
        for (let i = this.grains.length - 1; i >= 0; i--) {
            const g = this.grains[i];
            if (g.settled) { this.grains.splice(i, 1); continue; }

            g.vy += 0.002 * speed; // gravity
            g.x += g.vx * speed;
            g.y += g.vy * speed;

            // Check pile collision
            const col = Math.floor(g.x * cols);
            if (col >= 0 && col < cols) {
                const pileY = 1 - this.piles[col] / 200;
                if (g.y >= pileY && g.vy > 0) {
                    this.piles[col] += g.size * 0.5;
                    // Avalanche: spread to neighbors
                    if (col > 0 && this.piles[col] - this.piles[col - 1] > 3) {
                        this.piles[col - 1] += 1;
                        this.piles[col] -= 1;
                    }
                    if (col < cols - 1 && this.piles[col] - this.piles[col + 1] > 3) {
                        this.piles[col + 1] += 1;
                        this.piles[col] -= 1;
                    }
                    g.settled = true;
                    continue;
                }
            }

            // Out of bounds
            if (g.y > 1.05 || g.x < -0.05 || g.x > 1.05) {
                this.grains.splice(i, 1);
                continue;
            }

            // Draw grain
            const px = g.x * w;
            const py = g.y * h;
            const lightness = 40 + g.shade * 30;
            ctx.fillStyle = `hsla(${hue + 25}, 40%, ${lightness}%, 0.8)`;
            ctx.fillRect(px, py, g.size, g.size);
        }

        // Limit grains
        while (this.grains.length > 1000) this.grains.shift();
    }
}
