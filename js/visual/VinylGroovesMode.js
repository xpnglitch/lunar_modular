/**
 * VinylGroovesMode â€” Spinning record with frequency-modulated grooves.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class VinylGroovesMode {
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

        this.time += dt * speed * (1 + this.noteImpact * 0.2);
        this.noteImpact *= 0.95;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.min(w, h) * 0.42;
        const grooves = 20 + Math.floor(complexity * 20);

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.time * 0.08);

        for (let g = 0; g < grooves; g++) {
            const r = (g / grooves) * maxR + maxR * 0.1;
            const binIdx = analyser ? Math.floor((g / grooves) * analyser.length * 0.65) : 0;
            const v = analyser ? analyser[binIdx] / 255 : 0.2;
            const grooveHue = (hue + g * 3) % 360;
            const segs = 90;

            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const wobble = Math.sin(a * (4 + g * 0.5) + this.time) * v * 6;
                const pr = r + wobble;
                const px = Math.cos(a) * pr;
                const py = Math.sin(a) * pr;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${grooveHue},40%,${35 + v * 40}%,${0.15 + v * 0.5})`;
            ctx.lineWidth = 1 + v * 1.5;
            ctx.stroke();
        }

        // Center label
        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;
        const lg = ctx.createRadialGradient(0, 0, maxR * 0.06, 0, 0, maxR * 0.15);
        lg.addColorStop(0, `hsla(${hue},100%,95%,${0.4 + energy * 0.4})`);
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(0, 0, maxR * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Groove depth → filter, platter speed → lfoRate, wow/flutter → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.45 + Math.sin(t * 0.5) * 0.35, lfoRate: 0.5 + Math.sin(t * 0.1) * 0.15, detuneMod: Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.3) * 0.04 };
    }
}