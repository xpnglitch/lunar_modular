/**
 * NebulaMath — Volumetric Star-Forming Nursery Physics.
 * Manages gas cloud clusters and embedded protostars that ignite 
 * based on musical transients. Features organic Brownian drift.
 */
export class NebulaMath {
    constructor() {
        this.clouds = [];
        this.maxClouds = 10;
        this.time = 0;
        this.initialized = false;
    }

    /**
     * Trigger a cloud ignition or star-forming burst.
     */
    addCloud(x, y, freq, vel) {
        this.clouds.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 0.01,
            vy: (Math.random() - 0.5) * 0.01,
            energy: vel,
            life: 1.0,
            hue: (x * 360) % 360,
            density: 0.5 + Math.random() * 0.5,
            radius: 0.2 + vel * 0.3,
            stars: Array.from({ length: 3 }, () => ({
                ox: (Math.random() - 0.5) * 0.1,
                oy: (Math.random() - 0.5) * 0.1,
                bright: 0
            }))
        });

        if (this.clouds.length > this.maxClouds) this.clouds.shift();
    }

    /**
     * Progress the volumetric nursery physics.
     */
    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized) {
            for (let i = 0; i < 5; i++) this.addCloud(Math.random(), Math.random(), 440, 0.2);
            this.initialized = true;
        }

        this.time += dt;

        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const c = this.clouds[i];
            
            // Low-frequency organic drift
            c.vx += (Math.random() - 0.5) * 0.001 * (1 + c.energy);
            c.vy += (Math.random() - 0.5) * 0.001 * (1 + c.energy);
            
            c.x += c.vx * dt * 60 * speed;
            c.y += c.vy * dt * 60 * speed;

            // Bounce with damping
            if (c.x < 0 || c.x > 1) { c.vx *= -0.5; c.x = Math.max(0, Math.min(1, c.x)); }
            if (c.y < 0 || c.y > 1) { c.vy *= -0.5; c.y = Math.max(0, Math.min(1, c.y)); }

            c.energy *= 0.96;
            c.life -= dt * 0.02 * (1 - complexity);

            // Update embedded protostars
            for (const s of c.stars) {
                s.bright = (s.bright * 0.95) + (c.energy * 0.05);
            }

            if (c.life <= 0) this.clouds.splice(i, 1);
        }
    }

    getAudioModulation() {
        return {
            depth: this.clouds.length / this.maxClouds,
            reverb: 0.1 + (this.clouds.reduce((s, c) => s + c.energy, 0) / 5)
        };
    }
}
