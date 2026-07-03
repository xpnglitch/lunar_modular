import { ChronosMath } from '../math/ChronosMath.js';

/**
 * ChronosMode — Temporal machinery: concentric clock-rings, time-echo ripples, stroboscopic layers.
 * The visual plays with time itself — rings tick at different rates, echoes of past moments linger.
 */
export class ChronosMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new ChronosMath();
        this.time = 0;
        this.pulses = [];   // time-echo rings
        this.ticks = [];    // clock tick marks that fade
        this.initialized = false;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.pulses.push({
            r: 0,
            maxR: Math.min(this.width || 800, this.height || 600) * (0.2 + noteInfo.velocity * 0.35),
            life: 1.0,
            speed: 60 + noteInfo.velocity * 120,
            hueShift: noteInfo.normalizedPosition * 80 - 40,
        });
        // Burst of tick marks at current ring angles
        const rings = 6;
        for (let ring = 0; ring < rings; ring++) {
            for (let t = 0; t < 4; t++) {
                const a = (ring / rings) * Math.PI * 2 + Math.random() * 0.4;
                this.ticks.push({ a, ring, life: 1.0, vel: noteInfo.velocity });
            }
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.46;

        // Temporal fade — slow, ghostly persistence
        ctx.fillStyle = `rgba(0,0,0,${0.08 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.08})`;
        ctx.fillRect(0, 0, w, h);

        // === Concentric clock rings ===
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
            const frac = (i + 1) / ringCount;
            const r = frac * maxR;
            // Each ring ticks at a different rate (powers of 2, like clock gears)
            const tickRate = Math.pow(2, i) * 0.15 * (1 + complexity * 0.5);
            const angle = this.time * tickRate;
            const tickCount = 4 + i * 4;

            // Ring arc
            ctx.strokeStyle = `hsla(${(hue + i * 12) % 360},60%,${35 + frac * 25}%,${0.22 + energy * 0.18})`;
            ctx.lineWidth = 0.8 + (1 - frac) * 0.8;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

            // Tick marks
            for (let t = 0; t < tickCount; t++) {
                const ta = (t / tickCount) * Math.PI * 2 + angle;
                const inner = r - 6 - (1 - frac) * 4;
                const outer = r + 2;
                ctx.strokeStyle = `hsla(${(hue + i * 12) % 360},80%,${60 + frac * 20}%,${0.35 + energy * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(ta) * inner, cy + Math.sin(ta) * inner);
                ctx.lineTo(cx + Math.cos(ta) * outer, cy + Math.sin(ta) * outer);
                ctx.stroke();
            }

            // Rotating hand for this ring
            const handA = angle;
            const handLen = r * 0.85;
            ctx.strokeStyle = `hsla(${(hue + i * 15 + 30) % 360},90%,${60 + energy * 20}%,${0.5 + energy * 0.35})`;
            ctx.lineWidth = 1.2 - frac * 0.6;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(handA) * handLen, cy + Math.sin(handA) * handLen);
            ctx.stroke();
        }

        // === Time-echo pulse rings ===
        this.pulses = this.pulses.filter(p => p.life > 0.01);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.pulses) {
            p.r += p.speed * dt;
            p.life = Math.max(0, 1 - p.r / p.maxR);
            const rInner = Math.max(0, p.r * 0.9);
            const rOuter = Math.max(0, p.r * 1.1);
            const pg = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
            pg.addColorStop(0, 'transparent');
            pg.addColorStop(0.5, `hsla(${(hue + p.hueShift) % 360},100%,75%,${p.life * 0.55})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, p.r * 1.12), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Tick flash marks ===
        this.ticks = this.ticks.filter(t => t.life > 0.01);
        for (const tk of this.ticks) {
            tk.life -= dt * 2.5;
            const r = ((tk.ring + 1) / ringCount) * maxR;
            const px = cx + Math.cos(tk.a) * r;
            const py = cy + Math.sin(tk.a) * r;
            ctx.fillStyle = `hsla(${hue},100%,90%,${tk.life * tk.vel * 0.9})`;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0, 2.5 * tk.life * tk.vel), 0, Math.PI * 2);
            ctx.fill();
        }

        // === Central eye / pivot ===
        const centerR = Math.max(0, 16 + energy * 14);
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR);
        cg.addColorStop(0, `hsla(${hue},20%,98%,${0.9 + energy * 0.1})`);
        cg.addColorStop(0.4, `hsla(${hue},80%,65%,${0.7 + energy * 0.2})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, centerR, 0, Math.PI * 2); ctx.fill();

        // === Temporal radial lines (stroboscopic echoes) ===
        const lineCount = Math.floor(8 + complexity * 8);
        ctx.globalAlpha = 0.06 + energy * 0.06;
        for (let l = 0; l < lineCount; l++) {
            const la = (l / lineCount) * Math.PI * 2 + this.time * 0.04;
            ctx.strokeStyle = `hsla(${(hue + l * 15) % 360},70%,65%,1)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(la) * maxR * 1.2, cy + Math.sin(la) * maxR * 1.2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}
