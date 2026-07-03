/**
 * GyroscopeMode â€” Nested rotating gimbal rings.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class GyroscopeMode {
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
        const maxR = Math.min(w, h) * 0.35;
        const numRings = 3 + Math.floor(complexity * 4);

        ctx.globalCompositeOperation = 'lighter';

        for (let r = 0; r < numRings; r++) {
            const binIdx = analyser ? Math.floor((r / numRings) * analyser.length * 0.6) : 0;
            const v = analyser ? analyser[binIdx] / 255 : 0.3;
            const ringR = maxR * (0.4 + r * 0.12) * (0.8 + v * 0.3);
            const rot = this.time * (0.3 + r * 0.15) * (r % 2 ? 1 : -1);
            const tilt = Math.PI * 0.1 * r + v * 0.3;
            const ringHue = (hue + r * 45) % 360;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.scale(1, 0.3 + Math.abs(Math.sin(tilt + this.time * 0.2)) * 0.7);

            ctx.strokeStyle = `hsla(${ringHue},100%,${60 + v * 30}%,${0.4 + v * 0.5})`;
            ctx.lineWidth = 2 + v * 3;
            ctx.shadowBlur = 8 + v * 16;
            ctx.shadowColor = `hsl(${ringHue},100%,65%)`;
            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Center glow
        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
        cg.addColorStop(0, `hsla(${hue},0%,100%,${0.6 + energy * 0.4})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Gyro tilt → filter, spin rate → lfoRate, precession → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.5 + Math.sin(t * 0.8) * 0.4, lfoRate: 0.3 + Math.abs(Math.cos(t * 1.2)) * 0.5, detuneMod: Math.sin(t * 0.35) * 0.3 };
    }
}