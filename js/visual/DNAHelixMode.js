/**
 * DNAHelixMode â€” Double helix strands with frequency-reactive rungs.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class DNAHelixMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.noteImpact = 0;
    }

    resize(w, h) {}

    onNoteOn(noteInfo) {
        if (noteInfo) this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.5);
    }

    onNoteOff() {}

    render(ctx, w, h, mathEngine, dt) {
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const complexity = mathEngine.get('complexity');

        this.time += dt * speed * (1 + this.noteImpact * 0.5);
        this.noteImpact *= 0.95;

        const cy = h * 0.5;
        const amp = h * 0.15 * (0.8 + intensity * 0.4);
        const cycles = 2 + complexity * 3;
        const scroll = this.time * 1.2;
        const steps = 180;

        ctx.globalCompositeOperation = 'lighter';

        // Two strands
        for (let strand = 0; strand < 2; strand++) {
            const phase = strand * Math.PI;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const noiseV = 0.5 + Math.sin(t * 12 + this.time * 2) * 0.3 + this.noteImpact * 0.3;
                const x = t * w;
                const y = cy + Math.sin(t * cycles * Math.PI * 2 + scroll + phase) * amp * (0.5 + noiseV * 0.7);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            const strandHue = (hue + (strand === 0 ? 0 : 60)) % 360;
            ctx.strokeStyle = `hsla(${strandHue},100%,70%,0.85)`;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 10 + intensity * 18;
            ctx.shadowColor = `hsl(${strandHue},100%,70%)`;
            ctx.stroke();
        }

        // Rungs every ~10 steps
        const rungStep = 10;
        for (let i = 0; i <= steps; i += rungStep) {
            const t = i / steps;
            const noiseV = 0.5 + Math.sin(t * 12 + this.time * 2) * 0.3 + this.noteImpact * 0.3;
            const x = t * w;
            const y1 = cy + Math.sin(t * cycles * Math.PI * 2 + scroll) * amp * (0.5 + noiseV * 0.7);
            const y2 = cy + Math.sin(t * cycles * Math.PI * 2 + scroll + Math.PI) * amp * (0.5 + noiseV * 0.7);
            const rungHue = (hue + 20 + t * 80) % 360;
            ctx.strokeStyle = `hsla(${rungHue},90%,${60 + noiseV * 30}%,${0.35 + noiseV * 0.55})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 5 + noiseV * 8;
            ctx.shadowColor = `hsl(${rungHue},100%,70%)`;
            ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Helix twist → filter, rotation speed → lfoRate, strand offset → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.5 + Math.sin(t * 0.4) * 0.4, lfoRate: 0.25 + Math.abs(Math.cos(t * 0.3)) * 0.5, detuneMod: Math.cos(t * 0.6) * 0.25 };
    }
}