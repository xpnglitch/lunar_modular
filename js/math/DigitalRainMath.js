/**
 * DigitalRainMath — Neural Data Rain Physics.
 * Simulates vertical streams of high-frequency data glyphs.
 * Tracks column heads, vertical velocity, trail persistence, 
 * and high-energy "data surges" triggered by note events.
 */
export class DigitalRainMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.columns = []; // {x, head, speed, trail, volatility}
        this.maxColumns = 100;
        this.initialized = false;
    }

    /**
     * Trigger a "Data Surge" at a specific column.
     */
    addPulse(nx, energy) {
        this.energy = Math.min(2.0, this.energy + energy * 0.8);
        
        // Find columns near nx and boost them
        const xTarget = Math.floor(nx * this.columns.length);
        const radius = 5;
        for (let i = -radius; i <= radius; i++) {
            const idx = xTarget + i;
            if (this.columns[idx]) {
                this.columns[idx].speed += energy * 5.0;
                this.columns[idx].volatility = Math.min(1.0, this.columns[idx].volatility + energy);
            }
        }
    }

    /**
     * Step the digital rain simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized) {
            const colCount = Math.floor(40 + complexity * 120);
            this.columns = Array.from({ length: colCount }, (_, i) => ({
                x: i / colCount,
                head: Math.random() * 2.0 - 1.0, // Start above screen
                speed: 0.2 + Math.random() * 0.8,
                trail: 10 + Math.random() * 20,
                volatility: 0,
                chars: Array.from({ length: 40 }, () => Math.floor(Math.random() * 10))
            }));
            this.initialized = true;
        }

        this.time += dt * speed;
        this.energy *= 0.95;

        for (const col of this.columns) {
            // Speed scales with energy and global speed
            const currentSpeed = (col.speed * 0.5 + this.energy * 2.0) * speed;
            col.head += currentSpeed * dt;
            col.volatility *= 0.97;

            // Reset column when head exits bottom
            if (col.head > 1.2) {
                col.head = -0.2 - Math.random() * 0.5;
                col.speed = 0.2 + Math.random() * 0.8;
                col.trail = 10 + Math.random() * 20 + complexity * 20;
            }

            // High volatility causes character flicker
            if (col.volatility > 0.1 || Math.random() < 0.01) {
                const charIdx = Math.floor(Math.random() * col.chars.length);
                col.chars[charIdx] = Math.floor(Math.random() * 10);
            }
        }
    }

    getAudioModulation() {
        return {
            digitalHiss: Math.min(1, this.energy * 2),
            dataDensity: Math.min(1, this.energy * 1.5)
        };
    }
}
