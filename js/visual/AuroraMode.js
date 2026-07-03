/**
 * AuroraMode — High-fidelity Northern Lights (Cinematic Upgrade)
 * Renders multiple shifting curtains using volumetric ray-casting for 
 * realistic texture. Features distinct color banding (Green -> Magenta -> Red),
 * ground reflection, starfield, and horizon atmospheric glow.
 */
import { AuroraMath } from '../math/AuroraMath.js';

export class AuroraMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.auroraMath = new AuroraMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;

        // Starfield
        this.stars = [];

        // Shimmer particles
        this.shimmerParticles = [];
        this.maxShimmer = 200;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;

        this.stars = [];
        for (let i = 0; i < 250; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.8,
                size: 0.3 + Math.random() * 1.8,
                brightness: 0.15 + Math.random() * 0.45,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + Math.random() * 1.5,
                h: 200 + Math.random() * 60
            });
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.auroraMath.addPulse(noteInfo.normalizedPosition, 0.4 + noteInfo.velocity * 0.6);

        const cx = noteInfo.normalizedPosition * this.width;
        for (let i = 0; i < 8 + Math.floor(noteInfo.velocity * 12); i++) {
            if (this.shimmerParticles.length >= this.maxShimmer) break;
            this.shimmerParticles.push({
                x: cx + (Math.random() - 0.5) * 120,
                y: this.height * (0.1 + Math.random() * 0.45),
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 0.4 + 0.2,
                life: 0,
                maxLife: 3 + Math.random() * 4,
                size: 1 + Math.random() * 2,
                hue: (120 + Math.random() * 100) % 360,
            });
        }
    }

    getAudioModulation() { return this.auroraMath.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w; this.height = h;

        const complexity = mathEngine.get('complexity') || 0.5;
        const intensity = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue') || 0;
        const noteCount = mathEngine.noteCount;

        this.auroraMath.update(dt, complexity);

        // --- 1. Background Void & Starfield ---
        ctx.fillStyle = '#00000a';
        ctx.fillRect(0, 0, w, h);

        for (const star of this.stars) {
            star.twinkle += star.twinkleSpeed * dt;
            const twinkle = (Math.sin(star.twinkle) + 1) * 0.5;
            const alpha = star.brightness * (0.4 + twinkle * 0.6);

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${star.h}, 60%, 90%, ${alpha})`;
            ctx.fill();

            if (twinkle > 0.95 && star.size > 1.2) {
                ctx.fillStyle = `hsla(${star.h}, 80%, 95%, ${alpha * 0.2})`;
                ctx.beginPath(); ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2); ctx.fill();
            }
        }

        // --- 2. Horizon / Atmospheric Glow ---
        const hGlow = ctx.createLinearGradient(0, h * 0.4, 0, h);
        hGlow.addColorStop(0, 'transparent');
        hGlow.addColorStop(0.8, `hsla(${(hue + 120) % 360}, 50%, 10%, 0.15)`);
        hGlow.addColorStop(1, `hsla(${(hue + 140) % 360}, 60%, 15%, 0.3)`);
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, 0, w, h);

        // --- 3. Aurora Curtains (Volumetric Ray Pass) ---
        // We render curtains back-to-front
        for (let ci = 0; ci < this.auroraMath.curtains.length; ci++) {
            const curtain = this.auroraMath.curtains[ci];
            const points = curtain.points;
            const curtainHue = (120 + curtain.hueOffset + hue * 0.4) % 360;

            const pathPoints = points.map(p => ({
                x: p.x * w,
                y: (p.y + p.displacement) * h,
                brightness: p.brightness
            }));

            // --- A. Bloom / Glow Pass (Soft Background) ---
            ctx.globalCompositeOperation = 'lighter';
            const drawCurtainCurve = (width, alphaScale) => {
                ctx.beginPath();
                ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                for (let i = 1; i < pathPoints.length - 1; i++) {
                    const cpx = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
                    const cpy = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
                    ctx.quadraticCurveTo(pathPoints[i].x, pathPoints[i].y, cpx, cpy);
                }
                ctx.strokeStyle = `hsla(${curtainHue}, 70%, 60%, ${0.1 * alphaScale * intensity})`;
                ctx.lineWidth = width;
                ctx.stroke();
            };
            drawCurtainCurve(40, 0.4);
            drawCurtainCurve(10, 0.8);

            // --- B. Volumetric Ray Pass (Textured Vertical comb) ---
            // Draw thousands of fine vertical rays along the path
            const rayCount = 180 + Math.floor(intensity * 120);
            for (let r = 0; r < rayCount; r++) {
                const t = r / rayCount;
                const p = this._samplePath(pathPoints, t);
                if (!p) continue;

                const alpha = Math.min(0.7, p.brightness * (0.3 + noteCount * 0.08) * intensity);
                if (alpha < 0.02) continue;

                // Curtain height and banding
                const rayH = h * (0.4 + intensity * 0.3 + p.brightness * 0.3);
                const rayX = p.x;
                const rayY = p.y;

                // Multi-colored vertical gradient (Green -> Purple -> Red tips)
                const grad = ctx.createLinearGradient(rayX, rayY, rayX, rayY + rayH);
                grad.addColorStop(0, `hsla(${curtainHue}, 80%, 75%, 0)`);
                grad.addColorStop(0.1, `hsla(${curtainHue}, 100%, 70%, ${alpha})`); // Bright Green Base
                grad.addColorStop(0.5, `hsla(${(curtainHue + 40) % 360}, 90%, 60%, ${alpha * 0.6})`); // Purple/Magenta Mid
                grad.addColorStop(0.9, `hsla(${(curtainHue + 80) % 360}, 80%, 50%, ${alpha * 0.2})`); // Red Tip
                grad.addColorStop(1, 'transparent');

                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.2 + Math.random() * 1.5;
                ctx.beginPath();
                ctx.moveTo(rayX, rayY);
                ctx.lineTo(rayX, rayY + rayH);
                ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- 4. Ground Reflection ---
        const reflY = h * 0.78;
        const reflAlpha = 0.04 + noteCount * 0.02;
        const reflGrad = ctx.createLinearGradient(0, reflY, 0, h);
        reflGrad.addColorStop(0, 'transparent');
        reflGrad.addColorStop(1, `hsla(${(hue + 140) % 360}, 50%, 15%, ${reflAlpha})`);
        ctx.fillStyle = reflGrad;
        ctx.fillRect(0, reflY, w, h - reflY);

        // --- 5. Shimmer Particles ---
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this.shimmerParticles.length - 1; i >= 0; i--) {
            const p = this.shimmerParticles[i];
            p.x += p.vx; p.y += p.vy;
            p.life += dt;
            if (p.life > p.maxLife) { this.shimmerParticles.splice(i, 1); continue; }

            const fade = 1 - (p.life / p.maxLife);
            const twinkle = (Math.sin(p.life * 4 + p.size) + 1) * 0.5;
            const alpha = fade * 0.6 * twinkle * intensity;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${alpha})`;
            ctx.fill();

            if (alpha > 0.2) {
                const pGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
                pGlow.addColorStop(0, `hsla(${p.hue}, 80%, 75%, ${alpha * 0.4})`);
                pGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = pGlow;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    _samplePath(pathPoints, t) {
        if (!pathPoints.length) return null;
        const idx = t * (pathPoints.length - 1);
        const i = Math.floor(idx);
        const frac = idx - i;
        if (i >= pathPoints.length - 1) return pathPoints[pathPoints.length - 1];
        const p0 = pathPoints[i], p1 = pathPoints[i + 1];
        return {
            x: p0.x + (p1.x - p0.x) * frac,
            y: p0.y + (p1.y - p0.y) * frac,
            brightness: p0.brightness + (p1.brightness - p0.brightness) * frac,
        };
    }
}
