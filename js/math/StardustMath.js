/**
 * StardustMath — Kinetic particle cloud physics
 * Particles that follow noise flow and react to Light-Pressure pulses.
 * High-frequency motion based on MIDI velocity.
 */
export class StardustMath {
    constructor() {
        this.particles = [];
        this.maxParticles = 900;
        this.time = 0;
    }

    addParticles(nx, ny, freq, vel) {
        const count = 12 + Math.floor(vel * 30);
        const hue = (nx * 360) % 360;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: nx + (Math.random() - 0.5) * 0.02,
                y: ny + (Math.random() - 0.5) * 0.02,
                vx: (Math.random() - 0.5) * 0.1 * vel,
                vy: (Math.random() - 0.5) * 0.1 * vel,
                hue: hue + (Math.random() - 0.5) * 20,
                energy: vel * (0.5 + Math.random() * 0.5),
                life: 1.0,
                size: 1 + Math.random() * 3
            });
        }
        
        while (this.particles.length > this.maxParticles) this.particles.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const drift = 0.5 * speed;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            // Noise flow approximation
            const nx = (Math.sin(p.x * 10 + this.time) * Math.cos(p.y * 10)) * 0.02 * complexity;
            const ny = (Math.cos(p.x * 10 + this.time) * Math.sin(p.y * 10)) * 0.02 * complexity;
            
            p.vx += nx * speed;
            p.vy += ny * speed;

            // Light-Pressure influence
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - p.x, dy = lightPressure.y - p.y;
                let d = Math.hypot(dx, dy);
                if (d < 0.2) {
                    p.vx += dx * lightPressure.force * 0.5;
                    p.vy += dy * lightPressure.force * 0.5;
                }
            }

            // Move
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wrap
            if (p.x < 0) p.x += 1; if (p.x > 1) p.x -= 1;
            if (p.y < 0) p.y += 1; if (p.y > 1) p.y -= 1;

            // Damping
            p.vx *= 0.95;
            p.vy *= 0.95;

            p.energy *= 0.97;
            p.life -= dt * 0.08 * (1 - complexity);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    getAudioModulation() {
        const energySum = this.particles.reduce((sum, p) => sum + p.energy, 0);
        return {
            filterMod: 0.2 + energySum / this.maxParticles,
            detuneMod: energySum / this.maxParticles * 0.3
        };
    }
}
