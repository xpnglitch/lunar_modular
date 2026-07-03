/**
 * MyceliumMath — Neural Fungal Growth Physics.
 * Simulates a space-colonization algorithm where growth tips are attracted 
 * to nutrient points (spores), forming a persistent organic network.
 */
export class MyceliumMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.branches = [];
        this.tips = [];
        this.attractors = [];
        this.newBranches = [];
        this.maxBranches = 4000;
        this.maxTips = 40;
        this.initialized = false;
    }

    /**
     * Add nutrient attractors or new growth seeds.
     */
    addPulse(nx, ny, energy) {
        this.energy = Math.min(1.5, this.energy + energy * 0.5);
        
        // Spawn multiple nutrient points (attractors)
        const count = 10 + Math.floor(energy * 20);
        for (let i = 0; i < count; i++) {
            this.attractors.push({
                x: nx + (Math.random() - 0.5) * 0.3,
                y: ny + (Math.random() - 0.5) * 0.3,
                life: 1.0,
                active: true
            });
        }

        // Potential new growth seed
        if (this.tips.length < this.maxTips) {
            this.tips.push({
                x: nx,
                y: ny,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                hue: (nx * 360) % 360,
                energy: energy
            });
        }
    }

    /**
     * Step the biological simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        this.time += dt * speed;
        this.energy *= 0.96;
        this.newBranches = [];

        if (this.attractors.length > 500 + complexity * 1000) {
            this.attractors.splice(0, this.attractors.length - 1500);
        }

        // 1. Growth Tips iteration
        const growthStep = 0.04 * speed;
        const killDist = 0.012;
        const attractDist = 0.12 + complexity * 0.1;

        for (let i = this.tips.length - 1; i >= 0; i--) {
            const t = this.tips[i];
            
            // Find attractors
            let avgDx = 0, avgDy = 0, count = 0;
            for (const a of this.attractors) {
                if (!a.active) continue;
                const dx = a.x - t.x, dy = a.y - t.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < killDist * killDist) {
                    a.active = false;
                } else if (distSq < attractDist * attractDist) {
                    const d = Math.sqrt(distSq);
                    avgDx += dx / d;
                    avgDy += dy / d;
                    count++;
                }
            }

            // Steering logic
            if (count > 0) {
                t.vx += (avgDx / count) * 0.15;
                t.vy += (avgDy / count) * 0.15;
            } else {
                // Random drift if no attractors
                t.vx += (Math.random() - 0.5) * 0.05;
                t.vy += (Math.random() - 0.5) * 0.05;
            }

            // Light pressure influence
            if (lightPressure.force > 0) {
                const dx = t.x - lightPressure.x;
                const dy = t.y - lightPressure.y;
                const ld = Math.hypot(dx, dy) + 0.01;
                t.vx += (dx / ld) * lightPressure.force * 0.02;
                t.vy += (dy / ld) * lightPressure.force * 0.02;
            }

            // Normalize and extend
            const mag = Math.hypot(t.vx, t.vy) + 0.001;
            t.vx = (t.vx / mag) * growthStep;
            t.vy = (t.vy / mag) * growthStep;

            const nextX = t.x + t.vx;
            const nextY = t.y + t.vy;

            // Log new branch
            const nb = {
                x1: t.x, y1: t.y, x2: nextX, y2: nextY,
                hue: t.hue, energy: t.energy, life: 1.0
            };
            this.branches.push(nb);
            this.newBranches.push(nb);

            t.x = nextX;
            t.y = nextY;
            t.energy *= 0.99;

            // Tip death conditions
            if (t.x < -0.1 || t.x > 1.1 || t.y < -0.1 || t.y > 1.1) {
                this.tips.splice(i, 1);
            }
        }

        // Cleanup global branch pool
        if (this.branches.length > this.maxBranches) {
            this.branches.splice(0, this.branches.length - this.maxBranches);
        }
    }

    getAudioModulation() {
        return {
            mycelialHiss: Math.min(1, this.energy * 2),
            growthVibrance: this.energy
        };
    }
    
    clear() {
        this.branches = [];
        this.tips = [];
        this.attractors = [];
        this.newBranches = [];
    }
}
