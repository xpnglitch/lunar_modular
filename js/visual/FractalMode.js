/**
 * FractalMode — Julia set infinite zoom
 * Zooms into fractal arm boundaries with smooth coloring.
 * Notes morph the Julia constant without resetting zoom.
 */
import { FractalMath } from '../math/FractalMath.js';

export class FractalMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.fractalMath = new FractalMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 1.0;

        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;

        // Pre-computed palette (1024 entries for smooth gradients)
        this.paletteSize = 1024;
        this.paletteR = new Uint8Array(this.paletteSize);
        this.paletteG = new Uint8Array(this.paletteSize);
        this.paletteB = new Uint8Array(this.paletteSize);
        this._buildPalette(0);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.fractalMath.width;
        this.offscreen.height = this.fractalMath.height;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.fractalMath.width, this.fractalMath.height);
    }

    /**
     * Build a smooth 1024-entry palette with 6 color stops
     */
    _buildPalette(hueShift) {
        const stops = [
            { t: 0.0, r: 0, g: 2, b: 20 },
            { t: 0.12, r: 0, g: 40, b: 120 },
            { t: 0.25, r: 32, g: 140, b: 220 },
            { t: 0.40, r: 230, g: 255, b: 255 },
            { t: 0.55, r: 255, g: 200, b: 40 },
            { t: 0.70, r: 200, g: 30, b: 0 },
            { t: 0.82, r: 120, g: 0, b: 100 },
            { t: 0.92, r: 20, g: 0, b: 80 },
            { t: 1.0, r: 0, g: 2, b: 20 },
        ];

        for (let i = 0; i < this.paletteSize; i++) {
            const t = (i / this.paletteSize + hueShift) % 1.0;

            let s0 = stops[0], s1 = stops[1];
            for (let j = 0; j < stops.length - 1; j++) {
                if (t >= stops[j].t && t <= stops[j + 1].t) {
                    s0 = stops[j];
                    s1 = stops[j + 1];
                    break;
                }
            }

            const range = s1.t - s0.t || 1;
            const f = (t - s0.t) / range;
            // Smooth interpolation
            const sf = f * f * (3 - 2 * f); // smoothstep
            this.paletteR[i] = Math.round(s0.r + (s1.r - s0.r) * sf);
            this.paletteG[i] = Math.round(s0.g + (s1.g - s0.g) * sf);
            this.paletteB[i] = Math.round(s0.b + (s1.b - s0.b) * sf);
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.fractalMath.onNote(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.fractalMath.getAudioModulation();
    }

    setZoomSpeed(speed) {
        this.fractalMath.setZoomSpeed(speed);
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const hue = mathEngine.get('colorHue');
        const complexity = mathEngine.get('complexity');

        // Slowly cycle palette
        this._buildPalette((this.time * 0.02 + hue / 360 * 0.5) % 1.0);

        this.fractalMath.update(dt, complexity);
        this.fractalMath.compute();

        if (!this.imageData) return;

        const smooth = this.fractalMath.smooth;
        const iterations = this.fractalMath.iterations;
        const maxIter = this.fractalMath.maxIter;
        const gridW = this.fractalMath.width;
        const gridH = this.fractalMath.height;
        const data = this.imageData.data;
        const palSize = this.paletteSize;
        const pR = this.paletteR;
        const pG = this.paletteG;
        const pB = this.paletteB;

        for (let i = 0; i < gridW * gridH; i++) {
            const px = i * 4;
            const iter = iterations[i];

            if (iter >= maxIter) {
                // Inside the set
                data[px] = 1;
                data[px + 1] = 1;
                data[px + 2] = 3;
                data[px + 3] = 255;
                continue;
            }

            // Smooth coloring — use fractional iteration count
            const smoothVal = smooth[i];
            // Animate palette cycling with time for living feel
            const t = ((smoothVal * 15 + this.time * 3) % palSize + palSize) % palSize;
            const idx = Math.floor(t);
            const frac = t - idx;
            const idx2 = (idx + 1) % palSize;

            // Lerp between adjacent palette entries for extra smoothness
            data[px] = pR[idx] + (pR[idx2] - pR[idx]) * frac;
            data[px + 1] = pG[idx] + (pG[idx2] - pG[idx]) * frac;
            data[px + 2] = pB[idx] + (pB[idx2] - pB[idx]) * frac;
            data[px + 3] = 255;
        }

        this.offCtx.putImageData(this.imageData, 0, 0);

        // Bilinear upscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        // Zoom indicator
        const zoomLevel = this.fractalMath.zoom;
        ctx.font = '11px Inter, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.textAlign = 'left';
        ctx.fillText(`${zoomLevel < 1000 ? zoomLevel.toFixed(1) : zoomLevel.toExponential(1)}×`, 10, h - 10);
    }
}
