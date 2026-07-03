import { SolarFlareMath } from '../math/SolarFlareMath.js';

/**
 * SolarFlareMode — Slow-motion procedural fire.
 * 
 * Full-screen pixel field rendered on a low-res buffer and upscaled.
 * Multi-octave noise creates curling, engulfing flame patterns.
 * Locked warm palette: black → deep crimson → orange → gold → white-hot.
 * The hue dial controls flame turbulence and curl intensity.
 */
export class SolarFlareMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.fireMath = new SolarFlareMath();
        this.width = 0;
        this.height = 0;
        this.fireBuffer = null;
        this.fireCtx = null;
        this.fireW = 0;
        this.fireH = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        // Low-res buffer for pixel-level fire (performance)
        this.fireW = Math.floor(w / 5);
        this.fireH = Math.floor(h / 5);
        this.fireBuffer = document.createElement('canvas');
        this.fireBuffer.width = this.fireW;
        this.fireBuffer.height = this.fireH;
        this.fireCtx = this.fireBuffer.getContext('2d');
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.fireMath.addFlame(
            noteInfo.normalizedPosition,
            noteInfo.velocity
        );
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.fireMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');

        this.fireMath.step(dt, complexity, speed, intensity);

        if (!this.fireCtx || this.fireW === 0) {
            this.resize(w, h);
            if (!this.fireCtx) return;
        }

        const fw = this.fireW;
        const fh = this.fireH;
        const fctx = this.fireCtx;

        // --- LAYER 1: Pixel-level fire field ---
        const imgData = fctx.createImageData(fw, fh);
        const data = imgData.data;

        for (let py = 0; py < fh; py++) {
            const ny = py / fh;
            for (let px = 0; px < fw; px++) {
                const nx = px / fw;
                const fireVal = this.fireMath.sample(nx, ny, complexity, intensity);
                const color = this._fireColor(fireVal);
                const idx = (py * fw + px) * 4;
                data[idx] = color[0];
                data[idx + 1] = color[1];
                data[idx + 2] = color[2];
                data[idx + 3] = color[3];
            }
        }

        fctx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.fireBuffer, 0, 0, w, h);

        // --- LAYER 2: Ember sparks ---
        if (this.fireMath.flames.length > 0) {
            this._renderEmbers(ctx, w, h, intensity);
        }

        // --- LAYER 3: Flash at new flame origins ---
        for (const flame of this.fireMath.flames) {
            if (flame.life > 0.85) {
                this._renderBurst(ctx, flame, w, h);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Fire color gradient: 
     *   0.0  = transparent black (no flame)
     *   0.15 = deep crimson / maroon
     *   0.35 = rich red-orange
     *   0.55 = bright orange
     *   0.75 = golden yellow
     *   1.0  = white-hot
     */
    _fireColor(val) {
        const v = Math.max(0, Math.min(1, val));

        if (v < 0.05) {
            return [0, 0, 0, 0];
        }

        let r, g, b, a;

        if (v < 0.15) {
            // Darkness → deep maroon ember
            const t = (v - 0.05) / 0.1;
            r = t * 80;
            g = 0;
            b = 0;
            a = t * 180;
        } else if (v < 0.3) {
            // Dark ember → dark red
            const t = (v - 0.15) / 0.15;
            r = 80 + t * 120;
            g = t * 15;
            b = 0;
            a = 180 + t * 75;
        } else if (v < 0.45) {
            // Dark red → rich orange
            const t = (v - 0.3) / 0.15;
            r = 200 + t * 55;
            g = 15 + t * 80;
            b = 0;
            a = 255;
        } else if (v < 0.6) {
            // Rich orange → bright orange-yellow
            const t = (v - 0.45) / 0.15;
            r = 255;
            g = 95 + t * 100;
            b = t * 15;
            a = 255;
        } else if (v < 0.78) {
            // Orange-yellow → golden
            const t = (v - 0.6) / 0.18;
            r = 255;
            g = 195 + t * 45;
            b = 15 + t * 40;
            a = 255;
        } else {
            // Golden → white-hot
            const t = (v - 0.78) / 0.22;
            r = 255;
            g = 240 + t * 15;
            b = 55 + t * 200;
            a = 255;
        }

        return [Math.floor(r), Math.floor(g), Math.floor(b), Math.floor(a)];
    }

    _renderEmbers(ctx, w, h, intensity) {
        // Cheap embers — random sparks in the lower half, no noise re-sampling
        const count = Math.floor(10 + intensity * 25);
        ctx.fillStyle = 'rgba(255, 220, 80, 0.4)';
        for (let i = 0; i < count; i++) {
            const ex = (0.1 + Math.random() * 0.8) * w;
            const ey = (0.5 + Math.random() * 0.45) * h;
            const sparkSize = 0.5 + Math.random() * 2;
            ctx.globalAlpha = Math.random() * 0.4 * intensity;
            ctx.beginPath();
            ctx.arc(ex, ey, sparkSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    _renderBurst(ctx, burst, w, h) {
        const bx = burst.x * w;
        const by = (burst.baseY || burst.y || 0.9) * h;
        const size = 40 + burst.energy * 120;
        const alpha = burst.life * burst.energy;

        if (!isFinite(bx) || !isFinite(by) || !isFinite(size) || size <= 0) return;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, size);
        grad.addColorStop(0, `rgba(255, 255, 230, ${alpha * 0.7})`);
        grad.addColorStop(0.3, `rgba(255, 180, 40, ${alpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(200, 60, 0, ${alpha * 0.15})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, size, 0, Math.PI * 2);
        ctx.fill();
    }
}
