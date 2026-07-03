import { OrbitMath } from '../math/OrbitMath.js';

/**
 * SolarSystemMode — N-Body Orbital Dynamics.
 * 
 * Gravitational simulation with atmospheric planets, glowing orbital
 * trails, a pulsing corona sun, gravitational field lines, and
 * conjunction flashes. Each note spawns an orbiting body.
 */
export class SolarSystemMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.orbitMath = new OrbitMath();
        this.width = 0;
        this.height = 0;
        // Background stars
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random(), y: Math.random(),
                size: 0.3 + Math.random() * 1,
                brightness: 0.15 + Math.random() * 0.35,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.orbitMath.addBody(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.orbitMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const time = performance.now() * 0.001;

        this.orbitMath.step(dt, complexity, speed, lightPressure);

        const sx = lightPressure.x * w;
        const sy = lightPressure.y * h;

        // --- LAYER 0: Starfield ---
        for (const s of this.stars) {
            const twinkle = 0.3 + 0.7 * Math.sin(time * 1.2 + s.twinkle);
            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 200, 255, ${s.brightness * twinkle * 0.3})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- LAYER 1: Gravitational field lines (subtle radial) ---
        if (complexity > 0.2) {
            const lineCount = 8 + Math.floor(complexity * 16);
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + time * 0.05;
                const len = 60 + lightPressure.force * 200;
                const ex = sx + Math.cos(angle) * len;
                const ey = sy + Math.sin(angle) * len;
                const lineGrad = ctx.createLinearGradient(sx, sy, ex, ey);
                lineGrad.addColorStop(0, `hsla(${hue}, 50%, 60%, ${0.04 + lightPressure.force * 0.04})`);
                lineGrad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(ex, ey);
                ctx.strokeStyle = lineGrad;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // --- LAYER 2: Sun with multi-layer corona ---
        const sunSize = 20 + lightPressure.force * 50;
        const coronaPulse = 0.8 + 0.2 * Math.sin(time * 2);

        // Outer corona haze
        const corona3 = ctx.createRadialGradient(sx, sy, sunSize * 0.5, sx, sy, sunSize * 5);
        corona3.addColorStop(0, `hsla(${hue}, 70%, 60%, ${0.03 * coronaPulse})`);
        corona3.addColorStop(0.5, `hsla(${hue}, 60%, 50%, ${0.015 * coronaPulse})`);
        corona3.addColorStop(1, 'transparent');
        ctx.fillStyle = corona3;
        ctx.beginPath();
        ctx.arc(sx, sy, sunSize * 5, 0, Math.PI * 2);
        ctx.fill();

        // Mid corona
        const corona2 = ctx.createRadialGradient(sx, sy, sunSize * 0.3, sx, sy, sunSize * 2.5);
        corona2.addColorStop(0, `hsla(${hue}, 80%, 75%, ${0.15 + lightPressure.force * 0.2})`);
        corona2.addColorStop(0.5, `hsla(${hue}, 70%, 60%, 0.05)`);
        corona2.addColorStop(1, 'transparent');
        ctx.fillStyle = corona2;
        ctx.beginPath();
        ctx.arc(sx, sy, sunSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner corona
        const corona1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunSize * 1.2);
        corona1.addColorStop(0, `hsla(${hue}, 90%, 95%, ${0.7 + lightPressure.force * 0.3})`);
        corona1.addColorStop(0.3, `hsla(${hue}, 85%, 80%, 0.4)`);
        corona1.addColorStop(0.7, `hsla(${hue}, 80%, 65%, 0.1)`);
        corona1.addColorStop(1, 'transparent');
        ctx.fillStyle = corona1;
        ctx.beginPath();
        ctx.arc(sx, sy, sunSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Hard core
        ctx.beginPath();
        ctx.arc(sx, sy, sunSize * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 97%, 0.9)`;
        ctx.fill();

        // --- LAYER 3: Orbital trails with gradient fade ---
        for (const b of this.orbitMath.bodies) {
            if (b.trail.length < 2) continue;
            const bHue = (hue + b.hue) % 360;
            const bAlpha = (0.2 + b.energy * intensity) * b.life;

            // Draw trail as segments with fading alpha
            for (let i = 1; i < b.trail.length; i++) {
                const t = i / b.trail.length;
                const segAlpha = bAlpha * t * 0.5;
                if (segAlpha < 0.01) continue;

                const x1 = b.trail[i - 1].x * w;
                const y1 = b.trail[i - 1].y * h;
                const x2 = b.trail[i].x * w;
                const y2 = b.trail[i].y * h;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${bHue}, 80%, 70%, ${segAlpha})`;
                ctx.lineWidth = 0.5 + t * (1 + b.energy * 2);
                ctx.stroke();
            }

            // Trail glow (wide, faint)
            if (b.trail.length > 3) {
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x * w, b.trail[0].y * h);
                for (let i = 1; i < b.trail.length; i++) {
                    ctx.lineTo(b.trail[i].x * w, b.trail[i].y * h);
                }
                ctx.strokeStyle = `hsla(${bHue}, 60%, 55%, ${bAlpha * 0.06})`;
                ctx.lineWidth = 4 + b.energy * 6;
                ctx.stroke();
            }
        }

        // --- LAYER 4: Planet bodies with atmosphere ---
        for (const b of this.orbitMath.bodies) {
            const bx = b.x * w;
            const by = b.y * h;
            const bHue = (hue + b.hue) % 360;
            const bAlpha = (0.3 + b.energy * intensity) * b.life;
            const bSize = 3 + b.mass * 8;

            // Atmospheric glow (3 layers)
            const atmo3 = ctx.createRadialGradient(bx, by, 0, bx, by, bSize * 5);
            atmo3.addColorStop(0, `hsla(${bHue}, 70%, 60%, ${bAlpha * 0.06})`);
            atmo3.addColorStop(1, 'transparent');
            ctx.fillStyle = atmo3;
            ctx.beginPath();
            ctx.arc(bx, by, bSize * 5, 0, Math.PI * 2);
            ctx.fill();

            const atmo2 = ctx.createRadialGradient(bx, by, 0, bx, by, bSize * 2.5);
            atmo2.addColorStop(0, `hsla(${bHue}, 85%, 75%, ${bAlpha * 0.2})`);
            atmo2.addColorStop(0.6, `hsla(${bHue}, 75%, 60%, ${bAlpha * 0.05})`);
            atmo2.addColorStop(1, 'transparent');
            ctx.fillStyle = atmo2;
            ctx.beginPath();
            ctx.arc(bx, by, bSize * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Solid planet core
            ctx.beginPath();
            ctx.arc(bx, by, bSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${bHue}, 90%, 85%, ${bAlpha * 0.8})`;
            ctx.fill();

            // Hot core highlight
            ctx.beginPath();
            ctx.arc(bx - bSize * 0.2, by - bSize * 0.2, bSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(bHue + 30) % 360}, 100%, 95%, ${bAlpha * 0.5})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
