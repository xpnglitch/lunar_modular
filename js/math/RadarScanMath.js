/**
 * RadarScanMath — Tactical Resonance HUD Physics.
 * Simulates a high-precision digital sweep: tracking coordinate blips,
 * signal strength persistence, and "target lock" energy states.
 */
export class RadarScanMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.sweepAngle = 0;
        this.blips = []; // {angle, dist, energy, life, pulse}
        this.initialized = false;
        this.maxBlips = 40;
    }

    /**
     * Inject target data or signal disruption.
     */
    addPulse(nx, energy) {
        this.energy = Math.min(1.5, this.energy + energy * 0.7);
        
        // Add a "Target Lock" blip
        this.blips.push({
            angle: nx * Math.PI * 2,
            dist: 0.2 + (1 - nx) * 0.7,
            energy: energy,
            life: 3.0 + energy * 2,
            pulse: 0,
            swept: false
        });
        
        if (this.blips.length > this.maxBlips) this.blips.shift();
    }

    /**
     * Step the radar simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt * speed;
        this.energy *= 0.96;
        
        // Update sweep angle
        this.sweepAngle = (this.sweepAngle + dt * speed * 4.0) % (Math.PI * 2);

        // Update blips
        for (let i = this.blips.length - 1; i >= 0; i--) {
            const b = this.blips[i];
            b.life -= dt * speed;
            b.pulse += dt * speed * 10;
            
            // Detection logic: check if sweep is passing over blip
            const diff = (this.sweepAngle - b.angle + Math.PI * 2) % (Math.PI * 2);
            if (diff < 0.2 && diff > 0) {
                b.swept = true;
                b.energy = Math.min(1.0, b.energy + 0.1); // Refresh signal
            } else {
                b.swept = false;
            }

            if (b.life <= 0) this.blips.splice(i, 1);
        }

        // Ambient blip generation based on complexity
        if (Math.random() < 0.02 + complexity * 0.05) {
            this.addPulse(Math.random(), 0.1 + Math.random() * 0.3);
        }
    }

    getAudioModulation() {
        const blipCount = this.blips.length;
        return {
            sweepFrequency: 0.1 + this.energy * 0.5,
            dataNoise: Math.min(1, blipCount / this.maxBlips),
            signalResonance: this.energy
        };
    }
}
