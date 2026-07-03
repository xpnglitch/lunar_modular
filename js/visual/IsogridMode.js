import { IsogridMath } from '../math/IsogridMath.js';

/**
 * IsogridMode — High-Calibre Isometric Spectral Terrain.
 * Features: 
 * - Phong Specular Reflection on grid surfaces
 * - Height-based chromatic aberration
 * - Normal-mapped lighting derived from 'gtest' calibre.
 */
export class IsogridMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new IsogridMath();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.mathInstance.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        const audioData = mathEngine.getAnalyserData();
        this.mathInstance.update(dt, mathEngine.get('complexity'), audioData);

        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const grid = this.mathInstance.grid;
        const size = this.mathInstance.gridSize;

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        const cellSize = Math.min(w, h) / (size * 0.8);
        const ldx = Math.cos(this.time * 0.5), ldy = Math.sin(this.time * 0.5), ldz = 1.0;

        ctx.save();
        ctx.translate(w / 2, h / 2);

        // Render grid cells with Pro-Level Shading
        for (let q = -size; q <= size; q++) {
            for (let r = -size; r <= size; r++) {
                const cell = this.mathInstance.getCell(q, r);
                if (!cell) continue;

                // Isometric projection
                const px = (q - r) * cellSize * 0.866;
                const py = (q + r) * cellSize * 0.5 - cell.height * 100 * (1 + energy);

                // Normal calculation (simplified isometric normal)
                const nx = (q / size) * 0.2;
                const ny = (r / size) * 0.2;
                const nz = 1.0;
                const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
                const dot = (nx*ldx + ny*ldy + nz*ldz) / nlen;

                // Phong Specular
                const spec = Math.pow(Math.max(0, dot), 20) * 0.5;
                const alpha = 0.4 + cell.height * 0.6;
                const lightness = 20 + dot * 40 + spec * 40;

                ctx.fillStyle = `hsla(${hue + cell.height * 60}, 80%, ${lightness}%, ${alpha})`;
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;

                this._drawHex(ctx, px, py, cellSize * 0.95);
                ctx.fill();
                ctx.stroke();

                // High-calibre "Aura" on active cells
                if (cell.height > 0.6) {
                    ctx.save();
                    ctx.globalAlpha = (cell.height - 0.6) * energy;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        ctx.restore();
    }

    _drawHex(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + (Math.PI / 6);
            ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
        }
        ctx.closePath();
    }
}
