import { SurrealWarpMath } from '../math/SurrealWarpMath.js';

/**
 * SurrealWarpMode — Melting clocks and warped landscape.
 * 
 * Dalí-inspired surreal landscape with warped horizon, melting
 * geometric shapes, and dream-like color gradients. Notes create
 * ripple distortions in the warp field.
 */
export class SurrealWarpMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new SurrealWarpMath();
        this.ripples = [];
        this.objects = [];
        this._initObjects();
    }

    _initObjects() {
        // Floating surreal objects
        for (let i = 0; i < 12; i++) {
            this.objects.push({
                x: 0.1 + Math.random() * 0.8,
                y: 0.2 + Math.random() * 0.5,
                type: ['sphere', 'column', 'arch', 'drip'][Math.floor(Math.random() * 4)],
                size: 20 + Math.random() * 60,
                phase: Math.random() * Math.PI * 2,
                hueShift: Math.random() * 100 - 50,
                meltFactor: 0
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.ripples.push({
            x: noteInfo.normalizedPosition,
            y: 0.5,
            radius: 0,
            speed: 0.3 + noteInfo.velocity * 0.4,
            energy: noteInfo.velocity,
            life: 1.0
        });
        // Melt nearby objects
        for (const obj of this.objects) {
            const dist = Math.abs(obj.x - noteInfo.normalizedPosition);
            if (dist < 0.25) {
                obj.meltFactor = Math.min(1, obj.meltFactor + noteInfo.velocity * 0.5);
            }
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;
        const t = this.time;

        // Dreamy gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
        skyGrad.addColorStop(0, `hsla(${hue + 30}, 60%, 65%, 1)`);
        skyGrad.addColorStop(0.4, `hsla(${hue + 10}, 70%, 50%, 1)`);
        skyGrad.addColorStop(0.7, `hsla(${hue - 20}, 50%, 40%, 1)`);
        skyGrad.addColorStop(1, `hsla(${hue - 40}, 40%, 25%, 1)`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Warped horizon
        const horizonY = h * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 5) {
            const wave = Math.sin(x * 0.005 + t * speed * 0.2) * 20 +
                Math.sin(x * 0.01 + t * speed * 0.1) * 10;
            ctx.lineTo(x, horizonY + wave);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        groundGrad.addColorStop(0, `hsla(${hue + 20}, 30%, 35%, 1)`);
        groundGrad.addColorStop(1, `hsla(${hue + 40}, 25%, 15%, 1)`);
        ctx.fillStyle = groundGrad;
        ctx.fill();

        // Checkerboard perspective on ground
        const checks = 20;
        for (let r = 0; r < 8; r++) {
            const ry = horizonY + r * (h - horizonY) / 8;
            const perspective = r / 8;
            for (let c = 0; c < checks; c++) {
                if ((r + c) % 2 === 0) continue;
                const cx = (c / checks) * w;
                const cw = w / checks;
                const ch = (h - horizonY) / 8;
                ctx.fillStyle = `hsla(${hue + 20}, 20%, ${20 + perspective * 10}%, ${0.15 - perspective * 0.01})`;
                ctx.fillRect(cx, ry, cw, ch);
            }
        }

        // Ripple distortions
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed * dt;
            r.life -= dt * 0.6;
            if (r.life <= 0) { this.ripples.splice(i, 1); continue; }

            const rx = r.x * w;
            const ry = r.y * h;
            const rr = r.radius * w * 0.5;
            const alpha = r.life * r.energy * 0.15;

            ctx.strokeStyle = `hsla(${hue + 60}, 80%, 70%, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(rx, ry, rr, rr * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Render surreal objects
        for (const obj of this.objects) {
            obj.meltFactor *= 0.98;
            const px = obj.x * w;
            const py = obj.y * h;
            const sz = obj.size * (0.8 + Math.sin(t * 0.5 + obj.phase) * 0.2);
            const melt = obj.meltFactor;
            const objHue = hue + obj.hueShift;

            ctx.save();
            ctx.translate(px, py);
            // Apply melt distortion as a vertical scale
            ctx.scale(1 + melt * 0.3, 1 - melt * 0.3);

            if (obj.type === 'sphere') {
                const grad = ctx.createRadialGradient(0, -sz * 0.2, sz * 0.1, 0, 0, sz);
                grad.addColorStop(0, `hsla(${objHue}, 60%, 75%, 0.8)`);
                grad.addColorStop(0.7, `hsla(${objHue}, 50%, 40%, 0.6)`);
                grad.addColorStop(1, `hsla(${objHue}, 40%, 20%, 0.3)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, sz, 0, Math.PI * 2);
                ctx.fill();
                // Shadow
                ctx.fillStyle = `rgba(0,0,0,0.15)`;
                ctx.beginPath();
                ctx.ellipse(0, sz + 10 + melt * 20, sz * 0.8, sz * 0.15, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (obj.type === 'column') {
                ctx.fillStyle = `hsla(${objHue + 20}, 30%, 50%, 0.7)`;
                ctx.fillRect(-sz * 0.15, -sz, sz * 0.3, sz * 2);
                // Dripping from melt
                if (melt > 0.1) {
                    ctx.fillStyle = `hsla(${objHue}, 40%, 40%, ${melt * 0.5})`;
                    ctx.beginPath();
                    ctx.ellipse(0, sz + melt * 30, sz * 0.2, melt * 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (obj.type === 'arch') {
                ctx.strokeStyle = `hsla(${objHue - 20}, 40%, 55%, 0.7)`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, sz, Math.PI, 0);
                ctx.stroke();
                // Pillars
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fillRect(-sz - 2, 0, 4, sz * 0.6);
                ctx.fillRect(sz - 2, 0, 4, sz * 0.6);
            } else {
                // Dripping blob
                ctx.fillStyle = `hsla(${objHue + 40}, 50%, 50%, 0.6)`;
                ctx.beginPath();
                ctx.arc(0, 0, sz * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-sz * 0.1, sz * 0.5);
                ctx.quadraticCurveTo(0, sz * 0.5 + sz * (0.5 + melt), sz * 0.1, sz * 0.5);
                ctx.fill();
            }

            ctx.restore();
        }

        // Floating particles (dream dust)
        for (let p = 0; p < 15; p++) {
            const px = (Math.sin(t * 0.1 + p * 1.3) * 0.4 + 0.5) * w;
            const py = (Math.cos(t * 0.15 + p * 0.9) * 0.3 + 0.35) * h;
            const pAlpha = 0.1 + Math.sin(t + p) * 0.05 + energy * 0.1;
            ctx.fillStyle = `hsla(${hue + p * 20}, 70%, 80%, ${pAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 2 + Math.sin(t * 0.5 + p) * 1, 0, Math.PI * 2);
            ctx.fill();
        }

        while (this.ripples.length > 15) this.ripples.shift();
    }
}
