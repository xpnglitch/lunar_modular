/**
 * PhaseMath — Geometric Interference Physics.
 * Simulates a set of phase-locked oscillators that create constructive 
 * and destructive interference fields. MIDI notes act as phase injectors.
 */
export class PhaseMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.emitters = [];
        this.maxEmitters = 12;
        this.initialized = false;
    }

    /**
     * Inject phase shift or add a temporary emitter from a note.
     */
    addPulse(x, y, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.5);
        
        // Find existing emitter to nudge or add new one
        let nearest = null;
        let minDist = 2.0;
        for (const e of this.emitters) {
            const d = Math.hypot(x - e.x, y - e.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        }

        if (nearest && minDist < 0.2) {
            nearest.phi += vel * Math.PI;
            nearest.amp = Math.min(1.0, nearest.amp + vel);
        } else if (this.emitters.length < this.maxEmitters) {
            this.emitters.push({
                x: x, y: y,
                phi: Math.random() * Math.PI * 2,
                freq: 0.5 + Math.random() * 2.0,
                amp: vel,
                life: 1.0,
                decay: 0.2 + Math.random() * 0.4
            });
        }
    }

    /**
     * Progress the phase oscillation physics.
     */
    step(dt, complexity, speed) {
        if (!this.initialized) {
            for (let i = 0; i < 4; i++) {
                this.emitters.push({
                    x: Math.random(), y: Math.random(),
                    phi: Math.random() * Math.PI * 2,
                    freq: 0.5 + Math.random() * 1.5,
                    amp: 0.2, life: 1.0, decay: 0
                });
            }
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.95;

        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const e = this.emitters[i];
            e.phi += dt * e.freq * (1 + this.energy) * speed * 2;
            e.amp *= 0.98;
            
            if (e.decay > 0) {
                e.life -= dt * e.decay;
                if (e.life <= 0) this.emitters.splice(i, 1);
            }
        }
    }

    getAudioModulation() {
        return {
            phaseMix: this.energy,
            interference: this.emitters.length / this.maxEmitters
        };
    }
}
