/**
 * SpirographMath — 3D Cycloidal Geometry
 * Extends 2D spirographs into 3D space using nested rotations.
 * Parameters morph based on MIDI notes, creating evolving geometric meshes.
 */
export class SpirographMath {
    constructor() {
        this.time = 0;
        this.R = 5;
        this.r = 1;
        this.d = 5;
        this.targetR = 5;
        this.targetr = 1;
        this.targetd = 5;
        this.rotX = 0;
        this.rotY = 0;
        this.rotZ = 0;
    }

    setFromNote(nx, ny, freq, vel) {
        this.targetR = 2 + nx * 10;
        this.targetr = 0.5 + ny * 5;
        this.targetd = 1 + vel * 8;
        this.rotX += vel * 2;
        this.rotY += vel * 1.5;
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const lerp = 0.05 * speed;

        this.R += (this.targetR - this.R) * lerp;
        this.r += (this.targetr - this.r) * lerp;
        this.d += (this.targetd - this.d) * lerp;

        // Auto-rotation
        this.rotX += dt * 0.2 * speed;
        this.rotY += dt * 0.3 * speed;
        this.rotZ += dt * 0.1 * speed;

        // Light-Pressure kick
        if (lightPressure.force > 0.5) {
            this.d += lightPressure.force * 0.2;
            this.rotZ += lightPressure.force * 0.5;
        }
    }

    /**
     * Get 3D position at parameter t
     */
    getPositionAt(t, layer, complexity) {
        const R = this.R + layer * 0.5;
        const r = this.r;
        const d = this.d + Math.sin(this.time * 0.5) * complexity;

        // 2D Hypocycloid base
        let x = (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
        let y = (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
        let z = Math.sin(t * 3 + this.time) * d * 0.5; // 3D depth oscillation

        // 3D Rotations
        const tx = x, ty = y, tz = z;
        
        // Rotate Y
        let x1 = tx * Math.cos(this.rotY) + tz * Math.sin(this.rotY);
        let z1 = -tx * Math.sin(this.rotY) + tz * Math.cos(this.rotY);
        
        // Rotate X
        let y2 = ty * Math.cos(this.rotX) - z1 * Math.sin(this.rotX);
        let z2 = ty * Math.sin(this.rotX) + z1 * Math.cos(this.rotX);

        // Perspective 3D -> 2D
        const p = 5 / (5 - z2);
        return {
            x: x1 * p * 0.05,
            y: y2 * p * 0.05,
            z: z2
        };
    }

    getAudioModulation() {
        return {
            filterMod: 0.3 + (this.R / 15) * 0.5,
            lfoRate: 0.1 + (this.r / 5) * 2
        };
    }
}
