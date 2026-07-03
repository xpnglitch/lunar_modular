import { HeightmapMath } from '../math/HeightmapMath.js';

/**
 * HeightmapMode — 3D Terrain Fly-through.
 * Minimalist spectral terrain with atmospheric depth fog.
 * Technical, geometric, and focused on perspective depth.
 */
export class HeightmapMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new HeightmapMath();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.mathInstance.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const size = this.mathInstance.gridSize;

        const points = this.mathInstance.getTerrainPoints(w, h, 1.0);

        // Sky Background
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `hsla(${hue}, 80%, 5%, 1)`);
        skyGrad.addColorStop(0.4, `hsla(${hue}, 80%, 15%, 1)`);
        skyGrad.addColorStop(0.5, `hsla(${hue + 40}, 100%, 50%, 1)`); // Horizon line
        skyGrad.addColorStop(1, `hsla(${hue}, 80%, 10%, 1)`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Synthwave Sun
        ctx.globalCompositeOperation = 'lighter';
        const sunRadius = h * 0.15 * (1 + energy * 0.1);
        const sunY = h * 0.45;
        const sunX = w * 0.5;
        
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
        sunGrad.addColorStop(0, `hsla(${hue + 60}, 100%, 70%, 0.9)`);
        sunGrad.addColorStop(0.6, `hsla(${hue + 30}, 100%, 50%, 0.9)`);
        sunGrad.addColorStop(1, `hsla(${hue}, 100%, 40%, 0)`);
        ctx.fillStyle = sunGrad;
        ctx.fill();

        // Sun Glow
        const glowRad = ctx.createRadialGradient(sunX, sunY, sunRadius, sunX, sunY, sunRadius * 3);
        glowRad.addColorStop(0, `hsla(${hue + 40}, 100%, 60%, 0.4)`);
        glowRad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowRad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Terrain Drawing (Back to Front)
        for (let y = size - 2; y >= 0; y--) {
            for (let x = 0; x < size - 1; x++) {
                const i1 = y * size + x;
                const i2 = y * size + (x + 1);
                const i3 = (y + 1) * size + (x + 1);
                const i4 = (y + 1) * size + x;

                const p1 = points[i1];
                const p2 = points[i2];
                const p3 = points[i3];
                const p4 = points[i4];

                // Atmospheric Fog calculation
                const depth = p1.depth; // 0 (near, dark) to 1 (horizon, light)
                const alpha = 0.2 + depth * 0.8;
                const lightness = 10 + depth * 40;
                const hueShift = depth * 40;

                ctx.fillStyle = `hsla(${hue + hueShift}, 80%, ${lightness}%, ${alpha})`;
                ctx.strokeStyle = `hsla(${hue + hueShift}, 100%, ${lightness + 20}%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5 + depth * 1.5;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
                
                ctx.fill();
                ctx.stroke();

                // Occasional wireframe highlight for technical feel
                if (x % 4 === 0 && energy > 0.4) {
                    ctx.strokeStyle = `hsla(${hue + 60}, 100%, 75%, ${energy * 0.2})`;
                    ctx.stroke();
                }
            }
        }
    }
}
