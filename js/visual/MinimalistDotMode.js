import { MinimalistDotMath } from '../math/MinimalistDotMath.js';

/**
 * MinimalistDotMode — Zen restraint: a single breathing dot in vast negative space.
 * Orbit rings appear on notes and slowly fade. Connected to sound: clean, pure, focused.
 * The dot's size, hue, and orbit geometry respond precisely to every note.
 */
export class MinimalistDotMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new MinimalistDotMath();
        this.time = 0;
        this.orbitRings = [];   // note-triggered orbit arcs
        this.dotSize = 40;
        this.targetDotSize = 40;
        this.dotHue = 0;
        this.dotPulse = 0;
        this.satellites = [];   // small orbiting dots triggered by notes
        this.initialized = false;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;
        const maxR = Math.min(w, h) * 0.42;

        // Pulse the center dot
        this.targetDotSize = 40 + noteInfo.velocity * 80;
        this.dotPulse = noteInfo.velocity;

        // Add an orbit ring
        this.orbitRings.push({
            r: maxR * (0.2 + noteInfo.normalizedPosition * 0.65),
            life: 1.0,
            vel: noteInfo.velocity,
            hueShift: (noteInfo.normalizedPosition - 0.5) * 80,
            openAngle: Math.PI * 2, // becomes arc
            rotAngle: noteInfo.normalizedPosition * Math.PI * 2,
        });

        // Small satellite dot
        this.satellites.push({
            angle: noteInfo.normalizedPosition * Math.PI * 2,
            r: maxR * (0.12 + noteInfo.normalizedPosition * 0.5),
            life: 1.0, vel: noteInfo.velocity,
            speed: (0.5 + Math.random()) * (Math.random() < 0.5 ? 1 : -1),
            size: 4 + noteInfo.velocity * 10,
            hueShift: (noteInfo.normalizedPosition - 0.5) * 100,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        let energy = isFinite(this.mathInstance.energy) ? this.mathInstance.energy : 0;
        let intensity = isFinite(mathEngine.get('intensity')) ? mathEngine.get('intensity') : 0.5;
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.42;

        // Very slow fade — minimalist space
        ctx.fillStyle = `rgba(0,0,0,${0.05 + (1 - intensity) * 0.04})`;
        ctx.fillRect(0, 0, w, h);

        // Decay dot size
        this.targetDotSize += (40 + energy * 20 - this.targetDotSize) * 0.08;
        this.dotSize += (this.targetDotSize - this.dotSize) * 0.12;
        this.dotPulse *= 0.93;
        
        let ds = isFinite(this.dotSize) ? this.dotSize : 40;

        // === Orbit rings ===
        this.orbitRings = this.orbitRings.filter(r => r.life > 0.005);
        for (const ring of this.orbitRings) {
            ring.life -= dt * 0.35;
            ring.rotAngle += dt * 0.08;

            const ringAlpha = ring.life * ring.vel * 0.6;
            const ringHue = (hue + ring.hueShift) % 360;

            // Main ring arc
            ctx.strokeStyle = `hsla(${ringHue},70%,65%,${ringAlpha})`;
            ctx.lineWidth = 1 + ring.life * ring.vel * 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, ring.rotAngle, ring.rotAngle + Math.PI * 1.75);
            ctx.stroke();

            // Opposite dimmer arc
            ctx.strokeStyle = `hsla(${ringHue},60%,50%,${ringAlpha * 0.35})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, ring.rotAngle + Math.PI * 1.75, ring.rotAngle + Math.PI * 2);
            ctx.stroke();

            // Arc endpoints: tiny circles
            for (let ep = 0; ep < 2; ep++) {
                const ea = ring.rotAngle + (ep === 0 ? 0 : Math.PI * 1.75);
                const ex = cx + Math.cos(ea) * ring.r;
                const ey = cy + Math.sin(ea) * ring.r;
                ctx.fillStyle = `hsla(${ringHue},90%,80%,${ringAlpha * 1.2})`;
                ctx.beginPath(); ctx.arc(ex, ey, 2 + ring.life * 2, 0, Math.PI * 2); ctx.fill();
            }
        }

        // === Satellites ===
        this.satellites = this.satellites.filter(s => s.life > 0.005);
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.satellites) {
            s.angle += s.speed * dt * (0.5 + energy * 0.5);
            s.life -= dt * 0.4;
            
            // Bulletproof Sanitization
            let rLife = isFinite(s.life) ? s.life : 0;
            let rSize = isFinite(s.size) ? s.size : 10;
            let rBase = isFinite(s.r) ? s.r : 100;
            
            const sx = cx + Math.cos(s.angle) * rBase;
            const sy = cy + Math.sin(s.angle) * rBase;
            const satHue = (hue + s.hueShift) % 360;
            
            const satRadius = Math.max(0.1, rSize * rLife * 2.5);
            
            const satG = ctx.createRadialGradient(sx, sy, 0, sx, sy, satRadius);
            satG.addColorStop(0, `hsla(${satHue},80%,88%,${Math.max(0, rLife * s.vel)})`);
            satG.addColorStop(1, 'transparent');
            ctx.fillStyle = satG;
            ctx.beginPath(); ctx.arc(sx, sy, satRadius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === The Dot ===
        let dsRender = ds + Math.sin(this.time * 1.8) * 3 * (0.3 + energy * 0.7);
        if (!isFinite(dsRender)) dsRender = ds;
        const dotHue = (hue + this.time * 5) % 360;

        // Outer aura
        const auraR1 = Math.max(0.1, dsRender * 0.5);
        const auraR2 = Math.max(auraR1 + 0.1, dsRender * 5 + energy * dsRender * 3);
        const auraGrad = ctx.createRadialGradient(cx, cy, auraR1, cx, cy, auraR2);
        auraGrad.addColorStop(0, `hsla(${dotHue},80%,70%,${0.12 + energy * 0.12})`);
        auraGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = auraGrad;
        ctx.beginPath(); ctx.arc(cx, cy, dsRender * 5 + energy * dsRender * 3, 0, Math.PI * 2); ctx.fill();

        // Core dot
        const dotRadius = Math.max(0.1, dsRender);
        const dotGrad = ctx.createRadialGradient(cx - dsRender * 0.3, cy - dsRender * 0.3, 0, cx, cy, dotRadius);
        dotGrad.addColorStop(0, `rgba(255,255,255,${0.95 + this.dotPulse * 0.05})`);
        dotGrad.addColorStop(0.4, `hsla(${dotHue},80%,75%,${0.9 + energy * 0.1})`);
        dotGrad.addColorStop(1, `hsla(${dotHue},90%,50%,0.85)`);
        ctx.fillStyle = dotGrad;
        ctx.beginPath(); ctx.arc(cx, cy, dsRender, 0, Math.PI * 2); ctx.fill();

        // Crosshair (ultra-thin, minimalist)
        const crossLen = 25 + energy * 15;
        ctx.strokeStyle = `hsla(${dotHue},50%,70%,${0.2 + energy * 0.15})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - crossLen, cy); ctx.lineTo(cx + crossLen, cy);
        ctx.moveTo(cx, cy - crossLen); ctx.lineTo(cx, cy + crossLen);
        ctx.stroke();
    }
}
