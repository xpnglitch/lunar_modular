/**
 * VortexMath — Spiral warp physics
 * Manages multiple vortices that 'bend' particle trajectories.
 * Musical notes act as powerful gravitons or 'eye of the storm'.
 */
export class VortexMath {
    constructor() {
        this.vortices = [];
        this.maxVortices = 10;
        this.particles = [];
        this.maxParticles = 200;
        this.time = 0;
    }

    addVortex(nx, ny, freq, vel) {
        this.vortices.push({
            x: nx,
            y: ny,
            strength: (Math.random() > 0.5 ? 1 : -1) * (0.5 + vel),
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0,
            radius: 0.15 + vel * 0.2
        });
        if (this.vortices.length > this.maxVortices) this.vortices.shift();

        // Spawn particles into the vortex
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: nx + (Math.random() - 0.5) * 0.1,
                y: ny + (Math.random() - 0.5) * 0.1,
                vx: 0,
                vy: 0,
                hue: (nx * 360) % 360,
                energy: vel,
                life: 1.0
            });
        }
        while (this.particles.length > this.maxParticles) this.particles.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const drift = 0.5 * speed;

        for (let i = this.vortices.length - 1; i >= 0; i--) {
            let v = this.vortices[i];
            
            // Motion
            // v.x += Math.sin(this.time * 0.3 + v.hue) * 0.005 * speed;
            // v.y += Math.cos(this.time * 0.3 + v.hue) * 0.005 * speed;

            v.energy *= 0.98;
            v.life -= dt * 0.05 * (1 - complexity);
            if (v.life <= 0) this.vortices.splice(i, 1);
        }

        // Particle dynamics (Spiral motion)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            for (let v of this.vortices) {
                let dx = v.x - p.x, dy = v.y - p.y;
                let d = Math.hypot(dx, dy) + 0.01;
                
                if (d < v.radius) {
                    // Gravitational pull
                    const pull = v.strength * (1 - d / v.radius) * 0.05;
                    p.vx += (dx / d) * pull;
                    p.vy += (dy / d) * pull;

                    // Rotational force (Vortex)
                    const rotX = -dy / d, rotY = dx / d;
                    const rot = v.strength * (1 - d / v.radius) * 0.2 * speed;
                    p.vx += rotX * rot;
                    p.vy += rotY * rot;
                }
            }

            p.vx *= 0.95; p.vy *= 0.95; // Damping
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.energy *= 0.99;
            p.life -= dt * 0.1;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    getAudioModulation() {
        const energySum = this.vortices.reduce((sum, v) => sum + v.energy, 0);
        return {
            filterMod: 0.3 + energySum / this.maxVortices * 0.5,
            detuneMod: energySum / this.maxVortices * 0.3
        };
    }
}
