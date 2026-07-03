/**
 * MetaballsMath — Liquid physics simulation
 * Manages metabolic 'cells' that merge and split.
 * Notes spawn new cells, and 'Light-Pressure' pushes them together.
 */
export class MetaballsMath {
    constructor() {
        this.cells = [];
        this.maxCells = 15;
        this.time = 0;
    }

    addNote(nx, ny, freq, vel) {
        this.cells.push({
            x: nx,
            y: ny,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            radius: 0.05 + vel * 0.1,
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0
        });
        if (this.cells.length > this.maxCells) this.cells.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        
        for (let i = this.cells.length - 1; i >= 0; i--) {
            let c = this.cells[i];
            
            // Motion
            c.x += c.vx * dt * speed;
            c.y += c.vy * dt * speed;

            // Bounce
            if (c.x < 0 || c.x > 1) c.vx *= -1;
            if (c.y < 0 || c.y > 1) c.vy *= -1;

            // Light-Pressure attraction (Surface Tension)
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - c.x, dy = lightPressure.y - c.y;
                let d = Math.hypot(dx, dy);
                if (d < 0.4) {
                    c.vx += dx * lightPressure.force * 0.1;
                    c.vy += dy * lightPressure.force * 0.1;
                }
            }

            // Pulse radius
            c.radius = (0.05 + c.energy * 0.1) * (1 + Math.sin(this.time * 2 + c.hue) * 0.1 * complexity);

            c.energy *= 0.99;
            c.life -= dt * 0.05 * (1 - complexity);
            if (c.life <= 0) this.cells.splice(i, 1);
        }
    }

    getAudioModulation() {
        const activity = this.cells.reduce((sum, c) => sum + c.energy, 0);
        return {
            filterMod: 0.3 + activity * 0.4,
            reverbMix: activity * 0.2
        };
    }
}
