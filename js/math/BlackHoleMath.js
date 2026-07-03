/**
 * BlackHoleMath — Gravitational Field Simulation.
 * Models a gravity well acting on a dense star/dust field.
 * Audio energy modulates gravitational strength.
 */
export class BlackHoleMath {
    constructor() {
        this.time = 0;
        this.energy = 0;          // Current gravitational energy (audio-driven)
        this.mass = 1.0;          // Base mass of the singularity
        this.consumed = 0;        // Total stars consumed
        this.initialized = false;
        this.stars = [];
        this.dust = [];           // Nebula gas particles
    }

    addPulse(x, vel) {
        // Audio events feed the black hole — it grows hungrier
        this.energy = Math.min(3.0, this.energy + vel * 0.6);
        this.mass = Math.min(5.0, this.mass + vel * 0.02);
    }

    _spawnStar(atEdge) {
        // Spawn at a random position, or forced to the edge if replacing a consumed star
        let x, y;
        if (atEdge) {
            // Spawn on a random edge of the normalized field
            const side = Math.random() * 4;
            if (side < 1)      { x = Math.random(); y = 0; }
            else if (side < 2) { x = Math.random(); y = 1; }
            else if (side < 3) { x = 0; y = Math.random(); }
            else               { x = 1; y = Math.random(); }
        } else {
            x = Math.random();
            y = Math.random();
        }

        const dx = x - 0.5;
        const dy = y - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

        // Give it a slight tangential velocity so it orbits rather than falling straight in
        const tangentSpeed = 0.0003 + Math.random() * 0.0006;
        
        return {
            x, y,
            vx: (-dy / dist) * tangentSpeed + (Math.random() - 0.5) * 0.0001,
            vy: (dx / dist) * tangentSpeed + (Math.random() - 0.5) * 0.0001,
            size: 0.3 + Math.random() * 1.2,
            brightness: 0.3 + Math.random() * 0.7,
            hue: 180 + Math.random() * 80,  // Blue-white range
            alive: true
        };
    }

    _spawnDust() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.2 + Math.random() * 0.6;
        return {
            x: 0.5 + Math.cos(angle) * dist,
            y: 0.5 + Math.sin(angle) * dist,
            vx: 0, vy: 0,
            size: 1 + Math.random() * 4,
            alpha: 0.02 + Math.random() * 0.06,
            hue: 200 + Math.random() * 60
        };
    }

    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized) {
            // Populate the cosmos
            for (let i = 0; i < 2000; i++) this.stars.push(this._spawnStar(false));
            for (let i = 0; i < 300; i++) this.dust.push(this._spawnDust());
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.97; // Slow decay

        const G = (0.00002 + this.energy * 0.00008) * this.mass * speed;
        const eventHorizonR = 0.03 * this.mass;

        // --- Stars ---
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const s = this.stars[i];
            const dx = 0.5 - s.x;
            const dy = 0.5 - s.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) || 0.0001;

            // Gravitational acceleration: F = GM/r^2
            const accel = G / (distSq + 0.0001);
            s.vx += (dx / dist) * accel * dt * 60;
            s.vy += (dy / dist) * accel * dt * 60;

            // Dampen very slightly to prevent numerical explosion
            const vMag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
            if (vMag > 0.02) {
                s.vx *= 0.99;
                s.vy *= 0.99;
            }

            s.x += s.vx * dt * 60;
            s.y += s.vy * dt * 60;

            // Consumed by the event horizon
            if (dist < eventHorizonR) {
                this.consumed++;
                // Replace with a new star at the edge
                const fresh = this._spawnStar(true);
                Object.assign(s, fresh);
            }

            // Escaped the field entirely — respawn at edge
            if (s.x < -0.2 || s.x > 1.2 || s.y < -0.2 || s.y > 1.2) {
                const fresh = this._spawnStar(true);
                Object.assign(s, fresh);
            }
        }

        // --- Dust / Nebula Gas ---
        for (const d of this.dust) {
            const dx = 0.5 - d.x;
            const dy = 0.5 - d.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) || 0.0001;

            const accel = G * 0.3 / (distSq + 0.001);
            d.vx += (dx / dist) * accel * dt * 60;
            d.vy += (dy / dist) * accel * dt * 60;
            d.vx *= 0.995;
            d.vy *= 0.995;

            d.x += d.vx * dt * 60;
            d.y += d.vy * dt * 60;

            if (dist < eventHorizonR || d.x < -0.1 || d.x > 1.1 || d.y < -0.1 || d.y > 1.1) {
                Object.assign(d, this._spawnDust());
            }
        }
    }

    getAudioModulation() {
        return {
            gravity: this.energy,
            mass: this.mass
        };
    }
}
