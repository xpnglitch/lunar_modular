import { PolytopeMath } from '../math/PolytopeMath.js';

/**
 * PolytopeMode — 4D polytope (tesseract/24-cell/120-cell) visualization.
 * Multi-dimensional rotations, depth-layered edges with glow, vertex pulses,
 * and note-triggered dimensional fold events.
 */
export class PolytopeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new PolytopeMath();
        this.folds = [];   // note-triggered fold pulse rings
        this.rotBias = [0, 0, 0, 0, 0, 0]; // 4D rotation angle biases
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Add rotation impulse
        this.rotBias[Math.floor(Math.random() * 6)] += noteInfo.velocity * 0.8;
        // Fold event
        this.folds.push({ r: 0, life: 1.0, vel: noteInfo.velocity, hue: noteInfo.normalizedPosition * 360 });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;

        // === Deep background ===
        ctx.fillStyle = `rgba(1,0,3,${0.15 + (1-intensity)*0.1})`;
        ctx.fillRect(0, 0, w, h);

        // === Background hyperspace grid ===
        ctx.globalAlpha = 0.04 + energy * 0.04;
        ctx.strokeStyle = `hsla(${hue},60%,50%,1)`;
        ctx.lineWidth = 0.4;
        const gridStep = 40;
        for (let x = 0; x < w; x += gridStep) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridStep) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        const scale = Math.min(w, h) * 0.38 * (1 + energy * 0.18);

        // Decay rotation bias
        for (let i = 0; i < this.rotBias.length; i++) {
            this.rotBias[i] *= 0.97;
        }
        // Apply bias to math instance if it supports it
        if (this.mathInstance.applyBias) {
            this.mathInstance.applyBias(this.rotBias);
        }

        const projectedPoints = this.mathInstance.getProjectedPoints(w, h, scale);
        const edges = this.mathInstance.getEdges();

        if (!projectedPoints || !edges) return;

        // === Background glow (hyperspace portal) ===
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.8);
        bgGrad.addColorStop(0, `hsla(${hue},80%,40%,${0.06 + energy * 0.08})`);
        bgGrad.addColorStop(0.5, `hsla(${(hue + 120) % 360},70%,25%,${0.03})`);
        bgGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

        // === Edges — 3 pass render (outer glow → mid → sharp core) ===
        ctx.lineCap = 'round';
        const passes = [
            { widthMult: 12, alphaMult: 0.08 },
            { widthMult: 4, alphaMult: 0.25 },
            { widthMult: 1, alphaMult: 1.0 },
        ];

        for (const pass of passes) {
            ctx.globalCompositeOperation = pass.widthMult > 4 ? 'lighter' : 'source-over';
            for (const [i, j] of edges) {
                if (i >= projectedPoints.length || j >= projectedPoints.length) continue;
                const p1 = projectedPoints[i];
                const p2 = projectedPoints[j];

                const avgZ = ((p1.z ?? 0) + (p2.z ?? 0)) / 2;
                const avgW = ((p1.w ?? 0) + (p2.w ?? 0)) / 2;
                const depth = (1 - (avgZ + 1) / 2);
                const wDepth = (1 - (avgW + 1) / 2);
                const alpha = (0.15 + depth * 0.85) * pass.alphaMult * (0.5 + intensity * 0.5);
                const lw = (0.6 + depth * 2.5 + energy * 1.5) * pass.widthMult;
                const edgeHue = (hue + depth * 80 + wDepth * 40) % 360;
                const light = 45 + depth * 35 + wDepth * 15;

                ctx.lineWidth = lw;
                ctx.strokeStyle = `hsla(${edgeHue},${70 + depth * 25}%,${light}%,${Math.min(1, alpha)})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Vertices ===
        ctx.globalCompositeOperation = 'lighter';
        for (const p of projectedPoints) {
            if (p.x === undefined || p.y === undefined) continue;
            const depth = (1 - ((p.z ?? 0) + 1) / 2);
            const vSize = 2.5 + depth * 5 + energy * 7;
            const vAlpha = 0.4 + depth * 0.6;
            const vHue = (hue + depth * 60 + 30) % 360;

            // Outer glow
            const vg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, vSize * 4);
            vg.addColorStop(0, `hsla(${vHue},100%,90%,${vAlpha * 0.5})`);
            vg.addColorStop(0.4, `hsla(${vHue},90%,70%,${vAlpha * 0.15})`);
            vg.addColorStop(1, 'transparent');
            ctx.fillStyle = vg;
            ctx.beginPath(); ctx.arc(p.x, p.y, vSize * 4, 0, Math.PI * 2); ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${vHue},80%,92%,${Math.min(1, vAlpha)})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, vSize * 0.4), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Fold pulse rings ===
        ctx.globalCompositeOperation = 'lighter';
        this.folds = this.folds.filter(f => f.life > 0.01);
        for (const f of this.folds) {
            f.r += 180 * dt;
            f.life -= dt * 2;
            const fg = ctx.createRadialGradient(cx, cy, f.r * 0.85, cx, cy, f.r * 1.15);
            fg.addColorStop(0, 'transparent');
            fg.addColorStop(0.5, `hsla(${f.hue},100%,80%,${f.life * f.vel * 0.4})`);
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(cx, cy, f.r * 1.15, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
