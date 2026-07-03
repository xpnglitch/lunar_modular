import { BiolumeMath } from '../math/BiolumeMath.js';

/**
 * BiolumeMode — Organic Deep-Sea Luminescence.
 * Visualizes glowing 'plankton' that pulse with spectral color as they 
 * encounter currents and MIDI energy wells.
 */
export class BiolumeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.biolumeMath = new BiolumeMath();
    }

    resize(w, h) {
        this.biolumeMath.reset();
    }

    /**
     * Render the deep-sea field.
     */
    render(ctx, w, h, mathEngine, dt) {
        this.biolumeMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');

        // Deep oceanic blue/black
        ctx.fillStyle = '#000408';
        ctx.fillRect(0, 0, w, h);

        const particles = this.biolumeMath.particles;

        for (const p of particles) {
            // Project math units to screen
            const sx = (p.x / 800) * w;
            const sy = (p.y / 600) * h;
            
            const pHue = (hue + p.hueOffset + 360) % 360;
            const size = p.size * (0.8 + p.life * 0.2) * (1 + p.energy);
            
            // Total brightness depends on energy (MIDI activation) and life
            const brightness = p.life * (0.35 + p.energy * 0.65) * (0.5 + intensity * 0.5);
            
            if (brightness < 0.01) continue;

            // 1. Particle Atmospheric Glow (Soft)
            const glowSize = Math.max(1, size * 7);
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
            grad.addColorStop(0, `hsla(${pHue}, 100%, 70%, ${brightness * 0.3})`);
            grad.addColorStop(0.5, `hsla(${pHue}, 90%, 50%, ${brightness * 0.1})`);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // 2. High-energy Organic Core
            // The core only appears when 'activated' or high life
            if (p.energy > 0.05 || p.life > 0.8) {
                const coreAlpha = brightness * 0.6;
                ctx.fillStyle = `hsla(${pHue}, 100%, 95%, ${coreAlpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Subtle biolume trail (Ghosting)
                ctx.strokeStyle = `hsla(${pHue}, 100%, 80%, ${coreAlpha * 0.2})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - p.vx * 3, sy - p.vy * 3);
                ctx.stroke();
            }
        }

        // Draw light rays (Atmospheric scattering)
        this._drawLightRays(ctx, w, h, hue, intensity);
    }

    /**
     * Draws ethereal light rays descending from the surface.
     */
    _drawLightRays(ctx, w, h, hue, intensity) {
        const time = performance.now() * 0.001;
        const numRays = 5;
        
        ctx.globalAlpha = 0.05 + intensity * 0.05;
        for (let i = 0; i < numRays; i++) {
            const rx = (0.2 + (i/numRays) * 0.6 + Math.sin(time + i) * 0.1) * w;
            const rWidth = 100 + Math.sin(time * 0.5 + i) * 50;
            
            const rayGrad = ctx.createLinearGradient(rx, 0, rx + rWidth, 0);
            rayGrad.addColorStop(0, 'transparent');
            rayGrad.addColorStop(0.5, `hsla(${hue}, 80%, 70%, 0.4)`);
            rayGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(rx - rWidth, 0);
            ctx.lineTo(rx + rWidth, 0);
            ctx.lineTo(rx + rWidth * 0.5, h);
            ctx.lineTo(rx - rWidth * 0.5, h);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    getAudioModulation() {
        return {
            resonance: 0.1 + this.math.get('complexity') * 0.8,
            cutoff: 800 + this.math.get('intensity') * 8000
        };
    }
}
