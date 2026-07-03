/**
 * ShadowShapeMath — 3D primitives with dynamic shading.
 * Calculates positions and rotations for multiple geometric volumes.
 * Includes light-source tracking for shadow projection.
 */
export class ShadowShapeMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.shapes = [];
        this._initShapes();
    }

    _initShapes() {
        const types = ['cube', 'octahedron', 'tetrahedron', 'torus'];
        for (let i = 0; i < 6; i++) {
            this.shapes.push({
                type: types[i % types.length],
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 2,
                rotX: Math.random() * Math.PI,
                rotY: Math.random() * Math.PI,
                rotZ: Math.random() * Math.PI,
                scale: 0.2 + Math.random() * 0.3
            });
        }
    }

    addPulse(x, energy) {
        // Kick shapes based on audio position
        const idx = Math.floor(x * this.shapes.length);
        if (this.shapes[idx]) {
            this.shapes[idx].scale += energy * 0.5;
            this.shapes[idx].z -= energy * 1.5; // Push away on transients
        }
        this.energy = Math.min(1.0, this.energy + energy);
    }

    step(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        this.shapes.forEach((s, idx) => {
            s.rotX += dt * (0.2 + idx * 0.1) * (1 + complexity);
            s.rotY += dt * (0.3 + idx * 0.05) * (1 + complexity);
            s.scale = s.scale * 0.95 + (0.3 + idx * 0.05) * 0.05;
            s.z = s.z * 0.98 + (idx * 0.1) * 0.02; // Float back to natural depth
        });
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.8,
            resonance: 1 + this.energy * 3
        };
    }

    getProjectedShapes(w, h, baseScale) {
        return this.shapes.map(s => {
            // Apply 3D perspective
            const zCoord = 1 / (3.0 + s.z);
            const px = w/2 + s.x * w * 0.3 * zCoord;
            const py = h/2 + s.y * h * 0.3 * zCoord;
            return { ...s, px, py, pScale: s.scale * baseScale * zCoord, depth: s.z };
        }).sort((a, b) => b.depth - a.depth); // Sort for occlusion
    }
}
