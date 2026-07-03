/**
 * TemporalMath — Chronos Singularity Physics.
 * Manages a high-resolution "History Buffer" of engine states, 
 * simulating time-dilation, ghosting, and temporal splintering.
 */
export class TemporalMath {
    constructor() {
        this.buffer = [];
        this.maxBufferLength = 60;
        this.time = 0;
        this.energy = 0;
    }

    /**
     * Add current state to history buffer.
     */
    addFrame(notes, intensity, hue, complexity) {
        const frame = {
            notes: notes.map(n => ({ x: n.x, y: n.y, vel: n.velocity })),
            intensity: intensity,
            hue: hue,
            time: this.time,
            age: 0
        };
        
        this.buffer.unshift(frame);
        const limit = 10 + Math.floor(complexity * 40);
        if (this.buffer.length > limit) this.buffer.splice(limit);
    }

    /**
     * Progress temporal physics and aging.
     */
    step(dt, complexity, speed) {
        this.time += dt * speed;
        this.energy *= 0.95;

        for (let i = 0; i < this.buffer.length; i++) {
            const f = this.buffer[i];
            f.age = i / Math.max(1, this.buffer.length);
            
            // Subtle outward expansion of echoes
            for (const n of f.notes) {
                const dx = n.x - 0.5;
                const dy = n.y - 0.5;
                n.x += dx * 0.002 * f.age;
                n.y += dy * 0.002 * f.age;
            }
        }
    }

    getAudioModulation() {
        return {
            dilation: this.buffer.length / this.maxBufferLength,
            spectralBleed: this.energy
        };
    }
}
