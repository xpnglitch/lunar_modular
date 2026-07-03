import { PlasmaMath } from '../math/PlasmaMath.js';

/**
 * PlasmaMode — Energy field visualization
 * Renders a full-screen plasma field by sampling interference values on a 
 * low-res grid, producing organic pulsating energy patterns with filament
 * tendrils, hot spots, and layered atmospheric glow.
 */
export class PlasmaMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.pMath = new PlasmaMath();
        this.width = 0;
        this.height = 0;
        this.fieldBuffer = null;
        this.fieldCtx = null;
        this.fieldW = 0;
        this.fieldH = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.fieldW = Math.floor(w / 5);
        this.fieldH = Math.floor(h / 5);
        this.fieldBuffer = document.createElement('canvas');
        this.fieldBuffer.width = this.fieldW;
        this.fieldBuffer.height = this.fieldH;
        this.fieldCtx = this.fieldBuffer.getContext('2d');
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.pMath.addSource(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.pMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const reactivity = mathEngine.get('reactivity');

        this.pMath.step(dt, complexity, speed, lightPressure);

        if (!this.fieldCtx || this.fieldW === 0) {
            this.resize(w, h);
            if (!this.fieldCtx) return;
        }

        const fw = this.fieldW;
        const fh = this.fieldH;
        const fctx = this.fieldCtx;
        const time = this.pMath.time;

        // --- LAYER 1: Full-screen plasma field ---
        const imgData = fctx.createImageData(fw, fh);
        const data = imgData.data;

        // Reactivity scales the wave equation coefficients
        const waveScale = 0.3 + reactivity * 1.7; // 0.3x → 2x

        for (let py = 0; py < fh; py++) {
            const ny = py / fh;
            for (let px = 0; px < fw; px++) {
                const nx = px / fw;

                // Get interference value from all sources
                let val = this.pMath.getValueAt(nx, ny) * waveScale;

                // Add ambient plasma waves (coefficients scaled by reactivity)
                val += Math.sin(nx * 8 + time * 1.5) * Math.cos(ny * 6 - time * 0.8) * 0.3 * waveScale;
                val += Math.sin((nx + ny) * 12 + time * 2.2) * 0.15 * complexity * waveScale;
                val += Math.cos(nx * 4 - ny * 7 + time * 1.1) * 0.2;

                // Normalize to 0..1 range
                const normalized = (val + 2) / 4; // rough normalization
                const clamped = Math.max(0, Math.min(1, normalized));

                // Temperature-based coloring (cool plasma = blue/purple, hot = white/cyan)
                const temp = clamped;
                const pHue = (hue + temp * 120 - 30) % 360;
                const sat = 0.6 + (1 - temp) * 0.4;
                const lum = 0.05 + temp * 0.6 * (0.5 + intensity * 0.5);
                const alpha = Math.max(0, temp * 0.8 + 0.1);

                const rgb = this._hsl2rgb(((pHue % 360) + 360) % 360 / 360, sat, lum);
                const idx = (py * fw + px) * 4;
                data[idx] = rgb[0];
                data[idx + 1] = rgb[1];
                data[idx + 2] = rgb[2];
                data[idx + 3] = Math.floor(alpha * 255);
            }
        }
        fctx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.fieldBuffer, 0, 0, w, h);

        // --- LAYER 2: Energy filament tendrils from sources ---
        for (const s of this.pMath.sources) {
            const sx = s.x * w;
            const sy = s.y * h;
            const sHue = (hue + s.hue) % 360;
            const sAlpha = s.energy * s.life * (0.3 + intensity * 0.5);

            // Draw forking tendrils
            const numTendrils = 4 + Math.floor(complexity * 6 * (0.5 + reactivity));
            for (let t = 0; t < numTendrils; t++) {
                const baseAngle = (t / numTendrils) * Math.PI * 2 + time * 0.3 * (t % 2 === 0 ? 1 : -1);
                ctx.beginPath();
                ctx.moveTo(sx, sy);

                let tx = sx, ty = sy;
                const segments = 8 + Math.floor(complexity * 8);
                const reach = (60 + s.energy * 120) * (0.5 + intensity * 0.5) * (0.5 + reactivity);

                for (let seg = 0; seg < segments; seg++) {
                    const segRatio = seg / segments;
                    const jitter = Math.sin(time * 3 + t * 7 + seg * 2.3) * 15 * (1 + complexity);
                    const angle = baseAngle + jitter * 0.03 + Math.sin(seg * 0.5 + time) * 0.4;
                    const segLen = reach / segments;
                    tx += Math.cos(angle) * segLen;
                    ty += Math.sin(angle) * segLen;
                    ctx.lineTo(tx, ty);
                }

                const tendrilAlpha = sAlpha * (0.15 + (1 - complexity) * 0.1);
                ctx.strokeStyle = `hsla(${(sHue + t * 15) % 360}, 80%, 75%, ${tendrilAlpha})`;
                ctx.lineWidth = 1 + s.energy * 2;
                ctx.stroke();

                // Glow layer
                ctx.strokeStyle = `hsla(${(sHue + t * 15) % 360}, 80%, 75%, ${tendrilAlpha * 0.3})`;
                ctx.lineWidth = 4 + s.energy * 6;
                ctx.stroke();
            }
        }

        // --- LAYER 3: Hot spots (source cores) ---
        for (const s of this.pMath.sources) {
            const sx = s.x * w;
            const sy = s.y * h;
            const sHue = (hue + s.hue) % 360;
            const coreSize = (20 + s.energy * 60) * (0.5 + intensity * 0.5);

            // Outer corona
            const corona = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreSize * 2);
            corona.addColorStop(0, `hsla(${sHue}, 70%, 85%, ${s.life * s.energy * 0.4})`);
            corona.addColorStop(0.3, `hsla(${sHue}, 80%, 60%, ${s.life * s.energy * 0.15})`);
            corona.addColorStop(1, 'transparent');
            ctx.fillStyle = corona;
            ctx.beginPath();
            ctx.arc(sx, sy, coreSize * 2, 0, Math.PI * 2);
            ctx.fill();

            // Inner white-hot core
            const inner = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreSize * 0.4);
            inner.addColorStop(0, `rgba(255, 255, 255, ${s.life * s.energy * 0.6})`);
            inner.addColorStop(1, 'transparent');
            ctx.fillStyle = inner;
            ctx.beginPath();
            ctx.arc(sx, sy, coreSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _hsl2rgb(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}
