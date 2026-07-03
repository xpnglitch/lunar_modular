/**
 * HexagonMath — 2D Hexagonal Cellular Automata.
 * Grid-based system where cells react to specific audio frequency bands.
 * Hexagonal layout for a technical, organic feel.
 */
export class HexagonMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.gridSize = 12;
        this.cells = [];
        this._initCells();
    }

    _initCells() {
        for (let q = -this.gridSize; q <= this.gridSize; q++) {
            for (let r = Math.max(-this.gridSize, -q - this.gridSize); r <= Math.min(this.gridSize, -q + this.gridSize); r++) {
                this.cells.push({ q, r, active: 0, lastActive: 0, target: 0 });
            }
        }
    }

    addPulse(x, energy) {
        // Find cells at the proportional mapping of the x value (normalized position)
        const targetQ = Math.round((x - 0.5) * this.gridSize * 2);
        this.cells.forEach(c => {
            if (c.q === targetQ) c.target = Math.max(c.target, energy);
        });
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        this.cells.forEach(c => {
            // Cellular logic: decay and random neighbor activity based on complexity
            c.active = c.active * 0.9 + c.target * 0.1;
            c.target *= 0.8;
            
            // Interaction: complexity drives neighbor spreading
            if (complexity > 0.5 && c.active > 0.4) {
                const neighbors = this._getNeighbors(c);
                neighbors.forEach(n => { n.target += complexity * 0.05; });
            }
        });
    }

    _getNeighbors(c) {
        const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        return this.cells.filter(other => 
            dirs.some(d => other.q === c.q + d[0] && other.r === c.r + d[1])
        );
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.4,
            oscMix: 0.2 + this.energy * 0.6
        };
    }

    getHexagonPositions(w, h, size) {
        const cx = w / 2;
        const cy = h / 2;
        
        return this.cells.map(c => {
            const px = cx + size * (3/2 * c.q);
            const py = cy + size * (Math.sqrt(3)/2 * c.q + Math.sqrt(3) * c.r);
            return { x: px, y: py, active: c.active, q: c.q, r: c.r };
        });
    }
}
