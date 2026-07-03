/**
 * TornadoMath — Plasma Vortex Physics.
 * Simulates an electrified vortex: high-velocity helical bands, 
 * ionization energy levels, and atmospheric shockwave rings.
 */
export class TornadoMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.expansion = 0;
        this.vortexIntensity = 0.5;
        this.ionization = 0;
        this.initialized = false;
        this.rings = [];
    }

    /**
     * Trigger a vortex pulse or ionization burst.
     */
    addPulse(normalizedX, energy) {
        this.energy = Math.min(1.5, this.energy + energy * 0.7);
        this.expansion = Math.min(1.0, this.expansion + energy * 0.4);
        this.ionization = Math.min(1.0, this.ionization + energy * 0.6);
        
        // Add a shockwave ring
        this.rings.push({
            r: 0,
            life: 1.0,
            vel: energy
        });
    }

    /**
     * Step the plasma vortex physics.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt * speed;
        this.energy *= 0.95;
        this.expansion *= 0.98;
        this.ionization *= 0.97;
        this.vortexIntensity = 0.5 + (this.energy * 0.5);

        // Update rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.r += dt * speed * 200;
            r.life -= dt * 1.5;
            if (r.life <= 0) this.rings.splice(i, 1);
        }

        // Standard interaction: expansion increases with complexity
        const targetExp = (complexity * 0.5);
        this.expansion += (targetExp - this.expansion) * 0.05 * speed;
    }

    getAudioModulation() {
        return {
            vortexRoar: Math.min(1, this.energy * 1.5),
            plasmaCrackel: this.ionization,
            stormWidth: this.expansion
        };
    }
}
