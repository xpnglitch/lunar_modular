import { ImpressionistMath } from '../math/ImpressionistMath.js';

/**
 * ImpressionistMode — Monet-style painterly dabs accumulate over time.
 * Notes scatter fresh impasto strokes. The canvas builds a luminous layered painting.
 * Connected to sound: soft piano → gentle dabs; loud → broad gestural strokes.
 */
export class ImpressionistMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new ImpressionistMath();
        this.time = 0;
        this.strokes = [];       // active animated strokes
        this.strokeBudget = 8;   // auto-strokes per frame
        this.initialized = false;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    _makeStroke(x, y, hue, velocity, size) {
        return {
            x, y,
            hue: (hue + (Math.random() - 0.5) * 35) % 360,
            sat: 50 + Math.random() * 40,
            light: 35 + Math.random() * 40,
            size: size || (8 + velocity * 30 + Math.random() * 15),
            angle: Math.random() * Math.PI,
            alpha: 0.55 + Math.random() * 0.35,
            life: 1.0,
            decayRate: 0.3 + Math.random() * 0.5,
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;
        const hue = 0; // resolved at render time
        const cx = noteInfo.normalizedPosition * w;
        const cy = h * (0.25 + Math.random() * 0.5);
        const count = 8 + Math.floor(noteInfo.velocity * 24);
        const spread = 60 + noteInfo.velocity * 150;
        for (let i = 0; i < count; i++) {
            this.strokes.push({
                x: cx + (Math.random() - 0.5) * spread,
                y: cy + (Math.random() - 0.5) * spread * 0.6,
                hue: noteInfo.normalizedPosition * 360,
                sat: 55 + Math.random() * 40,
                light: 35 + Math.random() * 35,
                size: 10 + noteInfo.velocity * 45 + Math.random() * 20,
                angle: Math.random() * Math.PI,
                alpha: 0.6 + noteInfo.velocity * 0.3,
                life: 1.0,
                decayRate: 0.4 + Math.random() * 0.6,
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawStroke(ctx, x, y, hue, sat, light, size, angle, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        // Elliptical brush dab
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        g.addColorStop(0, `hsla(${hue},${sat}%,${Math.min(90, light + 15)}%,${alpha})`);
        g.addColorStop(0.5, `hsla(${hue},${sat}%,${light}%,${alpha * 0.7})`);
        g.addColorStop(1, `hsla(${hue},${sat}%,${light - 10}%,0)`);
        ctx.fillStyle = g;
        ctx.scale(1, 0.4); // flatten to dab shape
        ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');

        // Very slow fade — painting persists
        ctx.fillStyle = `rgba(0,0,0,${0.025 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.015})`;
        ctx.fillRect(0, 0, w, h);

        // Auto ambient strokes (landscape, sky, water)
        const autoCount = Math.floor(2 + energy * 6 + complexity * 4);
        for (let i = 0; i < autoCount; i++) {
            const zone = Math.random();
            let y, skyHue, size;
            if (zone < 0.35) {
                // Sky zone (top)
                y = Math.random() * h * 0.4;
                skyHue = (hue + 180) % 360; // complementary
                size = 15 + Math.random() * 30;
            } else if (zone < 0.6) {
                // Midground
                y = h * 0.35 + Math.random() * h * 0.3;
                skyHue = (hue + 60) % 360;
                size = 10 + Math.random() * 20;
            } else {
                // Foreground / water
                y = h * 0.65 + Math.random() * h * 0.35;
                skyHue = hue;
                size = 8 + Math.random() * 18;
            }
            this._drawStroke(ctx, Math.random() * w, y, skyHue, 55 + energy * 20, 35 + Math.random() * 35, size, Math.random() * Math.PI, 0.18 + energy * 0.1);
        }

        // Active note strokes
        this.strokes = this.strokes.filter(s => s.life > 0.01);
        for (const s of this.strokes) {
            s.life -= s.decayRate * dt;
            if (s.life <= 0) continue;
            // Hue drift toward current base
            s.hue += ((hue + (s.hue % 60)) - s.hue) * 0.04;
            this._drawStroke(ctx, s.x, s.y, s.hue, s.sat, s.light, s.size * s.life, s.angle, s.alpha * s.life);
        }

        // Luminous light catch highlights (impressionist shimmer)
        ctx.globalCompositeOperation = 'lighter';
        const shimmerCount = Math.floor(energy * 20);
        for (let i = 0; i < shimmerCount; i++) {
            const sx = Math.random() * w;
            const sy = Math.random() * h;
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8 + energy * 15);
            sg.addColorStop(0, `hsla(${(hue + 50) % 360},60%,95%,${energy * 0.3})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 8 + energy * 15, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
