import { WormholeMath } from '../math/WormholeMath.js';

/**
 * WormholeMode — Einstein-Rosen bridge: geometric rings converging to a vanishing point,
 * with gravitational lensing distortion and spacetime fabric warping.
 */
export class WormholeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new WormholeMath();
        this.time = 0;
        this.rings = [];    // tunnel ring positions
        this.distortions = []; // note-triggered spacetime pulses
        this.initialized = false;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.distortions.push({
            z: 0, life: 1.0, vel: noteInfo.velocity,
            hueShift: noteInfo.normalizedPosition * 120 - 60,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.5;

        // Persistent trail
        ctx.fillStyle = `rgba(0,0,0,${0.12 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.08})`;
        ctx.fillRect(0, 0, w, h);

        // === Background: fabric grid ===
        const gridStep = 40 + complexity * 10;
        const gridCols = Math.ceil(w / gridStep) + 2;
        const gridRows = Math.ceil(h / gridStep) + 2;
        ctx.strokeStyle = `hsla(${hue},50%,30%,${0.12 + energy * 0.08})`;
        ctx.lineWidth = 0.5;
        for (let gr = 0; gr < gridRows; gr++) {
            ctx.beginPath();
            for (let gc = 0; gc < gridCols; gc++) {
                const gx = gc * gridStep - gridStep;
                const gy = gr * gridStep - gridStep;
                // Warp toward center
                const dx = gx - cx, dy = gy - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const warp = maxR * maxR / (dist * dist + maxR * 0.8) * (0.8 + energy * 1.2);
                const wx = gx + (dx / (dist + 1)) * warp * 0.15;
                const wy = gy + (dy / (dist + 1)) * warp * 0.15;
                if (gc === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }
        for (let gc = 0; gc < gridCols; gc++) {
            ctx.beginPath();
            for (let gr = 0; gr < gridRows; gr++) {
                const gx = gc * gridStep - gridStep;
                const gy = gr * gridStep - gridStep;
                const dx = gx - cx, dy = gy - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const warp = maxR * maxR / (dist * dist + maxR * 0.8) * (0.8 + energy * 1.2);
                const wx = gx + (dx / (dist + 1)) * warp * 0.15;
                const wy = gy + (dy / (dist + 1)) * warp * 0.15;
                if (gr === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }

        // === Tunnel rings (geometric circles converging to vanishing point) ===
        const ringCount = 18;
        const tunnelSpeed = 0.4 + energy * 0.8;
        const ringPhase = (this.time * tunnelSpeed) % 1;

        for (let i = 0; i < ringCount; i++) {
            const t = ((i / ringCount) + ringPhase) % 1; // 0=far, 1=close
            const depth = Math.pow(t, 2.0); // non-linear depth
            const r = maxR * depth * 0.96;
            const alpha = depth * depth * (0.5 + energy * 0.35);

            if (r < 2) continue;

            const ringHue = (hue + i * 14 + this.time * 10) % 360;

            // Outer glow ring
            ctx.strokeStyle = `hsla(${ringHue},90%,${50 + depth * 30}%,${alpha * 0.4})`;
            ctx.lineWidth = 2 + depth * 6;
            ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2); ctx.stroke();

            // Sharp inner ring
            ctx.strokeStyle = `hsla(${ringHue},100%,${70 + depth * 25}%,${alpha * 0.85})`;
            ctx.lineWidth = 0.8 + depth * 1.5;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

            // Radial spokes (12 per ring, fading away from close ones)
            if (depth > 0.3) {
                const spokeCount = 12;
                ctx.strokeStyle = `hsla(${ringHue},80%,70%,${alpha * depth * 0.3})`;
                ctx.lineWidth = 0.5;
                for (let s = 0; s < spokeCount; s++) {
                    const sa = (s / spokeCount) * Math.PI * 2 + this.time * 0.05;
                    const prevT = ((i - 1) / ringCount + ringPhase) % 1;
                    const prevR = maxR * Math.pow(prevT, 2.0) * 0.96;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(sa) * r, cy + Math.sin(sa) * r);
                    ctx.lineTo(cx + Math.cos(sa) * prevR, cy + Math.sin(sa) * prevR);
                    ctx.stroke();
                }
            }
        }

        // === Note distortion pulses ===
        ctx.globalCompositeOperation = 'lighter';
        this.distortions = this.distortions.filter(d => d.life > 0.01);
        for (const d of this.distortions) {
            d.z += dt * 1.8;
            d.life -= dt * 1.0;
            const pr = maxR * Math.pow(Math.min(1, d.z), 2);
            const pr1 = Math.max(0.1, pr * 0.8);
            const pr2 = Math.max(pr1 + 0.1, pr * 1.2);
            const dg = ctx.createRadialGradient(cx, cy, pr1, cx, cy, pr2);
            dg.addColorStop(0, 'transparent');
            dg.addColorStop(0.5, `hsla(${(hue + d.hueShift) % 360},100%,80%,${d.life * d.vel * 0.7})`);
            dg.addColorStop(1, 'transparent');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.arc(cx, cy, pr * 1.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Event horizon aperture ===
        const horizonR = maxR * 0.04 + energy * maxR * 0.05;
        const horizonRadius = Math.max(0.1, horizonR * 3);
        const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, horizonRadius);
        hg.addColorStop(0, '#000');
        hg.addColorStop(0.6, `hsla(${(hue + 180) % 360},100%,60%,${0.4 + energy * 0.3})`);
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, horizonR * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, horizonR, 0, Math.PI * 2); ctx.fill();
    }
}
