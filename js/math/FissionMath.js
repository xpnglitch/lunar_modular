import { PhysicsCore } from './PhysicsCore.js';

/**
 * FissionMath — Simulates recursive particle splitting (Chaotic chain reactions).
 * Large particles split into smaller, faster siblings when triggered by 
 * high-intensity MIDI notes.
 */
export class FissionMath {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
        this.reset();
    }

    reset() {
        // Initial "Core" particles
        this.particles = [
            { x: 400, y: 300, vx: 2, vy: 1.5, size: 50, mass: 10, gen: 0, active: 1.0 },
            { x: 400, y: 300, vx: -2, vy: -1.5, size: 50, mass: 10, gen: 0, active: 1.0 }
        ];
    }

    /**
     * Physics step for the chain reaction.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // 1. Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Apply slight Brownian motion
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;

            // Physical integration
            PhysicsCore.step(p, 0.99);

            // Bounds check with bounce
            if (p.x < 0 || p.x > 800) p.vx *= -1;
            if (p.y < 0 || p.y > 600) p.vy *= -1;

            // 2. Collision with MIDI "Activators" triggers fission
            for (const note of notes) {
                const dx = note.x - p.x;
                const dy = note.y - p.y;
                const distSq = dx * dx + dy * dy;
                const collisionRange = 40 + note.velocity * 60;

                if (distSq < collisionRange * collisionRange && p.size > 4 && this.particles.length < this.maxParticles) {
                    this._triggerFission(i, p);
                    break;
                }
            }

            // Passive decay for small particles
            if (p.size < 5) {
                p.active -= dt * 0.1;
                if (p.active <= 0) this.particles.splice(i, 1);
            }
        }

        // Ambient idle state generation
        if (this.particles.length < 15 && Math.random() < 0.05) {
            this.particles.push({
                x: 400 + (Math.random() - 0.5) * 400,
                y: 300 + (Math.random() - 0.5) * 300,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: 20 + Math.random() * 30,
                mass: 8, gen: 0, active: 1.0
            });
        }

        // Limit density based on complexity
        const densityLimit = 100 + complexity * 400;
        if (this.particles.length > densityLimit) {
            this.particles.splice(0, this.particles.length - densityLimit);
        }
    }

    /**
     * Splits one particle into two smaller, high-velocity fragments.
     */
    _triggerFission(idx, p) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.sqrt(p.vx**2 + p.vy**2) + 2) * 1.2;

        const p1 = {
            x: p.x, y: p.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: p.size * 0.65,
            mass: p.mass * 0.5,
            gen: p.gen + 1,
            active: 1.0
        };

        const p2 = {
            x: p.x, y: p.y,
            vx: Math.cos(angle + Math.PI) * speed,
            vy: Math.sin(angle + Math.PI) * speed,
            size: p.size * 0.65,
            mass: p.mass * 0.5,
            gen: p.gen + 1,
            active: 1.0
        };

        // Replace the original with its children
        this.particles.splice(idx, 1, p1, p2);
    }
}
