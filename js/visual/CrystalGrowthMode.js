import { CrystalGrowthMath } from '../math/CrystalGrowthMath.js';

/**
 * CrystalGrowthMode — Prismatic Lattice Nucleation.
 * Hexagonal crystal lattice cells grow outward from nucleation seeds.
 * Each cell has prismatic facets that catch and refract colored light.
 * As crystals grow they push and crowd each other, forming natural
 * Voronoi-like boundaries. Energy creates light caustics and refraction
 * flashes. Note events trigger new nucleation sites with explosive growth.
 */
export class CrystalGrowthMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new CrystalGrowthMath();
        this.time = 0;
        this._seeds = [];
        this._cells = [];
        this._flashes = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initSeeds(w, h);
        this.initialized = true;
    }

    _initSeeds(w, h) {
        this._seeds = Array.from({ length: 8 }, (_, i) => ({
            x:       w * (0.1 + Math.random() * 0.8),
            y:       h * (0.1 + Math.random() * 0.8),
            r:       0,
            maxR:    80 + Math.random() * 120,
            hue:     (i / 8) * 360,
            sides:   5 + Math.floor(Math.random() * 4),  // hex/oct facets
            rot:     Math.random() * Math.PI,
            rotVel:  (Math.random() - 0.5) * 0.05,
            life:    1.0,
            growing: true,
        }));
        this._cells = [];
    }

    _spawnCrystal(x, y, hue, vel) {
        this._seeds.push({
            x, y,
            r:       0,
            maxR:    60 + vel * 120,
            hue:     hue,
            sides:   5 + Math.floor(Math.random() * 4),
            rot:     Math.random() * Math.PI,
            rotVel:  (Math.random() - 0.5) * 0.08,
            life:    1.0,
            growing: true,
        });
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.update(0, 0); // ensure energy updated
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const n = 2 + Math.floor(noteInfo.velocity * 5);
        for (let i = 0; i < n; i++) {
            const x = noteInfo.normalizedPosition * w + (Math.random()-0.5) * 150;
            const y = h * (0.15 + Math.random() * 0.7);
            const hue = (noteInfo.normalizedPosition * 360 + i * 40) % 360;
            this._spawnCrystal(x, y, hue, noteInfo.velocity);
        }
        // Light flash
        this._flashes.push({ x: noteInfo.normalizedPosition * w, y: h * 0.5, life: 1.0, vel: noteInfo.velocity });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawCrystal(ctx, seed, hue, intensity, energy) {
        const { x, y, r, sides, rot, life } = seed;
        if (r < 2) return;

        // Draw multiple concentric facet rings
        for (let ring = 0; ring < 3; ring++) {
            const rr    = r * (1 - ring * 0.28);
            const alpha = life * (0.08 + (1 - ring * 0.3) * 0.12) * (0.4 + intensity * 0.4);
            const sat   = 80 + ring * 10;
            const light = 40 + ring * 15 + energy * 20;
            const rHue  = (hue + ring * 25) % 360;

            ctx.strokeStyle = `hsla(${rHue}, ${sat}%, ${light}%, ${alpha})`;
            ctx.lineWidth   = 1.5 - ring * 0.4;
            ctx.beginPath();
            for (let s = 0; s <= sides; s++) {
                const a   = rot + (s / sides) * Math.PI * 2;
                // Slight irregular facets
                const ir  = rr * (1 + 0.08 * Math.sin(a * sides * 0.5 + this.time * 0.3));
                const px  = x + Math.cos(a) * ir;
                const py  = y + Math.sin(a) * ir;
                if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Fill with very faint color
            const fg = ctx.createRadialGradient(x, y, 0, x, y, rr);
            fg.addColorStop(0, `hsla(${rHue}, ${sat}%, ${light+15}%, ${alpha * 0.5})`);
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.fill();
        }

        // Bright specular glint
        const glintX = x + Math.cos(rot + 0.5) * r * 0.3;
        const glintY = y + Math.sin(rot + 0.5) * r * 0.3;
        const gg = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, r * 0.25);
        gg.addColorStop(0, `hsla(${hue}, 30%, 95%, ${life * 0.5 * (0.3 + energy * 0.5)})`);
        gg.addColorStop(1, 'transparent');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(glintX, glintY, r * 0.25, 0, Math.PI*2); ctx.fill();
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        // Dark crystal cave background
        ctx.fillStyle = `rgba(0,0,3,${0.12 + (1-intensity)*0.08})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Update and draw crystal seeds
        if (this._seeds.length < 4) this._initSeeds(w, h);
        while (this._seeds.length > 30) this._seeds.shift();

        for (let i = this._seeds.length - 1; i >= 0; i--) {
            const s = this._seeds[i];
            s.rot += s.rotVel * speed * dt;

            if (s.growing && s.r < s.maxR) {
                s.r += (20 + energy * 40) * speed * dt;
            } else if (s.growing) {
                s.growing = false;
            } else {
                s.life -= dt * 0.15;
                if (s.life <= 0) { this._seeds.splice(i, 1); continue; }
            }

            const cHue = (hue + s.hue) % 360;
            this._drawCrystal(ctx, s, cHue, intensity, energy);
        }

        // Growth nucleation ambient
        if (Math.random() < 0.008 + energy * 0.015) {
            this._spawnCrystal(
                Math.random() * w,
                Math.random() * h,
                (hue + Math.random() * 180) % 360,
                0.3
            );
        }

        // Light caustic flashes
        this._flashes = this._flashes.filter(f => f.life > 0.01);
        for (const f of this._flashes) {
            f.life -= dt * 2.0;
            const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 200 * f.vel);
            fg.addColorStop(0, `hsla(${hue}, 50%, 90%, ${f.life * f.vel * 0.3})`);
            fg.addColorStop(0.5, `hsla(${(hue+60)%360}, 100%, 70%, ${f.life * 0.1})`);
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
