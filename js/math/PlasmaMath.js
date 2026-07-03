/**
 * PlasmaMath — Interference wave physics
 * Manages multiple wave sources that create complex interference patterns.
 * Notes spawn new oscillators, and 'complexity' adds layers.
 */
export class PlasmaMath {
    constructor() {
        this.sources = [];
        this.maxSources = 8;
        this.time = 0;
    }

    addSource(nx, ny, freq, vel) {
        this.sources.push({
            x: nx,
            y: ny,
            freq: 0.5 + freq / 500,
            phase: Math.random() * Math.PI * 2,
            energy: vel,
            hue: (nx * 360) % 360,
            life: 1.0
        });
        if (this.sources.length > this.maxSources) this.sources.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const rate = 1.0 * speed;

        for (let i = this.sources.length - 1; i >= 0; i--) {
            let s = this.sources[i];
            
            // Motion
            // s.x += Math.cos(this.time * 0.5 + s.hue) * 0.05 * speed;
            // s.y += Math.sin(this.time * 0.5 + s.hue) * 0.05 * speed;

            // Light-Pressure reactivity
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - s.x, dy = lightPressure.y - s.y;
                let d = Math.hypot(dx, dy);
                if (d < 0.4) {
                    s.phase += lightPressure.force * 0.1;
                }
            }

            s.energy *= 0.98;
            s.life -= dt * 0.05 * (1 - complexity);
            if (s.life <= 0) this.sources.splice(i, 1);
        }
    }

    /**
     * Get the interference value at a specific 0-1 coordinate
     */
    getValueAt(x, y) {
        let val = 0;
        for (let s of this.sources) {
            const d = Math.hypot(s.x - x, s.y - y);
            val += Math.sin(d * 10 * s.freq - this.time * 2 + s.phase) * s.energy;
        }
        return val;
    }

    getAudioModulation() {
        const energySum = this.sources.reduce((sum, s) => sum + s.energy, 0);
        return {
            filterMod: 0.3 + energySum / this.maxSources * 0.5,
            harmonics: energySum / this.maxSources * 0.4
        };
    }
}
