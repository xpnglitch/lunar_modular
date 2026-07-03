/**
 * SuperformulaMath — Gielis Superformula implementation
 * Calculates complex polar radii for intricate geometric shapes.
 * Parameters morph based on MIDI notes and 'Light-Pressure' pulses.
 */
export class SuperformulaMath {
    constructor() {
        this.m = 5;
        this.n1 = 1;
        this.n2 = 1;
        this.n3 = 1;
        this.a = 1;
        this.b = 1;

        this.targetParams = { m: 5, n1: 1, n2: 1, n3: 1 };
        this.time = 0;
    }

    setFromNote(nx, ny, vel) {
        this.targetParams.m = Math.floor(2 + nx * 14);
        this.targetParams.n1 = 0.2 + ny * 5;
        this.targetParams.n2 = 0.2 + vel * 8;
        this.targetParams.n3 = 0.2 + Math.random() * 8;
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const lerp = 0.05 * speed;

        // Smoothly morph toward target parameters
        this.m += (this.targetParams.m - this.m) * lerp;
        this.n1 += (this.targetParams.n1 - this.n1) * lerp;
        this.n2 += (this.targetParams.n2 - this.n2) * lerp;
        this.n3 += (this.targetParams.n3 - this.n3) * lerp;

        // Modulate slightly based on complexity
        this.a = 1 + Math.sin(this.time * 0.2) * 0.1 * complexity;
        this.b = 1 + Math.cos(this.time * 0.2) * 0.1 * complexity;

        // Light-Pressure kick
        if (lightPressure.force > 0.5) {
            this.n1 += lightPressure.force * 0.2;
            this.m += lightPressure.force * 0.1;
        }
    }

    /**
     * Calculate radius for a given angle t (radians)
     */
    getRadius(t) {
        const m = this.m;
        const n1 = this.n1;
        const n2 = this.n2;
        const n3 = this.n3;
        const a = this.a;
        const b = this.b;

        const part1 = Math.pow(Math.abs(Math.cos((m * t) / 4) / a), n2);
        const part2 = Math.pow(Math.abs(Math.sin((m * t) / 4) / b), n3);
        const r = Math.pow(part1 + part2, -1 / n1);

        return r;
    }

    getAudioModulation() {
        // Param m (sides) affects the resonance, n1 (sharpness) affects harmonics
        return {
            filterMod: 0.2 + (this.m / 20) * 0.6,
            harmonics: (1 / (this.n1 + 0.1)) * 0.5
        };
    }
}
