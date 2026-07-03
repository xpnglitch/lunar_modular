/**
 * ExoplanetMath — Volcanic Gas Giant Physics.
 * Manages atmospheric band rotation, volcanic heat-maps, and ring dynamics.
 * Musical notes trigger "coronal mass ejections" and lightning storms.
 */
export class ExoplanetMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.stormEnergy = 0;
        this.initialized = false;
        this.bands = [];
        this.volcanoes = [];
    }

    /**
     * Trigger a surface event from a musical note.
     */
    addPulse(x, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.5);
        this.stormEnergy = Math.min(2.0, this.stormEnergy + vel * 0.8);
        
        // Spawn a localized volcanic eruption
        this.volcanoes.push({
            angle: Math.random() * Math.PI * 2,
            latitude: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75
            life: 1.0,
            vel: vel
        });
    }

    /**
     * Progress the atmospheric physics.
     */
    step(dt, complexity) {
        if (!this.initialized) {
            // Initialize atmospheric bands
            for (let i = 0; i < 10; i++) {
                this.bands.push({
                    y: -1 + (i / 9) * 2,
                    speed: (Math.random() - 0.5) * 0.1,
                    offset: Math.random() * 10
                });
            }
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.96;
        this.stormEnergy *= 0.94;

        // Progress volcanoes
        for (let i = this.volcanoes.length - 1; i >= 0; i--) {
            this.volcanoes[i].life -= dt * (0.5 + (1-complexity) * 1.0);
            if (this.volcanoes[i].life <= 0) this.volcanoes.splice(i, 1);
        }

        // Limit volcano count
        if (this.volcanoes.length > 20) this.volcanoes.shift();
    }

    getAudioModulation() {
        return {
            resonance: 0.1 + this.energy * 0.5,
            modulation: this.stormEnergy * 0.4
        };
    }
}
