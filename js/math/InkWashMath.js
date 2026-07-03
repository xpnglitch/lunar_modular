import { PhysicsCore } from './PhysicsCore.js';

/**
 * InkWashMath — Simulates organic ink dispersion (Sumi-e style).
 * MIDI notes act as "brushes" that drop ink into a fluid virtual medium.
 * Blobs expand, diffuse, and drift via low-frequency flow fields.
 */
export class InkWashMath {
    constructor() {
        this.blobs = [];
        this.maxBlobs = 150;
        this.reset();
    }

    reset() {
        this.blobs = [];
    }

    /**
     * Update the ink dispersion simulation.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        // 1. Emit ink from active notes
        for (const note of notes) {
            // Frequency of drops depends on velocity and entropy/complexity
            if (Math.random() < 0.1 + note.velocity * 0.2) {
                this.blobs.push(this._createBlob(note, intensity, complexity));
            }
        }

        // 2. Update existing blobs
        for (let i = this.blobs.length - 1; i >= 0; i--) {
            const b = this.blobs[i];

            // Radial expansion (The "Bleed" effect)
            b.radius += b.expansionSpeed * dt * (1 + intensity * 2);
            
            // Organic drift (Flow field)
            const angle = Math.sin(b.y * 0.002 + time * 0.2) * Math.PI * 2 + 
                          Math.cos(b.x * 0.002 - time * 0.1) * Math.PI;
            
            b.x += Math.cos(angle) * b.driftSpeed * dt;
            b.y += Math.sin(angle) * b.driftSpeed * dt;

            // Fade/Decay
            b.life -= dt * (0.15 + b.decayRate * 0.2);

            // Diffusion (The blob becomes more transparent as it expands)
            b.opacity = Math.max(0, b.life * (1.0 / (1 + b.radius * 0.01)));

            if (b.life <= 0 || b.opacity <= 0.01) {
                this.blobs.splice(i, 1);
            }
        }

        // Cap density
        if (this.blobs.length > this.maxBlobs) {
            this.blobs.splice(0, this.blobs.length - this.maxBlobs);
        }
    }

    _createBlob(note, intensity, complexity) {
        // Map frequency to a wide hue spread — each note gets a distinct color
        const freqHue = (Math.log2(note.frequency / 20) / 10) * 360;
        return {
            x: note.x,
            y: note.y,
            radius: 2 + Math.random() * 10,
            expansionSpeed: 20 + Math.random() * 40 * complexity,
            driftSpeed: 10 + Math.random() * 30 * intensity,
            decayRate: Math.random(),
            life: 1.0 + Math.random() * 2.5,
            opacity: 1.0,
            hueOffset: freqHue + (Math.random() - 0.5) * 15 // Frequency-driven color, slight variation
        };
    }
}
