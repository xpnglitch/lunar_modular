import { GlowWormMath } from '../math/GlowWormMath.js';

/**
 * GlowWormMode — Bioluminescent organism visualization
 * Multi-segment articulated worm bodies with undulating motion,
 * pulsing bioluminescent organs, atmospheric glow trails, 
 * and environmental light scatter.
 */
export class GlowWormMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.gMath = new GlowWormMath();
        this.width = 0;
        this.height = 0;
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.gMath.addWorm(noteInfo.normalizedPosition, 0.4 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}
    getAudioModulation() { return this.gMath.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const time = this.gMath.time;

        this.gMath.step(dt, complexity, speed, lightPressure);

        ctx.globalCompositeOperation = 'screen';

        for (const worm of this.gMath.worms) {
            const wHue = (hue + worm.hue) % 360;
            const wAlpha = (0.2 + worm.energy * intensity) * worm.life;
            const history = worm.history;
            if (history.length < 2) continue;

            // --- LAYER 1: Atmospheric glow trail (wide, soft, persistent) ---
            ctx.beginPath();
            ctx.moveTo(history[0].x * w, history[0].y * h);
            for (let i = 1; i < history.length; i++) {
                ctx.lineTo(history[i].x * w, history[i].y * h);
            }
            ctx.strokeStyle = `hsla(${wHue}, 70%, 60%, ${wAlpha * 0.06})`;
            ctx.lineWidth = 24 + worm.energy * 40;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Medium glow
            ctx.strokeStyle = `hsla(${wHue}, 80%, 70%, ${wAlpha * 0.12})`;
            ctx.lineWidth = 10 + worm.energy * 16;
            ctx.stroke();

            // --- LAYER 2: Segmented body with thickness variation ---
            for (let i = 1; i < history.length; i++) {
                const prev = history[i - 1];
                const curr = history[i];
                const segRatio = i / history.length; // 0=tail, 1=head
                const thickness = (2 + worm.energy * 8) * (0.3 + segRatio * 0.7);

                // Body segment
                ctx.beginPath();
                ctx.moveTo(prev.x * w, prev.y * h);
                ctx.lineTo(curr.x * w, curr.y * h);

                const segHue = (wHue + (1 - segRatio) * 30) % 360;
                const segAlpha = wAlpha * (0.3 + segRatio * 0.7);
                ctx.strokeStyle = `hsla(${segHue}, 80%, 65%, ${segAlpha})`;
                ctx.lineWidth = thickness;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Bioluminescent organ pulses along body
                if (i % 3 === 0 && complexity > 0.3) {
                    const pulse = 0.5 + 0.5 * Math.sin(time * 4 + i * 1.5 + worm.hue);
                    const organAlpha = segAlpha * pulse * 0.4;
                    const organR = thickness * 1.5 + pulse * 3;
                    const ox = curr.x * w;
                    const oy = curr.y * h;

                    const organGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, organR);
                    organGrad.addColorStop(0, `hsla(${(segHue + 40) % 360}, 90%, 85%, ${organAlpha})`);
                    organGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = organGrad;
                    ctx.beginPath();
                    ctx.arc(ox, oy, organR, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // --- LAYER 3: Head with bright core and antenna feelers ---
            const headX = worm.x * w;
            const headY = worm.y * h;
            const headSize = 5 + worm.energy * 14;
            const headAlpha = wAlpha;

            // Outer head glow
            const headGlowR = headSize * 6;
            const headGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, headGlowR);
            headGrad.addColorStop(0, `hsla(${wHue}, 90%, 85%, ${headAlpha * 0.3})`);
            headGrad.addColorStop(0.3, `hsla(${wHue}, 80%, 70%, ${headAlpha * 0.1})`);
            headGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(headX, headY, headGlowR, 0, Math.PI * 2);
            ctx.fill();

            // Bright head core
            ctx.beginPath();
            ctx.arc(headX, headY, headSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${wHue}, 90%, 95%, ${headAlpha * 0.8})`;
            ctx.fill();

            // Antenna feelers
            if (complexity > 0.4) {
                const angle = worm.angle;
                for (let a = -1; a <= 1; a += 2) {
                    const feelerAngle = angle + a * 0.5 + Math.sin(time * 3 + worm.hue + a) * 0.3;
                    const feelerLen = 8 + worm.energy * 15;
                    const fx = headX + Math.cos(feelerAngle) * feelerLen;
                    const fy = headY + Math.sin(feelerAngle) * feelerLen;

                    ctx.beginPath();
                    ctx.moveTo(headX, headY);
                    ctx.quadraticCurveTo(
                        headX + Math.cos(feelerAngle + a * 0.2) * feelerLen * 0.5,
                        headY + Math.sin(feelerAngle + a * 0.2) * feelerLen * 0.5,
                        fx, fy
                    );
                    ctx.strokeStyle = `hsla(${(wHue + 20) % 360}, 80%, 80%, ${headAlpha * 0.4})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();

                    // Antenna tip glow
                    ctx.beginPath();
                    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${(wHue + 40) % 360}, 90%, 90%, ${headAlpha * 0.5})`;
                    ctx.fill();
                }
            }

            // --- LAYER 4: Environmental light scatter (proximity glow on nearby surfaces) ---
            if (worm.energy > 0.3) {
                const scatterR = 40 + worm.energy * 60;
                const scatterGrad = ctx.createRadialGradient(headX, headY, 0, headX, headY, scatterR);
                scatterGrad.addColorStop(0, `hsla(${wHue}, 60%, 50%, ${wAlpha * 0.04})`);
                scatterGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = scatterGrad;
                ctx.beginPath();
                ctx.arc(headX, headY, scatterR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Light-Pressure food source visualization ---
        if (lightPressure.force > 0.1) {
            const px = lightPressure.x * w;
            const py = lightPressure.y * h;
            const foodR = 20 + lightPressure.force * 40;
            const pulse = 0.5 + 0.5 * Math.sin(time * 5);

            const foodGrad = ctx.createRadialGradient(px, py, 0, px, py, foodR);
            foodGrad.addColorStop(0, `hsla(${(hue + 60) % 360}, 80%, 80%, ${lightPressure.force * pulse * 0.15})`);
            foodGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = foodGrad;
            ctx.beginPath();
            ctx.arc(px, py, foodR, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
