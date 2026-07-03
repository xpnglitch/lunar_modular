/**
 * MoireMath — Overlapping periodic pattern superposition
 * Two or more geometric patterns (concentric circles, line grids)
 * overlap with controlled offset to create moiré interference.
 * Notes shift pattern offsets; Dial controls spacing.
 */
export class MoireMath {
    constructor() {
        // Pattern parameters
        this.patternSpacing = 12;     // Base spacing between lines/circles
        this.offsetX = 0;             // Horizontal offset of pattern B
        this.offsetY = 0;             // Vertical offset of pattern B
        this.rotation = 0;            // Rotation of pattern B (radians)
        this.time = 0;

        // Note-driven perturbations
        this.targetOffsetX = 0;
        this.targetOffsetY = 0;
        this.targetRotation = 0;
    }

    /**
     * Perturb the pattern based on a note
     */
    onNote(normalizedPosition, velocity) {
        // Notes shift the overlay pattern
        this.targetOffsetX += (normalizedPosition - 0.5) * velocity * 15;
        this.targetOffsetY += (Math.random() - 0.5) * velocity * 10;
        this.targetRotation += (normalizedPosition - 0.5) * velocity * 0.08;
    }

    /**
     * Update pattern state
     */
    update(dt, complexity) {
        this.time += dt;

        // Pattern spacing varies with complexity
        this.patternSpacing = 8 + (1 - complexity) * 15;

        // Smooth towards target offsets
        this.offsetX += (this.targetOffsetX - this.offsetX) * 0.04;
        this.offsetY += (this.targetOffsetY - this.offsetY) * 0.04;
        this.rotation += (this.targetRotation - this.rotation) * 0.03;

        // Slow drift when idle
        this.targetOffsetX += Math.sin(this.time * 0.15) * dt * 2;
        this.targetRotation += dt * 0.01;

        // Gradual decay back toward center
        this.targetOffsetX *= 0.999;
        this.targetOffsetY *= 0.999;
    }

    /**
     * Get the moiré "beat frequency" for audio coupling
     */
    getAudioModulation() {
        const beatFreq = Math.abs(Math.sin(this.rotation * 5)) * 0.5;
        const density = 1 / Math.max(4, this.patternSpacing);

        return {
            filterMod: beatFreq,
            detuneMod: density * 3,
            harmonics: Math.min(1, Math.abs(this.offsetX) * 0.02),
        };
    }
}
