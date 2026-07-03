import { AudioSurfaceMath } from '../math/AudioSurfaceMath.js';

/**
 * AudioSurfaceMode — Responsive 3D mesh surface: a topographic landscape rippling with notes.
 * Each key press creates a wave that propagates across the grid surface. Crests glow.
 */
export class AudioSurfaceMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new AudioSurfaceMath();
        this.time = 0;
        this.cols = 52;
        this.rows = 32;
        this.heights = null;
        this.waves = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.heights = new Float32Array(this.cols * this.rows);
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.waves.push({
            cx: noteInfo.normalizedPosition * this.cols,
            cy: this.rows / 2,
            r: 0,
            amp: noteInfo.velocity * 0.9,
            speed: 9 + noteInfo.velocity * 14,
            life: 1.0,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');

        const cols = this.cols, rows = this.rows;
        const cw = w / (cols - 1);
        const ch = (h * 0.7) / (rows - 1);

        // Advance waves
        this.waves = this.waves.filter(wv => wv.life > 0.01);
        for (const wv of this.waves) {
            wv.r += wv.speed * dt;
            wv.life -= dt * 0.55;
        }

        // Update height field
        const ht = this.heights;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                let hval = Math.sin(c * 0.26 + this.time * 0.65 + complexity * 0.4) *
                           Math.cos(r * 0.32 + this.time * 0.45) * 0.18 * (0.5 + energy);
                for (const wv of this.waves) {
                    const dist = Math.hypot(c - wv.cx, r - wv.cy);
                    const d = dist - wv.r;
                    if (Math.abs(d) < 4.5) {
                        hval += Math.exp(-d * d * 0.28) * Math.cos(d * 1.1) * wv.amp * wv.life;
                    }
                }
                ht[idx] = ht[idx] * 0.87 + hval * 0.13;
            }
        }

        // Trail
        ctx.fillStyle = `rgba(0,0,0,0.22)`;
        ctx.fillRect(0, 0, w, h);

        const baseY = h * 0.82;
        const isoX = (c) => c * cw;
        const isoY = (r, hval) => baseY - r * ch - hval * h * 0.2;

        // Horizontal grid lines
        ctx.lineWidth = 0.9;
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            for (let c = 0; c < cols; c++) {
                const hval = ht[r * cols + c];
                const x = isoX(c), y = isoY(r, hval);
                if (c === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const rowFrac = r / rows;
            const lh = (hue + rowFrac * 55) % 360;
            ctx.strokeStyle = `hsla(${lh},80%,${50 + energy * 20}%,${0.3 + rowFrac * 0.45})`;
            ctx.stroke();
        }

        // Vertical grid lines
        ctx.lineWidth = 0.5;
        for (let c = 0; c < cols; c++) {
            ctx.beginPath();
            for (let r = 0; r < rows; r++) {
                const hval = ht[r * cols + c];
                if (r === 0) ctx.moveTo(isoX(c), isoY(r, hval));
                else ctx.lineTo(isoX(c), isoY(r, hval));
            }
            ctx.strokeStyle = `hsla(${hue},55%,42%,0.16)`;
            ctx.stroke();
        }

        // Crest glow
        ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hval = ht[r * cols + c];
                if (hval > 0.22) {
                    const px = isoX(c), py = isoY(r, hval);
                    const radius = Math.max(0, hval * 24 * (0.5 + energy));
                    const cg = ctx.createRadialGradient(px, py, 0, px, py, radius);
                    cg.addColorStop(0, `hsla(${(hue + 40) % 360},100%,92%,${Math.min(0.9, hval * 0.8)})`);
                    cg.addColorStop(1, 'transparent');
                    ctx.fillStyle = cg;
                    ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
