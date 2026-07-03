/**
 * BoidsMath — Bio-Kinetic Flocking Simulation
 * Implements Reynolds flocking (Separation, Alignment, Cohesion) 
 * with audio-reactive behavioral shifts.
 */
export class BoidsMath {
    constructor() {
        this.boids = [];
        this.maxBoids = 80;
        this.time = 0;
        this.energy = 0;
        this.initialized = false;
    }

    addBoid(x, y, freq, vel) {
        const b = {
            x: x || Math.random(),
            y: y || Math.random(),
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            history: [],
            energy: vel ?? 0.5,
            hue: (x * 360) % 360,
            baseSize: 2 + Math.random() * 4,
            isLeader: Math.random() < 0.1,
            maxSpeed: 0.015 + Math.random() * 0.01,
            maxForce: 0.0005 + Math.random() * 0.0005
        };
        
        if (b.isLeader) {
            b.baseSize *= 2.5;
            b.maxSpeed *= 0.8;
            b.hue = (b.hue + 180) % 360;
        }

        this.boids.push(b);
        if (this.boids.length > this.maxBoids) this.boids.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized || this.boids.length < 20) {
            for (let i = 0; i < 40; i++) this.addBoid();
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.95;

        const maxTotalBoids = Math.floor(40 + complexity * 80);
        if (this.boids.length > maxTotalBoids) this.boids.shift();

        // 1. Calculate Flocking Forces
        for (let b of this.boids) {
            let sepX = 0, sepY = 0, sepCount = 0;
            let aliX = 0, aliY = 0, aliCount = 0;
            let cohX = 0, cohY = 0, cohCount = 0;

            const perception = 0.15 + complexity * 0.1;

            for (let other of this.boids) {
                if (b === other) continue;
                const d = Math.hypot(b.x - other.x, b.y - other.y);

                if (d < 0.04 && d > 0) {
                    const diffX = b.x - other.x;
                    const diffY = b.y - other.y;
                    const d2 = d * d + 0.0001; 
                    sepX += diffX / d2;
                    sepY += diffY / d2;
                    sepCount++;
                }

                if (d < perception) {
                    aliX += other.vx;
                    aliY += other.vy;
                    aliCount++;

                    cohX += other.x;
                    cohY += other.y;
                    cohCount++;
                }
            }

            // Apply Reynolds Forces
            if (sepCount > 0) {
                sepX /= sepCount; sepY /= sepCount;
                this._applyForce(b, sepX, sepY, 0.002 * (1 + this.energy));
            }
            if (aliCount > 0) {
                aliX /= aliCount; aliY /= aliCount;
                this._applyForce(b, aliX, aliY, 0.001);
            }
            if (cohCount > 0) {
                cohX /= cohCount; cohY /= cohCount;
                this._applySteer(b, cohX, cohY, 0.0005);
            }

            // 2. Light Pressure Reactivity (Attraction or Repulsion based on leader status)
            if (lightPressure.force > 0) {
                const dx = lightPressure.x - b.x;
                const dy = lightPressure.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 0.4) {
                    const f = lightPressure.force * (b.isLeader ? -0.005 : 0.005);
                    this._applyForce(b, dx, dy, f);
                }
            }

            // 3. Audio Reactivity: Jitter and Speed Boost
            if (this.energy > 0.5) {
                b.vx += (Math.random() - 0.5) * 0.01 * this.energy;
                b.vy += (Math.random() - 0.5) * 0.01 * this.energy;
            }

            // 4. Boundary Logic (Soft Repulsion)
            const margin = 0.1;
            const turnFactor = 0.002;
            if (b.x < margin) b.vx += turnFactor;
            if (b.x > 1 - margin) b.vx -= turnFactor;
            if (b.y < margin) b.vy += turnFactor;
            if (b.y > 1 - margin) b.vy -= turnFactor;

            // 5. Update Position
            const currentMaxSpeed = b.maxSpeed * (1 + this.energy * 2) * speed;
            const mag = Math.hypot(b.vx, b.vy);
            if (mag > currentMaxSpeed) {
                b.vx = (b.vx / mag) * currentMaxSpeed;
                b.vy = (b.vy / mag) * currentMaxSpeed;
            }

            b.x += b.vx * dt * 60;
            b.y += b.vy * dt * 60;

            // Update History for Trails
            b.history.push({ x: b.x, y: b.y });
            const maxHist = Math.floor(10 + b.energy * 20);
            if (b.history.length > maxHist) b.history.shift();

            b.energy *= 0.95;
        }
    }

    _applyForce(b, fx, fy, weight) {
        b.vx += fx * weight;
        b.vy += fy * weight;
    }

    _applySteer(b, tx, ty, weight) {
        const dx = tx - b.x;
        const dy = ty - b.y;
        b.vx += dx * weight;
        b.vy += dy * weight;
    }

    getAudioModulation() {
        return {
            panning: this.boids.reduce((sum, b) => sum + (b.x - 0.5), 0) / this.boids.length,
            brightness: 0.3 + this.energy * 0.7
        };
    }
}
