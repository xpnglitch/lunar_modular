import { WatercolorWashMath } from '../math/WatercolorWashMath.js';

/**
 * WatercolorWashMode — Bioluminescent Ink Bloom.
 * Giant glowing ink blooms expand and contract like bioluminescent organisms
 * in deep water. Multiple overlapping blooms of different hues blend additively
 * to create brilliant chromatic fusion zones. Fractal edge tendrils give each
 * bloom an organic, alive quality. Note events ignite new explosive blooms.
 */
export class WatercolorWashMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new WatercolorWashMath();
        this.time = 0;
        this._blooms = [];
        this._tendrils = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        // Seed ambient blooms
        for (let i = 0; i < 5; i++) {
            this._spawnBloom(Math.random() * w, Math.random() * h, 0.4, 0, false);
        }
        this.initialized = true;
    }

    _spawnBloom(x, y, vel, hueOff, burst) {
        const bloom = {
            x, y,
            r:       burst ? 0 : Math.random() * 80,
            maxR:    80 + Math.random() * 200 + (burst ? vel * 180 : 0),
            growRate: burst ? 120 + vel * 200 : 20 + Math.random() * 40,
            shrinkRate: 8 + Math.random() * 15,
            life:    1.0,
            hue:     hueOff,
            phase:   Math.random() * Math.PI * 2,
            wobble:  0.08 + Math.random() * 0.12,
            petals:  3 + Math.floor(Math.random() * 5),
            burst,
        };
        this._blooms.push(bloom);
        // Spawn tendrils for burst blooms
        if (burst) {
            const n = 8 + Math.floor(vel * 20);
            for (let i = 0; i < n; i++) {
                const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
                this._tendrils.push({
                    x, y,
                    angle,
                    len:   0,
                    maxLen: 60 + Math.random() * 180 * vel,
                    speed: 80 + Math.random() * 150,
                    life:  1.0,
                    hue:   hueOff,
                    width: 1 + Math.random() * 3,
                });
            }
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const x = noteInfo.normalizedPosition * w;
        const y = h * (0.2 + Math.random() * 0.6);
        const hueOff = (noteInfo.normalizedPosition * 360) % 360;
        this._spawnBloom(x, y, noteInfo.velocity, hueOff, true);
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

        // Deep ink water background
        ctx.fillStyle = `rgba(0,1,5,${0.08 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Ambient bloom replenishment
        if (this._blooms.length < 4 && Math.random() < 0.02) {
            this._spawnBloom(Math.random() * w, Math.random() * h, 0.3, (hue + Math.random() * 180) % 360, false);
        }

        // Draw tendrils
        this._tendrils = this._tendrils.filter(t => t.life > 0.01);
        for (const t of this._tendrils) {
            t.len  += t.speed * speed * dt;
            t.life -= dt * (0.4 + t.speed * 0.002);
            if (t.len > t.maxLen) t.life = 0;

            const ex = t.x + Math.cos(t.angle) * t.len;
            const ey = t.y + Math.sin(t.angle) * t.len;
            const tg = ctx.createLinearGradient(t.x, t.y, ex, ey);
            tg.addColorStop(0, `hsla(${t.hue},100%,75%,${t.life * 0.4 * intensity})`);
            tg.addColorStop(1, 'transparent');
            ctx.strokeStyle = tg;
            ctx.lineWidth   = t.width * t.life;
            ctx.lineCap     = 'round';
            ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(ex, ey); ctx.stroke();
        }

        // Draw blooms
        this._blooms = this._blooms.filter(b => b.life > 0.01);
        for (const bloom of this._blooms) {
            if (bloom.r < bloom.maxR) {
                bloom.r += bloom.growRate * speed * dt;
            } else {
                bloom.r    = bloom.maxR;
                bloom.life -= bloom.shrinkRate * dt / bloom.maxR;
            }

            const bHue  = (bloom.hue + hue) % 360;
            const bR    = bloom.r * (1 + energy * 0.2);
            const alpha = bloom.life * (0.012 + intensity * 0.018);

            // Multi-layer bloom: outer→inner, each with slight wobble
            for (let layer = 0; layer < 4; layer++) {
                const lFrac = 1 - layer / 4;
                const lR    = bR * lFrac;
                const lHue  = (bHue + layer * 20) % 360;
                const lAlpha = alpha * (1 + layer * 0.5);

                ctx.save();
                ctx.translate(bloom.x, bloom.y);
                ctx.rotate(this.time * 0.05 + bloom.phase);
                ctx.beginPath();

                // Organic petal shape via wobble
                const pts = 80;
                for (let p = 0; p <= pts; p++) {
                    const a    = (p / pts) * Math.PI * 2;
                    const wob  = 1 + bloom.wobble * Math.sin(a * bloom.petals + this.time * 0.8 + bloom.phase);
                    const rx   = Math.cos(a) * lR * wob;
                    const ry   = Math.sin(a) * lR * wob * 0.85;
                    if (p === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
                }
                ctx.closePath();

                const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, lR * 1.2);
                bg.addColorStop(0, `hsla(${lHue},90%,75%,${lAlpha * 1.5})`);
                bg.addColorStop(0.5, `hsla(${(lHue+20)%360},80%,55%,${lAlpha})`);
                bg.addColorStop(1, 'transparent');
                ctx.fillStyle = bg;
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
