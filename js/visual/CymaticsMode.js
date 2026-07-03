/**
 * CymaticsMode — Chladni plate pattern visualizer.
 *
 * Bakes patterns at 1/4 resolution using separable trig tables,
 * then upscales with smooth interpolation + post-processing glow.
 * Morphing: eigenfunction values blended per-pixel so nodal lines
 * physically move between geometries when notes change.
 */
import { CymaticsMath } from '../math/CymaticsMath.js';

const MORPH_DURATION = 0.6;
const BAKE_SCALE = 0.25; // Bake at 25% resolution, upscale with smoothing

export class CymaticsMode {
    constructor(mathEngine) {
        this.math         = mathEngine;
        this.cymaticsMath = new CymaticsMath();
        this.time         = 0;

        this._canvas     = document.createElement('canvas');
        this._ctx        = this._canvas.getContext('2d');
        this._hasPattern = false;
        this._plateW     = 0;
        this._plateH     = 0;
        this._lastHue    = -1;
        this._dirty      = true;
        this._buf        = null; // Reusable Float32Array

        // Morph state
        this._morphT       = 1.0;
        this._prevM        = 0;
        this._prevN        = 0;
        this._prevHasMode  = false;

        // Throttle chord re-bake to ~12 FPS
        this._chordTimer   = 0;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this._capturePrev();
        this.cymaticsMath.addNote(noteInfo.index, noteInfo.frequency);
        this._dirty  = true;
        this._morphT = 0;
    }

    onNoteOff(noteIndex) {
        this._capturePrev();
        this.cymaticsMath.removeNote(noteIndex);
        this._dirty  = true;
        this._morphT = 0;
    }

    _capturePrev() {
        const notes = this.cymaticsMath.notes;
        if (notes.size === 1) {
            const { m, n } = notes.values().next().value;
            this._prevM       = m;
            this._prevN       = n;
            this._prevHasMode = true;
        } else {
            this._prevHasMode = false;
        }
    }

    getAudioModulation() {
        return this.cymaticsMath.getAudioModulation();
    }

    /**
     * Bake at reduced resolution using fast separable trig tables.
     */
    _bake(resW, resH, hue, morphT) {
        const cm = this.cymaticsMath;

        if (cm.notes.size === 0) {
            this._dirty  = false;
            this._plateW = resW;
            this._plateH = resH;
            this._lastHue = hue;
            return;
        }

        this._canvas.width  = resW;
        this._canvas.height = resH;

        const total = resW * resH;
        if (!this._buf || this._buf.length < total) {
            this._buf = new Float32Array(total);
        }

        const doMorph = morphT < 1.0 && this._prevHasMode && cm.notes.size === 1;
        const maxVal = cm.bakeFast(
            this._buf, resW, resH, morphT,
            this._prevM, this._prevN, doMorph
        );

        // Convert to pixels
        const imageData = this._ctx.createImageData(resW, resH);
        const data = imageData.data;
        const hr = (hue || 0) * Math.PI / 180;
        const cr = 0.7 + 0.3 * Math.cos(hr);
        const cg = 0.7 + 0.3 * Math.cos(hr + 2.094);
        const cb = 0.7 + 0.3 * Math.cos(hr + 4.189);
        const invMax = 1 / maxVal;

        for (let i = 0; i < total; i++) {
            const nodal = Math.pow(1.0 - this._buf[i] * invMax, 6);
            const idx = i * 4;
            data[idx]     = (nodal * 255 * cr) | 0;
            data[idx + 1] = (nodal * 255 * cg) | 0;
            data[idx + 2] = (nodal * 255 * cb) | 0;
            data[idx + 3] = (20 + nodal * 235) | 0;
        }

        this._ctx.putImageData(imageData, 0, 0);
        this._hasPattern = true;
        this._dirty      = false;
        this._plateW     = resW;
        this._plateH     = resH;
        this._lastHue    = hue;
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.cymaticsMath.tick(dt);

        const hue    = mathEngine.get('colorHue') || 0;
        const bakeW  = Math.max(64, (w * BAKE_SCALE) | 0);
        const bakeH  = Math.max(64, (h * BAKE_SCALE) | 0);

        // Advance morph
        this._morphT = Math.min(1.0, this._morphT + dt / MORPH_DURATION);

        const cm = this.cymaticsMath;
        const needsBake = this._dirty
                        || this._plateW !== bakeW
                        || this._plateH !== bakeH
                        || this._lastHue !== hue;

        // Chord: throttle to ~12 FPS to stay smooth
        if (cm.isChord) {
            this._chordTimer += dt;
            if (this._chordTimer >= 0.083) {
                this._chordTimer = 0;
                this._bake(bakeW, bakeH, hue, 1.0);
            }
        } else if (this._morphT < 1.0 || needsBake) {
            this._bake(bakeW, bakeH, hue, this._morphT);
        }

        // ── Background ──
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // ── Draw upscaled pattern ──
        if (this._hasPattern) {
            const pulse = 0.85 + 0.15 * Math.sin(this.time * 2.5);
            const targetAlpha = cm.active ? pulse : 0.4 * pulse;

            // Enable smooth upscaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Main plate
            ctx.save();
            ctx.globalAlpha = targetAlpha;
            ctx.drawImage(this._canvas, 0, 0, w, h);
            ctx.restore();

            // Soft glow layer
            ctx.save();
            ctx.globalAlpha = 0.25 * targetAlpha;
            ctx.filter = 'blur(8px)';
            ctx.drawImage(this._canvas, 0, 0, w, h);
            ctx.restore();

            // Inner glow on nodal lines
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.15 * targetAlpha;
            ctx.filter = 'blur(20px)';
            ctx.drawImage(this._canvas, 0, 0, w, h);
            ctx.restore();
        }

        // ── Edge vignette ──
        const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.7);
        vg.addColorStop(0, 'transparent');
        vg.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        // ── HUD ──
        ctx.font      = '10px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        if (cm.active) {
            const modes = [...cm.notes.values()].map(n => `(${n.m},${n.n})`).join(' ');
            ctx.fillText(`CHLADNI  ${modes}`, 10, 18);
            const freqs = [...cm.notes.values()].map(n => Math.round(n.frequency) + 'Hz').join('  ');
            ctx.fillText(freqs, 10, 30);
        } else {
            ctx.fillText('CHLADNI PLATE', 10, 18);
        }
    }
}
