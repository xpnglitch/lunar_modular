import { NebulaGlowMath } from '../math/NebulaGlowMath.js';

/**
 * NebulaGlowMode — Aurora Plasma Curtain.
 * Towering vertical plasma sheets undulate like polar aurora borealis, layered in depth.
 * Luminous particles stream upward through the glowing curtain folds. Additive color
 * blending makes overlapping sheets bloom into brilliant chromatic light fusion.
 * Note events ignite new curtain columns with explosive vertical surges.
 */
export class NebulaGlowMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new NebulaGlowMath();
        this.time = 0;
        this._curtains = [];
        this._particles = [];
        this._flares = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildCurtains(w, h);
        this._buildParticles(w, h);
        this.initialized = true;
    }

    _buildCurtains(w, h) {
        const count = 16;
        this._curtains = Array.from({ length: count }, (_, i) => ({
            xBase:     w * (i / (count - 1)),
            phase:     Math.random() * Math.PI * 2,
            speed:     0.15 + Math.random() * 0.25,
            width:     50 + Math.random() * 100,
            hueOff:    (i / count) * 300,
            amplitude: 25 + Math.random() * 55,
            freq:      0.8 + Math.random() * 1.4,
            brightness:0.4 + Math.random() * 0.6,
            depth:     i / count,
        }));
    }

    _buildParticles(w, h) {
        this._particles = Array.from({ length: 350 }, () => ({
            x:       Math.random() * w,
            y:       Math.random() * h,
            vy:      -(20 + Math.random() * 90),
            vx:      (Math.random() - 0.5) * 15,
            life:    Math.random(),
            maxLife: 0.6 + Math.random() * 1.8,
            size:    0.5 + Math.random() * 2.5,
            hueOff:  Math.random() * 120,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        this._flares.push({
            x:      noteInfo.normalizedPosition * w,
            life:   1.0,
            vel:    noteInfo.velocity,
            hueOff: noteInfo.normalizedPosition * 180,
            width:  40 + noteInfo.velocity * 90,
        });
        const n = 25 + Math.floor(noteInfo.velocity * 45);
        for (let i = 0; i < n; i++) {
            this._particles.push({
                x:       noteInfo.normalizedPosition * w + (Math.random() - 0.5) * 120,
                y:       h * 0.7 + Math.random() * h * 0.3,
                vy:      -(70 + Math.random() * 220 * noteInfo.velocity),
                vx:      (Math.random() - 0.5) * 45,
                life:    0,
                maxLife: 0.3 + Math.random() * 1.0,
                size:    1 + Math.random() * 4,
                hueOff:  noteInfo.normalizedPosition * 180,
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawCurtain(ctx, w, h, xBase, phase, amplitude, freq, width, curtainHue, alpha) {
        const steps = 38;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const t  = i / steps;
            const y  = t * h;
            const dx = Math.sin(t * freq * Math.PI * 2 + phase) * amplitude;
            if (i === 0) ctx.moveTo(xBase + dx - width/2, y);
            else         ctx.lineTo(xBase + dx - width/2, y);
        }
        for (let i = steps; i >= 0; i--) {
            const t  = i / steps;
            const y  = t * h;
            const dx = Math.sin(t * freq * Math.PI * 2 + phase) * amplitude;
            ctx.lineTo(xBase + dx + width/2, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0,   `hsla(${curtainHue},100%,70%,0)`);
        grad.addColorStop(0.1, `hsla(${curtainHue},100%,70%,${alpha})`);
        grad.addColorStop(0.5, `hsla(${(curtainHue+30)%360},100%,80%,${alpha*1.4})`);
        grad.addColorStop(0.9, `hsla(${curtainHue},100%,60%,${alpha*0.6})`);
        grad.addColorStop(1,   `hsla(${curtainHue},100%,50%,0)`);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue      = Number(mathEngine.get('colorHue'))  || 0;
        const intensity= Number(mathEngine.get('intensity')) || 0.5;
        const speed    = Number(mathEngine.get('speed'))     || 1.0;
        const energy   = Number(this.mathInstance.energy)    || 0;

        // Deep polar sky
        ctx.fillStyle = '#000208';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Curtains back→front
        const sorted = [...this._curtains].sort((a, b) => a.depth - b.depth);
        for (const c of sorted) {
            c.phase += c.speed * speed * dt;
            const cHue  = (hue + c.hueOff) % 360;
            const alpha = c.brightness * (0.015 + intensity * 0.025) * (0.6 + energy * 0.6);
            this._drawCurtain(ctx, w, h, c.xBase, c.phase, c.amplitude * (1 + energy * 0.5), c.freq, c.width, cHue, alpha);
        }

        // Flares
        this._flares = this._flares.filter(f => f.life > 0.01);
        for (const f of this._flares) {
            f.life -= dt * 0.8;
            const fHue  = (hue + f.hueOff) % 360;
            const alpha = f.life * f.vel * 0.1;
            this._drawCurtain(ctx, w, h, f.x, this.time * 2, 25, 2, f.width, fHue, alpha);
        }

        // Streaming particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x    += p.vx * dt;
            p.y    += p.vy * dt;
            p.life += dt;
            if (p.life > p.maxLife || p.y < -10) {
                p.x       = Math.random() * w;
                p.y       = h + 5;
                p.vy      = -(20 + Math.random() * 90);
                p.vx      = (Math.random() - 0.5) * 15;
                p.life    = 0;
                p.maxLife = 0.6 + Math.random() * 1.8;
                p.size    = 0.5 + Math.random() * 2.5;
                continue;
            }
            const lifeFrac = p.life / p.maxLife;
            const alpha    = Math.sin(lifeFrac * Math.PI) * 0.55 * intensity;
            const pHue     = (hue + p.hueOff + lifeFrac * 60) % 360;
            ctx.fillStyle  = `hsla(${pHue},100%,85%,${alpha})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
