/**
 * GalacticSpiralMath — Spiral galaxy rotation
 */
export class GalacticSpiralMath {
    constructor() {
        this.time = 0;
        this.pulses = [];
        this.energy = 0;
    }

    addPulse(normalizedX, energy) {
        this.pulses.push({ x: normalizedX, energy, age: 0 });
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity) {
        this.time += dt;
        this.energy *= 0.94; // Decay
        
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            this.pulses[i].age += dt;
            if (this.pulses[i].age > 3.0) {
                this.pulses.splice(i, 1);
            }
        }
    }

    getAudioModulation() {
        return {
            filterMod: Math.min(1, this.energy * 2.5),
            detuneMod: Math.min(1, this.pulses.length * 0.12),
            harmonics: Math.min(1, this.energy * 1.5)
        };
    }
}
