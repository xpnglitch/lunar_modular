import { ConstellationMath } from '../math/ConstellationMath.js';

/**
 * ConstellationMode — Interactive Spacetime Chart.
 * A high-fidelity astronomical visualization featuring gravitational clustering, 
 * stellar evolution, and a warping spacetime grid background.
 */
export class ConstellationMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ConstellationMath();
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.energy = Math.min(1.0, this.mathInstance.energy + noteInfo.velocity * 0.4);
        
        // Igniting a star cluster
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        for (let i = 0; i < 5; i++) {
            this.mathInstance.addStar(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, 440, noteInfo.velocity);
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);

        const energy = this.mathInstance.energy;

        // --- Deep Space Nebula Backdrop ---
        const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
        bgGrad.addColorStop(0, `hsla(${hue}, 40%, 4%, 1)`);
        bgGrad.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 50%, 2%, 1)`);
        bgGrad.addColorStop(1, '#000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Subtle large nebula clouds
        for (let i = 0; i < 3; i++) {
            const nx = (0.3 + 0.4 * Math.sin(this.time * 0.1 + i)) * w;
            const ny = (0.3 + 0.4 * Math.cos(this.time * 0.13 + i)) * h;
            const r = Math.max(w, h) * 0.6;
            const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
            ng.addColorStop(0, `hsla(${(hue + i * 40) % 360}, 60%, 15%, 0.1)`);
            ng.addColorStop(1, 'transparent');
            ctx.fillStyle = ng;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- Spacetime Warp Grid ---
        ctx.strokeStyle = `hsla(${hue}, 60%, 40%, ${0.1 * intensity})`;
        ctx.lineWidth = 0.5;
        const gridSize = 40;
        const rows = Math.ceil(h / gridSize) + 1;
        const cols = Math.ceil(w / gridSize) + 1;

        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            for (let c = 0; c < cols; c++) {
                const gx = c / (cols - 1);
                const gy = r / (rows - 1);
                // Get metric distortion from math instance
                const dist = this.mathInstance.getDistortion(gx, gy);
                const px = (gx + dist.dx) * w;
                const py = (gy + dist.dy) * h;
                if (c === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        for (let c = 0; c < cols; c++) {
            ctx.beginPath();
            for (let r = 0; r < rows; r++) {
                const gx = c / (cols - 1);
                const gy = r / (rows - 1);
                const dist = this.mathInstance.getDistortion(gx, gy);
                const px = (gx + dist.dx) * w;
                const py = (gy + dist.dy) * h;
                if (r === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // --- Constellation Connections ---
        ctx.lineCap = 'round';
        for (const conn of this.mathInstance.connections) {
            const alpha = conn.alpha * intensity;
            const cHue = (hue + (conn.a.hue + conn.b.hue) * 0.5) % 360;
            
            ctx.beginPath();
            ctx.moveTo(conn.a.x * w, conn.a.y * h);
            ctx.lineTo(conn.b.x * w, conn.b.y * h);
            ctx.strokeStyle = `hsla(${cHue}, 50%, 60%, ${alpha})`;
            ctx.lineWidth = 0.5 + alpha * 1.5;
            ctx.stroke();
            
            // Interaction nodes on connections
            if (alpha > 0.4) {
                 const xMid = (conn.a.x + conn.b.x) * 0.5 * w;
                 const yMid = (conn.a.y + conn.b.y) * 0.5 * h;
                 ctx.fillStyle = `hsla(${cHue}, 100%, 80%, ${alpha * 0.5})`;
                 ctx.beginPath(); ctx.arc(xMid, yMid, 1, 0, Math.PI * 2); ctx.fill();
            }
        }

        // --- Stars (Celestial Entities) ---
        for (const s of this.mathInstance.stars) {
            const sx = s.x * w, sy = s.y * h;
            const sHue = (Number(hue) + (Number(s.hue) || 0)) % 360;
            const sAlpha = Math.max(0, Math.min(1, (0.2 + (Number(s.energy) || 0) * 0.8) * (Number(s.life) || 1) * intensity));
            const size = (s.type === 'giant' ? 3 : 1) * (1 + (Number(s.energy) || 0) * 2);

            // Halo
            const hSize = Math.max(0.1, size * (s.type === 'giant' ? 15 : 6));
            if (isNaN(sHue) || isNaN(sAlpha)) continue;

            const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, hSize);
            haloGrad.addColorStop(0, `hsla(${sHue}, 100%, 80%, ${sAlpha * 0.6})`);
            haloGrad.addColorStop(0.4, `hsla(${(sHue + 20) % 360}, 100%, 60%, ${sAlpha * 0.2})`);
            haloGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = haloGrad;
            ctx.beginPath(); ctx.arc(sx, sy, hSize, 0, Math.PI * 2); ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${sHue}, 100%, 95%, ${sAlpha})`;
            ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
            
            // Diffraction spikes for Giants
            if (s.type === 'giant') {
                ctx.strokeStyle = `hsla(${sHue}, 100%, 80%, ${sAlpha * 0.4})`;
                ctx.lineWidth = 0.5;
                const spike = hSize * 0.8;
                ctx.beginPath();
                ctx.moveTo(sx - spike, sy); ctx.lineTo(sx + spike, sy);
                ctx.moveTo(sx, sy - spike); ctx.lineTo(sx, sy + spike);
                ctx.stroke();
            }
        }

        // --- Global Distortion Ripples ---
        if (energy > 0.4) {
             const rSize = Math.max(w, h) * energy * 0.5;
             const rg = ctx.createRadialGradient(w/2, h/2, rSize * 0.8, w/2, h/2, rSize);
             rg.addColorStop(0, 'transparent');
             rg.addColorStop(0.5, `hsla(${hue}, 100%, 75%, ${energy * 0.05})`);
             rg.addColorStop(1, 'transparent');
             ctx.fillStyle = rg;
             ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
