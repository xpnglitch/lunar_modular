/**
 * FireEQMode â€” Fiery equalizer bars rising from the base.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class FireEQMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.noteImpact = 0;
    }

    resize(w, h) {}

    onNoteOn(noteInfo) {
        if (noteInfo) this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.4);
    }

    onNoteOff() {}

    render(ctx, w, h, mathEngine, dt) {
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const complexity = mathEngine.get('complexity');
        const analyser = mathEngine.getAnalyserData();

        this.time += dt * speed;
        this.noteImpact *= 0.94;

        const barCount = 48 + Math.floor(complexity * 32);
        const vizH = h * 0.42 * (0.8 + intensity * 0.4);
        const baseY = h * 0.65 + vizH * 0.25;
        const bw = w / barCount;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < barCount; i++) {
            const binIdx = analyser ? Math.floor(i / barCount * analyser.length * 0.65) : 0;
            const raw = analyser ? analyser[binIdx] / 255 : 0;
            const v = Math.min(1, raw + this.noteImpact * 0.3);
            const bh = v * vizH;
            const x = i * bw;

            // Fire gradient from yellow â†’ orange â†’ red â†’ dark
            const hue0 = (hue + 30) % 360;
            const hue1 = hue % 360;
            const hue2 = (hue - 30 + 360) % 360;
            const grad = ctx.createLinearGradient(x, baseY - bh, x, baseY);
            grad.addColorStop(0, `hsla(${hue0},100%,${50 + v * 40}%,${v * 0.9})`);
            grad.addColorStop(0.3, `hsla(${hue1},100%,55%,${v * 0.8})`);
            grad.addColorStop(0.7, `hsla(${hue2},100%,45%,${v * 0.7})`);
            grad.addColorStop(1, `hsla(${hue2},80%,15%,0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, baseY - bh, bw - 1, bh);

            // Spark particles at tips
            if (v > 0.5 && Math.random() < v * 0.4) {
                const sx = x + Math.random() * bw;
                const sy = baseY - bh - Math.random() * 20;
                ctx.fillStyle = `hsla(${hue0},100%,90%,${(v - 0.5) * 1.5})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Flame height → filter, turbulence → lfoRate, drift → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.35 + Math.abs(Math.sin(t * 1.3)) * 0.55, lfoRate: 0.4 + Math.abs(Math.sin(t * 2.1)) * 0.45, detuneMod: Math.sin(t * 0.7) * 0.2 };
    }
}