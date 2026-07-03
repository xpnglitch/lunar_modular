/**
 * GravityMath — Cinematic spacetime curvature physics.
 * Simulates a deformable grid mesh, gravitational waves, 
 * star fields, accretion disks, and debris fields.
 * Coordinates are normalized 0-1 throughout.
 */
export class GravityMath {
    constructor() {
        this.time = 0;
        this.stars = [];
        this.gravitationalWaves = [];
        this.grid = [];
        this.cols = 28;
        this.rows = 20;
        this.accretionParticles = [];
        this.debris = [];
        this.wells = [];          // autonomous gravity wells (always active)
        this.maxWaves = 12;
        this.maxAccretion = 180;
        this.maxDebris = 80;
        this.isInitialized = false;
    }

    reset(w = 800, h = 600) {
        this.time = 0;
        this._initStars();
        this._initGrid();
        this._initAccretion();
        this._initDebris();
        this._initWells();
        this.gravitationalWaves = [];
        this.isInitialized = true;
    }

    _initWells() {
        // 2-3 slowly drifting autonomous wells so the grid always deforms
        this.wells = [
            { x: 0.35, y: 0.4,  vx:  0.018, vy:  0.008, mass: 0.9 },
            { x: 0.65, y: 0.6,  vx: -0.012, vy: -0.007, mass: 0.7 },
            { x: 0.5,  y: 0.25, vx:  0.005, vy:  0.014, mass: 0.5 },
        ];
    }

