import { HypercubeMath } from '../math/HypercubeMath.js';

/**
 * HypercubeMode — 4D Tesseract visualization
 * Rotating wireframe of a 4-dimensional hypercube projected into 2D space.
 * Responsive to high-fidelity 'Light-Pressure' and MIDI velocity.
 */
export class HypercubeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.hMath = new HypercubeMath();
        this.width = 0;
        this.height = 0;
        this.trailOpacity = 0.08;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.hMath.addEnergy(noteInfo.normalizedPosition, 0.5 + Math.random() * 0.2, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.hMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.hMath.step(dt, complexity, speed, lightPressure);

        const projected = this.hMath.getProjectedPoints(w, h, complexity, intensity);
        const cx = w * 0.5;
        const cy = h * 0.5;
        const scale = Math.min(w, h) * 1.5;

        ctx.globalCompositeOperation = 'lighter';
        
        // --- Draw Edges ---
        for (let edge of this.hMath.edges) {
            const v1 = projected[edge[0]];
            const v2 = projected[edge[1]];
            
            const x1 = cx + v1[0] * scale;
            const y1 = cy + v1[1] * scale;
            const x2 = cx + v2[0] * scale;
            const y2 = cy + v2[1] * scale;

            const alpha = 0.3 + intensity * 0.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${alpha})`;
            ctx.lineWidth = 1 + intensity * 2;
            ctx.stroke();

            // Edge glow
            if (intensity > 0.5) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${alpha * 0.2})`;
                ctx.lineWidth = 5 + intensity * 10;
                ctx.stroke();
            }
        }

        // --- Draw Vertices (Glow Nodes) ---
        for (let v of projected) {
            const vx = cx + v[0] * scale;
            const vy = cy + v[1] * scale;
            const vAlpha = 0.5 + intensity * 0.5;
            const vSize = 3 + intensity * 5;

            const gradient = ctx.createRadialGradient(vx, vy, 0, vx, vy, vSize * 3);
            gradient.addColorStop(0, `hsla(${hue}, 90%, 90%, ${vAlpha * 0.4})`);
            gradient.addColorStop(1, `hsla(${hue}, 90%, 90%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(vx, vy, vSize * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(vx, vy, vSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 90%, 95%, ${vAlpha})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
