import { WindStreakMath } from '../math/WindStreakMath.js';

/**
 * WindStreakMode — Directional wind lines with particle streaks.
 * 
 * Hundreds of fine lines sweep across the screen following a
 * turbulent flow field. Notes add bursts of bright streaks and
 * shift the wind direction. Creates a sense of speed and motion.
 */
export class WindStreakMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new WindStreakMath();
        this.streaks = [];
        this._initStreaks();
    }

    _initStreaks() {
        for (let i = 0; i < 300; i++) {
            this.streaks.push(this._makeStreak(Math.random(), Math.random(), 0.2));
        }
    }

    _makeStreak(x, y, energy) {
        return {
            x, y,
            length: 30 + Math.random() * 80 * (0.5 + energy),
            speed: 0.1 + Math.random() * 0.3,
            angle: -0.3 + (Math.random() - 0.5) * 0.4,
            alpha: 0.1 + Math.random() * 0.3 * energy,
            hueShift: (Math.random() - 0.5) * 40,
            thickness: 0.5 + Math.random() * 1.5
        };
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const count = 20 + Math.floor(noteInfo.velocity * 30);
        for (let i = 0; i < count; i++) {
            const s = this._makeStreak(
                noteInfo.normalizedPosition + (Math.random() - 0.5) * 0.3,
                Math.random(),
                noteInfo.velocity
            );
            s.alpha = 0.3 + noteInfo.velocity * 0.5;
            s.bright = true;
            this.streaks.push(s);
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

        // Subtle gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, `hsla(${hue + 30}, 20%, 6%, 1)`);
        bgGrad.addColorStop(1, `hsla(${hue}, 25%, 10%, 1)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Cap streak count
        while (this.streaks.length > 500) this.streaks.shift();

        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const s = this.streaks[i];

            // Flow field angle
            const fieldAngle = s.angle + 
                Math.sin(s.y * 4 + t * speed * 0.3) * 0.3 * intensity +
                Math.cos(s.x * 6 + t * speed * 0.2) * 0.15;

            s.x += Math.cos(fieldAngle) * s.speed * speed * dt;
            s.y += Math.sin(fieldAngle) * s.speed * speed * dt * 0.3;

            // Wrap around
            if (s.x > 1.2) s.x -= 1.4;
            if (s.x < -0.2) s.x += 1.4;
            if (s.y > 1.1) s.y -= 1.2;
            if (s.y < -0.1) s.y += 1.2;

            // Fade bright streaks
            if (s.bright) {
                s.alpha *= 0.995;
                if (s.alpha < 0.05) { this.streaks.splice(i, 1); continue; }
            }

            const px = s.x * w;
            const py = s.y * h;
            const endX = px + Math.cos(fieldAngle) * s.length * (0.5 + energy * 0.5);
            const endY = py + Math.sin(fieldAngle) * s.length * 0.3;

            const streakHue = hue + s.hueShift;
            const lightness = s.bright ? 75 : 45 + energy * 20;
            const sat = s.bright ? 90 : 50 + energy * 30;

            ctx.strokeStyle = `hsla(${streakHue}, ${sat}%, ${lightness}%, ${s.alpha})`;
            ctx.lineWidth = s.thickness;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // Directional glow
        const glowGrad = ctx.createLinearGradient(0, 0, w, 0);
        glowGrad.addColorStop(0, `hsla(${hue}, 50%, 50%, ${0.02 + energy * 0.06})`);
        glowGrad.addColorStop(0.5, 'transparent');
        glowGrad.addColorStop(1, `hsla(${hue + 40}, 40%, 40%, ${0.01 + energy * 0.03})`);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);
    }
}
