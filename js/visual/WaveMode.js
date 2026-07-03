/**
 * WaveMode — Wave interference moiré patterns
 * Each note creates concentric waves. Multiple notes create interference.
 * Wave frequency = audio frequency (honest coupling — literally the same number).
 * 
 * Uses ImageData buffer for pixel rendering at reduced resolution.
 */
import { WaveMath } from '../math/WaveMath.js';

export class WaveMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.waveMath = new WaveMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.pixelSize = 6; // Render at 1/6 res, then upscale
        this.activeNotes = new Map();

        // ImageData buffer (created on resize)
        this.imgData = null;
        this.bufW = 0;
        this.bufH = 0;
        // Offscreen canvas for upscaling
        this.offCanvas = null;
        this.offCtx = null;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.bufW = Math.ceil(w / this.pixelSize);
        this.bufH = Math.ceil(h / this.pixelSize);
        // Create offscreen canvas at reduced resolution
        this.offCanvas = document.createElement('canvas');
        this.offCanvas.width = this.bufW;
        this.offCanvas.height = this.bufH;
        this.offCtx = this.offCanvas.getContext('2d');
        this.imgData = this.offCtx.createImageData(this.bufW, this.bufH);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.waveMath.addWave(noteInfo.normalizedPosition, noteInfo.frequency, noteInfo.velocity);
        this.activeNotes.set(noteInfo.index, noteInfo.normalizedPosition);
    }

    onNoteOff(noteIndex) {
        const pos = this.activeNotes.get(noteIndex);
        if (pos !== undefined) {
            this.waveMath.releaseWave(pos);
            this.activeNotes.delete(noteIndex);
        }
    }

    getAudioModulation() {
        return this.waveMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;

        if (this.width !== w || this.height !== h) {
            this.resize(w, h);
        }

        this.waveMath.step(dt);

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const hue = mathEngine.get('colorHue');
        const noteCount = mathEngine.noteCount;
        const reactivity = mathEngine.get('reactivity');

        const px = this.pixelSize;
        const bw = this.bufW;
        const bh = this.bufH;
        const data = this.imgData.data;

        // Pre-convert base hue to RGB for fast blending
        const hRad = hue * Math.PI / 180;
        const compRad = (hue + 180) * Math.PI / 180;
        // Base hue RGB
        const br = Math.round((Math.sin(hRad) * 0.5 + 0.5) * 100 + 80);
        const bg = Math.round((Math.sin(hRad + 2.094) * 0.5 + 0.5) * 100 + 80);
        const bb = Math.round((Math.sin(hRad + 4.189) * 0.5 + 0.5) * 180 + 75);
        // Complementary hue RGB
        const cr = Math.round((Math.sin(compRad) * 0.5 + 0.5) * 100 + 80);
        const cg = Math.round((Math.sin(compRad + 2.094) * 0.5 + 0.5) * 100 + 80);
        const cb = Math.round((Math.sin(compRad + 4.189) * 0.5 + 0.5) * 180 + 75);

        const waves = this.waveMath.waves;
        const hasWaves = waves.length > 0;
        const brightBoost = 40 + noteCount * 8;
        const alphaBoost = 0.5 + intensity * 0.5;
        const waveSpeed = 200 + complexity * 300;
        const waveReact = 0.3 + reactivity * 1.4; // Reactivity scales wave frequency coefficient
        const time = this.time;
        const halfH = h * 0.5;

        // Pre-compute per-wave constants outside pixel loop
        const waveCount = waves.length;
        const waveX = new Float64Array(waveCount);
        const waveVF = new Float64Array(waveCount);
        const waveAmp = new Float64Array(waveCount);
        const wavePhase = new Float64Array(waveCount);
        const speedTerm = time * waveSpeed * 0.01;

        for (let i = 0; i < waveCount; i++) {
            const wave = waves[i];
            waveX[i] = wave.x * w;
            waveVF[i] = wave.frequency * 0.01 * (0.5 + complexity * 1.5) * 0.01 * waveReact;
            wavePhase[i] = wave.phase - speedTerm;
            let a = wave.amplitude;
            if (!wave.active) {
                a *= Math.exp(-(time - wave.decayStart) * 0.7);
            }
            waveAmp[i] = a;
        }

        // Fill buffer
        for (let row = 0; row < bh; row++) {
            const y = row * px;
            const dy = y - halfH;
            const rowOffset = row * bw;
            for (let col = 0; col < bw; col++) {
                const x = col * px;
                const idx = (rowOffset + col) << 2;

                let value;
                if (hasWaves) {
                    let sum = 0;
                    for (let i = 0; i < waveCount; i++) {
                        const dx = x - waveX[i];
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        sum += Math.sin(dist * waveVF[i] + wavePhase[i]) * waveAmp[i] / (1 + dist * 0.003);
                    }
                    value = sum > 1 ? 1 : sum < -1 ? -1 : sum;
                } else {
                    const dx = x - w * 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    value = Math.sin(dist * 0.02 - time * 0.5) * 0.08;
                }

                const brightness = value > 0 ? value : -value;
                if (brightness < 0.02) {
                    data[idx] = 0;
                    data[idx + 1] = 0;
                    data[idx + 2] = 0;
                    data[idx + 3] = 0;
                    continue;
                }

                const lum = brightness * brightBoost * 0.01;
                const alpha = brightness * alphaBoost * 255;

                if (value > 0) {
                    data[idx] = (br * lum > 255 ? 255 : br * lum) | 0;
                    data[idx + 1] = (bg * lum > 255 ? 255 : bg * lum) | 0;
                    data[idx + 2] = (bb * lum > 255 ? 255 : bb * lum) | 0;
                } else {
                    data[idx] = (cr * lum > 255 ? 255 : cr * lum) | 0;
                    data[idx + 1] = (cg * lum > 255 ? 255 : cg * lum) | 0;
                    data[idx + 2] = (cb * lum > 255 ? 255 : cb * lum) | 0;
                }
                data[idx + 3] = (alpha > 255 ? 255 : alpha) | 0;
            }
        }

        // Put to offscreen canvas, then upscale to main canvas
        this.offCtx.putImageData(this.imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offCanvas, 0, 0, w, h);

        // Draw wave source indicators (these are few, so fine to use canvas API)
        for (const wave of this.waveMath.waves) {
            const wx = wave.x * w;
            const wy = h * 0.5;
            let amp = wave.amplitude;
            if (!wave.active) {
                amp *= Math.exp(-(this.time - wave.decayStart) * 0.7);
            }

            if (amp > 0.05) {
                const ringRadius = 8 + Math.sin(this.time * wave.frequency * 0.01) * 3;
                ctx.beginPath();
                ctx.arc(wx, wy, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${hue}, 90%, 80%, ${amp * 0.6})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                const glow = ctx.createRadialGradient(wx, wy, 0, wx, wy, 30);
                glow.addColorStop(0, `hsla(${hue}, 90%, 80%, ${amp * 0.5})`);
                glow.addColorStop(1, `hsla(${hue}, 90%, 80%, 0)`);
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(wx, wy, 30, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
