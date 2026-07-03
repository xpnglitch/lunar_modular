/**
 * GlitchMath — Digital Entropy Simulation.
 * Models signal failure, buffer corruption, and chromatic aberration.
 * Tracks nested slice states, spectral jitter, and bit-flip transients.
 */
export class GlitchMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.slices = [];
        this.maxSlices = 40;
        this.globalJitter = 0;
    }

    /**
     * Inject a new glitch burst or data corruption event.
     */
    addPulse(x, y, vel) {
        this.energy = Math.min(2.0, this.energy + vel * 0.8);
        
        // Spawn slices
        const count = 3 + Math.floor(vel * 8);
        for (let i = 0; i < count; i++) {
            this.slices.push({
                type: Math.random() > 0.4 ? 'h' : 'v',
                pos: Math.random(),
                size: 0.02 + Math.random() * 0.15,
                offset: (Math.random() - 0.5) * 0.1 * vel,
                life: 1.0,
                decay: 2.0 + Math.random() * 3.0,
                hueOff: (Math.random() - 0.5) * 60,
                rgbSplit: Math.random() * 0.05 * vel
            });
        }
        
        if (this.slices.length > this.maxSlices) this.slices.splice(0, this.slices.length - this.maxSlices);
    }

    /**
     * Progress the entropy simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        this.energy *= 0.92;
        this.globalJitter = Math.sin(this.time * 50) * 0.01 * this.energy * complexity;

        for (let i = this.slices.length - 1; i >= 0; i--) {
            const s = this.slices[i];
            s.life -= dt * s.decay;
            s.offset += (Math.random() - 0.5) * 0.005 * this.energy;
            
            if (s.life <= 0) this.slices.splice(i, 1);
        }
    }

    getAudioModulation() {
        return {
            bitcrush: this.energy * 0.8,
            jitter: this.globalJitter
        };
    }
}
