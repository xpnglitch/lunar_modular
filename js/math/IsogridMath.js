/**
 * IsogridMath — Isometric hexagonal spectral terrain logic.
 * Transforms a hexagonal grid (axial coordinates) into an isometric view.
 * Supports height-mapping and audio-reactive pulses.
 */
export class IsogridMath {
    constructor() {
        this.time = 0;
        this.energy = 0;
        this.complexity = 0;
        this.cells = new Map();
        this.gridSize = 12; // Radius of hexagonal grid
        this._initGrid();
    }

    _initGrid() {
        this.cells.clear();
        for (let q = -this.gridSize; q <= this.gridSize; q++) {
            for (let r = Math.max(-this.gridSize, -q - this.gridSize); r <= Math.min(this.gridSize, -q + this.gridSize); r++) {
                this.cells.set(`${q},${r}`, { height: 0, target: 0 });
            }
        }
    }

    addPulse(x, energy) {
        // Map normalized x to axial q
        const targetQ = Math.round((x - 0.5) * this.gridSize * 2);
        this.cells.forEach((val, key) => {
            const [q, r] = key.split(',').map(Number);
            if (q === targetQ) {
                val.target = Math.max(val.target, energy);
            }
        });
        this.energy = Math.min(1.0, this.energy + energy);
    }

    update(dt, complexity, audioData) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.94;

        this.cells.forEach((cell, key) => {
            cell.height = cell.height * 0.9 + cell.target * 0.1;
            cell.target *= 0.8;

            // Decay
            cell.height *= 0.98;
        });

        // Map audioData to the center line if available
        if (audioData) {
            const mid = Math.floor(audioData.length / 2);
            for (let q = -this.gridSize; q <= this.gridSize; q++) {
                const val = (audioData[(q + this.gridSize) % audioData.length] / 255);
                const cell = this.cells.get(`${q},0`);
                if (cell) cell.target = Math.max(cell.target, val * 0.3);
            }
        }
    }

    getCell(q, r) {
        return this.cells.get(`${q},${r}`);
    }

    getAudioModulation() {
        return {
            filterMod: this.energy * 0.5,
            harmonics: this.energy * 0.4
        };
    }
}
