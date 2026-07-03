/**
 * CrystalGrowthMath — Prismatic Lattice Nucleation Physics.
 * Simulates hexagonal crystal lattice structures growing through
 * nutrient fields, tracking facet tension and refraction energy.
 */
export class CrystalGrowthMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.nutrientLevel = 0.5;
        this.nucleationForce = 0;
        this.initialized = false;
        this.latticeSeeds = [];
    }

    /**
     * Trigger a new nucleation event or explosive growth pulse.
     */
    addPulse(normalizedX, energy) {
        this.energy = Math.min(1.5, this.energy + energy * 0.8);
        this.nucleationForce = Math.min(1.0, this.nucleationForce + energy * 0.6);
        this.nutrientLevel = Math.min(1.0, this.nutrientLevel + energy * 0.2);
    }

    /**
     * Step the mineral simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt * speed;
        this.energy *= 0.94;
        this.nucleationForce *= 0.96;
        this.nutrientLevel = 0.5 + (0.5 * this.energy); // Notes enrich the growth field

        // Standard interaction: complexity increases growth speed/density
        const growthRate = (0.2 + complexity * 0.8) * speed;
        
        // Handle light pressure interaction
        if (lightPressure.force > 0.1) {
            this.nucleationForce = Math.min(1.0, this.nucleationForce + lightPressure.force * 0.1);
        }
    }

    getAudioModulation() {
        return {
            crystalBrilliance: Math.min(1, this.energy * 2),
            latticeDensity: this.nutrientLevel,
            refractionFlicker: this.nucleationForce
        };
    }
}
