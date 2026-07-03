import { Spirograph3DMath } from '../math/Spirograph3DMath.js';

/**
 * Spirograph3DMode — Chromeograph.
 * Two harmonograph layers drawn as full closed parametric curves each frame.
 * Each layer renders with a full-spectrum rainbow gradient along its length,
 * split into three chromatic-aberration passes (R left / full centre / B right)
 * that give a prismatic glass-prism feel. The whole figure rotates slowly in 3D.
 * Audio notes perturb the oscillator phases, morphing the interference pattern.
 */
export class Spirograph3DMode {
    constructor(mathEngine) {
        this.math         = mathEngine;
        this.mathInstance = new Spirograph3DMath();
        this.time         = 0;
        this._rotX        = 0;
        this._rotY        = 0;
        this._rotZ        = 0;
        this.initialized  = false;
        this._offscreen   = null;
        this._offCtx      = null;
    }

    resize(w, h) {
        this.width = w; this.height = h; this.initialized = true;
        // Clear offscreen so trail doesn't carry stale content after resize
        this._offscreen = null; this._offCtx = null;
    }

    _ensureOffscreen(w, h) {
        if (!this._offscreen || this._offscreen.width !== w || this._offscreen.height !== h) {
            this._offscreen = document.createElement('canvas');
            this._offscreen.width  = w;
            this._offscreen.height = h;
            this._offCtx = this._offscreen.getContext('2d');
            this._offCtx.fillStyle = '#000006';
            this._offCtx.fillRect(0, 0, w, h);
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    // ── 3-axis rotation ───────────────────────────────────────────────────
    _rotate(x, y, z, rx, ry, rz) {
        // X rotation
        const y1 = y * Math.cos(rx) - z * Math.sin(rx);
        const z1 = y * Math.sin(rx) + z * Math.cos(rx);
        // Y rotation
        const x2 =  x * Math.cos(ry) + z1 * Math.sin(ry);
        const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
        // Z rotation
        const x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
        const y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
        return { x: x3, y: y3, z: z2 };
    }

    // ── Perspective projection ────────────────────────────────────────────
    _project(x, y, z, scale, cx, cy, dxOff) {
        const r   = this._rotate(x, y, z, this._rotX, this._rotY, this._rotZ);
        const fov = 3.5;
        const s   = fov / (fov + r.z * 0.5 + 1.0);
        return { sx: cx + dxOff + r.x * scale * s, sy: cy + r.y * scale * s, s };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const complexity = Number(mathEngine.get('complexity')) || 0.5;

        this.mathInstance.update(dt, complexity, speed);
        const energy = Number(this.mathInstance.energy) || 0;

        // Offscreen canvas accumulates the trail independent of the Renderer's clear
        this._ensureOffscreen(w, h);
        const oc = this._offCtx;

        // Fade the accumulated trail each frame
        oc.globalCompositeOperation = 'source-over';
        oc.fillStyle = `rgba(0,0,6,${0.10 + (1 - intensity) * 0.08})`;
        oc.fillRect(0, 0, w, h);

        // Slow 3D tumble
        this._rotX += dt * 0.006 * speed;
        this._rotY += dt * 0.010 * speed * (1 + energy * 0.35);
        this._rotZ += dt * 0.004 * speed;

        const scale  = Math.min(w, h) * 0.42;
        const cx     = w / 2;
        const cy     = h / 2;
        const numPts = Math.round(280 + complexity * 420); // 280–700 pts

        oc.save();
        oc.globalCompositeOperation = 'lighter';
        oc.lineCap = 'round';

        // Chromatic aberration: R channel offset left, B channel offset right
        const aberration = 2.5 + energy * 5;

        // ── Draw each harmonograph layer ─────────────────────────────────
        for (let li = 0; li < this.mathInstance.layers.length; li++) {
            const curve         = this.mathInstance.generateCurve(li, numPts);
            const layerHueBase  = hue + li * 145;
            const baseAlpha     = (0.75 - li * 0.2) * (0.45 + intensity * 0.55);

            // Three chromatic passes: R (left), full spectrum (centre), B (right)
            const chromaticPasses = [
                { dxOff: -aberration, hueShift: -35, alphaScale: 0.38 },
                { dxOff:  0,          hueShift:   0, alphaScale: 1.00 },
                { dxOff: +aberration, hueShift: 155, alphaScale: 0.38 },
            ];

            for (const pass of chromaticPasses) {
                const proj = curve.map(p =>
                    this._project(p.x, p.y, p.z, scale, cx, cy, pass.dxOff)
                );

                for (let i = 1; i < curve.length; i++) {
                    const pa_p = proj[i - 1];
                    const pb_p = proj[i];

                    const frac    = curve[i].frac;
                    const lineHue = (layerHueBase + pass.hueShift + frac * 360 + this.time * 18) % 360;
                    const light   = 48 + frac * 38;
                    const alpha   = baseAlpha * pass.alphaScale
                                  * (0.35 + frac * 0.75)
                                  * (0.55 + energy * 0.45);
                    const avgS    = (pa_p.s + pb_p.s) * 0.5;
                    const lw      = (0.5 + frac * 2.2 * avgS) * (1 + energy * 0.28);

                    oc.strokeStyle = `hsla(${lineHue},100%,${light}%,${alpha})`;
                    oc.lineWidth   = lw;
                    oc.beginPath();
                    oc.moveTo(pa_p.sx, pa_p.sy);
                    oc.lineTo(pb_p.sx, pb_p.sy);
                    oc.stroke();
                }
            }
        }

        // ── Glowing pen-tip ───────────────────────────────────────────────
        const tip = this.mathInstance.currentPoint();
        const tp  = this._project(tip.x, tip.y, tip.z, scale, cx, cy, 0);
        const tipR   = 5 + energy * 10;
        const tipHue = (hue + this.time * 55) % 360;

        const tg = oc.createRadialGradient(tp.sx, tp.sy, 0, tp.sx, tp.sy, tipR * 4);
        tg.addColorStop(0,   `hsla(${tipHue},80%,96%,${0.9 * intensity})`);
        tg.addColorStop(0.3, `hsla(${tipHue},100%,72%,${0.45 * intensity})`);
        tg.addColorStop(1,   'transparent');
        oc.fillStyle = tg;
        oc.beginPath(); oc.arc(tp.sx, tp.sy, tipR * 4, 0, Math.PI * 2); oc.fill();

        oc.fillStyle = '#fff';
        oc.beginPath(); oc.arc(tp.sx, tp.sy, Math.max(1.5, tipR * 0.35), 0, Math.PI * 2); oc.fill();

        oc.restore();

        // Blit accumulated offscreen trail to the main canvas
        ctx.drawImage(this._offscreen, 0, 0);
    }
}