    _initStars() {
        this.stars = [];
        for (let i = 0; i < 450; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: 0.2 + Math.random() * 1.6,
                brightness: 0.1 + Math.random() * 0.9,
                twinkleSpeed: 0.4 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2,
                hueShift: (Math.random() - 0.5) * 40
            });
        }
    }

    _initGrid() {
        this.grid = [];
        for (let j = 0; j < this.rows; j++) {
            for (let i = 0; i < this.cols; i++) {
                const ox = i / (this.cols - 1);
                const oy = j / (this.rows - 1);
                this.grid.push({ ox, oy, x: ox, y: oy, z: 0, vx: 0, vy: 0, vz: 0 });
            }
        }
    }

    _initAccretion() {
        this.accretionParticles = [];
        for (let i = 0; i < this.maxAccretion; i++) {
            this.accretionParticles.push(this._spawnAccretion());
        }
    }

    _spawnAccretion(wellIndex = null) {
        // Spawn in an orbit around a random well
        const wi = wellIndex !== null ? wellIndex : Math.floor(Math.random() * this.wells.length);
        const well = this.wells[wi] || { x: 0.5, y: 0.5 };

        const angle  = Math.random() * Math.PI * 2;
        const radius = 0.04 + Math.random() * 0.18;
        const px = well.x + Math.cos(angle) * radius;
        const py = well.y + Math.sin(angle) * radius;

        // Tangential velocity for stable initial orbit
        const speed = 0.003 + Math.random() * 0.004;
        return {
            x: px, y: py,
            vx: -Math.sin(angle) * speed,
            vy:  Math.cos(angle) * speed,
            life: 0.6 + Math.random() * 0.4,
            hueOffset: (Math.random() - 0.5) * 80,
            size: 0.6 + Math.random() * 2.2,
            wellIndex: wi,
            trail: []
        };
    }

    _initDebris() {
        this.debris = [];
        for (let i = 0; i < this.maxDebris; i++) {
            this._spawnDebris();
        }
    }

    _spawnDebris() {
        this.debris.push({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.003,
            vy: (Math.random() - 0.5) * 0.003,
            size: 1 + Math.random() * 3.5,
            brightness: 0.3 + Math.random() * 0.7,
            hueShift: (Math.random() - 0.5) * 30,
            captured: false,
            captureTime: 0
        });
    }

    step(mathEngine, dt) {
        if (!this.isInitialized) this.reset();
        // clamp dt to prevent spiral if tab was hidden
        const safeDt = Math.min(dt, 0.05);
        this.time += safeDt;

        const intensity  = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const notes      = mathEngine.getActiveNotes();

        this._updateWells(safeDt, intensity);
        this._updateWaves(notes, safeDt);
        this._updateGrid(notes, intensity, complexity, safeDt);
        this._updateAccretion(notes, intensity, safeDt);
        this._updateDebris(notes, safeDt);
    }

    _updateWells(dt, intensity) {
        for (const w of this.wells) {
            w.x += w.vx * dt;
            w.y += w.vy * dt;
            // Bounce off padded edges
            if (w.x < 0.15 || w.x > 0.85) { w.vx *= -1; w.x = Math.max(0.15, Math.min(0.85, w.x)); }
            if (w.y < 0.15 || w.y > 0.85) { w.vy *= -1; w.y = Math.max(0.15, Math.min(0.85, w.y)); }
        }
    }

    _updateWaves(notes, dt) {
        // Notes trigger waves
        notes.forEach(n => {
            if (Math.random() < 0.12) {
                this.gravitationalWaves.push({
                    cx: n.x / 800,
                    cy: n.y / 600,
                    radius: 0,
                    life: 1.0,
                    strength: n.velocity
                });
            }
        });
        // Autonomous wells occasionally emit ripples
        if (Math.random() < 0.04) {
            const w = this.wells[Math.floor(Math.random() * this.wells.length)];
            this.gravitationalWaves.push({
                cx: w.x, cy: w.y,
                radius: 0, life: 0.7,
                strength: 0.4 + w.mass * 0.4
            });
        }

        for (let i = this.gravitationalWaves.length - 1; i >= 0; i--) {
            const w = this.gravitationalWaves[i];
            w.radius += dt * 0.45;
            w.life   -= dt * 0.4;
            if (w.life <= 0 || w.radius > 1.8) this.gravitationalWaves.splice(i, 1);
        }
        if (this.gravitationalWaves.length > this.maxWaves) this.gravitationalWaves.shift();
    }

    _updateGrid(notes, intensity, complexity, dt) {
        const elastic = 0.08 + intensity * 0.08;
        const friction = 0.88;

        // Combine autonomous wells + note positions into one source list
        const sources = [
            ...this.wells.map(w => ({ x: w.x, y: w.y, velocity: w.mass, strength: 0.035 })),
            ...notes.map(n => ({ x: n.x / 800, y: n.y / 600, velocity: n.velocity, strength: 0.05 }))
        ];

        for (const p of this.grid) {
            // Spring back to origin
            p.vx += (p.ox - p.x) * elastic;
            p.vy += (p.oy - p.y) * elastic;
            p.vz += (0   - p.z) * elastic;

            // Pull from each gravity source
            for (const src of sources) {
                const dx = src.x - p.ox;
                const dy = src.y - p.oy;
                const distSq = dx * dx + dy * dy + 0.0005;
                const dist   = Math.sqrt(distSq);
                const force  = (src.velocity * src.strength) / distSq;
                // Grid points pulled toward source in x/y + pulled DOWN in z (depth warp)
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
                p.vz += force * 0.6;
            }

            p.vx *= friction; p.vy *= friction; p.vz *= friction;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.z += p.vz * dt * 60;

            // Clamp z to [0, 1] with no runaway multiplier
            p.z = Math.max(0, Math.min(1, p.z));
        }
    }

    _updateAccretion(notes, intensity, dt) {
        while (this.accretionParticles.length < this.maxAccretion) {
            this.accretionParticles.push(this._spawnAccretion());
        }

        for (let i = this.accretionParticles.length - 1; i >= 0; i--) {
            const p = this.accretionParticles[i];
            p.life -= dt * 0.15;
            if (p.life <= 0) { this.accretionParticles.splice(i, 1); continue; }

            // Collect pull forces from all wells + notes
            const sources = [
                ...this.wells.map(w => ({ x: w.x, y: w.y, mass: w.mass })),
                ...notes.map(n => ({ x: n.x / 800, y: n.y / 600, mass: n.velocity * 0.8 }))
            ];

            for (const src of sources) {
                const dx = src.x - p.x;
                const dy = src.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
                // Swallow if too close
                if (dist < 0.015) { p.life = 0; break; }

                // Tangential (orbital) + radial (infall) components
                const radialPull    = (src.mass * 0.00012) / (dist * dist);
                const tangentialDir = { x: -dy / dist, y: dx / dist };

                p.vx += tangentialDir.x * radialPull * 2.5 * dt * 60;
                p.vy += tangentialDir.y * radialPull * 2.5 * dt * 60;
                p.vx += (dx / dist) * radialPull * 0.6 * dt * 60;
                p.vy += (dy / dist) * radialPull * 0.6 * dt * 60;
            }

            p.vx *= 0.97; p.vy *= 0.97;
            p.x  += p.vx * dt * 60;
            p.y  += p.vy * dt * 60;

            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 14) p.trail.shift();
        }
    }

    _updateDebris(notes, dt) {
        // Debris pulled by wells + notes
        const sources = [
            ...this.wells.map(w => ({ x: w.x, y: w.y, velocity: w.mass })),
            ...notes.map(n => ({ x: n.x / 800, y: n.y / 600, velocity: n.velocity }))
        ];

        for (const d of this.debris) {
            if (d.captured) continue;
            for (const src of sources) {
                const dx = src.x - d.x;
                const dy = src.y - d.y;
                const distSq = dx * dx + dy * dy;
                const dist   = Math.sqrt(distSq);
                if (dist < 0.03) { d.captured = true; d.captureTime = this.time; break; }
                if (dist < 0.35) {
                    const pull = (src.velocity * 0.0006) / distSq;
                    d.vx += (dx / dist) * pull;
                    d.vy += (dy / dist) * pull;
                }
            }
            d.vx *= 0.982; d.vy *= 0.982;
            d.x  += d.vx;  d.y  += d.vy;
            if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
            if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        }
        for (let i = this.debris.length - 1; i >= 0; i--) {
            if (this.debris[i].captured && (this.time - this.debris[i].captureTime > 1.8)) {
                this.debris.splice(i, 1);
                this._spawnDebris();
            }
        }
    }
}
