/**
 * ReactionDiffusionMode — Turing pattern visualization
 * Gray-Scott model rendered at reduced resolution and upscaled.
 * Notes seed new chemical reactions. Pattern preset selector controls morphology.
 */
import { ReactionDiffusionMath } from '../math/ReactionDiffusionMath.js';

export class ReactionDiffusionMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.rdMath = new ReactionDiffusionMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 1.0; // Full redraw — we blit from offscreen

        // Offscreen canvas for reduced-resolution rendering
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
        
        this.subsets = ['Spots', 'Stripes', 'Spirals', 'Coral', 'Mitosis', 'Maze', 'Worms', 'Fingerprints', 'Bubbles', 'Solitons', 'Bacteria', 'Pulsating', 'Traveling', 'Turing', 'Holes', 'Stargate'];
        this.subIndex = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.rdMath.width;
        this.offscreen.height = this.rdMath.height;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.rdMath.width, this.rdMath.height);
    }

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        const key = this.subsets[this.subIndex].toLowerCase();
        this.rdMath.setPreset(key);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        this.rdMath.seedAt(x, y, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.rdMath.getAudioModulation();
    }

    /**
     * Set pattern preset (called from UI dropdown)
     */
    setPreset(name) {
        this.rdMath.setPreset(name);
        this.rdMath.reset();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // Run simulation steps (more with higher complexity)
        const steps = 4 + Math.floor(complexity * 6);

        // --- HONEST COUPLING: Light-Pressure Perturbation ---
        const lightPressure = mathEngine.getLightPressure();
        if (lightPressure.force > 0.1) {
            this.rdMath.seedAt(lightPressure.x, lightPressure.y, lightPressure.force * 0.5);
        }

        this.rdMath.step(steps);

        if (!this.imageData) return;

        // Render V concentration to ImageData
        const v = this.rdMath.v;
        const u = this.rdMath.u;
        const gridW = this.rdMath.width;
        const gridH = this.rdMath.height;
        const data = this.imageData.data;

        for (let i = 0; i < gridW * gridH; i++) {
            const px = i * 4;
            const vVal = v[i];
            const uVal = u[i];

            // Color mapping: V concentration → color
            // Low V = dark background, High V = bright organic color
            const brightness = vVal * (1.5 + intensity);

            // Hue shifts based on local U/V ratio for depth
            const localHue = (hue + vVal * 60 - uVal * 30 + 360) % 360;
            const sat = 40 + vVal * 40 + intensity * 15;
            const light = 3 + brightness * 45;

            const rgb = this._hslToRgb(localHue / 360, Math.min(1, sat / 100), Math.min(1, light / 100));
            data[px] = rgb[0];
            data[px + 1] = rgb[1];
            data[px + 2] = rgb[2];
            data[px + 3] = 255;
        }

        // Blit to offscreen then upscale to main canvas
        this.offCtx.putImageData(this.imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- Chromatic Bloom ---
        ctx.globalCompositeOperation = 'lighter';
        const bloomSize = 2 + intensity * 6;
        ctx.drawImage(this.offscreen, -bloomSize, 0, w + bloomSize * 2, h);
        ctx.drawImage(this.offscreen, bloomSize, 0, w + bloomSize * 2, h);
        ctx.drawImage(this.offscreen, 0, -bloomSize, w, h + bloomSize * 2);
        ctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(this.offscreen, 0, 0, w, h);
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}
