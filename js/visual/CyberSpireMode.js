import { CyberSpireMath } from '../math/CyberSpireMath.js';
import { PerspectiveCore } from '../math/PerspectiveCore.js';

/**
 * CyberSpireMode — Generative 3D City Visualization.
 * Draws vertical pillars that growth and pulse with MIDI spectral energy. 
 * High-speed 3D-in-2D vanishing points and depth-sorting provide the "Cyberpunk City" feel.
 */
export class CyberSpireMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.spireMath = new CyberSpireMath();
    }

    resize(w, h) {
        this.spireMath.reset();
    }

    /**
     * Render the neon sprawl.
     */
    render(ctx, w, h, mathEngine, dt) {
        this.spireMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // Black abyss
        ctx.fillStyle = '#000005';
        ctx.fillRect(0, 0, w, h);

        const spires = this.spireMath.spires;
        
        // 1. Perspective Projection of Spires
        const screenFov = Math.min(w, h) * 0.7;
        const projOpts = {
            fov: screenFov,
            center: { x: w / 2, y: h / 2 - h * 0.12 },
            depthOffset: screenFov * 0.4 + complexity * screenFov * 0.3
        };
        const projectedSpires = spires.map(s => {
            const ground = PerspectiveCore.project({ x: s.wx, y: 200, z: s.wz }, projOpts);
            const top = PerspectiveCore.project({ x: s.wx, y: 200 - s.h, z: s.wz }, projOpts);
            return { s, ground, top, z: ground.z };
        });

        // 2. Z-Sorting for Architectural Depth
        PerspectiveCore.zSort(projectedSpires);

        // 3. Render High-Fi Wireframe Spires
        ctx.lineJoin = 'round';
        ctx.lineCap = 'butt';

        for (const p of projectedSpires) {
            const alpha = Math.max(0, 1.0 - p.z / (screenFov * 3)) * (0.3 + intensity * 0.7);
            if (alpha < 0.05) continue;

            const pHue = (hue + p.s.hueOffset) % 360;
            const w = p.s.width * p.ground.scale;

            // Pillar Solid Face (Side)
            const grad = ctx.createLinearGradient(p.ground.x, p.ground.y, p.top.x, p.top.y);
            grad.addColorStop(0, `hsla(${pHue}, 70%, 20%, ${alpha * 0.2})`);
            grad.addColorStop(1, `hsla(${pHue}, 90%, 50%, ${alpha * 0.8})`);
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(p.ground.x - w / 2, p.ground.y);
            ctx.lineTo(p.ground.x + w / 2, p.ground.y);
            ctx.lineTo(p.top.x + w / 2, p.top.y);
            ctx.lineTo(p.top.x - w / 2, p.top.y);
            ctx.closePath();
            ctx.fill();

            // Glowing Edge
            ctx.strokeStyle = `hsla(${pHue}, 100%, 75%, ${alpha})`;
            ctx.lineWidth = 1 + intensity * 2;
            ctx.stroke();

            // Light-Caps (The top pulse)
            if (p.s.h > 150) {
                this._drawSpireCap(ctx, p.top.x, p.top.y, w, pHue, alpha, intensity);
            }
        }
    }

    /**
     * Draws a luminous beacon at the top of tall spires.
     */
    _drawSpireCap(ctx, x, y, width, hue, alpha, intensity) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, width * 3);
        glow.addColorStop(0, `hsla(${hue}, 100%, 95%, ${alpha})`);
        glow.addColorStop(0.4, `hsla(${hue}, 100%, 70%, ${alpha * 0.2})`);
        glow.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, width * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    getAudioModulation() {
        return {
            oscType: 'square',
            filterQ: 5.0 + this.math.get('intensity') * 15,
            bitDepth: 8 // Digital Dreams feel
        };
    }
}
