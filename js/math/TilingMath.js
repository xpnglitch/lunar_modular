/**
 * TilingMath — Non-Euclidean lattice generator.
 * Poincare Disk-style hyperbolic tiling and projection.
 * Geometry warps based on audio energy and complexity.
 */
export class TilingMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.p = 7; // Number of sides per polygon
        this.q = 3; // Number of polygons per vertex
        this.generations = 3;
        this.pulses = [];
    }

    addPulse(x, energy) {
        this.pulses.push({ x, energy, age: 0 });
        this.energy = Math.min(1.0, this.energy + energy);
    }

    step(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        // Dynamic p/q based on complexity
        this.p = 5 + Math.floor(complexity * 4);
        this.q = 3 + Math.floor(complexity * 2);

        // Pulse decay
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            this.pulses[i].age += dt;
            if (this.pulses[i].age > 2.0) this.pulses.splice(i, 1);
        }
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.7,
            resonance: 1 + this.energy * 2
        };
    }

    getHyperbolicPolygons(w, h, radius) {
        // Simplified hyperbolic-inspired tiling logic
        // We'll generate a set of arcs/polygons that warp towards the edge
        const polygons = [];
        const sides = this.p;
        const count = 4 + Math.floor(this.energy * 6);

        for (let i = 0; i < count; i++) {
            const angleOffset = this.time * 0.2 + (i * Math.PI * 2 / count);
            const rOffset = (i / count) * radius * 0.8;

            const vertices = [];
            for (let s = 0; s < sides; s++) {
                const angle = angleOffset + (s * Math.PI * 2 / sides);
                const r = radius * (0.3 + 0.4 * Math.sin(this.time + i));
                
                // Hyperbolic-like warp towards Disk edge
                const warp = 1 / (1 + (r / radius) * 0.5);
                const x = w/2 + Math.cos(angle) * r * warp * (1 + this.energy * 0.2);
                const y = h/2 + Math.sin(angle) * r * warp * (1 + this.energy * 0.2);
                
                vertices.push({ x, y });
            }
            polygons.push(vertices);
        }
        return polygons;
    }
}
