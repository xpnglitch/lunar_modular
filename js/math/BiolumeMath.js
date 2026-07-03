import { PhysicsCore } from './PhysicsCore.js';

/**
 * BiolumeMath — Simulates deep-sea bioluminescence and organic currents.
 * Particles ('Plankton') drift through a low-velocity fluid field, 
 * glowing brighter as they pass near MIDI activity zones.
 */
export class BiolumeMath {
    constructor() {
        this.particles = [];
        this.maxParticles = 250;
        this.reset();
    }

    reset() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this._createParticle());
        }
    }

    /**
     * Update the plankton swarm.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 1. Fluid Flow (Slow, undulating underwater current)
            // Use sin/cos fields for that 'gentle' drift
            const angle = Math.sin(p.y * 0.005 + time) * 0.5 + 
                          Math.cos(p.x * 0.005 - time * 0.5) * 0.5;
            
            p.vx += Math.cos(angle) * 0.25;
            p.vy += Math.sin(angle) * 0.25;

            // 2. Gentle Gravity (Attraction toward Note Centers)
            for (const note of notes) {
                const force = PhysicsCore.applyGravity(p, note, 200 * intensity, 120);
                p.vx += force.fx;
                p.vy += force.fy;
                
                // Plankton 'excites' when near a note
                const distSq = (p.x - note.x)**2 + (p.y - note.y)**2;
                if (distSq < 15000) {
                    p.energy = Math.min(1.0, p.energy + 0.1);
                }
            }

            // 3. Integration & Life
            PhysicsCore.step(p, 0.95);
            p.energy *= 0.96; // Decay excitation
            p.life -= dt * (0.05 + complexity * 0.1);

            // Warp bounds (Endless ocean)
            if (p.x < -100) p.x = 900;
            if (p.x > 900) p.x = -100;
            if (p.y < -100) p.y = 700;
            if (p.y > 700) p.y = -100;

            // Respawn old particles
            if (p.life <= 0) {
                this.particles[i] = this._createParticle();
            }
        }
    }

    _createParticle() {
        return {
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            ax: 0, ay: 0,
            life: Math.random() * 0.5 + 0.5,
            energy: 0, // Excitation level (0 to 1)
            size: 2 + Math.random() * 6,
            hueOffset: (Math.random() - 0.5) * 30
        };
    }
}
