import { SpectralMath } from '../math/SpectralMath.js';

/**
 * SpectralMode — 3D Fourier Transform Waterfall.
 * A technical rolling history of the spectral spectrum.
 * Features: Logarithmic frequency scaling, perspective depth, and spectral heat-mapping.
 */
export class SpectralMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new SpectralMath();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.mathInstance.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        const audioData = mathEngine.getAnalyserData();
        this.mathInstance.update(dt, mathEngine.get('complexity'), audioData);

        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const size = this.mathInstance.historySize;
        const fftSize = this.mathInstance.fftSize;

        const points = this.mathInstance.getSpectralPoints(w, h, 1.0);

        // Professional Dark Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a0d');
        bgGrad.addColorStop(1, '#1a1a25');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Technical Grid Underlay
        ctx.strokeStyle = `hsla(${hue}, 80%, 30%, 0.05)`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 10; i++) {
            const y = h * (0.1 + i * 0.08);
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Spectral Waterfall (Back to Front)
        for (let z = 0; z < size - 1; z++) {
            const alpha = 0.2 + (z / size) * 0.8;
            const lightness = 20 + (z / size) * 40;
            const hueShift = (z / size) * 40;

            ctx.beginPath();
            ctx.strokeStyle = `hsla(${hue + hueShift}, 100%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = 0.5 + (z / size) * 2.0;

            for (let x = 0; x < fftSize; x++) {
                const p = points[z * fftSize + x];
                x === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Connect the lines between history slices for a "Mesh" feel
            if (z % 5 === 0 && energy > 0.3) {
                ctx.lineWidth = 0.2;
                ctx.strokeStyle = `hsla(${hue}, 80%, 40%, 0.1)`;
                ctx.beginPath();
                for (let x = 0; x < fftSize; x+=4) {
                    const p1 = points[z * fftSize + x];
                    const p2 = points[(z+1) * fftSize + x];
                    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                }
                ctx.stroke();
            }
        }
        
        // Active Front Row Peak Overlay
        ctx.save();
        ctx.globalAlpha = 0.5 + energy * 0.5;
        ctx.strokeStyle = `hsla(${hue + 40}, 100%, 75%, 1)`;
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 10 * energy;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${energy})`;

        ctx.beginPath();
        const startIdx = (size - 1) * fftSize;
        for (let x = 0; x < fftSize; x++) {
            const p = points[startIdx + x];
            x === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
    }
}
