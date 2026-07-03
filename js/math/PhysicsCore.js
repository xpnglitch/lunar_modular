/**
 * PhysicsCore — Unified physics manager for Harmonia's high-fidelity modes.
 * Centralizes gravity, magnetism, and fluid-like forces to ensure consistency and performance.
 */
export class PhysicsCore {
    /**
     * Calculate gravitational pull from a point (like a MIDI note).
     * @param {Object} particle {x, y, vx, vy}
     * @param {Object} source {x, y, mass}
     * @param {number} G Gravitational constant
     * @param {number} minSmoothing Minimum distance to prevent infinite force
     */
    static applyGravity(particle, source, G = 1.0, minSmoothing = 20) {
        const dx = source.x - particle.x;
        const dy = source.y - particle.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < minSmoothing) return { fx: 0, fy: 0 };

        // Force = G * (m1 * m2) / r^2
        const force = (G * (source.mass || 1)) / distSq;
        
        return {
            fx: (dx / dist) * force,
            fy: (dy / dist) * force
        };
    }

    /**
     * Apply a flow field vector to a particle.
     * @param {Object} particle {x, y, vx, vy}
     * @param {Function} fieldFn (x, y) => {angle, magnitude}
     */
    static applyFlow(particle, fieldFn) {
        const force = fieldFn(particle.x, particle.y);
        return {
            fx: Math.cos(force.angle) * force.magnitude,
            fy: Math.sin(force.angle) * force.magnitude
        };
    }

    /**
     * Synchronize two particles for Quantum Entanglement.
     * If one is modified, the other mirrors it.
     */
    static entangle(p1, p2, ratio = 1.0) {
        // Mirrored velocity transfer
        p2.vx = -p1.vx * ratio;
        p2.vy = -p1.vy * ratio;
        // Positional mirroring happens in the mode's update loop
    }

    /**
     * Simple Euler integration with friction.
     */
    static step(particle, friction = 0.98, timeStep = 1.0) {
        particle.vx += particle.ax || 0;
        particle.vy += particle.ay || 0;
        
        particle.vx *= friction;
        particle.vy *= friction;
        
        particle.x += particle.vx * timeStep;
        particle.y += particle.vy * timeStep;
        
        // Reset acceleration
        particle.ax = 0;
        particle.ay = 0;
    }
}
