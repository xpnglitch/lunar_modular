import { FractureMath } from '../math/FractureMath.js';

/**
 * FractureMode — Voronoi shattering with displacement and glow.
 * 
 * The screen fractures into Voronoi-like shards. Notes trigger
 * shattering events that crack the surface, with shards separating
 * and revealing bright light through the cracks.
 */
export class FractureMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new FractureMath();
        this.points = [];
        this.cracks = [];
        this._initPoints();
    }

    _initPoints() {
        for (let i = 0; i < 40; i++) {
            this.points.push({
                x: Math.random(),
                y: Math.random(),
                ox: 0, oy: 0, // displacement offset
                hue: Math.random() * 360,
                shade: 0.5 + Math.random() * 0.5
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Create radial cracks from impact point
        const crackCount = 4 + Math.floor(noteInfo.velocity * 8);
        for (let i = 0; i < crackCount; i++) {
            const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.3;
            this.cracks.push({
                x: noteInfo.normalizedPosition,
                y: 0.3 + Math.random() * 0.4,
                angle,
                length: 0.05 + noteInfo.velocity * 0.2,
                energy: noteInfo.velocity,
                life: 1.0
            });
        }
        // Displace nearby Voronoi points
        for (const p of this.points) {
            const dx = p.x - noteInfo.normalizedPosition;
            const dy = p.y - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.3) {
                const force = (1 - dist / 0.3) * noteInfo.velocity;
                p.ox += (dx / (dist + 0.01)) * force * 0.05;
                p.oy += (dy / (dist + 0.01)) * force * 0.05;
            }
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;

        // Spring points back toward original position
        for (const p of this.points) {
            p.ox *= 0.95;
            p.oy *= 0.95;
        }

        // Render Voronoi-like cells using nearest-point coloring
        const cellSize = 8;
        const cellCols = Math.ceil(w / cellSize);
        const cellRows = Math.ceil(h / cellSize);

        for (let row = 0; row < cellRows; row++) {
            for (let col = 0; col < cellCols; col++) {
                const px = (col + 0.5) / cellCols;
                const py = (row + 0.5) / cellRows;

                // Find nearest Voronoi point
                let minDist = Infinity;
                let nearestPoint = null;
                let secondDist = Infinity;

                for (const p of this.points) {
                    const dx = px - (p.x + p.ox);
                    const dy = py - (p.y + p.oy);
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                        secondDist = minDist;
                        minDist = d;
                        nearestPoint = p;
                    } else if (d < secondDist) {
                        secondDist = d;
                    }
                }

                // Edge detection (close to Voronoi boundary)
                const edgeFactor = 1 - Math.min(1, (secondDist - minDist) * 200);

                const cellHue = hue + (nearestPoint ? nearestPoint.hue * 0.3 : 0);
                const cellShade = nearestPoint ? nearestPoint.shade : 0.5;
                const displacement = nearestPoint ? Math.sqrt(nearestPoint.ox * nearestPoint.ox + nearestPoint.oy * nearestPoint.oy) : 0;

                let cellLight = 8 + cellShade * 15 + displacement * 200;
                let cellAlpha = 0.9;
                let cellSat = 30 + intensity * 30;

                // Edge glow (cracks between cells)
                if (edgeFactor > 0.5) {
                    cellLight = 40 + edgeFactor * 50 + energy * 30;
                    cellSat = 70 + energy * 30;
                    cellAlpha = 0.5 + edgeFactor * 0.5;
                }

                ctx.fillStyle = `hsla(${cellHue}, ${cellSat}%, ${cellLight}%, ${cellAlpha})`;
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }

        // Render explicit cracks
        for (let i = this.cracks.length - 1; i >= 0; i--) {
            const c = this.cracks[i];
            c.life -= dt * 0.8;
            if (c.life <= 0) { this.cracks.splice(i, 1); continue; }

            const sx = c.x * w;
            const sy = c.y * h;
            const len = c.length * Math.min(w, h) * c.life;

            ctx.strokeStyle = `hsla(${hue + 40}, 100%, 80%, ${c.life * c.energy * 0.7})`;
            ctx.lineWidth = 1 + c.energy * 2;
            ctx.shadowColor = `hsla(${hue + 40}, 100%, 70%, ${c.life * 0.5})`;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            let bx = sx, by = sy;
            const segs = 5;
            for (let s = 0; s < segs; s++) {
                bx += Math.cos(c.angle + (Math.random() - 0.5) * 0.5) * len / segs;
                by += Math.sin(c.angle + (Math.random() - 0.5) * 0.5) * len / segs;
                ctx.lineTo(bx, by);
            }
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Impact flash
        if (energy > 0.6) {
            ctx.fillStyle = `hsla(${hue + 40}, 80%, 90%, ${(energy - 0.6) * 0.1})`;
            ctx.fillRect(0, 0, w, h);
        }

        while (this.cracks.length > 50) this.cracks.shift();
    }
}
