import { CometStreakMath } from '../math/CometStreakMath.js';

/**
 * CometStreakMode — Hypersonic Meteor Convergence.
 * A dense 3D perspective field of comets flying TOWARD the viewer from a
 * central vanishing point. Each comet scales with depth: far = tiny, near = massive.
 * Long chromatic tails taper from their bright heads. Note events trigger
 * dense meteor showers; reaching the screen causes radiant explosions.
 */
export class CometStreakMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new CometStreakMath();
        this.time = 0;
        this.comets = [];
        this.explosions = [];
        this._stars = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._stars = Array.from({ length: 280 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            s: 0.3 + Math.random() * 1.0, a: 0.15 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2
        }));
        this.comets = Array.from({ length: 80 }, () => this._spawn(true));
        this.initialized = true;
    }

    _spawn(randomZ = false) {
        return {
            x:     (Math.random() - 0.5) * 1.8,
            y:     (Math.random() - 0.5) * 1.8,
            z:     randomZ ? 0.1 + Math.random() * 1.4 : 1.2 + Math.random() * 0.5,
            vz:    -(0.5 + Math.random() * 1.0),
            hue:   Math.random() * 360,
            size:  0.6 + Math.random() * 1.4,
            trail: [],
        };
    }

    _proj(x, y, z, w, h) {
        const f = 0.7, s = f / Math.max(0.001, f + z);
        return { px: w/2 + x*s*w*0.55, py: h/2 + y*s*h*0.55, scale: s };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const n = 8 + Math.floor(noteInfo.velocity * 20);
        for (let i = 0; i < n; i++) {
            const c = this._spawn(false);
            c.vz  *= 1.8 + noteInfo.velocity;
            c.hue  = noteInfo.normalizedPosition * 360;
            c.size *= 1.2 + noteInfo.velocity * 0.8;
            this.comets.push(c);
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue      = Number(mathEngine.get('colorHue'))  || 0;
        const intensity= Number(mathEngine.get('intensity')) || 0.5;
        const speed    = Number(mathEngine.get('speed'))     || 1.0;
        const energy   = Number(this.mathInstance.energy)    || 0;

        ctx.fillStyle = `rgba(0,0,5,${0.10 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Starfield
        for (const s of this._stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * 1.8 + s.phase);
            ctx.fillStyle = `hsla(220,40%,90%,${s.a * tw * intensity * 0.4})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
        }

        // Refill pool
        while (this.comets.length < 80) this.comets.push(this._spawn(false));

        for (let i = this.comets.length - 1; i >= 0; i--) {
            const c = this.comets[i];
            c.z += c.vz * speed * dt;

            if (c.z <= 0.02) {
                const p = this._proj(c.x, c.y, 0.02, w, h);
                this.explosions.push({ x: p.px, y: p.py, r: 0, life: 1.0, hue: (hue + c.hue) % 360, sz: c.size });
                this.comets.splice(i, 1);
                continue;
            }
            if (c.z > 1.8) { this.comets.splice(i, 1); continue; }

            const { px, py, scale } = this._proj(c.x, c.y, c.z, w, h);
            c.trail.push({ px, py, scale });
            if (c.trail.length > 30) c.trail.shift();

            // Tail
            for (let t = 1; t < c.trail.length; t++) {
                const frac = t / c.trail.length;
                const tp = c.trail[t-1], tn = c.trail[t];
                ctx.strokeStyle = `hsla(${(hue+c.hue+frac*40)%360},100%,${55+frac*35}%,${frac*0.7*intensity*(0.4+energy*0.6)})`;
                ctx.lineWidth = frac * c.size * scale * 14;
                ctx.lineCap   = 'round';
                ctx.beginPath(); ctx.moveTo(tp.px, tp.py); ctx.lineTo(tn.px, tn.py); ctx.stroke();
            }

            // Head glow
            const hR = c.size * scale * 18 * (0.6 + energy * 0.4);
            const cH = (hue + c.hue) % 360;
            const hg = ctx.createRadialGradient(px, py, 0, px, py, hR);
            hg.addColorStop(0, `hsla(${cH},100%,97%,${0.9*intensity})`);
            hg.addColorStop(0.3, `hsla(${cH},100%,75%,${0.5*intensity})`);
            hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(px, py, hR, 0, Math.PI*2); ctx.fill();
        }

        // Explosions
        this.explosions = this.explosions.filter(e => e.life > 0.01);
        for (const e of this.explosions) {
            e.r   += 220 * dt;
            e.life -= dt * 2.0;
            const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r*2);
            eg.addColorStop(0, `hsla(${e.hue},100%,97%,${e.life*0.8})`);
            eg.addColorStop(0.4, `hsla(${(e.hue+40)%360},100%,65%,${e.life*0.4})`);
            eg.addColorStop(1, 'transparent');
            ctx.fillStyle = eg;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r*2, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
