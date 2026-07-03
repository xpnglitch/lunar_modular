import { PhysicsCore } from './PhysicsCore.js';

/**
 * MandalaMath — Simulates recursive radial symmetry (Fractal Geometry).
 * Tracks a series of geometric 'Seeds' that are mirrored across N-fold 
 * symmetry planes. MIDI notes act as "Symmetry Breakers" or "Frequency Nodes", 
 * shifting the radial distribution and rotational velocity.
 */
export class MandalaMath {
    constructor() {
        this.seeds = []; // Original points to be mirrored
        this.maxSeeds = 40;
        this.sides = 8; // N-fold symmetry
        this.rotation = 0;
        this.reset();
    }

    /**
     * Initial geometric state.
     */
    reset() {
        this.seeds = [];
        for (let i = 0; i < this.maxSeeds; i++) {
            this.seeds.push(this._createSeed());
        }
    }

    /**
     * Kaleidoscopic update step.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // 1. Dynamic Symmetry (Complexity shifts the number of sides)
        this.sides = 6 + Math.floor(complexity * 12);
        
        // 2. Global Rotation
        const baseRotationSpeed = 0.2 + intensity * 0.8;
        this.rotation += dt * baseRotationSpeed;

        // 3. Seed Evolution
        for (let i = this.seeds.length - 1; i >= 0; i--) {
            const s = this.seeds[i];

            // Radial Expansion/Contraction
            s.r += s.vr * dt * (1.0 + intensity * 2.0);
            s.theta += s.vTheta * dt * (1.0 + complexity * 1.5);

            // Bounce on radial bounds (Keeping seeds within the geometric frame)
            if (s.r < 50 || s.r > 500) s.vr *= -1;

            // Note influence (Attract seeds to note frequencies)
            for (const note of notes) {
                // Map note velocity to radial intensity
                const noteR = 100 + (note.x / 800) * 400;
                const dr = noteR - s.r;
                s.vr += dr * 0.05 * note.velocity;
            }

            // Life cycle
            s.life -= dt * (0.1 + Math.random() * 0.1);
            if (s.life <= 0) {
                this.seeds[i] = this._createSeed();
            }
        }
    }

    _createSeed() {
        return {
            r: 50 + Math.random() * 400, // Distance from center
            theta: Math.random() * Math.PI * 2, // Angle
            vr: (Math.random() - 0.5) * 50,
            vTheta: (Math.random() - 0.5) * 0.5,
            size: 2 + Math.random() * 8,
            life: 0.5 + Math.random() * 1.5,
            hueOffset: (Math.random() - 0.5) * 60
        };
    }
}
