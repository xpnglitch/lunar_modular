/**
 * PulsarBeamMath — Magnetogram Singularity Physics.
 * Simulates high-speed rotation and electromagnetic field dynamics.
 * Musical notes trigger radio-burst rings and polar jet flares.
 */
export class PulsarBeamMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.rotation = 0;
        this.spinRate = 2.0;
        this.jets = [];
        this.initialized = false;
    }

    /**
     * Trigger a radio burst / magnetic flare.
     */
    addPulse(x, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.5);
        this.spinRate = Math.min(15.0, this.spinRate + vel * 12.0); // Extreme spin up
        
        // Polar jet flare
        this.jets.push({
            life: 1.0,
            vel: vel,
            phase: Math.random() * Math.PI
        });
    }

    /**
     * Progress the magnetic field state.
     */
    step(dt, complexity) {
        this.time += dt;
        
        // Decay energy and spin
        this.energy *= 0.94;
        this.spinRate += (1.5 + (complexity * 2.0) - this.spinRate) * 0.05;
        this.rotation += this.spinRate * dt;

        // Progress jets
        for (let i = this.jets.length - 1; i >= 0; i--) {
            this.jets[i].life -= dt * (1.0 + (1-complexity) * 1.5);
            if (this.jets[i].life <= 0) this.jets.splice(i, 1);
        }
    }

    getAudioModulation() {
        return {
            brightness: 0.2 + this.energy * 0.8,
            frequency: 1 + this.spinRate * 0.1
        };
    }
}
