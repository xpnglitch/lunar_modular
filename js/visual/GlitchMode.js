import { GlitchMath } from '../math/GlitchMath.js';

/**
 * GlitchMode — Neural Entropy.
 * A high-fidelity cinematic simulation of digital signal failure and total entropy.
 * Features CRT scanline artifacts, multi-layer RGB chromatic aberration, 
 * recursive buffer fragmentation, and temporal jitter.
 */
export class GlitchMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new GlitchMath();
        this.initialized = false;
        this.offscreen = null;
        this.offCtx = null;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = w;
        this.offscreen.height = h;
        this.offCtx = this.offscreen.getContext('2d');
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, 0.5, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed, mathEngine.getLightPressure());
        const energy = Number(this.mathInstance.energy) || 0;

        // --- LAYER 1: Base Signal Generation (Recursive Feedback) ---
        this.offCtx.save();
        // Feedback echo
        this.offCtx.globalAlpha = 0.85 + (1-intensity) * 0.1;
        this.offCtx.drawImage(this.offscreen, 
            (Math.random()-0.5) * 4 * energy, 
            (Math.random()-0.5) * 4 * energy, w, h);
        
        // Base content: Digital artifacts
        this.offCtx.globalAlpha = 0.1 * intensity;
        this.offCtx.fillStyle = '#010005';
        this.offCtx.fillRect(0, 0, w, h);

        const hueVal = (hue + this.time * 20) % 360;
        this.offCtx.strokeStyle = `hsla(${hueVal}, 80%, 60%, 0.4)`;
        this.offCtx.lineWidth = 1;
        
        // Grid lines (flickering)
        if (Math.random() > 0.1) {
            const numLines = 5 + Math.floor(complexity * 10);
            for (let i = 0; i < numLines; i++) {
                const lp = (this.time * 0.2 + i / numLines) % 1.0;
                this.offCtx.beginPath();
                this.offCtx.moveTo(lp * w, 0); this.offCtx.lineTo(lp * w, h);
                this.offCtx.stroke();
            }
        }
        this.offCtx.restore();

        // --- LAYER 2: Entropy Corruptions (Pixel Shifting) ---
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Core Glitch Rendering: Slicing the offscreen buffer
        for (const s of this.mathInstance.slices) {
            const sX = s.type === 'v' ? s.pos * w : 0;
            const sY = s.type === 'h' ? s.pos * h : 0;
            const sW = s.type === 'v' ? s.size * w : w;
            const sH = s.type === 'h' ? s.size * h : h;
            
            const offset = s.offset * w * (0.5 + energy);
            const rgbOff = s.rgbSplit * w * intensity * 5;

            // Chromatic Aberration: R, G, B passes
            ctx.globalCompositeOperation = 'lighter';
            
            // RED
            ctx.filter = `hue-rotate(${s.hueOff}deg) brightness(1.5)`;
            const rx = s.type === 'v' ? sX + offset - rgbOff : sX + offset;
            const ry = s.type === 'h' ? sY + offset - rgbOff : sY + offset;
            ctx.drawImage(this.offscreen, sX, sY, sW, sH, rx, ry, sW, sH);

            // BLUE/CYAN
            ctx.filter = `hue-rotate(${s.hueOff + 180}deg) brightness(1.2)`;
            const bx = s.type === 'v' ? sX + offset + rgbOff : sX + offset;
            const by = s.type === 'h' ? sY + offset + rgbOff : sY + offset;
            ctx.drawImage(this.offscreen, sX, sY, sW, sH, bx, by, sW, sH);
            
            ctx.filter = 'none';
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw main clean-ish pass with jitter
        const jitX = (Math.random() - 0.5) * 10 * energy;
        const jitY = (Math.random() - 0.5) * 10 * energy;
        ctx.globalAlpha = 0.6;
        ctx.drawImage(this.offscreen, jitX, jitY, w, h);
        ctx.globalAlpha = 1.0;

        // --- LAYER 3: CRT Scanlines & Noise ---
        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < h; i += 4) {
            ctx.fillRect(0, i, w, 1);
        }

        // Periodic Frame Jump
        if (Math.random() < 0.02 * energy) {
            ctx.drawImage(ctx.canvas, 0, 0, w, h, (Math.random()-0.5)*50, (Math.random()-0.5)*50, w, h);
        }

        // Block Compression Artifacts (Fakes)
        if (energy > 0.5) {
             ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.1)`;
             for (let i = 0; i < 5; i++) {
                 const bx = Math.random() * w, by = Math.random() * h;
                 const bw = 20 + Math.random() * 80, bh = 10 + Math.random() * 40;
                 ctx.fillRect(bx, by, bw, bh);
             }
        }

        ctx.restore();
    }
}
