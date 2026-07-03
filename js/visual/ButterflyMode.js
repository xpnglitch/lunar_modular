/**
 * ButterflyMode â€” Butterfly polar curve with mirrored wings.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class ButterflyMode {
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
        const maxR = Math.min(w, h) * 0.4;
        const numPts = 120 + Math.floor(complexity * 80);

        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(cx, cy);

        // Two mirrored wings
        for (let mirror = -1; mirror <= 1; mirror += 2) {
            ctx.beginPath();
            for (let i = 0; i <= numPts; i++) {
                const frac = i / numPts;
                const angle = frac * Math.PI;
                const binIdx = analyser ? Math.floor(frac * analyser.length * 0.65) : 0;
                const v = analyser ? analyser[binIdx] / 255 : 0.3;

                // Butterfly curve: r = e^sin(Î¸) - 2cos(4Î¸) + sin^5((2Î¸-Ï€)/24)
                const theta = angle + this.time * 0.3;
                const bfly = Math.exp(Math.sin(theta)) - 2 * Math.cos(4 * theta) +
                    Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);
                const r = maxR * 0.22 * bfly * (0.6 + v * 0.6);

                const px = mirror * Math.cos(angle) * r;
                const py = -Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }

            const wingHue = (hue + (mirror > 0 ? 0 : 80)) % 360;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.5);
            grad.addColorStop(0, `hsla(${wingHue},100%,80%,${0.3 + energy * 0.4})`);
            grad.addColorStop(0.6, `hsla(${(wingHue + 40) % 360},100%,60%,${0.15 + energy * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = `hsla(${wingHue},100%,75%,${0.5 + energy * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10 + energy * 15;
            ctx.shadowColor = `hsl(${wingHue},100%,65%)`;
            ctx.stroke();
        }

        // Body line
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${(hue + 40) % 360},100%,70%)`;
        ctx.strokeStyle = `hsla(${(hue + 40) % 360},100%,80%,0.9)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -maxR * 0.35);
        ctx.lineTo(0, maxR * 0.2);
        ctx.stroke();

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Wing angle → filter, wing spread → lfoRate, phase → detune
    getAudioModulation() {
        const m = this.bMath || {}; const t = this.time || 0;
        return { filterMod: 0.4 + Math.abs(Math.sin(t * 0.3)) * 0.5, lfoRate: 0.3 + Math.abs(Math.cos(t * 0.2)) * 0.4, detuneMod: Math.sin(t * 0.5) * 0.3 };
    }
}