/**
 * VoronoiMath — Cellular partitioning logic
 * Manages 'seed' points that define the Voronoi cells.
 * High-fidelity 'Light-Pressure' reactivity where notes act as seeds.
 */
export class VoronoiMath {
    constructor() {
        this.seeds = [];
        this.maxSeeds = 40;
        this.time = 0;
    }

    addSeed(nx, ny, freq, vel) {
        this.seeds.push({
            x: nx,
            y: ny,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0
        });
        if (this.seeds.length > this.maxSeeds) this.seeds.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        
        for (let i = this.seeds.length - 1; i >= 0; i--) {
            let s = this.seeds[i];
            
            // Movement
            s.x += s.vx * dt * speed;
            s.y += s.vy * dt * speed;

            // Screen wrap
            if (s.x < 0) s.x += 1; if (s.x > 1) s.x -= 1;
            if (s.y < 0) s.y += 1; if (s.y > 1) s.y -= 1;

            // Light-Pressure attraction
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - s.x, dy = lightPressure.y - s.y;
                let d = Math.hypot(dx, dy);
                if (d < 0.3) {
                    s.vx += dx * lightPressure.force * 0.1;
                    s.vy += dy * lightPressure.force * 0.1;
                }
            }

            s.energy *= 0.98;
            s.life -= dt * 0.1 * (1 - complexity);
            if (s.life <= 0) this.seeds.splice(i, 1);
        }
    }

    getAudioModulation() {
        const energySum = this.seeds.reduce((sum, s) => sum + s.energy, 0);
        return {
            filterMod: 0.3 + (energySum / this.maxSeeds) * 0.5,
            harmonics: (energySum / this.maxSeeds) * 0.4
        };
    }
}
