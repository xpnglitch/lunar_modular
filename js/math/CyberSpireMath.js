import { PerspectiveCore } from './PerspectiveCore.js';

/**
 * CyberSpireMath — Generative 3D neon architecture.
 * Manages a grid of vertical 'Cyber Spires' that grow and pulsate in 3D 
 * based on MIDI note triggers and amplitude.
 */
export class CyberSpireMath {
    constructor() {
        this.spires = [];
        this.numSpires = 40;
        this.reset();
    }

    /**
     * Initial city layout.
     */
    reset() {
        this.spires = [];
        for (let i = 0; i < this.numSpires; i++) {
            // Distributed city block style
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 600;
            
            this.spires.push({
                wx: Math.cos(angle) * dist,
                wz: Math.sin(angle) * dist,
                h: 20 + Math.random() * 100,
                targetH: 20,
                width: 15 + Math.random() * 25,
                phase: Math.random() * Math.PI * 2,
                hueOffset: Math.random() * 60
            });
        }
    }

    /**
     * Update architectural heights.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        for (const s of this.spires) {
            // 1. Ambient architectural breathing
            s.targetH = 40 + Math.sin(time + s.phase) * 30;

            // 2. MIDI Spike (Reaction to spectral height/note velocity)
            for (const note of notes) {
                // Map note velocity to Spire height
                const distSq = (s.wx - (note.x - 400))**2 + (s.wz - (note.y - 300))**2;
                const influence = Math.max(0, 1.0 - Math.sqrt(distSq) / 400);
                
                if (influence > 0) {
                    s.targetH += influence * (100 + note.velocity * 400) * intensity;
                }
            }

            // High complexity = faster, twitchier towers
            const smoothing = 0.05 + complexity * 0.2;
            s.h += (s.targetH - s.h) * smoothing;

            // Rotate slightly for 'city scan' effect
            const rotationSpeed = complexity * 0.01;
            const nx = s.wx * Math.cos(rotationSpeed) - s.wz * Math.sin(rotationSpeed);
            const nz = s.wx * Math.sin(rotationSpeed) + s.wz * Math.cos(rotationSpeed);
            s.wx = nx;
            s.wz = nz;
        }
    }
}
