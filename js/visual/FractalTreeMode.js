import { FractalTreeMath } from '../math/FractalTreeMath.js';

/**
 * FractalTreeMode — Neural Tree of Life.
 * A high-fidelity organic growth simulation featuring recursive branching with tapered depth, 
 * bio-luminescent blooms, and complex multi-frequency wind dynamics.
 */
export class FractalTreeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new FractalTreeMath();
        this.time = 0;
        this.growthLevel = 0;
        this.targetGrowth = 5;
        this.petals = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Sudden growth burst
        this.targetGrowth = Math.min(9.5, this.targetGrowth + noteInfo.velocity * 0.8);
        
        // Scatter petals from the tree canopy
        const w = this.width, h = this.height;
        const beamX = noteInfo.normalizedPosition * w;
        const count = 12 + Math.floor(noteInfo.velocity * 40);
        for (let i = 0; i < count; i++) {
            this.petals.push({
                x: beamX + (Math.random() - 0.5) * 150,
                y: h * 0.3 + Math.random() * h * 0.2,
                vx: (Math.random() - 0.5) * 100,
                vy: -Math.random() * 80 * noteInfo.velocity,
                life: 1.0,
                size: 2 + Math.random() * 5,
                rot: Math.random() * Math.PI,
                rotV: (Math.random() - 0.5) * 5,
                hueOff: (Math.random() - 0.5) * 40
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawBranch(ctx, x, y, angle, length, depth, maxDepth, hue, energy, scale, complexity) {
        if (depth > maxDepth || length < 2) return;

        // Multi-frequency wind physics
        const wind1 = Math.sin(this.time * 0.8 + depth * 0.2 + x * 0.005) * 0.08;
        const wind2 = Math.cos(this.time * 2.1 + depth * 0.5) * 0.04 * energy;
        const endAngle = angle + wind1 + wind2;

        const ex = x + Math.cos(endAngle) * length;
        const ey = y + Math.sin(endAngle) * length;

        const depthFrac = depth / Math.max(1, maxDepth);
        const bHue = (hue + depthFrac * (40 + complexity * 60)) % 360;
        const bLight = 20 + depthFrac * 40;
        const bAlpha = (0.6 + energy * 0.4) * (1.0 - (depth / 12));

        // Tapered branch logic
        const thickness = Math.max(0.5, (maxDepth - depth + 1) * 2.5 * scale);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `hsla(${bHue}, ${40 + depthFrac * 30}%, ${bLight}%, ${bAlpha})`;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Bio-luminescent blooms at branch tips
        if (depth >= maxDepth - 1) {
            const bloomSize = (2 + energy * 8) * scale;
            const bloomHue = (bHue + 60) % 360;
            
            ctx.globalCompositeOperation = 'lighter';
            const bg = ctx.createRadialGradient(ex, ey, 0, ex, ey, bloomSize * 4);
            bg.addColorStop(0, `hsla(${bloomHue}, 100%, 80%, ${bAlpha * 0.4})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(ex, ey, bloomSize * 4, 0, Math.PI * 2); ctx.fill();
            
            ctx.fillStyle = `hsla(${bloomHue}, 90%, 90%, ${bAlpha})`;
            ctx.beginPath(); ctx.arc(ex, ey, bloomSize, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Recursive branching
        const spread = 0.35 + (energy * 0.15) + (depth * 0.02);
        const shrink = 0.72 + (Math.random() * 0.08);

        this._drawBranch(ctx, ex, ey, endAngle - spread, length * shrink, depth + 1, maxDepth, hue, energy, scale, complexity);
        this._drawBranch(ctx, ex, ey, endAngle + spread, length * (shrink - 0.05), depth + 1, maxDepth, hue, energy, scale, complexity);
        
        // Occasional third branch for higher complexity
        if (depth < 2 && complexity > 0.6) {
             this._drawBranch(ctx, ex, ey, endAngle + (Math.random() - 0.5) * 0.5, length * 0.6, depth + 1, maxDepth, hue, energy, scale, complexity);
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        this.mathInstance.step(dt, mathEngine.get('complexity') || 0);
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const energy = Number(this.mathInstance.energy) || 0;
        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;

        // --- Environmental Backdrop ---
        ctx.fillStyle = `rgba(1, 0, 4, ${0.12 + (1-intensity) * 0.1})`;
        ctx.fillRect(0, 0, w, h);

        // Ground Mist
        const mistG = ctx.createLinearGradient(0, h * 0.7, 0, h);
        mistG.addColorStop(0, 'transparent');
        mistG.addColorStop(1, `hsla(${hue}, 40%, 10%, 0.4)`);
        ctx.fillStyle = mistG;
        ctx.fillRect(0, h * 0.7, w, h * 0.3);

        // Growth Dynamics
        this.growthLevel += (this.targetGrowth - this.growthLevel) * 0.02;
        this.targetGrowth += ( (5 + complexity * 3.5) - this.targetGrowth) * 0.01;
        const maxDepth = Math.floor(this.growthLevel);
        const trunkLen = h * 0.16 + complexity * h * 0.08;

        // Render multiple trees with parallax
        const treeCount = 1 + Math.floor(complexity * 3);
        for (let i = 0; i < treeCount; i++) {
            const tx = w * (0.2 + (i / Math.max(1, treeCount - 1)) * 0.6);
            const ty = h * 0.9 - (i % 2) * 20; // Alternate depth slight offset
            const tScale = 0.6 + (i / treeCount) * 0.5;
            const tHue = (hue + i * 45) % 360;
            
            this._drawBranch(ctx, tx, ty, -Math.PI / 2, trunkLen * tScale, 0, maxDepth, tHue, energy, tScale, complexity);
        }

        // --- Cinematic Petal Scatter ---
        ctx.globalCompositeOperation = 'lighter';
        this.petals = this.petals.filter(p => p.life > 0.01 && p.y < h + 20);
        for (const p of this.petals) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 50 * dt; // Gravity
            p.vx += Math.sin(this.time + p.y * 0.02) * 30 * dt;
            p.rot += p.rotV * dt;
            p.life -= dt * 0.4;

            const pHue = (hue + p.hueOff + 60) % 360;
            ctx.fillStyle = `hsla(${pHue}, 100%, 80%, ${p.life * intensity})`;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
