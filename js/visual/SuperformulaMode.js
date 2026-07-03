import { SuperformulaMath } from '../math/SuperformulaMath.js';

/**
 * SuperformulaMode — Gielis shape visualization
 * Intricate silhouettes are morphing their parameters based on 'complexity' and notes.
 * Responsive to high-fidelity 'Light-Pressure' forces.
 */
export class SuperformulaMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.sMath = new SuperformulaMath();
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
        this.sMath.setFromNote(noteInfo.normalizedPosition, 0.5 + Math.random() * 0.2, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.sMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.sMath.step(dt, complexity, speed, lightPressure);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const maxRadius = Math.min(w, h) * 0.4;

        // Draw multiple layers for depth
        const layers = 3 + Math.floor(complexity * 5);
        for (let l = 0; l < layers; l++) {
            const layerScale = 1 - (l / layers) * 0.5;
            const lHue = (hue + l * 20) % 360;
            const lAlpha = (0.2 + intensity * 0.6) * (1 - l / layers);

            ctx.beginPath();
            const segments = 200 + Math.floor(complexity * 400);
            for (let i = 0; i <= segments; i++) {
                const t = (i / segments) * Math.PI * 2;
                const r = this.sMath.getRadius(t);
                const rx = cx + Math.cos(t) * r * maxRadius * layerScale;
                const ry = cy + Math.sin(t) * r * maxRadius * layerScale;
                
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            
            ctx.strokeStyle = `hsla(${lHue}, 80%, 75%, ${lAlpha})`;
            ctx.lineWidth = 1 + l / 2;
            ctx.stroke();

            // Core glow for the inner layer
            if (l === 0) {
                const glowSize = maxRadius * 1.5;
                const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
                gradient.addColorStop(0, `hsla(${lHue}, 80%, 70%, ${lAlpha * 0.1})`);
                gradient.addColorStop(1, `hsla(${lHue}, 80%, 70%, 0)`);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }
    }
}
