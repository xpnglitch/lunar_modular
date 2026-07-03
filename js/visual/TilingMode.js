import { TilingMath } from '../math/TilingMath.js';

/**
 * TilingMode — Non-Euclidean Poincare Disk Tiling.
 * Concentric rings of hyperbolic geometry that warp and compress toward the event boundary.
 * Notes trigger hyperbolic ripples that distort the metric space, illuminating the lattice.
 */
export class TilingMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new TilingMath();
        this.ripples = [];
        this.initialized = false;
        this.diskR = 0;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.diskR = Math.min(w, h) * 0.45;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Add a hyperbolic ripple
        this.ripples.push({
            r: 0,
            life: 1.0,
            vel: noteInfo.velocity,
            hueShift: noteInfo.normalizedPosition * 60 - 30,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.step(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity') || 0.5;
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;
        const R = this.diskR * (1 + energy * 0.05);

        // --- Deep Space Background ---
        ctx.fillStyle = `rgba(3,1,8,${0.15 + (1 - intensity) * 0.1})`;
        ctx.fillRect(0, 0, w, h);

        // --- Disk Atmosphere ---
        const dGrad = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
        dGrad.addColorStop(0, `hsla(${hue},80%,10%,${0.3 + energy * 0.2})`);
        dGrad.addColorStop(0.8, `hsla(${(hue + 40) % 360},60%,5%,${0.5})`);
        dGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = dGrad;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // Update ripples
        this.ripples = this.ripples.filter(r => r.life > 0.01);
        for (const rip of this.ripples) {
            rip.r += dt * 1.5; // expands in hyperbolic metric
            rip.life -= dt * 1.2;
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- Draw Hyperbolic Lattice ---
        // We approximate the Poincare disk by rendering concentric rings of cells.
        // As radius -> R, cell sizes approach 0.
        const rings = 12 + Math.floor(energy * 5);
        const baseSides = 6;
        
        // Spin the entire disk slowly
        const baseRot = this.time * 0.15 * (1 + energy);

        for (let i = 0; i < rings; i++) {
            // Mapping Euclidean to Hyperbolic radius: 
            // We use a non-linear mapping so rings compress at the edge
            // pseudo-hyperbolic radius fraction:
            const r1 = R * (1 - Math.pow(0.65, i));
            const r2 = R * (1 - Math.pow(0.65, i + 1));
            const ringMid = (r1 + r2) / 2;
            
            // Cells in this ring increases as we go out
            const cells = baseSides * (i + 1);
            const angStep = (Math.PI * 2) / cells;

            const ringAlpha = Math.pow((rings - i) / rings, 0.8) * (0.3 + intensity * 0.7);

            for (let c = 0; c < cells; c++) {
                const ang1 = c * angStep + baseRot * (i % 2 === 0 ? 1 : -1);
                const ang2 = (c + 1) * angStep + baseRot * (i % 2 === 0 ? 1 : -1);

                // Calculate local ripple deformation
                let deform = 0;
                let cellHue = hue + (i * 10);
                let cellGlow = 0;

                for (const rip of this.ripples) {
                    // Hyperbolic distance approximation from center
                    const hypDist = Math.atanh(ringMid / R) || 0;
                    const d = Math.abs(hypDist - rip.r * 2);
                    if (d < 0.5) {
                        const falloff = 1 - d / 0.5;
                        deform += falloff * 0.3 * rip.vel; // push outward
                        cellGlow += falloff * rip.life * rip.vel;
                        cellHue += rip.hueShift * falloff;
                    }
                }

                const r1Def = Math.min(R * 0.99, r1 + deform * (r2 - r1));
                const r2Def = Math.min(R * 0.999, r2 + deform * (r2 - r1));

                // Vertices of the cell
                const p1x = cx + Math.cos(ang1) * r1Def, p1y = cy + Math.sin(ang1) * r1Def;
                const p2x = cx + Math.cos(ang2) * r1Def, p2y = cy + Math.sin(ang2) * r1Def;
                const p3x = cx + Math.cos(ang2) * r2Def, p3y = cy + Math.sin(ang2) * r2Def;
                const p4x = cx + Math.cos(ang1) * r2Def, p4y = cy + Math.sin(ang1) * r2Def;

                // Draw edge
                ctx.beginPath();
                ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y);
                ctx.lineTo(p3x, p3y); ctx.lineTo(p4x, p4y);
                ctx.closePath();

                const drawAlpha = ringAlpha * (1 + cellGlow * 3);
                const light = 50 + cellGlow * 40;

                ctx.strokeStyle = `hsla(${cellHue % 360}, 80%, ${light}%, ${drawAlpha})`;
                ctx.lineWidth = 0.5 + (1 - i/rings) * 1.5 + cellGlow * 2;
                ctx.stroke();

                if (cellGlow > 0.1) {
                    ctx.fillStyle = `hsla(${cellHue % 360}, 100%, 70%, ${cellGlow * 0.25 * ringAlpha})`;
                    ctx.fill();
                }
            }
        }

        // --- Boundary Edge ---
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.2 + energy * 0.3})`;
        ctx.lineWidth = 1.5 + energy * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';
    }
}
