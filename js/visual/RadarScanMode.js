import { RadarScanMath } from '../math/RadarScanMath.js';

/**
 * RadarScanMode — Tactical Resonance HUD.
 * A high-fidelity military-grade radar interface. 
 * Features multi-layered data overlays, azimuth readouts, tactical target
 * blips with phosphor persistence, and CRT-style scanline aberrations.
 */
export class RadarScanMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new RadarScanMath();
        this.initialized = false;
        this.time = 0;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0.5;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 120; // Default green
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);
        const energy = Number(this.mathInstance.energy) || 0;
        const sweepAngle = this.mathInstance.sweepAngle;

        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) * 0.42;

        // --- BACKGROUND DISPLAY ---
        ctx.fillStyle = '#010402';
        ctx.fillRect(0, 0, w, h);

        // Grid lines (Background)
        ctx.strokeStyle = `hsla(${hue}, 100%, 20%, 0.15)`;
        ctx.lineWidth = 1;
        const gridSize = 40;
        for(let x = 0; x < w; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for(let y = 0; y < h; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        // --- HUD ELEMENTS (translated to centre) ---
        ctx.save();
        ctx.translate(cx, cy);

        // Concentric range rings
        for (let i = 1; i <= 4; i++) {
            const r = radius * (i / 4);
            ctx.strokeStyle = `hsla(${hue}, 100%, 40%, ${0.2 + (energy * 0.1)})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 15]);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);

            if (complexity > 0.3) {
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.4)`;
                ctx.font = '8px monospace';
                ctx.fillText(`${i * 25}%`, r + 5, 5);
            }
        }

        // Crosshairs
        ctx.strokeStyle = `hsla(${hue}, 100%, 30%, 0.3)`;
        ctx.beginPath(); ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(0, radius); ctx.stroke();

        // --- SWEEP & PHOSPHOR TRAIL ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const trailSegments = 60;
        const trailSpan = Math.PI * 0.6;
        for (let i = 0; i < trailSegments; i++) {
            const angle = sweepAngle - (i / trailSegments) * trailSpan;
            const alpha = (1 - i / trailSegments) * 0.25 * (0.5 + energy * 0.5);
            const tx = Math.cos(angle) * radius;
            const ty = Math.sin(angle) * radius;

            const grad = ctx.createLinearGradient(0, 0, tx, ty);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `hsla(${hue}, 100%, 50%, ${alpha})`);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(tx, ty);
            const nextAngle = sweepAngle - ((i+1) / trailSegments) * trailSpan;
            ctx.lineTo(Math.cos(nextAngle) * radius, Math.sin(nextAngle) * radius);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Main Sweep Line
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
        ctx.stroke();

        // --- TACTICAL BLIPS ---
        for (const b of this.mathInstance.blips) {
            const bx = Math.cos(b.angle) * b.dist * radius;
            const by = Math.sin(b.angle) * b.dist * radius;
            const bAlpha = (b.swept ? 0.9 : 0.3) * (b.life / 3);
            const bSize = (2 + b.energy * 6) * (1 + Math.sin(b.pulse) * 0.2);

            // Blip Glow
            const bg = ctx.createRadialGradient(bx, by, 0, bx, by, bSize * 4);
            bg.addColorStop(0, `hsla(${hue}, 100%, 70%, ${bAlpha})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(bx, by, bSize * 4, 0, Math.PI * 2); ctx.fill();

            // Blip Crosshair Lock
            if (b.swept || b.energy > 0.6) {
                ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${bAlpha * 0.8})`;
                const s = bSize + 5;
                ctx.strokeRect(bx - s, by - s, s*2, s*2);
            }
        }

        ctx.restore(); // resets globalCompositeOperation (lighter → normal), still translated
        ctx.restore(); // resets translate back to Renderer's DPR transform

        // --- HUD DATA OVERLAYS ---
        if (complexity > 0.5) {
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.6)`;
            ctx.font = '10px monospace';
            ctx.fillText("SCANNING INTERFACE v2.0", 20, 30);
            ctx.fillText(`AZIMUTH: ${(sweepAngle * 180 / Math.PI).toFixed(1)}°`, 20, 45);
            ctx.fillText(`TARGETS: ${this.mathInstance.blips.length}`, 20, 60);
            
            // Random data stream
            if (this.time % 0.1 < 0.05) {
                ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.3)`;
                ctx.fillText(`0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}`, w - 70, 30 + Math.random() * 100);
            }
        }

        // --- CRT SCANLINES ---
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }

        // Post-processing: Edge Vignette
        const vig = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, w * 0.8);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }
}
