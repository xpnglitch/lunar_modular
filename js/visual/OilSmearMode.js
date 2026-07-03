import { OilSmearMath } from '../math/OilSmearMath.js';

/**
 * OilSmearMode — Chromatic Waveform Horizon.
 * Hundreds of layered horizontal waveform lines create a glowing 3D terrain
 * viewed from a low angle — rolling neon hills of light. Foreground lines are
 * thick and saturated; horizon lines are thin and ethereal. The full chromatic
 * spectrum shifts through blues, cyans, magentas, pinks, yellows, and greens.
 * Audio energy raises the wave peaks. Center lines peak higher for depth ridge.
 */
export class OilSmearMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new OilSmearMath();
        this.time = 0;
        this.ripples = [];
        this.initialized = false;
        this._lines = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildLines(w, h);
        this.initialized = true;
    }

    _buildLines(w, h) {
        const count = 140;
        this._lines = Array.from({ length: count }, (_, i) => {
            const t = i / (count - 1); // 0=horizon, 1=foreground
            return {
                t,
                baseY:      h * (0.28 + t * 0.62),
                phase:      Math.random() * Math.PI * 2,
                phaseSpeed: 0.3 + Math.random() * 0.6,
                freqMult:   0.8 + Math.random() * 0.4,
                hueOff:     (Math.random() - 0.5) * 30,
            };
        });
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.ripples.push({
            x:     noteInfo.normalizedPosition,
            life:  1.0,
            vel:   noteInfo.velocity,
            speed: 0.6 + noteInfo.velocity * 0.8,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))    || 0;
        const intensity  = Number(mathEngine.get('intensity'))   || 0.5;
        const speed      = Number(mathEngine.get('speed'))       || 1.0;
        const complexity = Number(mathEngine.get('complexity'))  || 0;
        const energy     = Number(this.mathInstance.energy)      || 0;

        // Persistent dark background
        ctx.fillStyle = `rgba(1,0,5,${0.18 + (1 - intensity) * 0.10})`;
        ctx.fillRect(0, 0, w, h);

        // Update ripples
        this.ripples = this.ripples.filter(r => r.life > 0.01);
        for (const r of this.ripples) r.life -= dt * 0.5;

        ctx.globalCompositeOperation = 'lighter';

        const baseFreq    = 2.5 + complexity * 3.0;
        const baseAmp     = h * (0.025 + intensity * 0.045);
        const energyBoost = energy * h * 0.07;

        for (const line of this._lines) {
            const { t, baseY, phase, phaseSpeed, freqMult, hueOff } = line;

            const depthFade = 0.04 + t * 0.96;
            const lineWidth = 0.4 + t * t * 6.0;
            const amplitude = baseAmp * depthFade + energyBoost * depthFade;
            const freq      = (baseFreq * freqMult * (1.0 - t * 0.3)) / w;
            const timePhase = this.time * speed * phaseSpeed;

            // Full chromatic spectrum: blue→cyan→magenta→yellow→green
            let lineHue;
            if (t < 0.25)       lineHue = (hue + 220 + t * 320)          % 360;
            else if (t < 0.5)   lineHue = (hue + 300 + (t - 0.25) * 160) % 360;
            else if (t < 0.75)  lineHue = (hue + 340 + (t - 0.5) * 160)  % 360;
            else                lineHue = (hue + 60  + (t - 0.75) * 240)  % 360;
            lineHue = (lineHue + hueOff + 360) % 360;

            const sat   = 70 + t * 25;
            const light = 40 + t * 25;
            const alpha = (0.06 + depthFade * 0.18) * (0.5 + intensity * 0.5);

            ctx.strokeStyle = `hsla(${lineHue}, ${sat}%, ${light}%, ${alpha})`;
            ctx.lineWidth   = lineWidth;
            ctx.lineJoin    = 'round';
            ctx.beginPath();

            const steps = Math.min(w, 500);
            for (let s = 0; s <= steps; s++) {
                const x  = (s / steps) * w;
                const nx = s / steps;

                // Primary wave
                let dy = Math.sin(x * freq * Math.PI * 2 + timePhase + phase) * amplitude;
                // Second harmonic
                dy += Math.sin(x * freq * Math.PI * 4.1 + timePhase * 1.3 + phase * 0.7) * amplitude * 0.3;
                // Center ridge peak
                const ridge = Math.exp(-Math.pow(nx - 0.5, 2) * 8) * amplitude * (0.5 + energy * 1.5);
                dy -= ridge;
                // Ripple distortions
                for (const r of this.ripples) {
                    const rdist = Math.abs(nx - r.x);
                    const rWave = Math.exp(-rdist * rdist * 40) * Math.sin(rdist * 40 - this.time * 10 * r.speed);
                    dy += rWave * r.life * r.vel * amplitude * 1.5;
                }

                if (s === 0) ctx.moveTo(x, baseY + dy); else ctx.lineTo(x, baseY + dy);
            }
            ctx.stroke();
        }

        // Horizon convergence glow
        const horizonY = h * 0.28;
        const hg = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 80);
        hg.addColorStop(0, 'transparent');
        hg.addColorStop(0.5, `hsla(${(hue + 200) % 360}, 80%, 70%, ${0.03 + energy * 0.08})`);
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(0, horizonY - 40, w, 120);

        // Energy crest bloom
        if (energy > 0.15) {
            const peakG = ctx.createRadialGradient(w/2, horizonY + h * 0.2, 0, w/2, horizonY + h * 0.2, w * 0.5);
            peakG.addColorStop(0, `hsla(${hue}, 100%, 80%, ${energy * 0.12})`);
            peakG.addColorStop(1, 'transparent');
            ctx.fillStyle = peakG; ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
