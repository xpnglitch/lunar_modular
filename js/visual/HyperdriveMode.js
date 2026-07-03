import { HyperdriveMath } from '../math/HyperdriveMath.js';

/**
 * HyperdriveMode — Warp speed star tunnel: stars stretch into speed lines rushing past the viewer.
 * Notes trigger acceleration bursts. Speed and color shift with energy.
 */
export class HyperdriveMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new HyperdriveMath();
        this.time = 0;
        this.stars = [];
        this.speed = 0;
        this.targetSpeed = 0.4;
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initStars(w, h);
        this.initialized = true;
    }

    _initStars(w, h) {
        this.stars = Array.from({ length: 300 }, () => this._makestar(w, h, true));
    }

    _makestar(w, h, spread = false) {
        const z = spread ? Math.random() * 1.5 : 1.5;
        return {
            x: (Math.random() - 0.5) * 2.2,
            y: (Math.random() - 0.5) * 2.2,
            z,
            px: null, py: null,
            hueShift: (Math.random() - 0.5) * 60,
            size: 0.5 + Math.random() * 1.2,
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.targetSpeed = 1.5 + noteInfo.velocity * 3.5;
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;

        // Decay speed toward base
        const baseSpeed = 0.35 + energy * 0.8;
        this.targetSpeed += (baseSpeed - this.targetSpeed) * 0.015;
        this.speed += (this.targetSpeed - this.speed) * 0.07;

        // Full black clear (warp looks better on pure black)
        ctx.fillStyle = `rgba(0,0,0,${0.25 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.2})`;
        ctx.fillRect(0, 0, w, h);

        // Warp tunnel: concentric ellipses
        const tunnelCount = 6;
        for (let i = 0; i < tunnelCount; i++) {
            const frac = (i + 1) / tunnelCount;
            const rr = frac * Math.min(w, h) * 0.5;
            const tunnelHue = (hue + i * 20) % 360;
            ctx.strokeStyle = `hsla(${tunnelHue},100%,${40 + frac * 30}%,${frac * frac * 0.15 * (0.5 + energy)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rr, rr * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'lighter';

        for (const s of this.stars) {
            // Project 3D star onto 2D
            const sx = (s.x / s.z) * w * 0.5 + cx;
            const sy = (s.y / s.z) * h * 0.5 + cy;

            // Advance z (star approaches viewer)
            const prevZ = s.z;
            s.z -= this.speed * dt * (0.8 + energy * 0.6);

            if (s.z <= 0.01 || sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
                Object.assign(s, this._makestar(w, h, false));
                s.z = 1.5;
                s.px = null; s.py = null;
                continue;
            }

            const psx = (s.x / s.z) * w * 0.5 + cx;
            const psy = (s.y / s.z) * h * 0.5 + cy;

            // Stretch: draw line from old projected pos to new
            const stretchLen = Math.hypot(psx - (s.px || psx), psy - (s.py || psy));
            const brightness = Math.min(1, this.speed * 0.5) * (0.5 + energy * 0.5);
            const starHue = (hue + s.hueShift) % 360;

            if (s.px !== null && stretchLen > 0.5) {
                const grad = ctx.createLinearGradient(s.px, s.py, psx, psy);
                grad.addColorStop(0, `hsla(${starHue},80%,70%,0)`);
                grad.addColorStop(0.6, `hsla(${starHue},90%,90%,${brightness * 0.8})`);
                grad.addColorStop(1, `hsla(${(starHue + 20) % 360},100%,98%,${brightness})`);
                ctx.strokeStyle = grad;
                ctx.lineWidth = s.size * Math.min(2.5, this.speed * 0.8);
                ctx.beginPath();
                ctx.moveTo(s.px, s.py);
                ctx.lineTo(psx, psy);
                ctx.stroke();
            } else {
                // Close star: draw dot
                ctx.fillStyle = `hsla(${starHue},80%,90%,${brightness})`;
                ctx.beginPath();
                ctx.arc(psx, psy, s.size, 0, Math.PI * 2);
                ctx.fill();
            }

            s.px = psx; s.py = psy;
        }
        ctx.globalCompositeOperation = 'source-over';

        // Central warp core glow
        const warpR = 20 + this.speed * 25;
        const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, warpR);
        wg.addColorStop(0, `hsla(${hue},20%,99%,${0.9 * Math.min(1, this.speed * 0.6)})`);
        wg.addColorStop(0.3, `hsla(${(hue + 40) % 360},100%,70%,${0.6 * Math.min(1, this.speed * 0.5)})`);
        wg.addColorStop(1, 'transparent');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.arc(cx, cy, warpR, 0, Math.PI * 2); ctx.fill();
    }
}
