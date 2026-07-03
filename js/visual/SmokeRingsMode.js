/**
 * SmokeRingsMode â€” Expanding wobbly smoke ring toroids on beat.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class SmokeRingsMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.noteImpact = 0;
        this.rings = [];
        this.lastEnergy = 0;
    }

    resize(w, h) {
        this.rings = [];
    }

    onNoteOn(noteInfo) {
        if (noteInfo) this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.6);
    }

    onNoteOff() {}

    render(ctx, w, h, mathEngine, dt) {
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const complexity = mathEngine.get('complexity');
        const analyser = mathEngine.getAnalyserData();

        this.time += dt * speed;
        this.noteImpact *= 0.93;

        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxR = Math.max(w, h) * 0.6;
        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;

        // Spawn on energy spikes or note impacts
        if ((energy > this.lastEnergy + 0.06 && energy > 0.1 && this.rings.length < 20) ||
            (this.noteImpact > 0.3 && this.rings.length < 20)) {
            this.rings.push({
                r: 10 + Math.random() * 30,
                alpha: 0.7 + energy * 0.3,
                ringHue: (hue + (this.time * 80) % 360) % 360,
                speed: 60 + energy * 180,
                width: 8 + energy * 20,
                wobble: Math.random() * Math.PI * 2,
                wobbleAmp: 3 + Math.random() * 8,
            });
        }
        this.lastEnergy = this.lastEnergy * 0.9 + energy * 0.1;

        ctx.globalCompositeOperation = 'lighter';

        // Static concentric standing rings
        const bands = 4 + Math.floor(complexity * 4);
        for (let b = 0; b < bands; b++) {
            const binIdx = analyser ? Math.floor((b / bands) * analyser.length * 0.5) : 0;
            const v = analyser ? analyser[binIdx] / 255 : 0.2;
            if (v < 0.03) continue;
            const r = (b / bands) * maxR * 0.4 + v * maxR * 0.08;
            const bandHue = (hue + 20 + b * 30) % 360;
            ctx.strokeStyle = `hsla(${bandHue},60%,${50 + v * 30}%,${v * 0.25})`;
            ctx.lineWidth = 6 + v * 10;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Expanding smoke rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            ring.r += ring.speed * dt;
            ring.alpha -= dt * 0.6;
            ring.wobble += 0.04;
            if (ring.alpha <= 0 || ring.r > maxR) {
                this.rings.splice(i, 1);
                continue;
            }

            ctx.lineWidth = ring.width * ring.alpha;
            ctx.strokeStyle = `hsla(${ring.ringHue},50%,65%,${ring.alpha * 0.5})`;

            // Wobbly ring
            const segs = 32;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const wobR = ring.r + Math.sin(a * 3 + ring.wobble) * ring.wobbleAmp * ring.alpha;
                const px = cx + Math.cos(a) * wobR;
                const py = cy + Math.sin(a) * wobR;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
        this.rings = [];
        this.lastEnergy = 0;
    }

    // Ring expansion → filter, puff rate → lfoRate, drift → detune
    getAudioModulation() {
        const t = this.time || 0; const expand = ((t * 0.2) % 1);
        return { filterMod: 0.3 + expand * 0.6, lfoRate: 0.15 + (1 - expand) * 0.5, detuneMod: Math.sin(t * 0.25) * 0.2 };
    }
}