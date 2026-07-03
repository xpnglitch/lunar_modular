/**
 * KaleidoscopeMath — Symmetrical coordinate transformations
 * Manages the generation of repeated geometric motifs.
 * Responds to MIDI notes by spawning patterns that pulse with audio activity.
 */
export class KaleidoscopeMath {
    constructor() {
        this.nodes = [];
        this.time = 0;
        this.maxNodes = 60;
    }

    addNode(nx, ny, freq, vel) {
        this.nodes.push({
            x: nx,
            y: ny,
            angle: Math.random() * Math.PI * 2,
            radius: 0.1 + Math.random() * 0.4,
            speed: (Math.random() - 0.5) * 2,
            size: 5 + Math.random() * 10,
            energy: vel,
            hue: (nx * 360) % 360,
            type: Math.floor(Math.random() * 3) // 0: Triangle, 1: Hex, 2: Star
        });
        if (this.nodes.length > this.maxNodes) this.nodes.shift();
    }

    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        const drift = 0.5 * speed;

        for (let n of this.nodes) {
            // Movement logic
            n.angle += n.speed * dt * speed;
            n.radius += Math.sin(this.time * 0.5 + n.hue) * 0.05 * speed;
            
            // Light-Pressure reactivity
            if (lightPressure.force > 0) {
                const dist = Math.hypot(lightPressure.x - 0.5, lightPressure.y - 0.5);
                n.energy += lightPressure.force * 0.05;
                n.speed += lightPressure.force * 0.1;
            }

            n.energy *= 0.98;
        }
    }

    getAudioModulation() {
        const totalEnergy = this.nodes.reduce((sum, n) => sum + n.energy, 0);
        const avgEnergy = totalEnergy / Math.max(1, this.nodes.length);
        return {
            filterMod: 0.4 + avgEnergy * 0.5,
            harmonics: avgEnergy * 0.6
        };
    }
}
