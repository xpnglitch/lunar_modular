import { KaleidoscopeMath } from '../math/KaleidoscopeMath.js';

/**
 * KaleidoscopeMode — Symmetrical mirror visualization
 * Renders geometric primitives mirrored across multiple axes.
 * Responsive to MIDI notes and 'Light-Pressure' forces.
 */
export class KaleidoscopeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.kMath = new KaleidoscopeMath();
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
        // Add a burst of nodes from the note position
        const nx = noteInfo.normalizedPosition;
        const ny = 0.5 + Math.random() * 0.2;
        for (let i = 0; i < 3; i++) {
            this.kMath.addNode(nx, ny, noteInfo.frequency, noteInfo.velocity);
        }
    }

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.kMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.kMath.step(dt, complexity, speed, lightPressure);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const slices = 4 + Math.floor(complexity * 12);
        const angleStep = (Math.PI * 2) / slices;

        ctx.save();
        ctx.translate(cx, cy);

        // Draw for each slice and its mirror
        for (let i = 0; i < slices; i++) {
            ctx.save();
            ctx.rotate(i * angleStep);
            
            // Mirror flip every other slice
            if (i % 2 === 1) {
                ctx.scale(1, -1);
            }

            this._drawSliceContent(ctx, w, h, hue, intensity, complexity);
            ctx.restore();
        }

        ctx.restore();

        // Optional Light-Pressure visual in the center
        if (lightPressure.force > 0.1) {
            const glowSize = 50 + lightPressure.force * 100;
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${lightPressure.force * 0.1})`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, 70%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawSliceContent(ctx, w, h, hue, intensity, complexity) {
        const scale = Math.min(w, h) * 0.5;

        for (let n of this.kMath.nodes) {
            const nx = (Math.cos(n.angle) * n.radius) * scale;
            const ny = (Math.sin(n.angle) * n.radius) * scale;
            const nHue = (hue + n.hue) % 360;
            const nAlpha = (0.3 + n.energy * intensity) * (1 - n.radius);
            const nSize = (n.size + n.energy * 20) * (0.8 + complexity * 0.4);

            if (nAlpha < 0.01) continue;

            ctx.save();
            ctx.translate(nx, ny);
            ctx.rotate(this.kMath.time * (0.5 + complexity) + n.hue);
            
            ctx.fillStyle = `hsla(${nHue}, 80%, 70%, ${nAlpha})`;
            ctx.strokeStyle = `hsla(${nHue}, 80%, 85%, ${nAlpha * 1.5})`;
            ctx.lineWidth = 1;

            if (n.type === 0) { // Triangle
                ctx.beginPath();
                ctx.moveTo(nSize, 0);
                ctx.lineTo(-nSize * 0.5, nSize * 0.86);
                ctx.lineTo(-nSize * 0.5, -nSize * 0.86);
                ctx.fill();
                ctx.stroke();
            } else if (n.type === 1) { // Hex
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const x = Math.cos(angle) * nSize;
                    const y = Math.sin(angle) * nSize;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.fill();
                ctx.stroke();
            } else { // Star
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    const innerAngle = angle + Math.PI / 5;
                    ctx.lineTo(Math.cos(angle) * nSize, Math.sin(angle) * nSize);
                    ctx.lineTo(Math.cos(innerAngle) * (nSize * 0.4), Math.sin(innerAngle) * (nSize * 0.4));
                }
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}
