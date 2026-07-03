import { Matrix4D } from './Matrix4D.js';

/**
 * PolytopeMath — 4D Tesseract and Simplex geometry logic.
 * Calculates rotations and projections for 4D polytopes.
 */
export class PolytopeMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.vertices = this._generateTesseractVertices();
        this.angleXW = 0;
        this.angleYW = 0;
        this.angleZW = 0;
        this.angleXY = 0;
        this.pulses = [];
    }

    addPulse(x, energy) {
        this.pulses.push({ x, energy, age: 0 });
        this.energy = Math.min(1.0, this.energy + energy);
    }

    _generateTesseractVertices() {
        const v = [];
        for (let i = 0; i < 16; i++) {
            v.push([
                (i & 1) ? 1 : -1,
                (i & 2) ? 1 : -1,
                (i & 4) ? 1 : -1,
                (i & 8) ? 1 : -1
            ]);
        }
        return v;
    }

    update(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        // Rotations driven by audio complexity and energy
        const speed = 0.5 + complexity * 1.5;
        this.angleXW += dt * speed * 0.4;
        this.angleYW += dt * speed * 0.3;
        this.angleZW += dt * speed * 0.2;
        this.angleXY += dt * 0.1;

        // Pulse decay
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            this.pulses[i].age += dt;
            if (this.pulses[i].age > 4.0) this.pulses.splice(i, 1);
        }
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.8,
            detuneMod: this.energy * 0.4,
            harmonicity: 1.0 + this.energy * 0.5
        };
    }

    getProjectedPoints(w, h, scale) {
        // Build 4D rotation matrix
        let m = Matrix4D.rotateXW(this.angleXW);
        m = Matrix4D.multiply(m, Matrix4D.rotateYW(this.angleYW));
        m = Matrix4D.multiply(m, Matrix4D.rotateZW(this.angleZW));
        m = Matrix4D.multiply(m, Matrix4D.rotateXY(this.angleXY));

        return this.vertices.map(v => {
            const rotated = Matrix4D.transform(m, v);
            
            // Perspective projection from 4D to 3D
            const wCoord = 1 / (2.5 + rotated[3]);
            const x3 = rotated[0] * wCoord;
            const y3 = rotated[1] * wCoord;
            const z3 = rotated[2] * wCoord;

            // Perspective projection from 3D to 2D
            const zCoord = 1 / (2.5 + z3);
            const x2 = x3 * zCoord;
            const y2 = y3 * zCoord;

            return {
                x: w/2 + x2 * scale,
                y: h/2 + y2 * scale,
                z: z3, // Useful for depth shading
                w: rotated[3] // Useful for 4D shadow concepts
            };
        });
    }
    
    getEdges() {
        const edges = [];
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                let diff = 0;
                let v1 = this.vertices[i];
                let v2 = this.vertices[j];
                for (let k = 0; k < 4; k++) {
                    if (v1[k] !== v2[k]) diff++;
                }
                if (diff === 1) edges.push([i, j]);
            }
        }
        return edges;
    }
}
