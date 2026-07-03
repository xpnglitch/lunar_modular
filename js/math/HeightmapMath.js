/**
 * HeightmapMath — 3D Terrain Fly-through.
 * Generates Perlin-based terrain with continuous movement.
 * Includes horizon-line calculation for perspective atmospheric depth.
 */
export class HeightmapMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.gridSize = 25;
        this.terrain = [];
        this.speed = 2.0;
        this._initTerrain();
    }

    _initTerrain() {
        for (let x = 0; x < this.gridSize; x++) {
            this.terrain[x] = new Float32Array(this.gridSize).fill(0);
        }
    }

    addPulse(x, energy) {
        // Impact ripples in the distance
        const gx = Math.floor(x * this.gridSize);
        if (this.terrain[gx]) this.terrain[gx][this.gridSize-1] = energy;
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        // Move terrain forward
        const scroll = dt * this.speed * (1 + this.energy * 2);
        
        // Shift history and generate new terrain at the horizon
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize - 1; y++) {
                this.terrain[x][y] = this.terrain[x][y + 1];
            }
            // Generate new horizon heights with Perlin-style noise
            const noise = (Math.sin(x * 0.3 + this.time * 1.5) * Math.cos(this.time * 0.5) + 1) * 0.5;
            this.terrain[x][this.gridSize - 1] = noise * (0.3 + complexity * 0.7);
        }
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.6,
            detuneMod: this.energy * 0.3
        };
    }

    getTerrainPoints(w, h, scale) {
        const pts = [];
        const fov = 1.0;
        const horizon = h * 0.4;
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const z = this.terrain[x][y] * 150 * (1 + this.energy);
                
                // Perspective math
                const normX = (x / this.gridSize - 0.5) * 2;
                const normY = (y / this.gridSize); // 0 (near) to 1 (horizon)
                
                const depthScale = 1 / (1 + (1 - normY) * 5);
                const px = w/2 + normX * w * 0.5 * (1 - normY);
                const py = h - (normY * h * 0.6) - (z * (1 - normY));

                pts.push({ x: px, y: py, z: z, depth: normY });
            }
        }
        return pts;
    }
}
