/**
 * MagneticMath — Physics of attraction and repulsion
 * Simulates a grid of field lines that warp around MIDI 'poles'.
 * Responds to Light-Pressure pulses from active notes.
 */
export class MagneticMath {
    constructor() {
        this.poles = [];
        this.time = 0;
        this.maxPoles = 12;
    }

    addPole(nx, ny, freq, vel) {
        this.poles.push({
            x: nx,
            y: ny,
            strength: (Math.random() > 0.5 ? 1 : -1) * (0.5 + vel),
            hue: (nx * 360) % 360,
            energy: vel,
            life: 1.0
        });
        if (this.poles.length > this.maxPoles) this.poles.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        
        for (let i = this.poles.length - 1; i >= 0; i--) {
            let p = this.poles[i];
            
            // Subtle motion
            p.x += Math.sin(this.time * 0.3 + p.hue) * 0.005 * speed;
            p.y += Math.cos(this.time * 0.3 + p.hue) * 0.005 * speed;

            // Light-Pressure influence
            if (lightPressure.force > 0) {
                let dx = lightPressure.x - p.x, dy = lightPressure.y - p.y;
                let d = Math.hypot(dx, dy);
                if (d < 0.3) {
                    p.strength += lightPressure.force * 0.1 * (p.strength > 0 ? 1 : -1);
                }
            }

            p.energy *= 0.98;
            p.life -= dt * 0.08 * (1 - complexity);
            if (p.life <= 0) this.poles.splice(i, 1);
        }
    }

    /**
     * Get the magnetic field vector at a specific 0-1 coordinate
     */
    getFieldAt(x, y) {
        let fx = 0, fy = 0;
        for (let p of this.poles) {
            let dx = p.x - x, dy = p.y - y;
            let d2 = dx * dx + dy * dy + 0.001;
            let force = p.strength / d2;
            fx += dx * force * 0.005;
            fy += dy * force * 0.005;
        }
        return { fx, fy };
    }

    getAudioModulation() {
        const totalPower = this.poles.reduce((sum, p) => sum + Math.abs(p.strength), 0);
        return {
            filterMod: 0.3 + totalPower * 0.1,
            detuneMod: totalPower * 0.05
        };
    }
}
