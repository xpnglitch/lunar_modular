import { MetaballsMath } from '../math/MetaballsMath.js';

/**
 * MetaballsMode — Liquid bloom visualization
 * Renders an actual metaball field via pixel-sampled threshold contouring.
 * Additive radial falloff fields are summed per-pixel (at low res) and
 * thresholded to produce organic merging/splitting blob surfaces.
 */
export class MetaballsMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mMath = new MetaballsMath();
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
        // Low-res offscreen buffer for metaball field sampling
        this.fieldW = Math.floor(w / 4);
        this.fieldH = Math.floor(h / 4);
        this.fieldBuffer = document.createElement('canvas');
        this.fieldBuffer.width = this.fieldW;
        this.fieldBuffer.height = this.fieldH;
        this.fieldCtx = this.fieldBuffer.getContext('2d');
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mMath.addNote(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.mMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.mMath.step(dt, complexity, speed, lightPressure);

        if (!this.fieldCtx || this.fieldW === 0) {
            this.resize(w, h);
            if (!this.fieldCtx) return;
        }

        const fw = this.fieldW;
        const fh = this.fieldH;
        const fctx = this.fieldCtx;
        const cells = this.mMath.cells;

        // --- LAYER 1: Metaball field (low-res pixel sampling) ---
        const imgData = fctx.createImageData(fw, fh);
        const data = imgData.data;
        const threshold = 1.0;

        for (let py = 0; py < fh; py++) {
            const ny = py / fh;
            for (let px = 0; px < fw; px++) {
                const nx = px / fw;

                // Sum inverse-square radial falloff from every cell
                let field = 0;
                let weightedHue = 0;
                let totalWeight = 0;
                for (const c of cells) {
                    const dx = nx - c.x;
                    const dy = ny - c.y;
                    const r2 = dx * dx + dy * dy + 0.0001;
                    const contribution = (c.radius * c.radius * c.life) / r2;
                    field += contribution;
                    weightedHue += c.hue * contribution;
                    totalWeight += contribution;
                }

                if (field > threshold) {
                    const blendHue = totalWeight > 0 ? weightedHue / totalWeight : 0;
                    const pHue = (hue + blendHue) % 360;

                    // Surface brightness — peaks near threshold, falls off deep inside
                    const surfaceFactor = Math.min(1, (field - threshold) * 2);
                    const edgeFactor = field < threshold * 1.5 ? 1 : Math.max(0.3, 1 - (field - threshold * 1.5) * 0.1);
                    const bright = surfaceFactor * edgeFactor;

                    // HSL to RGB approximation
                    const sat = 0.7 + intensity * 0.3;
                    const lum = 0.3 + bright * 0.5;
                    const alpha = (0.5 + bright * 0.5) * (0.6 + intensity * 0.4);
                    const rgb = this._hsl2rgb(pHue / 360, sat, lum);

                    const idx = (py * fw + px) * 4;
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = Math.floor(alpha * 255);
                }
            }
        }
        fctx.putImageData(imgData, 0, 0);

        // Draw upscaled field with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.fieldBuffer, 0, 0, w, h);

        // --- LAYER 2: Surface tension highlights (contour edges) ---
        for (const c of cells) {
            const cx = c.x * w;
            const cy = c.y * h;
            const r = c.radius * Math.min(w, h) * 2;
            const cHue = (hue + c.hue) % 360;
            const cAlpha = c.life * (0.2 + c.energy * 0.6);

            // Inner bright membrane
            const memGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.2);
            memGrad.addColorStop(0, 'transparent');
            memGrad.addColorStop(0.7, `hsla(${cHue}, 80%, 80%, ${cAlpha * 0.15})`);
            memGrad.addColorStop(0.9, `hsla(${cHue}, 90%, 90%, ${cAlpha * 0.3})`);
            memGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = memGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 3: Specular highlights ---
        for (const c of cells) {
            const cx = c.x * w;
            const cy = c.y * h;
            const r = c.radius * Math.min(w, h);
            const cAlpha = c.life * c.energy;

            // Specular dot (top-left light source)
            const specX = cx - r * 0.3;
            const specY = cy - r * 0.3;
            const specR = r * 0.4;
            const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, specR);
            specGrad.addColorStop(0, `rgba(255, 255, 255, ${cAlpha * 0.35})`);
            specGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = specGrad;
            ctx.beginPath();
            ctx.arc(specX, specY, specR, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 4: Ambient tendrils between close cells ---
        if (cells.length > 1) {
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    const a = cells[i], b = cells[j];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const d = Math.hypot(dx, dy);
                    const mergeRange = (a.radius + b.radius) * 3;
                    if (d < mergeRange) {
                        const mx = ((a.x + b.x) / 2) * w;
                        const my = ((a.y + b.y) / 2) * h;
                        const bridge = (1 - d / mergeRange);
                        const bHue = (hue + (a.hue + b.hue) / 2) % 360;
                        const bAlpha = bridge * Math.min(a.life, b.life) * 0.3;

                        const bridgeGrad = ctx.createRadialGradient(mx, my, 0, mx, my, d * w * 0.3);
                        bridgeGrad.addColorStop(0, `hsla(${bHue}, 80%, 75%, ${bAlpha})`);
                        bridgeGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = bridgeGrad;
                        ctx.beginPath();
                        ctx.arc(mx, my, d * w * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
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
