import { SupernovaMath } from '../math/SupernovaMath.js';

/**
 * SupernovaMode — Hypernova Detonation.
 * A high-fidelity cinematic simulation of a massive star's death.
 * Features blinding flash transients, expanding shockwave rings, and 
 * the formation of a swirling gaseous nebula around a central singularity.
 */
export class SupernovaMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new SupernovaMath();
        this.detonations = [];
        this.initialized = false;
        this._stars = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initStars(w, h);
        this.initialized = true;
    }

    _initStars(w, h) {
        this._stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: 0.5 + Math.random() * 1.5,
            a: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.3 + Math.random() * 0.4;
        this.mathInstance.addDetonation(x, y, noteInfo.velocity);
        
        // Detonation FX
        this.detonations.push({
            x, y,
            life: 1.0,
            vel: noteInfo.velocity,
            hueOff: (Math.random() - 0.5) * 60
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);
        const energy = Number(this.mathInstance.energy) || 0;

        // --- Deep Space Backdrop ---
        ctx.fillStyle = '#010006';
        ctx.fillRect(0, 0, w, h);

        // Twinkling Starfield with "Warp" interaction
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this._stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + s.phase);
            const distToSing = Math.hypot(s.x/w - this.mathInstance.singularityX, s.y/h - this.mathInstance.singularityY);
            const warpX = (s.x/w - this.mathInstance.singularityX) * (energy * 0.05 / (distToSing + 0.1)) * w;
            const warpY = (s.y/h - this.mathInstance.singularityY) * (energy * 0.05 / (distToSing + 0.1)) * h;
            
            ctx.fillStyle = `hsla(220, 100%, 90%, ${s.a * tw * intensity})`;
            ctx.beginPath(); 
            ctx.arc(s.x + warpX, s.y + warpY, s.s, 0, Math.PI * 2); 
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Gaseous Nebula Ejecta ---
        ctx.globalCompositeOperation = 'screen';
        for (const p of this.mathInstance.nebulaEjecta) {
            const px = p.x * w, py = p.y * h;
            const pSize = 10 + p.life * 100 * intensity;
            const pHue = (hue + p.hue) % 360;
            const pAlpha = p.life * 0.15 * intensity;

            const pg = ctx.createRadialGradient(px, py, 0, px, py, pSize);
            pg.addColorStop(0, `hsla(${pHue}, 80%, 60%, ${pAlpha})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Detonation Shockwaves ---
        this.detonations = this.detonations.filter(d => d.life > 0.01);
        ctx.globalCompositeOperation = 'lighter';
        for (const d of this.detonations) {
            d.life -= dt * 0.8;
            const dx = d.x * w, dy = d.y * h;
            const r = (1 - d.life) * Math.max(w, h) * 0.5 * (0.5 + d.vel);
            const dHue = (hue + d.hueOff) % 360;
            
            // Inner Flash
            if (d.life > 0.8) {
                const flashAlpha = (d.life - 0.8) * 5;
                const fg = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 2);
                fg.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
                fg.addColorStop(1, 'transparent');
                ctx.fillStyle = fg;
                ctx.fillRect(0, 0, w, h);
            }

            // Expanding Shockwave Ring
            const ringAlpha = d.life * 0.6;
            const ringWidth = r * 0.1;
            const rg = ctx.createRadialGradient(dx, dy, Math.max(0, r - ringWidth), dx, dy, r);
            rg.addColorStop(0, 'transparent');
            rg.addColorStop(0.5, `hsla(${dHue}, 100%, 80%, ${ringAlpha})`);
            rg.addColorStop(1, 'transparent');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
        }

        // --- Central Remnant (Singularity) ---
        const sx = this.mathInstance.singularityX * w;
        const sy = this.mathInstance.singularityY * h;
        const singR = 10 + energy * 40;
        
        const coreG = ctx.createRadialGradient(sx, sy, 0, sx, sy, singR * 5);
        coreG.addColorStop(0, `hsla(${hue}, 100%, 95%, ${0.9 + energy * 0.1})`);
        coreG.addColorStop(0.2, `hsla(${(hue + 30) % 360}, 100%, 70%, ${0.5 + energy * 0.3})`);
        coreG.addColorStop(1, 'transparent');
        ctx.fillStyle = coreG;
        ctx.beginPath(); ctx.arc(sx, sy, singR * 5, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sx, sy, singR * 0.6, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}
