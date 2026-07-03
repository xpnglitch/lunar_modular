import { RecursiveGridMath } from '../math/RecursiveGridMath.js';

/**
 * RecursiveGridMode — Quantum Cell Subdivision Engine.
 * A living Mondrian-inspired grid that continuously fractures and reforms.
 * Cells pulse with color and split on audio transients, creating cascading
 * subdivision waves. Each cell has a pulsing neon border and glowing fill.
 * The hierarchy of divisions creates depth: fine cells in the distance,
 * massive glowing slabs in the foreground. Pure geometric abstraction.
 */
export class RecursiveGridMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new RecursiveGridMath();
        this.time = 0;
        this._cells = [];
        this._splits = [];  // split animations
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildGrid(w, h);
        this.initialized = true;
    }

    _buildGrid(w, h) {
        // Start with a small set of base cells and recursively split
        this._cells = [];
        const root = { x: 0, y: 0, w, h, depth: 0, hue: Math.random() * 360, phase: Math.random() * Math.PI * 2, energy: 0 };
        this._splitCell(root, 4);
    }

    _splitCell(cell, maxDepth) {
        if (cell.depth >= maxDepth || (cell.w < 30 && cell.h < 30)) {
            this._cells.push(cell);
            return;
        }
        if (Math.random() < 0.35) {
            // Don't split — keep as leaf
            this._cells.push(cell);
            return;
        }
        const splitH = cell.w > cell.h;
        if (splitH) {
            const split = cell.w * (0.3 + Math.random() * 0.4);
            this._splitCell({ x: cell.x, y: cell.y, w: split, h: cell.h, depth: cell.depth+1, hue: (cell.hue + 45 + Math.random()*30) % 360, phase: Math.random()*Math.PI*2, energy: 0 }, maxDepth);
            this._splitCell({ x: cell.x+split, y: cell.y, w: cell.w-split, h: cell.h, depth: cell.depth+1, hue: (cell.hue + 90 + Math.random()*30) % 360, phase: Math.random()*Math.PI*2, energy: 0 }, maxDepth);
        } else {
            const split = cell.h * (0.3 + Math.random() * 0.4);
            this._splitCell({ x: cell.x, y: cell.y, w: cell.w, h: split, depth: cell.depth+1, hue: (cell.hue + 45 + Math.random()*30) % 360, phase: Math.random()*Math.PI*2, energy: 0 }, maxDepth);
            this._splitCell({ x: cell.x, y: cell.y+split, w: cell.w, h: cell.h-split, depth: cell.depth+1, hue: (cell.hue + 90 + Math.random()*30) % 360, phase: Math.random()*Math.PI*2, energy: 0 }, maxDepth);
        }
    }

    _splitCellsNear(x, y, energy) {
        // Find cells containing this point and split them
        const target = this._cells.find(c => x >= c.x && x < c.x+c.w && y >= c.y && y < c.y+c.h);
        if (!target) return;
        const idx = this._cells.indexOf(target);
        this._cells.splice(idx, 1);

        // Record split animation
        this._splits.push({ x: target.x, y: target.y, w: target.w, h: target.h, life: 1.0, energy });

        const newDepth = target.depth + 1;
        const splitH   = target.w > target.h;
        const hueShift = energy * 90;

        if (splitH && target.w > 20) {
            const split = target.w * (0.3 + Math.random() * 0.4);
            this._cells.push({ x: target.x, y: target.y, w: split, h: target.h, depth: newDepth, hue: (target.hue + hueShift) % 360, phase: Math.random()*Math.PI*2, energy });
            this._cells.push({ x: target.x+split, y: target.y, w: target.w-split, h: target.h, depth: newDepth, hue: (target.hue + hueShift + 50) % 360, phase: Math.random()*Math.PI*2, energy });
        } else if (!splitH && target.h > 20) {
            const split = target.h * (0.3 + Math.random() * 0.4);
            this._cells.push({ x: target.x, y: target.y, w: target.w, h: split, depth: newDepth, hue: (target.hue + hueShift) % 360, phase: Math.random()*Math.PI*2, energy });
            this._cells.push({ x: target.x, y: target.y+split, w: target.w, h: target.h-split, depth: newDepth, hue: (target.hue + hueShift + 50) % 360, phase: Math.random()*Math.PI*2, energy });
        } else {
            // Too small — put back
            this._cells.push(target);
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const x = noteInfo.normalizedPosition * w;
        const y = Math.random() * h;
        const splits = 2 + Math.floor(noteInfo.velocity * 6);
        for (let i = 0; i < splits; i++) {
            this._splitCellsNear(x + (Math.random()-0.5)*150, y + (Math.random()-0.5)*150, noteInfo.velocity);
        }
        // Energize nearby cells
        for (const c of this._cells) {
            const cx = c.x + c.w/2, cy = c.y + c.h/2;
            const dist = Math.hypot(cx - x, cy - y);
            if (dist < 200) c.energy = Math.min(1.0, noteInfo.velocity * (1 - dist/200));
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        // Black background
        ctx.fillStyle = `rgba(0,0,0,${0.15 + (1-intensity)*0.1})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Ambient grid reset if too fragmented
        if (this._cells.length > 400) this._buildGrid(w, h);
        if (this._cells.length < 8) this._buildGrid(w, h);

        // Ambient random splits
        if (Math.random() < 0.015 + energy * 0.03) {
            this._splitCellsNear(Math.random() * w, Math.random() * h, 0.2 + energy * 0.3);
        }

        // Energy decay
        for (const c of this._cells) c.energy *= Math.pow(0.94, dt * 60);

        // Draw cells
        for (const c of this._cells) {
            const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.2 + c.phase);
            const cHue  = (hue + c.hue) % 360;
            const boost = c.energy;
            const depthFac = 1 - c.depth * 0.15;

            // Fill
            const fillAlpha = (0.015 + boost * 0.08 + energy * 0.02) * depthFac * (0.4 + intensity*0.4);
            ctx.fillStyle = `hsla(${cHue}, 70%, ${40+boost*30}%, ${fillAlpha})`;
            ctx.fillRect(c.x+1, c.y+1, c.w-2, c.h-2);

            // Border glow
            const borderAlpha = (0.06 + pulse * 0.06 + boost * 0.25 + energy * 0.06) * depthFac * (0.5+intensity*0.5);
            ctx.strokeStyle = `hsla(${cHue}, 90%, ${55+boost*30+pulse*10}%, ${borderAlpha})`;
            ctx.lineWidth   = 0.5 + boost * 3 + (c.depth === 0 ? 2 : 0);
            ctx.strokeRect(c.x+0.5, c.y+0.5, c.w-1, c.h-1);

            // Corner sparkle for energized cells
            if (boost > 0.3 || energy > 0.5) {
                const sg = ctx.createRadialGradient(c.x+c.w/2, c.y+c.h/2, 0, c.x+c.w/2, c.y+c.h/2, Math.max(c.w, c.h) * 0.4);
                sg.addColorStop(0, `hsla(${cHue},100%,80%,${(boost+energy*0.3)*0.1})`);
                sg.addColorStop(1, 'transparent');
                ctx.fillStyle = sg;
                ctx.fillRect(c.x, c.y, c.w, c.h);
            }
        }

        // Split flash animations
        this._splits = this._splits.filter(s => s.life > 0.01);
        for (const s of this._splits) {
            s.life -= dt * 3.0;
            const sHue  = (hue + Math.random() * 60) % 360;
            const alpha = s.life * s.energy * 0.5;
            ctx.strokeStyle = `hsla(${sHue}, 100%, 90%, ${alpha})`;
            ctx.lineWidth   = 2 * s.life;
            ctx.strokeRect(s.x, s.y, s.w, s.h);
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
