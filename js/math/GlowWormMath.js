/**
 * GlowWormMath — Autonomous neon agent physics
 * Agents that navigate using 'Light-Pressure' and leave persistent trails.
 * Note activity spawns new worms or provides 'food' (energy).
 */
export class GlowWormMath {
    constructor() {
        this.worms = [];
        this.maxWorms = 80;
        this.time = 0;
    }

    addWorm(nx, ny, freq, vel) {
        this.worms.push({
            x: nx,
            y: ny,
            angle: Math.random() * Math.PI * 2,
            speed: 0.1 + vel * 0.2,
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0,
            history: [] // for trails
        });
        if (this.worms.length > this.maxWorms) this.worms.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        
        for (let i = this.worms.length - 1; i >= 0; i--) {
            let w = this.worms[i];
            
            // Steering: 'Light-Pressure' attraction
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - w.x, dy = lightPressure.y - w.y;
                let targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - w.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                w.angle += angleDiff * 0.1 * lightPressure.force * speed;
            }

            // Move
            w.x += Math.cos(w.angle) * w.speed * dt;
            w.y += Math.sin(w.angle) * w.speed * dt;

            // Bounce / Wrap
            if (w.x < 0) { w.x = 0; w.angle = Math.PI - w.angle; }
            if (w.x > 1) { w.x = 1; w.angle = Math.PI - w.angle; }
            if (w.y < 0) { w.y = 0; w.angle = -w.angle; }
            if (w.y > 1) { w.y = 1; w.angle = -w.angle; }

            // History for trails
            w.history.push({ x: w.x, y: w.y });
            if (w.history.length > 30 + complexity * 50) w.history.shift();

            w.energy *= 0.99;
            w.life -= dt * 0.03 * (1 - complexity);
            if (w.life <= 0) this.worms.splice(i, 1);
        }
    }

    getAudioModulation() {
        const energySum = this.worms.reduce((sum, w) => sum + w.energy, 0);
        return {
            filterMod: 0.3 + (energySum / this.maxWorms) * 0.5,
            detuneMod: (energySum / this.maxWorms) * 0.3
        };
    }
}
