import { ParametricMath } from '../math/ParametricMath.js';

/**
 * ParametricMode — Multi-layer parametric curves (Lissajous, rose, epitrochoid) with
 * slowly evolving a/b ratios. Each note adds a new curve layer with different parameters.
 */
export class ParametricMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new ParametricMath();
        this.time = 0;
        this.curves = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        // Seed initial curves
        if (this.curves.length === 0) this._seedCurves(w, h);
        this.initialized = true;
    }

    _seedCurves(w, h) {
        const types = ['lissajous', 'rose', 'epitrochoid'];
        for (let i = 0; i < 4; i++) {
            this.curves.push(this._makeCurve(types[i % types.length], i));
        }
    }

    _makeCurve(type, seed) {
        return {
            type,
            a: 1 + Math.floor(seed * 1.7) % 5,
            b: 2 + Math.floor(seed * 2.3) % 6,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: (Math.random() - 0.5) * 0.15,
            rotSpeed: (Math.random() - 0.5) * 0.04,
            rot: Math.random() * Math.PI * 2,
            scale: 0.3 + Math.random() * 0.18,
            life: 1.0,
            decaySpeed: 0.04 + Math.random() * 0.04,
            hueShift: (Math.random() - 0.5) * 80,
            points: 120 + Math.floor(seed * 30) % 80,
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const types = ['lissajous', 'rose', 'epitrochoid'];
        const type = types[Math.floor(noteInfo.normalizedPosition * types.length)];
        const curve = this._makeCurve(type, noteInfo.normalizedPosition * 10);
        curve.life = 0.6 + noteInfo.velocity * 0.4;
        curve.decaySpeed = 0.06 + (1 - noteInfo.velocity) * 0.08;
        curve.a = 1 + Math.floor(noteInfo.normalizedPosition * 7);
        curve.b = 2 + Math.floor(noteInfo.normalizedPosition * 5 + 1);
        curve.hueShift = (noteInfo.normalizedPosition - 0.5) * 100;
        this.curves.push(curve);
        // Keep max curves manageable
        if (this.curves.length > 8) this.curves.shift();
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _computePoint(curve, t, cx, cy, w, h, energy) {
        const scale = Math.min(w, h) * (curve.scale + energy * 0.08);
        const pt = curve.phase + t;

        switch (curve.type) {
            case 'lissajous': {
                const x = Math.sin(curve.a * t + pt) * scale;
                const y = Math.sin(curve.b * t) * scale;
                return { x: cx + x, y: cy + y };
            }
            case 'rose': {
                const k = curve.a / curve.b;
                const r = scale * Math.cos(k * t);
                return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
            }
            case 'epitrochoid': {
                const R = scale * 0.55, rr = scale * (0.2 + energy * 0.1), d = scale * 0.3;
                const x = (R + rr) * Math.cos(t) - d * Math.cos((R + rr) / rr * t);
                const y = (R + rr) * Math.sin(t) - d * Math.sin((R + rr) / rr * t);
                return { x: cx + x, y: cy + y };
            }
            default:
                return { x: cx, y: cy };
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;

        // Slow trail
        ctx.fillStyle = `rgba(0,0,0,${0.06 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.06})`;
        ctx.fillRect(0, 0, w, h);

        // Update and draw curves
        this.curves = this.curves.filter(c => c.life > 0.005);
        for (const curve of this.curves) {
            curve.phase += curve.phaseSpeed * dt * (1 + energy * 1.5);
            curve.rot += curve.rotSpeed * dt;
            curve.life -= curve.decaySpeed * dt;

            const steps = curve.points;
            const maxT = Math.PI * 2 * curve.b;
            const curveHue = (hue + curve.hueShift) % 360;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(curve.rot);
            ctx.translate(-cx, -cy);

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t = (i / steps) * maxT;
                const pt = this._computePoint(curve, t, cx, cy, w, h, energy);
                const tFrac = i / steps;
                const hFrac = (curveHue + tFrac * 40) % 360;

                if (i === 0) {
                    ctx.moveTo(pt.x, pt.y);
                } else {
                    ctx.lineTo(pt.x, pt.y);
                }
            }
            ctx.closePath();

            // Filled with gradient, then stroked
            const pg = ctx.createLinearGradient(cx - w * curve.scale, cy, cx + w * curve.scale, cy);
            pg.addColorStop(0, `hsla(${curveHue},80%,55%,${curve.life * 0.08})`);
            pg.addColorStop(0.5, `hsla(${(curveHue + 40) % 360},90%,65%,${curve.life * 0.12})`);
            pg.addColorStop(1, `hsla(${curveHue},80%,55%,${curve.life * 0.08})`);
            ctx.fillStyle = pg; ctx.fill();

            ctx.strokeStyle = `hsla(${curveHue},90%,${60 + energy * 20}%,${curve.life * (0.6 + energy * 0.3)})`;
            ctx.lineWidth = 1.2 + energy * 1.2;
            ctx.stroke();
            ctx.restore();

            // Glow overlay
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            const glowStep = Math.floor(steps / 8);
            for (let i = 0; i <= glowStep; i++) {
                const t = (i / glowStep) * maxT;
                const pt = this._computePoint(curve, t, cx, cy, w, h, energy);
                if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
            }
            ctx.strokeStyle = `hsla(${(curveHue + 20) % 360},100%,80%,${curve.life * energy * 0.25})`;
            ctx.lineWidth = 3 + energy * 3;
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Auto-seed decaying curves
        if (this.curves.length < 2 || energy > 0.15 && this.curves.length < 6) {
            if (Math.random() < 0.02 + energy * 0.05) {
                const types = ['lissajous', 'rose', 'epitrochoid'];
                this.curves.push(this._makeCurve(types[Math.floor(Math.random() * types.length)], this.time));
            }
        }
    }
}
