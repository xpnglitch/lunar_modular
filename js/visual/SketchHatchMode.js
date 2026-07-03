import { SketchHatchMath } from '../math/SketchHatchMath.js';

/**
 * SketchHatchMode — Magnetic Topology Engine.
 * Dense curved field lines trace the invisible topology of a dynamic
 * multi-pole magnetic field. Lines curve, orbit, and converge at poles
 * that slowly drift and shift with the audio. Bright field concentrations
 * glow with additive color. Note events create new magnetic poles that
 * warp the entire field topology in real time.
 */
export class SketchHatchMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new SketchHatchMath();
        this.time = 0;
        this._poles = [];
        this._lines = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initPoles(w, h);
        this._buildLines(w, h);
        this.initialized = true;
    }

    _initPoles(w, h) {
        this._poles = Array.from({ length: 4 }, (_, i) => ({
            x:       w * (0.2 + (i / 3) * 0.6),
            y:       h * (0.3 + Math.random() * 0.4),
            strength: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5),
            vx:      (Math.random() - 0.5) * 15,
            vy:      (Math.random() - 0.5) * 10,
            hue:     (i / 4) * 280,
        }));
    }

    _buildLines(w, h) {
        const count = 80;
        this._lines = Array.from({ length: count }, (_, i) => ({
            // Seed from a ring of starting positions around the canvas
            sx: w * (0.05 + (i / count) * 0.9) + (Math.random() - 0.5) * w * 0.08,
            sy: Math.random() * h,
            pts: [],
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        // Add a temporary strong pole
        this._poles.push({
            x:        noteInfo.normalizedPosition * w,
            y:        h * (0.2 + Math.random() * 0.6),
            strength: (Math.random() < 0.5 ? 1 : -1) * noteInfo.velocity,
            vx:       (Math.random() - 0.5) * 20,
            vy:       (Math.random() - 0.5) * 15,
            hue:      noteInfo.normalizedPosition * 360,
            life:     3.0,   // temporary
        });
        if (this._poles.length > 8) this._poles.shift();
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _fieldAt(x, y, w, h) {
        // Sum dipole field vectors from all poles
        let fx = 0, fy = 0;
        for (const p of this._poles) {
            const dx = x - p.x, dy = y - p.y;
            const dist2 = dx*dx + dy*dy + 400;
            const mag = p.strength * 8000 / dist2;
            fx += mag * dx / Math.sqrt(dist2);
            fy += mag * dy / Math.sqrt(dist2);
        }
        const len = Math.sqrt(fx*fx + fy*fy) + 0.0001;
        return { fx: fx/len, fy: fy/len, mag: Math.min(1, len * 0.1) };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const complexity = Number(mathEngine.get('complexity')) || 0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        // Slow fade for trace persistence
        ctx.fillStyle = `rgba(1,0,3,${0.06 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        // Update poles (slow drift)
        for (const p of this._poles) {
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;
            // Bounce at edges
            if (p.x < w*0.05 || p.x > w*0.95) p.vx *= -1;
            if (p.y < h*0.05 || p.y > h*0.95) p.vy *= -1;
            if (p.life !== undefined) { p.life -= dt; if (p.life <= 0) p.strength *= 0.9; }
        }
        this._poles = this._poles.filter(p => p.life === undefined || p.life > 0 || Math.abs(p.strength) > 0.01);

        ctx.globalCompositeOperation = 'lighter';

        // Draw field lines — integrate forward along field
        const stepSize    = 3 + complexity * 3;
        const maxSteps    = 60 + Math.floor(complexity * 80);
        const lineCount   = 60 + Math.floor(complexity * 40);

        for (let li = 0; li < lineCount; li++) {
            // Start seed positions distributed across canvas
            let x = w * (li / lineCount) + Math.sin(this.time * 0.3 + li) * 30;
            let y = h * (0.1 + 0.8 * ((li * 0.618) % 1.0));

            let prevX = x, prevY = y;

            for (let s = 0; s < maxSteps; s++) {
                const { fx, fy, mag } = this._fieldAt(x, y, w, h);
                x += fx * stepSize;
                y += fy * stepSize;

                if (x < 0 || x > w || y < 0 || y > h) break;

                const progress = s / maxSteps;
                const lineHue  = (hue + li * 4.5 + mag * 60) % 360;
                const alpha    = (0.03 + mag * 0.12 + energy * 0.05) * (0.4 + intensity * 0.4) * (1 - progress * 0.5);

                ctx.strokeStyle = `hsla(${lineHue}, 80%, ${45+mag*35}%, ${alpha})`;
                ctx.lineWidth   = 0.5 + mag * 2.0 + energy * 0.8;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();

                prevX = x; prevY = y;
            }
        }

        // Draw pole glows
        for (const p of this._poles) {
            const pHue  = (hue + p.hue) % 360;
            const pAbs  = Math.abs(p.strength);
            const pg    = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40 + pAbs * 60);
            pg.addColorStop(0, `hsla(${pHue}, 100%, 80%, ${pAbs * 0.3 * intensity})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(p.x, p.y, 40 + pAbs*60, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
