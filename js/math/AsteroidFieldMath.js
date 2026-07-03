/**
 * AsteroidFieldMath — 3D space travel physics.
 * Tracks orbital bodies in 3D coordinate space with perspective scaling.
 * Musical notes trigger spatial ripples and forward thrust impulses.
 */
export class AsteroidFieldMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.thrust = 0;
        this.zVelocity = 0.5;
        this.initialized = false;
    }

    /**
     * Trigger a spatial pulse from a musical note.
     */
    addPulse(x, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.4);
        this.thrust = Math.min(2.0, this.thrust + vel * 0.6);
    }

    /**
     * Progress the 3D physics state centered on Z-axis movement.
     */
    step(dt, complexity) {
        this.time += dt;
        
        // Decay energy and thrust
        this.energy *= 0.94;
        this.thrust *= 0.96;
        
        // Base velocity + audio-reactive thrust
        this.zVelocity = 0.2 + (this.thrust * 3.0) + (complexity * 0.5);
    }

    /**
     * Map current state to audio parameters.
     */
    getAudioModulation() {
        return {
            brightness: 0.1 + this.energy * 0.8,
            detune: this.thrust * 0.2
        };
    }
}
