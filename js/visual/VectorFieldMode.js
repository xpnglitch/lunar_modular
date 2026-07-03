import { VectorFieldMath } from '../math/VectorFieldMath.js';

/**
 * VectorFieldMode — High-Density Eulerian Flow.
 * Features: Particle advection, kinetic occlusion, and trail-based motion blur.
 * Technical, analytical, and highly structured visualization.
 */
export class VectorFieldMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new VectorFieldMath();
        this.trailCanvas = null;
        this.trailCtx = null;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = w;
        this.trailCanvas.height = h;
        this.trailCtx = this.trailCanvas.getContext('2d');
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

        if (!this.trailCanvas) this.resize(w, h);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const energy = this.mathInstance.energy;

        // --- LAYER 1: Accumulative Trails ---
        this.trailCtx.fillStyle = `rgba(0, 0, 0, ${0.05 + energy * 0.1})`; // Feedback loop
        this.trailCtx.fillRect(0, 0, w, h);

        this.mathInstance.particles.forEach(p => {
            const px = p.x * w;
            const py = p.y * h;

            // Kinetic Occlusion mapping (Z is simulated depth)
            const z = (Math.sin(p.x * 5 + this.time) + 1) * 0.5;
            const size = 1 + (1 - z) * 3 + energy * 5;
            const alpha = 0.5 + (1 - z) * 0.5;
            const lightness = 40 + (1 - z) * 40;

            this.trailCtx.fillStyle = `hsla(${hue + z * 20}, 80%, ${lightness}%, ${alpha})`;
            this.trailCtx.beginPath();
            this.trailCtx.arc(px, py, size, 0, Math.PI * 2);
            this.trailCtx.fill();
        });

        // --- LAYER 2: Vector Field Overlay ---
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(this.trailCanvas, 0, 0);

        // Technical Grid Visualization
        const gs = this.mathInstance.gridSize;
        const cellSizeX = w / gs;
        const cellSizeY = h / gs;

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.15)`;
        ctx.lineWidth = 0.5;

        for (let x = 0; x < gs; x++) {
            for (let y = 0; y < gs; y++) {
                const f = this.mathInstance.field[x][y];
                const cx = (x + 0.5) * cellSizeX;
                const cy = (y + 0.5) * cellSizeY;
                
                // Draw vector arrows
                const len = 10 + (Math.hypot(f.vx, f.vy) * 2) * (1 + energy);
                const angle = Math.atan2(f.vy, f.vx);
                
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.moveTo(-len/2, 0); ctx.lineTo(len/2, 0);
                ctx.stroke();
                
                // Head
                if (energy > 0.4) {
                    ctx.beginPath();
                    ctx.moveTo(len/2, 0); ctx.lineTo(len/2 - 4, -2); ctx.lineTo(len/2 - 4, 2);
                    ctx.closePath();
                    ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.4)`;
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        // Focal Glow
        if (energy > 0.5) {
            ctx.shadowBlur = 15 * energy;
            ctx.shadowColor = `hsla(${hue}, 100%, 75%, ${energy})`;
            ctx.globalAlpha = energy * 0.3;
            ctx.drawImage(this.trailCanvas, 0, 0);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }
    }
}
