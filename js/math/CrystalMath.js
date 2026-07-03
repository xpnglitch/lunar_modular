/**
 * CrystalMath — Hypnotic Prism Array Physics.
 * Simulates the rotation, refraction, and angular momentum 
 * of a multi-faceted geometric prism field.
 */
export class CrystalMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.flashIntensity = 0;
        this.angularMomentum = 0.2;
        this.initialized = false;
    }

    /**
     * Shatter nearby crystals or inject high-frequency flash energy.
     */
    addPulse(normalizedX, energy) {
        this.energy = Math.min(2.0, this.energy + energy * 0.9);
        this.flashIntensity = Math.min(1.0, this.flashIntensity + energy * 0.7);
        this.angularMomentum = Math.min(2.0, this.angularMomentum + energy * 1.5);
    }

    /**
     * Step the prism field simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt * speed;
        this.energy *= 0.94;
        this.flashIntensity *= 0.96;
        this.angularMomentum *= 0.97;
        this.angularMomentum = Math.max(0.2, this.angularMomentum); // Constant slow rotation

        // Interaction with complexity: more complex lattices spin with more friction
        const friction = 0.94 - complexity * 0.05;
        this.angularMomentum *= (friction + (1 - friction) * (1 - dt)); 

        // Handle light pressure perturbation
        if (lightPressure.force > 0.1) {
            this.angularMomentum = Math.min(2.0, this.angularMomentum + lightPressure.force * 0.2);
        }
    }

    getAudioModulation() {
        return {
            refractionWhimmer: Math.min(1, this.energy * 2),
            specularBloom: this.flashIntensity,
            prismSpin: this.angularMomentum
        };
    }
}
