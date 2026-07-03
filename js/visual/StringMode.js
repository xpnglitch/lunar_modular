/**
 * StringMode — Vibrating string harmonics visualizer
 * Each note creates a vibrating string showing standing wave patterns.
 * Higher complexity reveals more overtones. The harmonic ratios
 * are the same ones heard in the audio (honest coupling).
 */
import { StringMath } from '../math/StringMath.js';

export class StringMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.stringMath = new StringMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 0.1;

        this.activeNotes = new Map();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.stringMath.addString(noteInfo.normalizedPosition, noteInfo.frequency, noteInfo.velocity);
        this.activeNotes.set(noteInfo.index, noteInfo.normalizedPosition);
    }

    onNoteOff(noteIndex) {
        const pos = this.activeNotes.get(noteIndex);
        if (pos !== undefined) {
            this.stringMath.releaseString(pos);
            this.activeNotes.delete(noteIndex);
        }
    }

    getAudioModulation() {
        return this.stringMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        this.stringMath.step(dt);

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const noteCount = mathEngine.noteCount;

        const strings = this.stringMath.strings;
        if (strings.length === 0) {
            // Idle: draw a gently breathing string
            this._drawIdleString(ctx, w, h, hue, intensity);
            return;
        }

        // Layout strings vertically
        const margin = h * 0.1;
        const availableHeight = h - margin * 2;
        const slotHeight = Math.min(availableHeight / strings.length, 180);
        const totalHeight = slotHeight * strings.length;
        const startY = (h - totalHeight) * 0.5;

        for (let si = 0; si < strings.length; si++) {
            const s = strings[si];
            const centerY = startY + slotHeight * (si + 0.5);
            const stringWidth = w * 0.75;
            const startX = (w - stringWidth) * 0.5;

            // Get current amplitude
            let amp = s.amplitude;
            if (!s.active) {
                amp *= Math.exp(-(this.stringMath.time - s.decayStart) * 0.5);
            }
            if (amp < 0.01) continue;

            const stringHue = (hue + si * 45) % 360;
            const saturation = 70 + intensity * 25;
            const lightness = 50 + amp * 25;
            const maxDisplacement = slotHeight * 0.35 * amp;

            // Draw fixed endpoints
            const endpointSize = 4;
            ctx.fillStyle = `hsla(0, 0%, 70%, 0.6)`;
            ctx.beginPath();
            ctx.arc(startX, centerY, endpointSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(startX + stringWidth, centerY, endpointSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw the string as a smooth curve
            const resolution = 200;
            ctx.beginPath();
            for (let i = 0; i <= resolution; i++) {
                const x = i / resolution;
                const displacement = this.stringMath.sampleString(s, x, complexity);
                const px = startX + x * stringWidth;
                const py = centerY + displacement * maxDisplacement;

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }

            // Main string line
            ctx.strokeStyle = `hsla(${stringHue}, ${saturation}%, ${lightness}%, ${0.7 + noteCount * 0.05})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Glow line
            ctx.strokeStyle = `hsla(${stringHue}, ${saturation}%, ${lightness + 15}%, ${0.15 + intensity * 0.1})`;
            ctx.lineWidth = 6;
            ctx.stroke();

            // Draw nodal points (where displacement is always 0)
            const numHarmonics = 3 + Math.floor(complexity * 12);
            // The dominant harmonic determines the nodal pattern
            for (let n = 2; n <= Math.min(numHarmonics, 8); n++) {
                for (let k = 1; k < n; k++) {
                    const nodeX = startX + (k / n) * stringWidth;
                    const nodeAlpha = 0.15 * amp * (1 - (n - 2) / 8);
                    if (nodeAlpha < 0.02) continue;

                    ctx.beginPath();
                    ctx.arc(nodeX, centerY, 3, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${stringHue}, 40%, 80%, ${nodeAlpha})`;
                    ctx.fill();
                }
            }

            // Draw harmonic envelope (optional at high complexity)
            if (complexity > 0.4) {
                ctx.beginPath();
                for (let i = 0; i <= resolution; i++) {
                    const x = i / resolution;
                    // Envelope from dominant harmonic
                    const envelope = Math.abs(Math.sin(Math.PI * x)) * maxDisplacement;
                    const px = startX + x * stringWidth;

                    if (i === 0) {
                        ctx.moveTo(px, centerY - envelope);
                    } else {
                        ctx.lineTo(px, centerY - envelope);
                    }
                }
                for (let i = resolution; i >= 0; i--) {
                    const x = i / resolution;
                    const envelope = Math.abs(Math.sin(Math.PI * x)) * maxDisplacement;
                    const px = startX + x * stringWidth;
                    ctx.lineTo(px, centerY + envelope);
                }
                ctx.closePath();
                ctx.fillStyle = `hsla(${stringHue}, ${saturation}%, ${lightness}%, 0.03)`;
                ctx.fill();
            }
        }
    }

    _drawIdleString(ctx, w, h, hue, intensity) {
        const centerY = h * 0.5;
        const stringWidth = w * 0.6;
        const startX = (w - stringWidth) * 0.5;
        const resolution = 200;
        const breathe = Math.sin(this.time * 0.5) * 15;

        ctx.beginPath();
        for (let i = 0; i <= resolution; i++) {
            const x = i / resolution;
            const py = centerY + Math.sin(x * Math.PI) * breathe;
            const px = startX + x * stringWidth;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${hue}, 50%, 60%, 0.2)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Endpoints
        ctx.fillStyle = `hsla(0, 0%, 70%, 0.3)`;
        ctx.beginPath();
        ctx.arc(startX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(startX + stringWidth, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
