/**
 * OrbitMath — N-body Gravitational Physics
 * Every body exerts gravity on every other body.
 * Musical notes act as high-mass 'planetary' seeds.
 * Centered around a massive 'Sun' driven by Light-Pressure.
 */
export class OrbitMath {
    constructor() {
        this.bodies = [];
        this.maxBodies = 25;
        this.time = 0;
        this.G = 0.05; // Gravitational constant
        this.sunMass = 5.0;
    }

    addBody(nx, ny, freq, vel) {
        // Orbit initialization
        const dist = Math.hypot(nx - 0.5, ny - 0.5) + 0.1;
        const speed = Math.sqrt(this.sunMass * this.G / (dist * 2)) * 0.8;
        const angle = Math.atan2(ny - 0.5, nx - 0.5) + Math.PI / 2;

        this.bodies.push({
            x: nx,
            y: ny,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            mass: 0.1 + vel * 0.5,
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0,
            trail: []
        });
        
        if (this.bodies.length > this.maxBodies) this.bodies.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const simSpeed = 1.0 * speed;
        
        // Sun position (Light-Pressure focus)
        const sx = lightPressure.x;
        const sy = lightPressure.y;
        this.sunMass = 2.0 + lightPressure.force * 10.0;

        for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i];
            
            // 1. Gravity from Sun
            const sdx = sx - b.x;
            const sdy = sy - b.y;
            const sd2 = sdx * sdx + sdy * sdy + 0.001;
            const sd = Math.sqrt(sd2);
            const sf = (this.G * this.sunMass * b.mass) / sd2;
            b.vx += (sdx / sd) * sf * dt * simSpeed;
            b.vy += (sdy / sd) * sf * dt * simSpeed;

            // 2. N-body forces (Gravity from other planets)
            for (let j = i + 1; j < this.bodies.length; j++) {
                const b2 = this.bodies[j];
                const dx = b2.x - b.x;
                const dy = b2.y - b.y;
                const d2 = dx * dx + dy * dy + 0.001;
                const d = Math.sqrt(d2);
                
                // Mutual attraction
                const f = (this.G * b.mass * b2.mass) / d2;
                const fx = (dx / d) * f * dt * simSpeed;
                const fy = (dy / d) * f * dt * simSpeed;
                
                b.vx += fx / b.mass;
                b.vy += fy / b.mass;
                b2.vx -= fx / b2.mass;
                b2.vy -= fy / b2.mass;
            }

            // 3. Update Position
            b.x += b.vx * dt * simSpeed;
            b.y += b.vy * dt * simSpeed;

            // Trail history
            if (this.time % 0.05 < dt) {
                b.trail.push({ x: b.x, y: b.y });
                if (b.trail.length > 20 + complexity * 40) b.trail.shift();
            }

            b.energy *= 0.99;
            b.life -= dt * 0.02 * (1 - complexity);
        }

        // Cleanup dead bodies
        for (let i = this.bodies.length - 1; i >= 0; i--) {
            if (this.bodies[i].life <= 0) this.bodies.splice(i, 1);
        }
    }

    getAudioModulation() {
        const kineticEnergy = this.bodies.reduce((sum, b) => sum + 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy), 0);
        return {
            filterMod: 0.3 + kineticEnergy * 50,
            harmonics: kineticEnergy * 20
        };
    }
}
