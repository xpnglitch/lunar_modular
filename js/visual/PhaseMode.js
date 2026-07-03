import { PhaseMath } from '../math/PhaseMath.js';

/**
 * PhaseMode — Geometric Interference.
 * A high-fidelity cinematic simulation of wave superposition and interference patterns.
 * Features real-time field rendering of constructive/destructive wave-fronts, 
 * Moiré ghosts, and audio-reactive oscillator emitters.
 */
export class PhaseMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new PhaseMath();
        this.initialized = false;
        this.offscreen = null;
        this.offCtx = null;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        // Half-res buffer for pixel-level interference field
        this.fieldW = Math.floor(w / 4);
        this.fieldH = Math.floor(h / 4);
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.fieldW;
        this.offscreen.height = this.fieldH;
        this.offCtx = this.offscreen.getContext('2d');
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        this.mathInstance.addPulse(x, y, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed);
        const energy = Number(this.mathInstance.energy) || 0;

        // --- LAYER 1: Interference Field Computation ---
        const fw = this.fieldW, fh = this.fieldH;
        const imgData = this.offCtx.createImageData(fw, fh);
        const data = imgData.data;

        for (let y = 0; y < fh; y++) {
            const ny = y / fh;
            for (let x = 0; x < fw; x++) {
                const nx = x / fw;
                
                let val = 0;
                for (const e of this.mathInstance.emitters) {
                    const dist = Math.sqrt((nx - e.x)**2 + (ny - e.y)**2);
                    // Wave equation: sin(dist * freq - phase) * envelope
                    val += Math.sin(dist * (10 + complexity * 30) - e.phi) * e.amp;
                }
                
                // Moiré noise
                val += Math.sin(nx * 100 + this.time) * Math.cos(ny * 100) * 0.1 * complexity;

                // Normalize and color
                const norm = (val / Math.max(1, this.mathInstance.emitters.length) + 1) * 0.5;
                const idx = (y * fw + x) * 4;
                const vHue = (hue + norm * 100) % 360;
                
                // HSL to RGB approximation for speed
                const r = Math.floor(norm * 255);
                data[idx] = r; 
                data[idx + 1] = Math.floor(norm * 128); 
                data[idx + 2] = 255 - r; 
                data[idx + 3] = Math.floor(norm * 200 * intensity);
            }
        }
        this.offCtx.putImageData(imgData, 0, 0);

        // --- LAYER 2: Main Canvas Assembly ---
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        // --- LAYER 3: Wave Front Rings ---
        ctx.lineWidth = 1;
        for (const e of this.mathInstance.emitters) {
            const ex = e.x * w, ey = e.y * h;
            const rBase = (this.time * 0.5 + e.phi * 0.1) % 1.0;
            const r = rBase * Math.max(w, h) * 0.5;
            const alpha = (1 - rBase) * e.amp * intensity;
            
            ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.3})`;
            ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.stroke();
            
            // Emitter core
            if (e.amp > 0.05) {
                const coreG = ctx.createRadialGradient(ex, ey, 0, ex, ey, 15);
                coreG.addColorStop(0, `hsla(${hue}, 100%, 95%, ${e.amp * intensity})`);
                coreG.addColorStop(1, 'transparent');
                ctx.fillStyle = coreG;
                ctx.beginPath(); ctx.arc(ex, ey, 15, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
