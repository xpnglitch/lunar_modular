import { VortexMath } from '../math/VortexMath.js';

/**
 * VortexMode — Spiral gravitational warp visualization
 * Multi-layered spiral arms, accretion disk particles,
 * funnel depth rendering, and dramatic gravity-well cores.
 */
export class VortexMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.vMath = new VortexMath();
        this.width = 0;
        this.height = 0;
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.vMath.addVortex(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}
    getAudioModulation() { return this.vMath.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const reactivity = mathEngine.get('reactivity');
        const time = this.vMath.time;

        this.vMath.step(dt, complexity, speed, lightPressure);

        ctx.globalCompositeOperation = 'screen';

        // --- LAYER 1: Spiral arm structures around each vortex ---
        for (const v of this.vMath.vortices) {
            const vx = v.x * w;
            const vy = v.y * h;
            const vHue = (hue + v.hue) % 360;
            const vAlpha = v.energy * v.life;
            const armCount = 2 + Math.floor(complexity * 3);
            const maxR = (80 + v.energy * 150) * (0.5 + intensity * 0.5) * (0.5 + reactivity);

            for (let arm = 0; arm < armCount; arm++) {
                const baseAngle = (arm / armCount) * Math.PI * 2 + time * v.strength * 0.5;
                ctx.beginPath();

                const segments = 40 + Math.floor(complexity * 30);
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const r = t * maxR;
                    const spiralAngle = baseAngle + t * Math.PI * (1.5 + reactivity * 1) * (v.strength > 0 ? 1 : -1);
                    const sx = vx + Math.cos(spiralAngle) * r;
                    const sy = vy + Math.sin(spiralAngle) * r;

                    if (s === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }

                const armAlpha = vAlpha * (0.15 + intensity * 0.15);
                const armHue = (vHue + arm * 20) % 360;

                // Core arm line
                ctx.strokeStyle = `hsla(${armHue}, 80%, 70%, ${armAlpha})`;
                ctx.lineWidth = 1 + v.energy * 2;
                ctx.stroke();

                // Glow envelope
                ctx.strokeStyle = `hsla(${armHue}, 70%, 60%, ${armAlpha * 0.25})`;
                ctx.lineWidth = 6 + v.energy * 10;
                ctx.stroke();
            }
        }

        // --- LAYER 2: Accretion disk rings ---
        for (const v of this.vMath.vortices) {
            const vx = v.x * w;
            const vy = v.y * h;
            const vHue = (hue + v.hue) % 360;
            const maxR = (60 + v.energy * 100) * (0.5 + intensity * 0.5) * (0.5 + reactivity);

            const ringCount = 3 + Math.floor(complexity * 4);
            for (let r = 0; r < ringCount; r++) {
                const ringR = maxR * (0.3 + r * 0.15);
                const ringAlpha = v.energy * v.life * (0.06 + intensity * 0.06) * (1 - r / ringCount);
                const rHue = (vHue + r * 12) % 360;

                // Elliptical ring (tilted disk perspective)
                ctx.beginPath();
                ctx.ellipse(vx, vy, ringR, ringR * 0.4, time * 0.2 + v.hue, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${rHue}, 70%, 75%, ${ringAlpha})`;
                ctx.lineWidth = 1 + intensity;
                ctx.stroke();
                // Glow
                ctx.strokeStyle = `hsla(${rHue}, 70%, 75%, ${ringAlpha * 0.3})`;
                ctx.lineWidth = 4 + intensity * 4;
                ctx.stroke();
            }
        }

        // --- LAYER 3: Particle trails with spiral motion ---
        for (const p of this.vMath.particles) {
            const px = p.x * w;
            const py = p.y * h;
            const pHue = (hue + p.hue) % 360;
            const speed2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const pAlpha = (0.2 + p.energy * intensity) * p.life;

            if (pAlpha < 0.02) continue;

            // Velocity trail
            const trailLen = Math.min(speed2 * 60, 30);
            if (trailLen > 1) {
                const angle = Math.atan2(p.vy, p.vx);
                const tx = px - Math.cos(angle) * trailLen;
                const ty = py - Math.sin(angle) * trailLen;

                const tGrad = ctx.createLinearGradient(tx, ty, px, py);
                tGrad.addColorStop(0, 'transparent');
                tGrad.addColorStop(1, `hsla(${pHue}, 80%, 75%, ${pAlpha * 0.5})`);
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(px, py);
                ctx.strokeStyle = tGrad;
                ctx.lineWidth = 1 + p.energy * 2;
                ctx.stroke();
            }

            // Particle core
            const size = 1 + p.energy * 3 + speed2 * 2;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${pHue}, 90%, 85%, ${pAlpha})`;
            ctx.fill();
        }

        // --- LAYER 4: Vortex eye cores ---
        for (const v of this.vMath.vortices) {
            const vx = v.x * w;
            const vy = v.y * h;
            const vHue = (hue + v.hue) % 360;
            const coreAlpha = v.energy * v.life;
            const coreR = 15 + v.energy * 30;

            // Outer glow
            const outerGrad = ctx.createRadialGradient(vx, vy, 0, vx, vy, coreR * 3);
            outerGrad.addColorStop(0, `hsla(${vHue}, 80%, 80%, ${coreAlpha * 0.4})`);
            outerGrad.addColorStop(0.3, `hsla(${vHue}, 70%, 60%, ${coreAlpha * 0.15})`);
            outerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(vx, vy, coreR * 3, 0, Math.PI * 2);
            ctx.fill();

            // Dark eye (event horizon feel)
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(vx, vy, coreR * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${coreAlpha * 0.7})`;
            ctx.fill();
            ctx.globalCompositeOperation = 'screen';

            // Bright ring at the edge
            ctx.beginPath();
            ctx.arc(vx, vy, coreR * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${(vHue + 20) % 360}, 100%, 85%, ${coreAlpha * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Pulsing inward ring
            const pulseR = ((time * 2 + v.hue) % 1) * coreR * 1.5;
            const pulseAlpha = (1 - pulseR / (coreR * 1.5)) * coreAlpha * 0.3;
            ctx.beginPath();
            ctx.arc(vx, vy, Math.max(1, pulseR), 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${vHue}, 80%, 80%, ${pulseAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
