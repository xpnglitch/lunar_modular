import { MoireSpiralMath } from '../math/MoireSpiralMath.js';

/**
 * MoireSpiralMode — True moiré patterns from overlapping spiral grids rotating at slightly
 * different rates. Interference nodes create beating rings that pulse with the sound's detune.
 */
export class MoireSpiralMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new MoireSpiralMath();
        this.time = 0;
        this.rot1 = 0;
        this.rot2 = 0;
        this.pulses = [];
        this.initialized = false;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.pulses.push({ life: 1.0, vel: noteInfo.velocity, hueShift: noteInfo.normalizedPosition * 120 - 60 });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawSpiralGrid(ctx, cx, cy, rot, lineCount, maxR, hue, alpha, energy) {
        // Draw concentric circles
        const circleCount = Math.floor(12 + energy * 8);
        for (let c = 0; c < circleCount; c++) {
            const r = (c + 1) * (maxR / circleCount);
            ctx.strokeStyle = `hsla(${hue},70%,65%,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Draw radiating spokes
        for (let l = 0; l < lineCount; l++) {
            const a = rot + (l / lineCount) * Math.PI * 2;
            ctx.strokeStyle = `hsla(${hue},70%,65%,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
            ctx.stroke();
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.49;

        // Full redraw each frame (moiré works best without trails)
        ctx.fillStyle = `rgba(0,0,0,${0.55 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.2})`;
        ctx.fillRect(0, 0, w, h);

        const spokeCount = Math.floor(20 + complexity * 18);

        // Rotate grids at slightly different rates → creates moiré beating
        const baseRate = 0.12 + energy * 0.35;
        const offset = 0.007 + energy * 0.012; // small offset = slow beat frequency
        this.rot1 += baseRate * dt;
        this.rot2 += (baseRate + offset) * dt;

        // Grid 1 (primary hue)
        this._drawSpiralGrid(ctx, cx, cy, this.rot1, spokeCount, maxR, hue, 0.45 + energy * 0.2, energy);

        // Grid 2 (shifted hue, XOR-like via additive blend)
        ctx.globalCompositeOperation = 'lighter';
        this._drawSpiralGrid(ctx, cx, cy, this.rot2, spokeCount, maxR, (hue + 40) % 360, 0.35 + energy * 0.2, energy);
        ctx.globalCompositeOperation = 'source-over';

        // Interference highlight: compute beat frequency visually
        const beatAngle = this.rot1 - this.rot2;
        const beatRings = 6;
        for (let b = 0; b < beatRings; b++) {
            const phase = (b / beatRings) * Math.PI * 2 + beatAngle * 3;
            const br = maxR * (0.1 + b * 0.15 + Math.abs(Math.sin(phase)) * 0.05);
            const ba = 0.12 + Math.abs(Math.sin(phase + this.time * 0.5)) * 0.18 * (0.5 + energy * 0.5);
            ctx.strokeStyle = `hsla(${(hue + 20) % 360},90%,85%,${ba})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.stroke();
        }

        // Note pulses
        ctx.globalCompositeOperation = 'lighter';
        this.pulses = this.pulses.filter(p => p.life > 0.01);
        for (const p of this.pulses) {
            p.life -= dt * 1.8;
            const pr = maxR * (1 - p.life) * 1.1;
            const pg = ctx.createRadialGradient(cx, cy, pr * 0.85, cx, cy, pr * 1.15);
            pg.addColorStop(0, 'transparent');
            pg.addColorStop(0.5, `hsla(${(hue + p.hueShift) % 360},100%,85%,${p.life * p.vel * 0.7})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(cx, cy, pr * 1.18, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Center dot
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 + energy * 12);
        cg.addColorStop(0, `rgba(255,255,255,${0.9 + energy * 0.1})`);
        cg.addColorStop(0.5, `hsla(${hue},100%,70%,${0.6 + energy * 0.3})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 8 + energy * 12, 0, Math.PI * 2); ctx.fill();
    }
}
