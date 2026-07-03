/**
 * NeonPulseMath — Cyberpunk Metropolis Physics.
 * Simulates atmospheric rain density, neon sign flickering, 
 * and high-energy "data-burst" sky flashes in a digital cityscape.
 */
export class NeonPulseMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.rainIntensity = 0.2;
        this.flickerState = 0;
        this.initialized = false;
        this.signStates = [];
    }

    /**
     * Trigger a new neon burst or sign sequence.
     */
    addPulse(x, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.6);
        this.rainIntensity = Math.min(1.0, this.rainIntensity + vel * 0.2);
        
        // Randomly activate sign states
        for (let i = 0; i < this.signStates.length; i++) {
            if (Math.random() < vel * 0.3) {
                this.signStates[i].active = true;
                this.signStates[i].timer = 0.5 + Math.random() * 0.5;
            }
        }
    }

    /**
     * Progress the atmospheric physics.
     */
    step(dt, complexity, speed) {
        if (!this.initialized) {
            this.signStates = Array.from({ length: 24 }, () => ({
                active: false,
                timer: 0,
                hueShift: (Math.random() - 0.5) * 40
            }));
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.94;
        this.rainIntensity = 0.2 + (0.8 * this.energy);
        this.flickerState = Math.sin(this.time * 40) * 0.5 + 0.5;

        for (const s of this.signStates) {
            if (s.active) {
                s.timer -= dt * (1 + complexity);
                if (s.timer <= 0) s.active = false;
            }
        }
    }

    getAudioModulation() {
        return {
            neonFlicker: this.flickerState * this.energy,
            rainWetness: this.rainIntensity
        };
    }
}
