/**
 * WaveTunnelMode â€” Tunnel of oscillating rings receding into depth.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class WaveTunnelMode {
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
        const analyser = mathEngine.getAnalyserData();

        this.time += dt * speed * (1 + this.noteImpact * 0.3);
        this.noteImpact *= 0.95;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const numRings = 12 + Math.floor(complexity * 12);
        const maxR = Math.min(w, h) * 0.45;

        ctx.globalCompositeOperation = 'lighter';

        for (let r = 0; r < numRings; r++) {
            const depth = (r + (this.time * 2) % 1) / numRings;
            const binIdx = analyser ? Math.floor((r / numRings) * analyser.length * 0.6) : 0;
            const v = analyser ? analyser[binIdx] / 255 : 0.3;
            const ringR = maxR * depth * (0.8 + v * 0.3);
            const alpha = (1 - depth) * (0.3 + v * 0.6) * intensity;
            if (alpha < 0.01) continue;

            const ringHue = (hue + depth * 120) % 360;
            const segs = 48;

            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2 + this.time * 0.15 * (r % 2 ? 1 : -1);
                const mod = 1 + Math.sin(a * 6 + this.time * 2 + r) * v * 0.25;
                const pr = ringR * mod;
                const px = cx + Math.cos(a) * pr;
                const py = cy + Math.sin(a) * pr;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${ringHue},100%,${55 + v * 35}%,${alpha})`;
            ctx.lineWidth = 1 + (1 - depth) * 3;
            ctx.shadowBlur = v * 10;
            ctx.shadowColor = `hsl(${ringHue},100%,65%)`;
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Tunnel depth → filter, wave propagation → lfoRate, wall lean → detune
    getAudioModulation() {
        const t = this.time || 0; const depth = 0.5 + Math.sin(t * 0.35) * 0.45;
        return { filterMod: depth, lfoRate: 0.25 + (1 - depth) * 0.55, detuneMod: Math.cos(t * 0.6) * 0.3 };
    }
}