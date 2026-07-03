import { ExoplanetMath } from '../math/ExoplanetMath.js';

/**
 * ExoplanetMode — Volcanic Gas Giant.
 * A high-fidelity cinematic simulation of an alien world with dynamic atmospheric bands, 
 * orbital rings, and localized volcanic eruptions triggered by musical notes.
 */
export class ExoplanetMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ExoplanetMath();
        this.initialized = false;
        this._stars = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initBackdrop(w, h);
        this.initialized = true;
    }

    _initBackdrop(w, h) {
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
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue');

        this.mathInstance.step(dt, complexity);
        const energy = this.mathInstance.energy;
        const storm = this.mathInstance.stormEnergy;

        const pR = Math.min(w, h) * 0.32;
        const cx = w / 2, cy = h / 2;

        // --- Deep Space Background ---
        ctx.fillStyle = '#010008';
        ctx.fillRect(0, 0, w, h);

        // Twinkling Starfield
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this._stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + s.phase);
            ctx.fillStyle = `hsla(220, 100%, 90%, ${s.a * tw * intensity})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Distant Star Flare ---
        const starX = w * 0.8, starY = h * 0.2;
        const flareG = ctx.createRadialGradient(starX, starY, 0, starX, starY, pR * 3);
        flareG.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.15)`);
        flareG.addColorStop(1, 'transparent');
        ctx.fillStyle = flareG;
        ctx.fillRect(0, 0, w, h);

        // --- Orbital Rings (Back Half) ---
        this._drawRings(ctx, cx, cy, pR, hue, energy, true);

        // --- Planet Body ---
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2); ctx.clip();

        // Atmospheric Base
        const pGrad = ctx.createRadialGradient(cx - pR * 0.4, cy - pR * 0.4, 0, cx, cy, pR);
        pGrad.addColorStop(0, `hsla(${hue}, 80%, 60%, 1)`);
        pGrad.addColorStop(0.5, `hsla(${(hue + 20) % 360}, 60%, 30%, 1)`);
        pGrad.addColorStop(1, `hsla(${(hue + 40) % 360}, 80%, 10%, 1)`);
        ctx.fillStyle = pGrad;
        ctx.fillRect(cx - pR, cy - pR, pR * 2, pR * 2);

        // Atmospheric Bands
        for (const band of this.mathInstance.bands) {
            const by = cy + (band.y * pR);
            const bHeight = pR * 0.15;
            const bHue = (hue + band.offset * 10) % 360;
            const bAlpha = 0.15 + 0.25 * Math.sin(this.time * 0.5 + band.offset);
            
            ctx.fillStyle = `hsla(${bHue}, 100%, 80%, ${bAlpha * (0.5 + energy * 0.5)})`;
            // Scrolling bands (fake)
            const scrollOff = Math.sin(this.time * band.speed) * pR * 0.1;
            ctx.fillRect(cx - pR, by - bHeight/2 + scrollOff, pR * 2, bHeight);
        }

        // Volcanic Hotspots
        ctx.globalCompositeOperation = 'lighter';
        for (const v of this.mathInstance.volcanoes) {
            // Project rotating latitude/longitude
            const rotAngle = v.angle + (this.time * 0.1);
            const vx = Math.cos(rotAngle) * pR * 0.8;
            const vy = v.latitude * pR * 0.6;
            
            // Only draw if on front side (relative to rotation)
            if (Math.sin(rotAngle) > 0) {
                const vSize = 10 + v.vel * 80 * v.life;
                const vGrad = ctx.createRadialGradient(cx + vx, cy + vy, 0, cx + vx, cy + vy, vSize);
                vGrad.addColorStop(0, `hsla(20, 100%, 80%, ${v.life * intensity})`);
                vGrad.addColorStop(0.4, `hsla(0, 100%, 60%, ${v.life * 0.4 * intensity})`);
                vGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = vGrad;
                ctx.beginPath(); ctx.arc(cx + vx, cy + vy, vSize, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // Terminator Shading (Infinite Shadow)
        const tGrad = ctx.createRadialGradient(cx - pR * 0.5, cy - pR * 0.5, pR * 0.5, cx, cy, pR * 1.5);
        tGrad.addColorStop(0, 'transparent');
        tGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = tGrad;
        ctx.fillRect(cx - pR, cy - pR, pR * 2, pR * 2);

        // Atmosphere Rim Glow
        const rimG = ctx.createRadialGradient(cx, cy, pR * 0.85, cx, cy, pR);
        rimG.addColorStop(0, 'transparent');
        rimG.addColorStop(1, `hsla(${hue}, 100%, 85%, ${0.4 + energy * 0.4})`);
        ctx.fillStyle = rimG;
        ctx.fillRect(cx - pR, cy - pR, pR * 2, pR * 2);

        ctx.restore();

        // --- Orbital Rings (Front Half) ---
        this._drawRings(ctx, cx, cy, pR, hue, energy, false);

        // --- Outer Atmospheric Scattering ---
        ctx.globalCompositeOperation = 'lighter';
        const atmoG = ctx.createRadialGradient(cx, cy, pR * 0.95, cx, cy, pR * 1.3);
        atmoG.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.1 + energy * 0.1})`);
        atmoG.addColorStop(1, 'transparent');
        ctx.fillStyle = atmoG;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }

    _drawRings(ctx, cx, cy, pR, hue, energy, isBack) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.3); // Elliptical rings
        
        ctx.globalCompositeOperation = 'lighter';
        const rCount = 4;
        for (let i = 0; i < rCount; i++) {
            const inner = pR * (1.3 + i * 0.15);
            const outer = inner + pR * 0.1;
            
            // For front half, we clip the back area (conceptually)
            // But since we draw back half FIRST before planet, and front half AFTER, 
            // we just need the planet body to overdraw the middle.
            // If isBack, we can technically only draw the top half, etc.
            // Simplified: we'll just use globalCompositeOperation and layering.
            
            const rAlpha = (0.2 - i * 0.04) * (0.6 + energy * 0.4);
            const rHue = (hue + i * 15) % 360;
            
            const rGrad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
            rGrad.addColorStop(0, 'transparent');
            rGrad.addColorStop(0.5, `hsla(${rHue}, 70%, 70%, ${rAlpha})`);
            rGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = rGrad;
            ctx.beginPath(); ctx.arc(0, 0, outer, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }
}
