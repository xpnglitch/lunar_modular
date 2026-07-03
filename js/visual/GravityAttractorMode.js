import { GravityMath as GravityAttractorMath } from '../math/GravityAttractorMath.js';

/**
 * GravityAttractorMode â€” Multi-point gravity simulation.
 * High-fidelity particle swarm attracted to dynamic physics nodes.
 * Notes create new attractors and pulse current ones.
 */
export class GravityAttractorMode {
    constructor() {
        this.gMath = new GravityAttractorMath(2000);
        this.width = 0;
        this.height = 0;
        this.trailOpacity = 0.03; // Much slower trail fade for persistence
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        // normalizedPosition is a scalar 0-1 (note pitch position)
        const x = 0.15 + noteInfo.normalizedPosition * 0.7; // Spread across middle 70%
        const y = 0.3 + Math.random() * 0.4; // Random vertical position
        this.gMath.addAttractor(x, y, 0.5 + noteInfo.velocity * 2);
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const hue = mathEngine.get('colorHue');

        // Parameter mapping
        const gravity = 0.05 + intensity * 0.1;
        const friction = 0.98 + complexity * 0.015;
        this.gMath.step(dt, intensity, gravity, friction);

        // Slow trail fade - keeps the visual persistent
        ctx.fillStyle = `rgba(0, 0, 0, ${this.trailOpacity})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Particles â€” render as small glowing dots
        for (const pt of this.gMath.particles) {
            const x = pt.x * w;
            const y = pt.y * h;
            const speedSq = pt.vx * pt.vx + pt.vy * pt.vy;
            const speed = Math.sqrt(speedSq) * 100;
            const size = 1.5 + speed * 0.8;

            const ptHue = (hue + pt.hue) % 360;
            const alpha = Math.min(1, 0.3 + speed * 5);

            ctx.fillStyle = `hsla(${ptHue}, 90%, 75%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Attractors (nodes) â€” bright, persistent gravity wells
        for (const att of this.gMath.attractors) {
            let ax = att.x * w;
            let ay = att.y * h;
            let mass = att.mass || 1;

            if (!isFinite(ax) || isNaN(ax)) ax = w / 2;
            if (!isFinite(ay) || isNaN(ay)) ay = h / 2;
            if (!isFinite(mass) || isNaN(mass)) mass = 0.1;

            const radius = Math.max(5, 25 * mass);

            // Outer glow
            const outerGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, radius * 3);
            outerGrad.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.15)`);
            outerGrad.addColorStop(0.5, `hsla(${hue}, 70%, 50%, 0.05)`);
            outerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(ax, ay, radius * 3, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, radius);
            grad.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.5)`);
            grad.addColorStop(0.5, `hsla(${hue}, 90%, 70%, 0.2)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ax, ay, radius, 0, Math.PI * 2);
            ctx.fill();

            // Bright center dot
            ctx.beginPath();
            ctx.arc(ax, ay, 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 95%, 0.7)`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.gMath.clear();
    }

    // Attractor pull → filter, orbital speed → lfoRate, wobble → detune
    getAudioModulation() {
        const t = this.time || 0; const pull = 0.5 + Math.sin(t * 0.15) * 0.4;
        return { filterMod: pull, lfoRate: 0.2 + (1 - pull) * 0.5, detuneMod: Math.sin(t * 0.4) * 0.35 };
    }
}