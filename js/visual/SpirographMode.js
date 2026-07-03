import { SpirographMath } from '../math/SpirographMath.js';

/**
 * SpirographMode — Cycloid3D overhaul
 * 3D cycloidal patterns with nested rotations and perspective projection.
 * High-fidelity geometric meshes that evolve with synth parameters.
 */
export class Cycloid3DMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.spirographMath = new SpirographMath();
        this.width = 0;
        this.height = 0;
        this.trailOpacity = 0.05;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.spirographMath.setFromNote(
            noteInfo.normalizedPosition, 
            0.5, // placeholder ny
            noteInfo.frequency, 
            noteInfo.velocity
        );
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.spirographMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.spirographMath.step(dt, complexity, speed, lightPressure);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const scale = Math.min(w, h) * 0.4;

        ctx.globalCompositeOperation = 'screen';

        // Draw multiple layers of 3D curves
        const numLayers = 3 + Math.floor(complexity * 5);
        const steps = 1000 + Math.floor(complexity * 1000);

        for (let l = 0; l < numLayers; l++) {
            const lAlpha = (0.2 + intensity * 0.5) * (1 - l / numLayers);
            const lHue = (hue + l * 10) % 360;

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t = (i / steps) * Math.PI * 2 * 10;
                const pos = this.spirographMath.getPositionAt(t, l, complexity);
                
                const px = cx + pos.x * scale;
                const py = cy + pos.y * scale;

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }

            ctx.strokeStyle = `hsla(${lHue}, 80%, 70%, ${lAlpha})`;
            ctx.lineWidth = 1 + intensity * 2;
            ctx.stroke();

            // Mesh glow
            if (intensity > 0.5) {
                ctx.strokeStyle = `hsla(${lHue}, 80%, 70%, ${lAlpha * 0.2})`;
                ctx.lineWidth = 4 + intensity * 8;
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
