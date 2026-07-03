/**
 * MoireMode — Op-art moiré interference visualization
 * Two overlapping patterns (concentric circles + rotated circles)
 * create hypnotic interference fringes. Notes shift the overlay.
 * 
 * Performance: All circles/lines batched into single path draws.
 */
import { MoireMath } from '../math/MoireMath.js';

export class MoireMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.moireMath = new MoireMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.moireMath.onNote(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.moireMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const hue = mathEngine.get('colorHue');
        const noteCount = mathEngine.noteCount;
        const lightPressure = mathEngine.getLightPressure();

        this.moireMath.update(dt, complexity);

        const spacing = this.moireMath.patternSpacing;
        const ox = this.moireMath.offsetX;
        const oy = this.moireMath.offsetY;
        const rot = this.moireMath.rotation;

        const cx = w / 2;
        const cy = h / 2;

        const maxRadius = Math.sqrt(cx * cx + cy * cy);
        // Cap circle count for performance
        const numCircles = Math.min(Math.ceil(maxRadius / spacing), 80);

        ctx.globalCompositeOperation = 'lighter';

        // Pattern A — base circles (SINGLE batched path)
        ctx.beginPath();
        for (let i = 1; i <= numCircles; i++) {
            const r = i * spacing;
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        ctx.strokeStyle = `hsla(${hue}, 30%, 40%, ${0.25 + intensity * 0.15})`;
        ctx.lineWidth = 1 + intensity;
        ctx.stroke();

        // Pattern B — offset circles (SINGLE batched path)
        const bx = cx + ox;
        const by = cy + oy;

        // Light-pressure warp (computed once, not per circle)
        const lpX = lightPressure.x * w;
        const lpY = lightPressure.y * h;
        const warpStrength = lightPressure.force * 150;
        const distToCenter = Math.hypot(bx - lpX, by - lpY);
        const warpFactor = (1.0 / (1.0 + distToCenter * 0.005)) * warpStrength;
        const warpedX = bx + (bx - lpX) * warpFactor * 0.01;
        const warpedY = by + (by - lpY) * warpFactor * 0.01;

        ctx.beginPath();
        for (let i = 1; i <= numCircles; i++) {
            const r = i * spacing;
            ctx.moveTo(warpedX + r, warpedY);
            ctx.arc(warpedX, warpedY, r, 0, Math.PI * 2);
        }
        const overlayHue = (hue + 30 + noteCount * 10) % 360;
        ctx.strokeStyle = `hsla(${overlayHue}, 40%, 45%, ${0.25 + intensity * 0.15})`;
        ctx.lineWidth = 1 + intensity;
        ctx.stroke();

        // Pattern C — rotated line grids (batched)
        if (complexity > 0.3) {
            const lineSpacing = spacing * 1.5;
            const numLines = Math.min(Math.ceil(maxRadius * 2 / lineSpacing), 60);
            const alpha = 0.08 + (complexity - 0.3) * 0.2;
            const gridHue = (hue + 60) % 360;

            // Grid 1
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.beginPath();
            for (let i = -numLines; i <= numLines; i++) {
                const y = i * lineSpacing;
                ctx.moveTo(-maxRadius, y);
                ctx.lineTo(maxRadius, y);
            }
            ctx.strokeStyle = `hsla(${gridHue}, 35%, 40%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();

            // Grid 2
            ctx.save();
            ctx.translate(cx + ox * 0.5, cy + oy * 0.5);
            ctx.rotate(rot + Math.PI * 0.3);
            ctx.beginPath();
            for (let i = -numLines; i <= numLines; i++) {
                const y = i * lineSpacing;
                ctx.moveTo(-maxRadius, y);
                ctx.lineTo(maxRadius, y);
            }
            ctx.strokeStyle = `hsla(${gridHue}, 35%, 40%, ${alpha * 0.7})`;
            ctx.stroke();
            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';

        // Center glow
        const glowSize = 60 + noteCount * 20;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
        glow.addColorStop(0, `hsla(${hue}, 60%, 60%, ${0.05 + noteCount * 0.02})`);
        glow.addColorStop(1, `hsla(${hue}, 60%, 60%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
        ctx.fill();
    }
}
