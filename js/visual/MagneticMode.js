import { MagneticMath } from '../math/MagneticMath.js';

/**
 * MagneticMode — Vector field visualization
 * Field lines that distort around attractors and repulsors pulsated by notes.
 * High-fidelity 'Light-Pressure' reactivity.
 */
export class MagneticMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mMath = new MagneticMath();
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
        this.mMath.addPole(noteInfo.normalizedPosition, 0.5 + (Math.random() - 0.5) * 0.4, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.mMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.mMath.step(dt, complexity, speed, lightPressure);

        const gridSize = 20 + Math.floor(complexity * 40);
        const cellW = w / gridSize;
        const cellH = h / gridSize;

        for (let ix = 0; ix <= gridSize; ix++) {
            for (let iy = 0; iy <= gridSize; iy++) {
                const x = ix / gridSize;
                const y = iy / gridSize;

                const { fx, fy } = this.mMath.getFieldAt(x, y);
                const fieldMag = Math.hypot(fx, fy);
                const angle = Math.atan2(fy, fx);

                const sx = x * w;
                const sy = y * h;
                const lineLen = (5 + fieldMag * 50) * (0.5 + intensity * 0.5);
                const alpha = (0.2 + fieldMag * 0.8) * (0.4 + intensity * 0.6);
                const fHue = (hue + fieldMag * 200) % 360;

                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angle);

                // Draw field needle
                ctx.beginPath();
                ctx.moveTo(-lineLen * 0.5, 0);
                ctx.lineTo(lineLen * 0.5, 0);
                ctx.strokeStyle = `hsla(${fHue}, 80%, 75%, ${alpha})`;
                ctx.lineWidth = 1 + fieldMag * 3;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Needle glow
                if (fieldMag > 0.1) {
                    ctx.beginPath();
                    ctx.moveTo(-lineLen * 0.4, 0);
                    ctx.lineTo(lineLen * 0.4, 0);
                    ctx.strokeStyle = `hsla(${fHue}, 80%, 75%, ${alpha * 0.3})`;
                    ctx.lineWidth = 3 + fieldMag * 6;
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // Draw poles
        for (let p of this.mMath.poles) {
            const px = p.x * w;
            const py = p.y * h;
            const pHue = (hue + p.hue) % 360;
            const pAlpha = p.energy * p.life;

            const glowSize = 30 + p.energy * 60;
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
            gradient.addColorStop(0, `hsla(${pHue}, 90%, 80%, ${pAlpha * 0.6})`);
            gradient.addColorStop(1, `hsla(${pHue}, 90%, 80%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
