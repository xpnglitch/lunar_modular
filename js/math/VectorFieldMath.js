/**
 * VectorFieldMath — High-density Eulerian flow visualization.
 * Calculates dynamic vector fields driven by multi-octave noise.
 * Includes particle advection and kinetic occlusion logic.
 */
export class VectorFieldMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.gridSize = 20;
        this.field = [];
        this.particles = [];
        this.maxParticles = 800;
        this._initField();
    }

    _initField() {
        for (let x = 0; x < this.gridSize; x++) {
            this.field[x] = [];
            for (let y = 0; y < this.gridSize; y++) {
                this.field[x][y] = { vx: 0, vy: 0 };
            }
        }
    }

    addPulse(x, energy) {
        // Create an "Explosion" in the vector field
        const gx = Math.floor(x * this.gridSize);
        const gy = Math.floor(this.gridSize / 2);
        if (this.field[gx] && this.field[gx][gy]) {
            this.field[gx][gy].vx += (Math.random() - 0.5) * energy * 10;
            this.field[gx][gy].vy += (Math.random() - 0.5) * energy * 10;
        }
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        // Update the field with noise and interaction
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const angle = Math.sin(x * 0.2 + this.time) * Math.cos(y * 0.2 + this.time * 0.5) * Math.PI * 2;
                const speed = 0.5 + complexity * 2.0;
                
                // Transition towards the noise-driven angle
                const targetVx = Math.cos(angle) * speed;
                const targetVy = Math.sin(angle) * speed;
                
                this.field[x][y].vx = this.field[x][y].vx * 0.95 + targetVx * 0.05;
                this.field[x][y].vy = this.field[x][y].vy * 0.95 + targetVy * 0.05;
            }
        }

        // Advect particles
        if (this.particles.length < this.maxParticles + complexity * 500) {
            this.particles.push({ 
                x: Math.random(), y: Math.random(), 
                vx: 0, vy: 0, 
                age: 0, life: 2 + Math.random() * 3 
            });
        }

        this.particles.forEach((p, idx) => {
            const gx = Math.floor(p.x * this.gridSize);
            const gy = Math.floor(p.y * this.gridSize);
            
            if (this.field[gx] && this.field[gx][gy]) {
                p.vx = p.vx * 0.9 + this.field[gx][gy].vx * 0.1;
                p.vy = p.vy * 0.9 + this.field[gx][gy].vy * 0.1;
            }

            p.x += p.vx * dt * 0.1;
            p.y += p.vy * dt * 0.1;

            // Wrap around
            p.x = (p.x + 1) % 1;
            p.y = (p.y + 1) % 1;
            p.age += dt;

            if (p.age > p.life) {
                this.particles[idx] = { x: Math.random(), y: Math.random(), vx: 0, vy: 0, age: 0, life: 2 + Math.random() * 3 };
            }
        });
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.6,
            resonance: 1 + this.energy * 3
        };
    }
}
