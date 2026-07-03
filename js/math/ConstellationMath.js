/**
 * ConstellationMath — Interactive Spacetime Chart Physics
 * Simulates a celestial network with gravitational clustering, 
 * stellar evolution, and spacetime metric distortion.
 */
export class ConstellationMath {
    constructor() {
        this.stars = [];
        this.connections = [];
        this.time = 0;
        this.energy = 0;
        this.maxStars = 60;
        this.initialized = false;
    }

    /**
     * Birth a new star at a location.
     */
    addStar(x, y, freq, vel) {
        const s = {
            x: x || Math.random(),
            y: y || Math.random(),
            vx: (Math.random() - 0.5) * 0.002,
            vy: (Math.random() - 0.5) * 0.002,
            mass: 0.5 + Math.random() * 2.0,
            energy: vel,
            hue: (x * 360) % 360,
            life: 1.0,
            type: Math.random() < 0.1 ? 'giant' : 'dwarf',
            phase: Math.random() * Math.PI * 2
        };

        if (s.type === 'giant') {
            s.mass *= 3;
            s.hue = (s.hue + 180) % 360;
        }

        this.stars.push(s);
        if (this.stars.length > this.maxStars) {
            // Cull oldest stars
            this.stars.sort((a,b) => b.life - a.life);
            this.stars.pop();
        }
    }

    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized || this.stars.length < 15) {
            for (let i = 0; i < 30; i++) this.addStar();
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.96;

        // 1. Gravitational Interactions and Clustering
        for (let i = 0; i < this.stars.length; i++) {
            const s1 = this.stars[i];
            for (let j = i + 1; j < this.stars.length; j++) {
                const s2 = this.stars[j];
                
                const dx = s2.x - s1.x;
                const dy = s2.y - s1.y;
                const d2 = dx * dx + dy * dy + 0.0001;
                const d = Math.sqrt(d2);

                if (d < 0.25) {
                    // Universal gravitation approximation
                    const force = (s1.mass * s2.mass) / (d2 * 50000);
                    const fx = (dx / d) * force;
                    const fy = (dy / d) * force;
                    
                    s1.vx += fx; s1.vy += fy;
                    s2.vx -= fx; s2.vy -= fy;
                }
            }

            // Light Pressure (Solar winds)
            if (lightPressure.force > 0) {
                const ldx = s1.x - lightPressure.x;
                const ldy = s1.y - lightPressure.y;
                const ld = Math.hypot(ldx, ldy) + 0.001;
                if (ld < 0.3) {
                    const f = (lightPressure.force * 0.002) / ld;
                    s1.vx += ldx * f; s1.vy += ldy * f;
                }
            }

            // Integration
            s1.vx *= 0.98; s1.vy *= 0.98; // Cosmic damping
            s1.x += s1.vx * dt * 60 * speed;
            s1.y += s1.vy * dt * 60 * speed;

            // Constrain within bounds (Soft wrap/bounce)
            if (s1.x < 0) { s1.x = 0; s1.vx *= -0.5; }
            if (s1.x > 1) { s1.x = 1; s1.vx *= -0.5; }
            if (s1.y < 0) { s1.y = 0; s1.vy *= -0.5; }
            if (s1.y > 1) { s1.y = 1; s1.vy *= -0.5; }

            s1.energy *= 0.94;
            s1.life -= dt * 0.02 * (1 - complexity);
        }

        // 2. Generate Connections (Constellations)
        this.connections = [];
        const maxDist = 0.15 + complexity * 0.05;
        for (let i = 0; i < this.stars.length; i++) {
            for (let j = i + 1; j < this.stars.length; j++) {
                const s1 = this.stars[i];
                const s2 = this.stars[j];
                const d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
                if (d < maxDist) {
                    this.connections.push({
                        a: s1, b: s2,
                        alpha: (1 - d / maxDist) * (0.2 + (s1.energy + s2.energy) * 0.5)
                    });
                }
            }
        }

        // Cleanup dead stars
        this.stars = this.stars.filter(s => s.life > 0);
    }

    /**
     * Calculate spacetime metric distortion at a given point.
     * Returns a displacement vector.
     */
    getDistortion(px, py) {
        let dx = 0, dy = 0;
        for (const s of this.stars) {
            const distSq = Math.pow(px - s.x, 2) + Math.pow(py - s.y, 2) + 0.01;
            const force = s.mass * (0.005 + s.energy * 0.02) / distSq;
            dx += (s.x - px) * force;
            dy += (s.y - py) * force;
        }
        return { dx, dy };
    }

    getAudioModulation() {
        return {
            panning: (this.stars.reduce((s, st) => s + st.x, 0) / this.stars.length - 0.5) * 2,
            intensity: this.energy
        };
    }
}
