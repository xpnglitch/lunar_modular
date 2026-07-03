/**
 * MeteorShowerMode â€” Falling meteor particles with trailing tails.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class MeteorShowerMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.noteImpact = 0;
        this.meteors = [];
    }

    resize(w, h) {
        this.meteors = [];
    }

    onNoteOn(noteInfo) {
        if (noteInfo) this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.6);
    }

    onNoteOff() {}

    render(ctx, w, h, mathEngine, dt) {
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const analyser = mathEngine.getAnalyserData();

        this.time += dt * speed;
        this.noteImpact *= 0.94;

        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;
        const maxParts = 150;

        // Spawn meteors
        const spawnRate = Math.floor(1 + (energy + this.noteImpact) * 8);
        for (let i = 0; i < spawnRate && this.meteors.length < maxParts; i++) {
            const angle = -Math.PI * 0.2 - Math.random() * Math.PI * 0.15;
            const v = 0.3 + Math.random() * 0.7;
            const spd = 4 + v * 14 + energy * 6;
            this.meteors.push({
                x: Math.random() * w * 1.2 - w * 0.1,
                y: -20 - Math.random() * 60,
                vx: Math.cos(angle) * spd,
                vy: -Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.006 + Math.random() * 0.012,
                hueOff: Math.random() * 50,
                size: 1.5 + Math.random() * 2.5,
                trail: [],
            });
        }

        ctx.globalCompositeOperation = 'lighter';

        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 20) m.trail.shift();

            m.vy += 0.08;
            m.x += m.vx;
            m.y += m.vy;
            m.life -= m.decay;

            if (m.life <= 0 || m.y > h + 30 || m.x > w + 50 || m.x < -50) {
                this.meteors.splice(i, 1);
                continue;
            }

            const meteorHue = (hue + m.hueOff) % 360;

            // Trail
            if (m.trail.length > 1) {
                for (let t = 1; t < m.trail.length; t++) {
                    const frac = t / m.trail.length;
                    ctx.strokeStyle = `hsla(${meteorHue},100%,${60 + frac * 30}%,${frac * m.life * 0.5})`;
                    ctx.lineWidth = m.size * frac * m.life;
                    ctx.beginPath();
                    ctx.moveTo(m.trail[t - 1].x, m.trail[t - 1].y);
                    ctx.lineTo(m.trail[t].x, m.trail[t].y);
                    ctx.stroke();
                }
            }

            // Head glow
            const headR = m.size * m.life * 1.5;
            const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, headR * 3);
            hg.addColorStop(0, `hsla(${meteorHue},100%,95%,${m.life})`);
            hg.addColorStop(0.3, `hsla(${meteorHue},100%,70%,${m.life * 0.5})`);
            hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(m.x, m.y, headR * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
        this.meteors = [];
    }

    // Meteor density → filter, streak speed → lfoRate, spread → detune
    getAudioModulation() {
        const t = this.time || 0; const streak = 0.4 + Math.abs(Math.sin(t * 0.9)) * 0.5;
        return { filterMod: streak, lfoRate: 0.35 + streak * 0.4, detuneMod: Math.cos(t * 0.5) * 0.3 };
    }
}