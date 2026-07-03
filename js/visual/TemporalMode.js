import { TemporalMath } from '../math/TemporalMath.js';

/**
 * TemporalMode — Chronos Singularity.
 * A high-fidelity cinematic simulation of time-dilation and spectral echoes.
 * Features cascading historical frame-ghosting, chromatic dimensional bleeding, 
 * and a sweeping temporal nexus that illuminates the past.
 */
export class TemporalMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new TemporalMath();
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.energy = Math.min(1.0, this.mathInstance.energy + noteInfo.velocity * 0.5);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        // Capture current state into temporal buffer
        const activeNotes = mathEngine.getActiveNotes();
        this.mathInstance.addFrame(activeNotes, intensity, hue, complexity);
        this.mathInstance.step(dt, complexity, speed);

        const cx = w / 2, cy = h / 2;
        const sweepAngle = (this.time * 0.8) % (Math.PI * 2);

        // --- LAYER 1: Deep Space Vantablack ---
        ctx.fillStyle = '#010005';
        ctx.fillRect(0, 0, w, h);

        // Temporal Warp Grid
        ctx.strokeStyle = `hsla(${hue}, 40%, 30%, ${0.1 * intensity})`;
        ctx.lineWidth = 0.5;
        const gridSize = 50;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            for (let y = 0; y < h; y += 10) {
                const dx = (x - cx) / w;
                const dy = (y - cy) / h;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const warp = Math.sin(this.time + dist * 5) * 20 * intensity;
                ctx.lineTo(x + warp, y);
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- LAYER 2: Historical Echo Cascade ---
        const buffer = this.mathInstance.buffer;
        for (let i = buffer.length - 1; i >= 0; i--) {
            const f = buffer[i];
            const age = i / Math.max(1, buffer.length);
            const frameAlpha = (1.0 - Math.pow(age, 0.5)) * 0.2 * intensity;
            if (frameAlpha < 0.01) continue;

            const fHue = (f.hue + age * 60) % 360;
            const fScale = 1.0 + age * 1.5;

            for (const n of f.notes) {
                const nx = n.x * w, ny = n.y * h;
                
                // Displacement from origin
                const dx = cx + (nx - cx) * fScale;
                const dy = cy + (ny - cy) * fScale;
                
                const r = (5 + n.vel * 20) * (1 - age * 0.5);
                
                // Illuminated Echo (only glow if near sweep hand)
                const nodeAngle = Math.atan2(dy - cy, dx - cx);
                const angleDiff = Math.abs((nodeAngle + Math.PI * 2) % (Math.PI * 2) - sweepAngle);
                const sweepInt = Math.max(0, 1 - angleDiff * 5) * 5;
                
                const ghostAlpha = frameAlpha * (1 + sweepInt);
                const gG = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 4);
                gG.addColorStop(0, `hsla(${fHue}, 100%, 75%, ${ghostAlpha})`);
                gG.addColorStop(0.5, `hsla(${fHue}, 80%, 50%, ${ghostAlpha * 0.3})`);
                gG.addColorStop(1, 'transparent');
                
                ctx.fillStyle = gG;
                ctx.beginPath(); ctx.arc(dx, dy, r * 4, 0, Math.PI * 2); ctx.fill();
                
                if (age < 0.1) {
                    ctx.fillStyle = `hsla(${fHue}, 100%, 95%, ${ghostAlpha * 0.8})`;
                    ctx.beginPath(); ctx.arc(dx, dy, r * 0.5, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // --- LAYER 3: Temporal Sweep Nexus ---
        const sweepR = Math.max(w, h) * 0.5;
        const sweepG = ctx.createRadialGradient(cx, cy, sweepR * 0.2, cx, cy, sweepR);
        sweepG.addColorStop(0, `hsla(${hue}, 80%, 40%, 0)`);
        sweepG.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.05 * intensity})`);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, sweepR, sweepAngle - 0.2, sweepAngle + 0.2);
        ctx.fillStyle = sweepG;
        ctx.fill();

        // High-energy sweep hand
        const hx = cx + Math.cos(sweepAngle) * sweepR;
        const hy = cy + Math.sin(sweepAngle) * sweepR;
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${0.3 * intensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
        
        const hG = ctx.createRadialGradient(hx, hy, 0, hx, hy, 40);
        hG.addColorStop(0, `rgba(255,255,255,${0.4 * intensity})`);
        hG.addColorStop(1, 'transparent');
        ctx.fillStyle = hG;
        ctx.beginPath(); ctx.arc(hx, hy, 40, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}
