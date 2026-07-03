import { MandalaMath } from '../math/MandalaMath.js';

/**
 * MandalaMode — Recursive Symmetry and Fractal Geometry.
 * Intricate lace-like patterns with geodesic connections, concentric
 * ring structures, gradient-filled geometric shapes, and pulsing
 * energy veins that create a living sacred geometry field.
 */
export class MandalaMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mMath = new MandalaMath();
    }

    resize(w, h) {
        this.mMath.reset();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.mMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        const seeds = this.mMath.seeds;
        const sides = this.mMath.sides;
        const rotation = this.mMath.rotation;

        // High-contrast void
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rotation);

        // --- LAYER 1: Concentric guide rings ---
        const maxR = Math.min(w, h) * 0.45;
        const ringCount = 5 + Math.floor(complexity * 6);
        for (let r = 0; r < ringCount; r++) {
            const ringR = maxR * ((r + 1) / ringCount);
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.5 + r * 0.8);
            const ringAlpha = 0.04 + intensity * 0.06 * pulse;
            const rHue = (hue + r * 15) % 360;

            ctx.beginPath();
            ctx.arc(0, 0, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${rHue}, 70%, 60%, ${ringAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // --- LAYER 2: Radial symmetry slices ---
        for (let i = 0; i < sides; i++) {
            const isMirror = i % 2 === 0;
            ctx.save();
            ctx.rotate((i * Math.PI * 2) / sides);
            if (isMirror) ctx.scale(1, -1);

            // --- LAYER 2a: Geodesic connection web ---
            ctx.beginPath();
            for (let s = 0; s < seeds.length; s++) {
                const seed = seeds[s];
                const x = Math.cos(seed.theta) * seed.r;
                const y = Math.sin(seed.theta) * seed.r;

                // Connect to nearby seeds
                for (let s2 = s + 1; s2 < seeds.length && s2 < s + 5; s2++) {
                    const seed2 = seeds[s2];
                    const x2 = Math.cos(seed2.theta) * seed2.r;
                    const y2 = Math.sin(seed2.theta) * seed2.r;
                    const dist = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);

                    if (dist < 200) {
                        const lineAlpha = (1 - dist / 200) * Math.min(seed.life, seed2.life) * 0.15 * (0.3 + intensity * 0.7);
                        if (lineAlpha > 0.01) {
                            const lHue = (hue + (seed.hueOffset + seed2.hueOffset) / 2 + 360) % 360;
                            ctx.strokeStyle = `hsla(${lHue}, 70%, 60%, ${lineAlpha})`;
                            ctx.lineWidth = 0.3 + intensity * 0.5;
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            // Curved connection via midpoint offset
                            const mx = (x + x2) / 2 + Math.sin(time + s) * 10;
                            const my = (y + y2) / 2 + Math.cos(time + s) * 10;
                            ctx.quadraticCurveTo(mx, my, x2, y2);
                            ctx.stroke();
                        }
                    }
                }
            }

            // --- LAYER 2b: Filled geometric shapes at seed positions ---
            for (const seed of seeds) {
                const x = Math.cos(seed.theta) * seed.r;
                const y = Math.sin(seed.theta) * seed.r;
                const alpha = seed.life * (0.15 + intensity * 0.5);
                const pHue = (hue + seed.hueOffset + 360) % 360;
                const size = seed.size * (0.5 + intensity * 0.5);

                if (alpha < 0.02) continue;

                // Determine shape type based on seed distance from center
                const distRatio = seed.r / 500;
                const shapeType = Math.floor(distRatio * 3) % 3;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(time * 0.3 + seed.hueOffset * 0.1);

                if (shapeType === 0) {
                    // Diamond
                    ctx.beginPath();
                    ctx.moveTo(0, -size); ctx.lineTo(size, 0);
                    ctx.lineTo(0, size); ctx.lineTo(-size, 0);
                    ctx.closePath();
                } else if (shapeType === 1) {
                    // Hexagon
                    ctx.beginPath();
                    for (let v = 0; v < 6; v++) {
                        const a = (v / 6) * Math.PI * 2;
                        if (v === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
                        else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
                    }
                    ctx.closePath();
                } else {
                    // Circle
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                }

                // Gradient fill
                const fillGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                fillGrad.addColorStop(0, `hsla(${pHue}, 90%, 80%, ${alpha * 0.6})`);
                fillGrad.addColorStop(1, `hsla(${pHue}, 70%, 50%, ${alpha * 0.15})`);
                ctx.fillStyle = fillGrad;
                ctx.fill();

                // Edge stroke
                ctx.strokeStyle = `hsla(${pHue}, 100%, 85%, ${alpha * 0.8})`;
                ctx.lineWidth = 0.8 + intensity * 1.5;
                ctx.stroke();

                // Inner dot
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${pHue}, 100%, 95%, ${alpha * 0.7})`;
                ctx.fill();

                ctx.restore();
            }

            ctx.restore();
        }

        // --- LAYER 3: Energy veins (radial pulsing lines from center) ---
        const veinCount = sides;
        for (let v = 0; v < veinCount; v++) {
            const vAngle = rotation + (v / veinCount) * Math.PI * 2;
            const pulse = 0.5 + 0.5 * Math.sin(time * 2 + v * 1.7);
            const vLen = maxR * (0.3 + pulse * 0.7);
            const vAlpha = intensity * 0.08 * pulse;
            const vHue = (hue + v * 20) % 360;

            // Glow line
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(vAngle) * vLen, Math.sin(vAngle) * vLen);
            ctx.strokeStyle = `hsla(${vHue}, 80%, 75%, ${vAlpha})`;
            ctx.lineWidth = 1.5 + intensity * 3;
            ctx.stroke();

            // Wide glow
            ctx.strokeStyle = `hsla(${vHue}, 80%, 75%, ${vAlpha * 0.3})`;
            ctx.lineWidth = 8 + intensity * 10;
            ctx.stroke();
        }

        // --- LAYER 4: Central mandala core ---
        const coreR = 20 + intensity * 30;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
        coreGrad.addColorStop(0, `hsla(${hue}, 100%, 95%, ${0.4 + intensity * 0.4})`);
        coreGrad.addColorStop(0.3, `hsla(${hue}, 90%, 75%, 0.15)`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Core inner ring
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${0.2 + intensity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
    }

    getAudioModulation() {
        return {
            harmonicity: 0.5 + this.math.get('complexity') * 4.0,
            modulationIndex: 1.0 + this.math.get('intensity') * 20,
            oscType: 'sine'
        };
    }
}
