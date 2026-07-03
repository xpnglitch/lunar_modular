import { QuantumMath } from '../math/QuantumMath.js';

/**
 * QuantumMode — A representation of non-local entanglement.
 * Particles are rendered in pairs; interacting with one causes its twin to 
 * react identically across the 'Quantum Field'.
 */
export class QuantumMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.quantumMath = new QuantumMath();
    }

    resize(w, h) {
        // No-op: uses internal normalized coordinates scaled during render
    }

    /**
     * Main render loop for Quantum Mode.
     */
    render(ctx, w, h, mathEngine, dt) {
        // Step the simulation
        this.quantumMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // Draw background trail (slight flicker for 'quantum noise')
        const flicker = (Math.random() - 0.5) * 0.02;
        ctx.fillStyle = `rgba(5, 5, 10, ${0.15 + flicker})`;
        ctx.fillRect(0, 0, w, h);

        const particles = this.quantumMath.particles;
        ctx.lineCap = 'round';

        for (let i = 0; i < particles.length; i += 2) {
            const p1 = particles[i];
            const p2 = particles[i+1];

            // Project normalized math units (800x600) to actual screen size
            const x1 = (p1.x / 800) * w;
            const y1 = (p1.y / 600) * h;
            const x2 = (p2.x / 800) * w;
            const y2 = (p2.y / 600) * h;

            // 1. Draw the "Spooky Action" Thread
            // These connections pulse with note intensity
            const entIntensity = p1.intensity * (0.3 + intensity * 0.7);
            if (entIntensity > 0.05) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                
                // Entanglement threads are thinner and more ethereal
                const threadAlpha = entIntensity * 0.12 * (0.5 + complexity * 0.5);
                ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${threadAlpha})`;
                ctx.lineWidth = 0.5 + entIntensity * 2;
                ctx.stroke();

                // Subtle "wave" nodes along the thread
                if (complexity > 0.5) {
                    this._drawThreadNode(ctx, x1, y1, x2, y2, entIntensity, hue);
                }
            }

            // 2. Draw the particles
            this._drawQuantumBound(ctx, x1, y1, p1.intensity, hue);
            // Twin uses complementary hue to emphasize entanglement duality
            this._drawQuantumBound(ctx, x2, y2, p1.intensity, (hue + 180) % 360);
        }
    }

    /**
     * Draws a shimmering node on the entanglement thread.
     */
    _drawThreadNode(ctx, x1, y1, x2, y2, intensity, hue) {
        const time = performance.now() * 0.005;
        const t = (Math.sin(time) + 1) / 2;
        const nx = x1 + (x2 - x1) * t;
        const ny = y1 + (y2 - y1) * t;
        
        ctx.beginPath();
        ctx.arc(nx, ny, 2 * intensity, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${intensity * 0.3})`;
        ctx.fill();
    }

    /**
     * Draws an individual quantum particle with a soft probabilistic glow.
     */
    _drawQuantumBound(ctx, x, y, pIntensity, hue) {
        const size = 1.5 + pIntensity * 4.5;
        
        // Probabilistic Glow (Radial Gradient)
        const glowSize = Math.max(1, size * 4.5);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        grad.addColorStop(0, `hsla(${hue}, 90%, 70%, ${0.25 + pIntensity * 0.4})`);
        grad.addColorStop(0.4, `hsla(${hue}, 80%, 60%, ${0.05 + pIntensity * 0.1})`);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // High-energy core
        if (pIntensity > 0.1) {
            ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${0.4 + pIntensity * 0.6})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getAudioModulation() {
        // Quantum mode modulates FM synthesis for 'shimmering' artifacts
        return {
            fmIndex: 2.0 + this.math.get('intensity') * 10,
            harmonicity: 0.5 + this.math.get('complexity') * 2.0
        };
    }
}
