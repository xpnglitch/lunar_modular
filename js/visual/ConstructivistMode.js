import { ConstructivistMath } from '../math/ConstructivistMath.js';

/**
 * ConstructivistMode — Geometric suprematist composition.
 * 
 * Bold geometric shapes (rectangles, circles, diagonals) in
 * primary colors on a stark background. Inspired by Malevich
 * and El Lissitzky. Notes shift composition and animate rotations.
 */
export class ConstructivistMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ConstructivistMath();
        this.shapes = [];
        this._initComposition();
    }

    _initComposition() {
        // Primary color palette: red, black, white, yellow, blue
        const palette = [
            { h: 0, s: 85, l: 50 },     // red
            { h: 0, s: 0, l: 10 },       // black
            { h: 0, s: 0, l: 92 },       // white
            { h: 45, s: 90, l: 55 },      // gold/yellow
            { h: 220, s: 75, l: 45 },     // blue
            { h: 15, s: 80, l: 45 },      // dark orange
        ];

        for (let i = 0; i < 18; i++) {
            const color = palette[Math.floor(Math.random() * palette.length)];
            const type = Math.random();
            this.shapes.push({
                type: type < 0.45 ? 'rect' : type < 0.75 ? 'circle' : 'line',
                x: 0.1 + Math.random() * 0.8,
                y: 0.1 + Math.random() * 0.8,
                w: 0.05 + Math.random() * 0.25,
                h2: 0.03 + Math.random() * 0.2,
                angle: (Math.floor(Math.random() * 8)) * (Math.PI / 4),
                targetAngle: 0,
                color,
                speed: 0.2 + Math.random() * 0.5,
                offset: Math.random() * Math.PI * 2,
                scale: 1
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Rotate and shift shapes
        for (const s of this.shapes) {
            if (Math.random() < noteInfo.velocity * 0.5) {
                s.targetAngle += (Math.PI / 4) * (Math.random() < 0.5 ? 1 : -1);
                s.scale = 1 + noteInfo.velocity * 0.3;
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

        // Warm off-white background
        ctx.fillStyle = `hsl(40, 20%, 90%)`;
        ctx.fillRect(0, 0, w, h);

        // Render shapes
        for (const s of this.shapes) {
            // Animate toward target angle
            s.angle += (s.targetAngle - s.angle) * dt * 3;
            s.scale += (1 - s.scale) * dt * 2;

            const px = s.x * w + Math.sin(t * s.speed * speed + s.offset) * 10 * intensity;
            const py = s.y * h + Math.cos(t * s.speed * speed * 0.7 + s.offset) * 8 * intensity;
            const sw = s.w * w * s.scale;
            const sh = s.h2 * h * s.scale;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(s.angle);

            const c = s.color;
            const hueShift = (hue - 220) * 0.1;
            ctx.fillStyle = `hsla(${c.h + hueShift}, ${c.s}%, ${c.l}%, 0.9)`;

            if (s.type === 'rect') {
                ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
            } else if (s.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, sw / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Diagonal line/bar
                ctx.lineWidth = 4 + energy * 6;
                ctx.strokeStyle = ctx.fillStyle;
                ctx.beginPath();
                ctx.moveTo(-sw / 2, 0);
                ctx.lineTo(sw / 2, 0);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Grid lines (constructivist overlay)
        if (intensity > 0.3) {
            ctx.strokeStyle = `rgba(0,0,0,${0.04 + intensity * 0.04})`;
            ctx.lineWidth = 0.5;
            const gridSpacing = 60;
            for (let x = 0; x < w; x += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        }

        // Diagonal accent lines
        ctx.strokeStyle = `rgba(200, 30, 30, ${0.1 + energy * 0.15})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.3);
        ctx.lineTo(w * 0.7, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h);
        ctx.lineTo(w, h * 0.4);
        ctx.stroke();
    }
}
