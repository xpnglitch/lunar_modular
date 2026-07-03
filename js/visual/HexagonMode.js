import { HexagonMath } from '../math/HexagonMath.js';

/**
 * HexagonMode — Hexagonal Cellular Automata.
 * A technical honeycomb lattice where cells pulse and interact based on spectral history.
 * Geometric, grid-based, and highly structured.
 */
export class HexagonMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new HexagonMath();
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
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const energy = this.mathInstance.energy;
        
        // Dynamic hex size
        const hexSize = (Math.min(w, h) / 30) * (1 + energy * 0.1);
        const hexPoints = this.mathInstance.getHexagonPositions(w, h, hexSize);

        // Technical Grid Background
        ctx.strokeStyle = `hsla(${hue}, 80%, 30%, 0.1)`;
        ctx.lineWidth = 0.5;

        // Draw Cells
        hexPoints.forEach(p => {
            const alpha = 0.1 + p.active * 0.8;
            const lightness = 20 + p.active * 60;
            const size = hexSize * (0.4 + p.active * 0.6);

            // Draw Hexagon Primitive
            ctx.fillStyle = `hsla(${hue + p.q * 5}, 70%, ${lightness}%, ${alpha * 0.4})`;
            ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness + 20}%, ${alpha})`;
            ctx.lineWidth = 1.0 + p.active * 3.0;

            this._drawHexagon(ctx, p.x, p.y, size);
            ctx.fill();
            ctx.stroke();

            // Internal detail for "Active" cells
            if (p.active > 0.5) {
                ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${p.active * 0.3})`;
                this._drawHexagon(ctx, p.x, p.y, size * 0.5);
                ctx.fill();
            }
        });
        
        // Transient Overlays (Connecting active regions)
        if (energy > 0.4) {
            ctx.strokeStyle = `hsla(${hue + 60}, 100%, 70%, ${energy * 0.3})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            hexPoints.filter(p => p.active > 0.6).forEach((p, idx) => {
                idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        }
    }

    _drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + (Math.PI / 6);
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
    }
}
