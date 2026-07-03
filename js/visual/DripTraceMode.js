import { DripTraceMath } from '../math/DripTraceMath.js';

/**
 * DripTraceMode — Neon Viscous Flow.
 * Luminous neon fluid drips from the top of the screen, each drop leaving
 * a glowing chromatic trail. Drops accelerate under simulated gravity,
 * pooling at the ground with ripple rings. The floor holds accumulated
 * luminous pigment with soft reflective glow. Note events trigger
 * explosive multi-color drip cascades from targeted positions.
 */
export class DripTraceMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new DripTraceMath();
        this.time = 0;
        this._drips = [];
        this._pool = [];   // glow patches at ground
        this._ambientTimer = 0;
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    _spawnDrip(x, h, vel, hue, size) {
        return {
            x,
            y:      -10,
            vy:     80 + Math.random() * 60,     // initial drip speed
            trail:  [],                           // {x, y} history
            hue,
            size:   size || (2 + Math.random() * 4),
            vel:    vel || 0.5,
            alive:  true,
            stretch: 0,                          // elongation due to speed
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const count = 5 + Math.floor(noteInfo.velocity * 20);
        for (let i = 0; i < count; i++) {
            const x = noteInfo.normalizedPosition * w + (Math.random() - 0.5) * 120;
            this._drips.push(this._spawnDrip(
                x, h,
                noteInfo.velocity,
                (noteInfo.normalizedPosition * 360 + Math.random() * 120 - 60 + 360) % 360,
                2 + Math.random() * 6 * noteInfo.velocity
            ));
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const energy     = Number(this.mathInstance.energy)     || 0;
        const groundY    = h * 0.92;

        // Slow trail fade
        ctx.fillStyle = `rgba(1,0,4,${0.06 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        // Ambient drip spawning
        this._ambientTimer -= dt;
        if (this._ambientTimer <= 0) {
            this._ambientTimer = 0.08 + Math.random() * 0.25 / (1 + energy * 2);
            this._drips.push(this._spawnDrip(
                Math.random() * w, h,
                0.2 + Math.random() * 0.4,
                (hue + Math.random() * 200 - 100 + 360) % 360,
                1 + Math.random() * 3
            ));
        }
        while (this._drips.length > 200) this._drips.shift();

        ctx.globalCompositeOperation = 'lighter';

        // Draw pool glow
        this._pool = this._pool.filter(p => p.life > 0.01);
        for (const p of this._pool) {
            p.r   += 60 * dt;
            p.life -= dt * (0.3 + (1-intensity) * 0.3);
            const pg = ctx.createRadialGradient(p.x, groundY, 0, p.x, groundY, p.r);
            pg.addColorStop(0, `hsla(${p.hue},100%,70%,${p.life * 0.25 * intensity})`);
            pg.addColorStop(0.5, `hsla(${(p.hue+30)%360},100%,50%,${p.life * 0.1})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(p.x, groundY, p.r, 0, Math.PI*2); ctx.fill();
        }

        // Draw and update drips
        for (let i = this._drips.length - 1; i >= 0; i--) {
            const d = this._drips[i];

            d.vy += 280 * dt * speed;  // gravity acceleration
            d.y  += d.vy * dt * speed;

            d.trail.push({ x: d.x, y: d.y });
            if (d.trail.length > 40) d.trail.shift();

            if (d.y >= groundY) {
                // Splat into pool
                this._pool.push({ x: d.x, hue: d.hue, r: d.size * 2, life: 1.0 });
                this._drips.splice(i, 1);
                continue;
            }

            // Draw glowing trail
            if (d.trail.length > 2) {
                for (let t = 1; t < d.trail.length; t++) {
                    const frac = t / d.trail.length;
                    const tp = d.trail[t-1], tn = d.trail[t];
                    const alpha = frac * 0.6 * intensity * (0.5 + energy * 0.5);
                    ctx.strokeStyle = `hsla(${d.hue},100%,${60+frac*30}%,${alpha})`;
                    ctx.lineWidth   = d.size * frac * 1.5;
                    ctx.lineCap     = 'round';
                    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(tn.x, tn.y); ctx.stroke();
                }
            }

            // Glowing drop head
            const headR = d.size * (1.5 + d.vel * 1.5) * (1 + energy * 0.3);
            const hg    = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, headR * 3);
            hg.addColorStop(0, `hsla(${d.hue},100%,90%,${0.8*intensity})`);
            hg.addColorStop(0.4, `hsla(${d.hue},100%,65%,${0.4*intensity})`);
            hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(d.x, d.y, headR*3, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';

        // Ground reflective floor
        const floorG = ctx.createLinearGradient(0, groundY, 0, h);
        floorG.addColorStop(0, `hsla(${hue},80%,20%,${0.15 + energy*0.15})`);
        floorG.addColorStop(1, `rgba(0,0,0,0.8)`);
        ctx.fillStyle = floorG;
        ctx.fillRect(0, groundY, w, h - groundY);
    }
}
