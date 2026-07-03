/**
 * InterferenceMode — 2D wave interference visualization
 * Each note is a ripple source. Chords create complex interference patterns.
 * Renders the wave grid as a colored height map using ImageData.
 */
import { InterferenceMath } from '../math/InterferenceMath.js';

export class InterferenceMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.waveMath = new InterferenceMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 1.0; // No trails — full redraw each frame

        // Offscreen canvas for pixel rendering
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        // Create offscreen canvas at grid resolution
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.waveMath.cols;
        this.offscreen.height = this.waveMath.rows;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.waveMath.cols, this.waveMath.rows);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        // Place source based on note position (low=left, high=right) with some vertical spread
        const x = noteInfo.normalizedPosition;
        const y = 0.3 + Math.random() * 0.4;
        this.waveMath.addSource(
            noteInfo.index,
            x, y,
            noteInfo.frequency,
            0.6 + noteInfo.velocity * 0.4
        );
    }

    onNoteOff(noteIndex) {
        this.waveMath.removeSource(noteIndex);
    }

    getAudioModulation() {
        return this.waveMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const complexity = mathEngine.get('complexity');
        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const lightPressure = mathEngine.getLightPressure();

        // --- HONEST COUPLING: Light-Pressure Pulse ---
        if (lightPressure.force > 0.1) {
            this.waveMath.addSource('lp', lightPressure.x, lightPressure.y, 440, lightPressure.force * 0.8);
        } else {
            this.waveMath.removeSource('lp');
        }

        // Step the wave equation (multiple sub-steps for stability)
        const steps = 3 + Math.floor(complexity * 4);
        for (let i = 0; i < steps; i++) {
            this.waveMath.step(dt / steps, complexity);
        }

        // Render wave field to ImageData
        if (!this.imageData) return;

        const grid = this.waveMath.getGrid();
        const cols = this.waveMath.cols;
        const rows = this.waveMath.rows;
        const data = this.imageData.data;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const px = idx * 4;
                const val = grid[idx];

                // Map wave amplitude to color
                // Positive = bright warm, Negative = cool dark, Zero = dark background
                const absVal = Math.abs(val);
                const brightness = Math.min(1, absVal * (1.5 + intensity));

                let rr, gg, bb;
                if (val > 0) {
                    // Constructive: warm tones (based on current hue)
                    const h = (hue + val * 30) % 360;
                    const rgb = this._hslToRgb(h / 360, 0.7 + intensity * 0.2, 0.15 + brightness * 0.55);
                    rr = rgb[0]; gg = rgb[1]; bb = rgb[2];
                } else {
                    // Destructive: complementary cool tones
                    const h = (hue + 180 + val * 30) % 360;
                    const rgb = this._hslToRgb(h / 360, 0.5 + intensity * 0.3, 0.05 + brightness * 0.35);
                    rr = rgb[0]; gg = rgb[1]; bb = rgb[2];
                }

                // --- Specular Highlight ---
                if (absVal > 0.4) {
                    const spec = Math.pow(absVal, 4) * 150;
                    rr = Math.min(255, rr + spec);
                    gg = Math.min(255, gg + spec);
                    bb = Math.min(255, bb + spec);
                }

                data[px] = rr;
                data[px + 1] = gg;
                data[px + 2] = bb;
                data[px + 3] = 255;
            }
        }

        // Put to offscreen canvas and scale up to main canvas
        this.offCtx.putImageData(this.imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        // Draw source indicators (glowing dots at source positions)
        for (const [, src] of this.waveMath.sources) {
            const sx = (src.col / cols) * w;
            const sy = (src.row / rows) * h;
            const pulse = 0.5 + Math.sin(this.time * 4) * 0.3;

            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 + pulse * 10);
            gradient.addColorStop(0, `hsla(${hue}, 90%, 90%, 0.8)`);
            gradient.addColorStop(0.4, `hsla(${hue}, 80%, 60%, 0.3)`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, 30 + pulse * 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * HSL to RGB conversion (h, s, l in 0-1 range)
     */
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
