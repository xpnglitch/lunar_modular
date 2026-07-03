import { StardustMath } from '../math/StardustMath.js';

/**
 * StardustMode — Kinetic cosmic dust cloud visualization
 * Multi-layered particle rendering with volumetric dust haze, 
 * velocity-based comet trails, energy nebula cores, and 
 * twinkling star-birth highlights.
 */
export class StardustMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.sMath = new StardustMath();
        this.width = 0;
        this.height = 0;
        // Ambient background star field
        this.bgStars = [];
        for (let i = 0; i < 500; i++) {
            this.bgStars.push({
                x: Math.random(), y: Math.random(),
                size: 0.3 + Math.random() * 1.2,
                brightness: 0.2 + Math.random() * 0.5,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.5 + Math.random() * 2
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.sMath.addParticles(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}
    getAudioModulation() { return this.sMath.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const time = this.sMath.time;

        this.sMath.step(dt, complexity, speed, lightPressure);

        // --- LAYER 1: Background star field with twinkle ---
        for (const s of this.bgStars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
            const alpha = s.brightness * twinkle * (0.3 + intensity * 0.3);
            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- LAYER 2: Volumetric dust haze (large soft clouds from particle clusters) ---
        // Group nearby particles into density clusters
        const particles = this.sMath.particles;
        const clusterSize = 0.12;
        const clusters = [];
        const visited = new Set();

        for (let i = 0; i < particles.length; i++) {
            if (visited.has(i)) continue;
            const p = particles[i];
            let cx = p.x, cy = p.y, count = 1, totalEnergy = p.energy;

            for (let j = i + 1; j < particles.length; j++) {
                if (visited.has(j)) continue;
                const q = particles[j];
                if (Math.abs(q.x - p.x) < clusterSize && Math.abs(q.y - p.y) < clusterSize) {
                    cx += q.x; cy += q.y;
                    totalEnergy += q.energy;
                    count++;
                    visited.add(j);
                }
            }
            visited.add(i);
            if (count >= 2) {
                clusters.push({ x: cx / count, y: cy / count, size: count, energy: totalEnergy / count });
            }
        }

        for (const cl of clusters) {
            const cx = cl.x * w;
            const cy = cl.y * h;
            const cloudR = (30 + cl.size * 15) * (0.5 + intensity * 0.5);
            const cHue = (hue + cl.energy * 60) % 360;
            const cAlpha = Math.min(0.15, cl.energy * 0.08 * cl.size);

            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudR);
            grad.addColorStop(0, `hsla(${cHue}, 60%, 60%, ${cAlpha})`);
            grad.addColorStop(0.5, `hsla(${cHue}, 50%, 40%, ${cAlpha * 0.4})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, cloudR, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 3: Particle comet trails (velocity-based arc trails) ---
        for (const p of particles) {
            const px = p.x * w;
            const py = p.y * h;
            const pHue = (hue + p.hue) % 360;
            const speed2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const pAlpha = (0.2 + p.energy * intensity) * p.life;

            if (speed2 > 0.02 && pAlpha > 0.05) {
                const trailLen = Math.min(speed2 * 80, 40);
                const angle = Math.atan2(p.vy, p.vx);

                // Comet tail gradient
                const tx = px - Math.cos(angle) * trailLen;
                const ty = py - Math.sin(angle) * trailLen;
                const tGrad = ctx.createLinearGradient(tx, ty, px, py);
                tGrad.addColorStop(0, 'transparent');
                tGrad.addColorStop(1, `hsla(${pHue}, 80%, 75%, ${pAlpha * 0.6})`);

                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(px, py);
                ctx.strokeStyle = tGrad;
                ctx.lineWidth = Math.max(0.5, p.size * 0.6);
                ctx.stroke();

                // Wide glow trail
                ctx.strokeStyle = `hsla(${pHue}, 70%, 65%, ${pAlpha * 0.1})`;
                ctx.lineWidth = p.size * 3;
                ctx.stroke();
            }
        }

        // --- LAYER 4: Particle cores with size/energy variation ---
        for (const p of particles) {
            const px = p.x * w;
            const py = p.y * h;
            const pHue = (hue + p.hue) % 360;
            const pAlpha = (0.3 + p.energy * intensity) * p.life;
            const size = Math.max(0.3, (p.size + p.energy * 4) * (0.5 + intensity * 0.5));

            if (pAlpha < 0.03) continue;

            // Soft glow envelope
            if (size > 1.5) {
                const glowR = size * 4;
                const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
                glowGrad.addColorStop(0, `hsla(${pHue}, 80%, 80%, ${pAlpha * 0.12})`);
                glowGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(px, py, glowR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${pHue}, 90%, 85%, ${pAlpha})`; 
            ctx.fill();
        }

        // --- LAYER 5: Star-birth sparkle (rare high-energy flashes) ---
        for (const p of particles) {
            if (p.energy > 0.7 && p.life > 0.8) {
                const px = p.x * w;
                const py = p.y * h;
                const pHue = (hue + p.hue) % 360;
                const sparkAlpha = p.energy * p.life * 0.6;
                const sparkSize = 3 + p.energy * 8;

                // Cross-shaped lens flare
                ctx.strokeStyle = `hsla(${pHue}, 90%, 95%, ${sparkAlpha * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(px - sparkSize, py); ctx.lineTo(px + sparkSize, py);
                ctx.moveTo(px, py - sparkSize); ctx.lineTo(px, py + sparkSize);
                ctx.stroke();

                // Bright core flash
                const flashGrad = ctx.createRadialGradient(px, py, 0, px, py, sparkSize * 0.6);
                flashGrad.addColorStop(0, `rgba(255, 255, 255, ${sparkAlpha * 0.5})`);
                flashGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(px, py, sparkSize * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
