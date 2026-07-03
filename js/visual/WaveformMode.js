import { WaveformMath } from '../math/WaveformMath.js';

/**
 * WaveformMode â€” 3D-perspective wave terrain.
 * Multiple layers of oscillating waveforms with perspective scaling.
 * Notes perturb the wave amplitude and frequency.
 */
export class WaveformMode {
    constructor() {
        this.wMath = new WaveformMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.noteImpact = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.5);
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');

        this.time += dt * speed * (1 + this.noteImpact);
        this.noteImpact *= 0.95;

        const params = {
            rows: 15 + Math.floor(complexity * 25),
            amplitude: (40 + intensity * 100) * (1 + this.noteImpact),
            frequency: 2 + complexity * 6,
            perspective: 0.7 + intensity * 0.3
        };

        const rows = this.wMath.generatePoints(w, h, params, this.time);

        // Clear background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        rows.forEach(row => {
            const rowHue = (hue + row.hueOffset) % 360;
            const alpha = row.alpha * intensity;

            // Draw filled area
            ctx.beginPath();
            ctx.moveTo(row.points[0].x, h);
            row.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.lineTo(w, h);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, row.yBase - params.amplitude, 0, row.yBase + params.amplitude);
            grad.addColorStop(0, `hsla(${rowHue}, 100%, 60%, ${alpha * 0.6})`);
            grad.addColorStop(0.5, `hsla(${rowHue}, 80%, 40%, ${alpha * 0.3})`);
            grad.addColorStop(1, `hsla(${rowHue}, 60%, 20%, ${alpha * 0.05})`);
            
            ctx.fillStyle = grad;
            ctx.fill();

            // Draw line on top
            ctx.beginPath();
            ctx.moveTo(row.points[0].x, row.points[0].y);
            row.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
            ctx.strokeStyle = `hsla(${rowHue}, 100%, 75%, ${alpha})`;
            ctx.lineWidth = 1.5 * row.scale;
            ctx.stroke();
        });
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Waveform peak → filter, zero-crossing rate → lfoRate, drift → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.4 + Math.abs(Math.sin(t * 0.6)) * 0.5, lfoRate: 0.3 + Math.abs(Math.cos(t * 0.4)) * 0.4, detuneMod: Math.sin(t * 0.3) * 0.2 };
    }
}