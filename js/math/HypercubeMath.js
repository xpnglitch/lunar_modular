import { Matrix4D } from './Matrix4D.js';

/**
 * HypercubeMath — 4D Tesseract geometry
 * 4D projection logic and rotation.
 * Multiple axes of rotation modulated by notes.
 */
export class HypercubeMath {
    constructor() {
        this.vertices = [];
        this.edges = [];
        this.time = 0;
        this.rotation = [0, 0, 0, 0, 0, 0]; // XY, XZ, XW, YW, YZ, ZW
        this.angleSpeed = 0.5;

        // Initialize 16 vertices of a 4D hypercube
        for (let i = 0; i < 16; i++) {
            this.vertices.push([
                (i & 1 ? 1 : -1),
                (i & 2 ? 1 : -1),
                (i & 4 ? 1 : -1),
                (i & 8 ? 1 : -1)
            ]);
        }

        // Initialize 32 edges
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 4; j++) {
                const neighbor = i ^ (1 << j);
                if (neighbor > i) {
                    this.edges.push([i, neighbor]);
                }
            }
        }
    }

    addEnergy(nx, ny, freq, vel) {
        // Change rotation axis/speed based on note
        const axis = Math.floor(nx * 6);
        this.rotation[axis] += vel * 2;
        this.angleSpeed = 0.2 + vel * 2.0;
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        
        // Decay speeds
        for (let i = 0; i < 6; i++) {
            this.rotation[i] *= 0.95;
        }
        
        const baseSpeed = 0.5 * speed;
        this.angleSpeed += (baseSpeed - this.angleSpeed) * 0.05;
    }

    getProjectedPoints(w, h, complexity, intensity) {
        const theta1 = this.time * 0.5 * this.angleSpeed;
        const theta2 = this.time * 0.3 * this.angleSpeed + this.rotation[0];
        
        // Multi-axis rotation matrix
        let m = Matrix4D.rotateXY(theta1);
        m = Matrix4D.multiply(m, Matrix4D.rotateXW(theta2));
        m = Matrix4D.multiply(m, Matrix4D.rotateYW(theta1 * 0.7));
        m = Matrix4D.multiply(m, Matrix4D.rotateZW(theta2 * 0.4));

        const projected = this.vertices.map(v => {
            const rotated = Matrix4D.transform(m, v);
            
            // Perspective projection 4D -> 3D
            const perspective4D = 2 / (3 - rotated[3]);
            const p3d = [rotated[0] * perspective4D, rotated[1] * perspective4D, rotated[2] * perspective4D];

            // Perspective projection 3D -> 2D
            const perspective3D = 2 / (3 - p3d[2]);
            return [
                p3d[0] * perspective3D * 0.2, 
                p3d[1] * perspective3D * 0.2
            ];
        });

        return projected;
    }

    getAudioModulation() {
        return {
            filterMod: 0.3 + this.angleSpeed * 0.2,
            detuneMod: this.angleSpeed * 0.1
        };
    }
}
