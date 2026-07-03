/**
 * FireFieldMath — Solar Corona Physics.
 * Simulates the seething surface of a star: convection granulation,
 * magnetic prominence tension, and Coronal Mass Ejection (CME) energy.
 */
export class FireFieldMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.surfaceHeat = 0;
        this.loopTension = 0;
        this.initialized = false;
        this.granules = [];
    }

    /**
     * Trigger a Coronal Mass Ejection (CME) or magnetic snap.
     */
    addPulse(normalizedX, energy) {
        this.energy = Math.min(2.0, this.energy + energy * 0.8);
        this.surfaceHeat = Math.min(1.5, this.surfaceHeat + energy * 0.5);
        this.loopTension = Math.min(1.0, this.loopTension + energy * 0.4);
    }

    /**
     * Step the solar simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized) {
            // Pre-seed some convection granules
            this.granules = Array.from({ length: 40 }, () => ({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.01,
                vy: (Math.random() - 0.5) * 0.01,
                heat: Math.random()
            }));
            this.initialized = true;
        }

        this.time += dt * speed;
        this.energy *= 0.94; // CME decay
        this.surfaceHeat *= 0.98; // General surface cooling
        this.loopTension *= 0.96; // Magnetic relaxation

        // Granule convection physics
        for (const g of this.granules) {
            // Drift based on light pressure and complexity
            if (lightPressure.force > 0) {
                const dx = g.x - lightPressure.x;
                const dy = g.y - lightPressure.y;
                const dist = Math.hypot(dx, dy) + 0.01;
                const force = (lightPressure.force * 0.05) / dist;
                g.vx += dx * force;
                g.vy += dy * force;
            }

            g.vx *= 0.95; g.vy *= 0.95;
            g.x += g.vx * dt; g.y += g.vy * dt;

            // Wrap
            if (g.x < 0) g.x = 1; if (g.x > 1) g.x = 0;
            if (g.y < 0) g.y = 1; if (g.y > 1) g.y = 0;

            // Heat pulsation
            g.heat = 0.5 + 0.5 * Math.sin(this.time * (2 + complexity) + g.x * 10);
        }
    }

    getAudioModulation() {
        return {
            plasmaWhine: Math.min(1, this.energy * 2),
            solarFlux: this.surfaceHeat,
            magneticHum: this.loopTension
        };
    }
}
