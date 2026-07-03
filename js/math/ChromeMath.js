/**
 * ChromeMath — Liquid Mercury Surface Physics.
 * Simulates large, reflective "blobs" with surface tension, 
 * mutual repulsion, and high-energy mercurial ripples.
 */
export class ChromeMath {
    constructor() {
        this.blobs = [];
        this.maxBlobs = 10;
        this.time = 0;
        this.energy = 0;
        this.initialized = false;
    }

    /**
     * Trigger a new mercurial ripple or blob injection.
     */
    addPulse(nx, ny, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.4);
        
        // Find nearest blob and inject energy
        let nearest = null;
        let minDist = 2.0;
        for (const b of this.blobs) {
            const d = Math.hypot(nx - b.x, ny - b.y);
            if (d < minDist) {
                minDist = d;
                nearest = b;
            }
        }
        
        if (nearest) {
            nearest.vx += (nx - nearest.x) * vel * 0.1;
            nearest.vy += (ny - nearest.y) * vel * 0.1;
            nearest.energy = Math.min(1.0, nearest.energy + vel);
        } else if (this.blobs.length < this.maxBlobs) {
            this._addBlob(nx, ny, vel);
        }
    }

    /**
     * Progress the liquid metal physics.
     */
    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized) {
            for (let i = 0; i < 6; i++) this._addBlob(Math.random(), Math.random(), 0.2);
            this.initialized = true;
        }

        this.time += dt;
        this.energy *= 0.94;

        // Mutual repulsion and surface tension
        for (let i = 0; i < this.blobs.length; i++) {
            const b1 = this.blobs[i];
            
            for (let j = i + 1; j < this.blobs.length; j++) {
                const b2 = this.blobs[j];
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
                const minDist = b1.radius + b2.radius;
                
                if (dist < minDist) {
                    const push = (minDist - dist) * 0.01;
                    b1.vx -= (dx / dist) * push;
                    b1.vy -= (dy / dist) * push;
                    b2.vx += (dx / dist) * push;
                    b2.vy += (dy / dist) * push;
                }
            }

            // Brownian drift and integration
            b1.vx += (Math.random() - 0.5) * 0.002 * complexity;
            b1.vy += (Math.random() - 0.5) * 0.002 * complexity;
            
            b1.x += b1.vx * dt * 60 * speed;
            b1.y += b1.vy * dt * 60 * speed;
            
            // Damping
            b1.vx *= 0.97;
            b1.vy *= 0.97;
            b1.energy *= 0.95;

            // Bouncy bounds
            if (b1.x < 0.1 || b1.x > 0.9) b1.vx *= -0.8;
            if (b1.y < 0.1 || b1.y > 0.9) b1.vy *= -0.8;
            
            b1.x = Math.max(0, Math.min(1, b1.x));
            b1.y = Math.max(0, Math.min(1, b1.y));
        }
    }

    _addBlob(x, y, vel) {
        this.blobs.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 0.01,
            vy: (Math.random() - 0.5) * 0.01,
            radius: 0.1 + Math.random() * 0.15,
            energy: vel,
            hueOff: (Math.random() - 0.5) * 60,
            phase: Math.random() * Math.PI * 2
        });
    }

    getAudioModulation() {
        return {
            reflection: 0.1 + this.energy * 0.9,
            fluidity: this.blobs.length / this.maxBlobs
        };
    }
}
