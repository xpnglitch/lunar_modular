import { FluidMath } from '../math/FluidMath.js';

/**
 * FluidMode — Chromodynamic Fluid Simulation.
 * A high-fidelity implementation of Navier-Stokes fluid dynamics.
 * Features high-density dye injection, spectral color-space mapping,
 * and high-frequency velocity-driven chromatic bloom.
 */
export class FluidMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new FluidMath(64); // 64x64 simulation grid
        this.initialized = false;
        this.time = 0;
        
        // Rendering offscreen buffer
        this.offscreen = document.createElement('canvas');
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = null;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.offscreen.width = this.mathInstance.N + 2;
        this.offscreen.height = this.mathInstance.N + 2;
        this.imageData = this.offCtx.createImageData(this.offscreen.width, this.offscreen.height);
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0.5;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);
        const energy = Number(this.mathInstance.energy) || 0;

        // --- RENDER FLUID GRID TO OFFSCREEN ---
        const dens = this.mathInstance.density;
        const vx = this.mathInstance.Vx;
        const vy = this.mathInstance.Vy;
        const data = this.imageData.data;
        const N = this.mathInstance.N;

        for (let j = 0; j <= N + 1; j++) {
            const yOff = j * (N + 2);
            for (let i = 0; i <= N + 1; i++) {
                const idx = yOff + i;
                const d = dens[idx];
                const di = idx * 4;

                if (d < 0.1) {
                    data[di+3] = 0;
                    continue;
                }

                // Map density to vibrant spectral colors
                const normD = Math.min(1.0, d / 200.0);
                const localHue = (hue + normD * 120 + i * 2) % 360;
                const localSat = 40 + normD * 60;
                const localLight = 10 + normD * 60 + intensity * 20;

                const rgb = this._hslToRgb(localHue / 360, localSat / 100, localLight / 100);
                data[di] = rgb[0];
                data[di+1] = rgb[1];
                data[di+2] = rgb[2];
                data[di+3] = Math.min(255, d * 0.5);
            }
        }
        this.offCtx.putImageData(this.imageData, 0, 0);

        // --- MAIN CANVAS DISPLAY ---
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Multi-layered Fluid Bloom
        const bloom = 5 + energy * 20 + intensity * 10;
        ctx.filter = `blur(${bloom}px) saturate(2)`;
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        ctx.filter = `blur(${bloom * 0.5}px) brightness(1.5)`;
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        // Crisp high-velocity layer
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.drawImage(this.offscreen, 0, 0, w, h);
        ctx.restore();

        // Edge vignetting for focal depth
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,5,0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
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
        return [r * 255, g * 255, b * 255];
    }

    clear() {
        this.mathInstance.clear();
    }
}
