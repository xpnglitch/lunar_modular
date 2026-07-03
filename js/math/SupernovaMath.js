/**
 * SupernovaMath — Hypernova Detonation Physics.
 * Simulates the life cycle of a dying star: compression, detonation, and 
 * the formation of a expanding gaseous nebula with a central singularity.
 */
export class SupernovaMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.detonations = [];
        this.nebulaEjecta = [];
        this.singularityX = 0.5;
        this.singularityY = 0.5;
        this.initialized = false;
    }

    /**
     * Trigger a new detonation event.
     */
    addDetonation(x, y, vel) {
        this.energy = Math.min(2.0, this.energy + vel * 0.8);
        this.singularityX = x;
        this.singularityY = y;
        
        // Initial blast surge
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.15 * vel;
            this.nebulaEjecta.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.2 + Math.random() * 0.5,
                hue: Math.random() * 360,
                mass: 0.5 + Math.random()
            });
        }
    }

    /**
     * Progress the stellar collapse and expansion physics.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt;
        this.energy *= 0.96;

        const gravity = 0.005 * (1 - this.energy) * complexity;

        // Process gaseous ejecta
        for (let i = this.nebulaEjecta.length - 1; i >= 0; i--) {
            const p = this.nebulaEjecta[i];
            
            // Central singularity gravity
            const dx = this.singularityX - p.x;
            const dy = this.singularityY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
            
            p.vx += (dx / dist) * gravity;
            p.vy += (dy / dist) * gravity;
            
            // Turbulence
            p.vx += (Math.random() - 0.5) * 0.01 * this.energy;
            p.vy += (Math.random() - 0.5) * 0.01 * this.energy;

            p.x += p.vx * dt * 60 * speed;
            p.y += p.vy * dt * 60 * speed;

            p.life -= dt * p.decay;
            if (p.life <= 0) this.nebulaEjecta.splice(i, 1);
        }

        // Limit density
        if (this.nebulaEjecta.length > 300) this.nebulaEjecta.shift();
    }

    getAudioModulation() {
        return {
            resonance: this.energy * 0.5,
            distortion: Math.min(1.0, this.energy * 1.2)
        };
    }
}
