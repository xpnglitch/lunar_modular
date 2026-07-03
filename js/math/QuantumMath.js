import { PhysicsCore } from './PhysicsCore.js';

/**
 * QuantumMath — Simulates entangled particle pairs.
 * Each particle has a "twin" that mirrors its state instantly.
 */
export class QuantumMath {
    constructor() {
        this.particles = [];
        this.numPairs = 40;
        this.reset();
    }

    reset() {
        this.particles = [];
        for (let i = 0; i < this.numPairs; i++) {
            // Create a parent-child relationship (entangled pair)
            const p1 = this._createParticle();
            const p2 = { ...p1 }; // Start identical
            
            // Mirror position across center
            p2.x = 800 - p1.x;
            p2.y = 600 - p1.y;
            p2.isTwin = true;
            
            p1.twin = p2;
            p2.twin = p1;
            
            this.particles.push(p1, p2);
        }
    }

    _createParticle() {
        return {
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            ax: 0,
            ay: 0,
            life: 1.0,
            hue: Math.random() * 360,
            intensity: 0
        };
    }

    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const globalIntensity = mathEngine.get('intensity');
        
        for (const p of this.particles) {
            if (p.isTwin) continue; // Twins are handled via entanglement

            // 1. Move toward notes (Gravitational influence)
            for (const note of notes) {
                const force = PhysicsCore.applyGravity(p, note, 150 * globalIntensity);
                p.ax += force.fx;
                p.ay += force.fy;
            }

            // 2. Apply Brownian jitter (Quantum fluctuations)
            p.ax += (Math.random() - 0.5) * 0.5;
            p.ay += (Math.random() - 0.5) * 0.5;

            // 3. Physical integration
            PhysicsCore.step(p, 0.95);

            // 4. Entanglement transfer
            PhysicsCore.entangle(p, p.twin, 1.0);
            
            // Synchronize positions (mirroring)
            p.twin.x = 800 - p.x;
            p.twin.y = 600 - p.y;
            
            // Bounds check
            if (p.x < 0 || p.x > 800) p.vx *= -1;
            if (p.y < 0 || p.y > 600) p.vy *= -1;
            
            p.intensity = notes.length > 0 ? 1.0 : p.intensity * 0.95;
        }
    }
}
