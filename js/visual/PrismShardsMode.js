/**
 * PrismShardsMode â€” Refracting triangular shards radiating from center.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class PrismShardsMode {
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
        const maxR = Math.min(w, h) * 0.38;
        const numShards = 12 + Math.floor(complexity * 10);

        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;

        ctx.globalCompositeOperation = 'lighter';

        // Central prism core
        const coreR = maxR * 0.12 * (1 + energy * 0.5);
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
        cg.addColorStop(0, `hsla(${hue},0%,100%,${0.5 + energy * 0.4})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < numShards; i++) {
            const binIdx = analyser ? Math.floor((i / numShards) * analyser.length * 0.7) : 0;
            const v = analyser ? analyser[binIdx] / 255 : 0.3;
            if (v < 0.02) continue;

            const angle = (i / numShards) * Math.PI * 2 + this.time * 0.12;
            const len = maxR * (0.3 + v * 0.7) * intensity;
            const spread = 0.06 + v * 0.08;
            const shardHue = (hue + (i / numShards) * 360) % 360;

            // Triangular shard
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle - spread) * len, cy + Math.sin(angle - spread) * len);
            ctx.lineTo(cx + Math.cos(angle + spread) * len, cy + Math.sin(angle + spread) * len);
            ctx.closePath();

            const grad = ctx.createLinearGradient(cx, cy,
                cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            grad.addColorStop(0, `hsla(${shardHue},100%,95%,${v * 0.6})`);
            grad.addColorStop(0.4, `hsla(${shardHue},100%,65%,${v * 0.4})`);
            grad.addColorStop(1, `hsla(${shardHue},100%,50%,0)`);
            ctx.fillStyle = grad;
            ctx.fill();

            // Edge glow
            ctx.strokeStyle = `hsla(${shardHue},100%,80%,${v * 0.7})`;
            ctx.lineWidth = 1 + v * 1.5;
            ctx.shadowBlur = 8 + v * 16;
            ctx.shadowColor = `hsl(${shardHue},100%,70%)`;
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // Refraction angle → filter, shard velocity → lfoRate, dispersion → detune
    getAudioModulation() {
        const t = this.time || 0;
        return { filterMod: 0.6 + Math.sin(t * 1.1) * 0.35, lfoRate: 0.4 + Math.abs(Math.cos(t * 0.8)) * 0.45, detuneMod: Math.sin(t * 0.7) * 0.4 };
    }
}