import { MyceliumMath } from '../math/MyceliumMath.js';

/**
 * MyceliumMode — Neural Fungal Growth.
 * A high-fidelity biological simulation of persistent fungal hyphae.
 * Features space-colonization branching logic, persistent bioluminescent 
 * filaments with spectral decay, and high-energy network pulses.
 */
export class NeuralFungalMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new MyceliumMath();
        this.initialized = false;
        this.time = 0;
        
        // Persistence buffer for the growing network
        this.persistCanvas = document.createElement('canvas');
        this.persistCtx = this.persistCanvas.getContext('2d');
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.persistCanvas.width = w;
        this.persistCanvas.height = h;
        this.persistCtx.fillStyle = '#010005';
        this.persistCtx.fillRect(0, 0, w, h);
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        this.mathInstance.addPulse(x, y, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawPersistentBranch(b, hue, intensity) {
        const ctx = this.persistCtx;
        const w = this.width, h = this.height;
        const bHue = (hue + (Number(b.hue) || 0)) % 360;
        const alpha = (0.2 + (Number(b.energy) || 0) * 0.5) * (Number(b.life) || 1);
        const lw = 0.5 + (Number(b.energy) || 0) * 2;

        ctx.lineCap = 'round';

        // Outer Glow
        ctx.strokeStyle = `hsla(${bHue}, 100%, 60%, ${alpha * 0.15})`;
        ctx.lineWidth = lw * 4;
        ctx.beginPath(); ctx.moveTo(b.x1 * w, b.y1 * h); ctx.lineTo(b.x2 * w, b.y2 * h); ctx.stroke();

        // Core Filament
        ctx.strokeStyle = `hsla(${bHue}, 80%, 80%, ${alpha * 0.8})`;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(b.x1 * w, b.y1 * h); ctx.lineTo(b.x2 * w, b.y2 * h); ctx.stroke();
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0.5;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);
        const energy = Number(this.mathInstance.energy) || 0;

        // Draw new growth to the persistence buffer
        for (const b of this.mathInstance.newBranches) {
            this._drawPersistentBranch(b, hue, intensity);
        }

        // Slow decay of the persistent network
        this.persistCtx.globalCompositeOperation = 'source-over';
        this.persistCtx.fillStyle = `rgba(1, 0, 5, ${0.005 * (1.2 - intensity)})`;
        this.persistCtx.fillRect(0, 0, w, h);

        // Blit persistence buffer
        ctx.drawImage(this.persistCanvas, 0, 0);

        // --- Foreground: Active Tips & Nutrients ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Attractor Nutrients (tiny glowing dots)
        for (const a of this.mathInstance.attractors) {
            if (!a.active) continue;
            const aAlpha = 0.1 + energy * 0.2;
            ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${aAlpha})`;
            ctx.fillRect(a.x * w, a.y * h, 1, 1);
        }

        // Growth Tips (Bright Lead)
        for (const t of this.mathInstance.tips) {
            const tx = t.x * w, ty = t.y * h;
            const tHue = (hue + (Number(t.hue) || 0)) % 360;
            const tEnergy = Number(t.energy) || 0;
            const tAlpha = (0.6 + tEnergy * 0.4) * intensity;
            const tRadius = 2 + tEnergy * 6;

            // Tip Glow
            const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, tRadius * 4);
            tg.addColorStop(0, `hsla(${tHue}, 100%, 90%, ${tAlpha * 0.8})`);
            tg.addColorStop(1, 'transparent');
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.arc(tx, ty, tRadius * 4, 0, Math.PI * 2); ctx.fill();

            // Tip Core
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(tx, ty, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Network Bioluminescence Flash
        if (energy > 0.5) {
            const fg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
            fg.addColorStop(0, `hsla(${hue}, 100%, 60%, ${energy * 0.04})`);
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, w, h);
        }
    }

    clear() {
        this.mathInstance.clear();
        if (this.persistCtx) {
            this.persistCtx.fillStyle = '#010005';
            this.persistCtx.fillRect(0, 0, this.width, this.height);
        }
    }
}
