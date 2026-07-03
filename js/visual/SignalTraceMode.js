import { SignalTraceMath } from '../math/SignalTraceMath.js';

/**
 * SignalTraceMode — Oscilloscope waveform display.
 * 
 * Multiple glowing waveform traces sweep across the screen like
 * a classic analog oscilloscope. Notes perturb the waveforms
 * with spikes and amplitude changes. Phosphor-green glow aesthetic.
 */
export class SignalTraceMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new SignalTraceMath();
        this.traces = [];
        this.spikes = [];
        this._initTraces();
    }

    _initTraces() {
        for (let i = 0; i < 4; i++) {
            this.traces.push({
                freq: 1 + i * 0.7 + Math.random() * 0.5,
                amp: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2,
                yOffset: 0.2 + i * 0.2,
                hueShift: i * 30
            });
        }
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.spikes.push({
            x: noteInfo.normalizedPosition,
            energy: noteInfo.velocity,
            life: 1.0,
            trace: Math.floor(Math.random() * this.traces.length)
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;
        const t = this.time * speed;

        // Dark scope background
        ctx.fillStyle = `hsla(${hue + 100}, 15%, 3%, 1)`;
        ctx.fillRect(0, 0, w, h);

        // Grid
        const gridDiv = 10;
        ctx.strokeStyle = `hsla(${hue + 100}, 20%, 15%, 0.2)`;
        ctx.lineWidth = 0.5;
        for (let i = 1; i < gridDiv; i++) {
            const gx = (i / gridDiv) * w;
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
            const gy = (i / gridDiv) * h;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }
        // Center cross (brighter)
        ctx.strokeStyle = `hsla(${hue + 100}, 20%, 20%, 0.3)`;
        ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

        const scopeHue = 120 + (hue - 220) * 0.15;

        // Update and decay spikes
        for (let i = this.spikes.length - 1; i >= 0; i--) {
            this.spikes[i].life -= dt * 1.5;
            if (this.spikes[i].life <= 0) this.spikes.splice(i, 1);
        }

        // Render traces
        for (let ti = 0; ti < this.traces.length; ti++) {
            const trace = this.traces[ti];
            const traceY = trace.yOffset * h;
            const amp = trace.amp * h * (0.5 + intensity * 0.5 + energy * 0.3);
            const traceHue = scopeHue + trace.hueShift;

            // Glow layer (wider, dimmer)
            ctx.lineWidth = 6;
            ctx.strokeStyle = `hsla(${traceHue}, 80%, 50%, 0.08)`;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
                const nx = x / w;
                let y = traceY + this._waveValue(nx, t, trace, complexity);

                // Spike influence
                for (const spike of this.spikes) {
                    if (spike.trace === ti) {
                        const dist = Math.abs(nx - spike.x);
                        if (dist < 0.05) {
                            y -= (1 - dist / 0.05) * spike.energy * spike.life * amp * 2;
                        }
                    }
                }

                y = traceY + (y - traceY); // normalize

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Main trace line
            ctx.lineWidth = 2;
            ctx.strokeStyle = `hsla(${traceHue}, 100%, 65%, ${0.6 + energy * 0.3})`;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
                const nx = x / w;
                let y = traceY + this._waveValue(nx, t, trace, complexity);

                for (const spike of this.spikes) {
                    if (spike.trace === ti) {
                        const dist = Math.abs(nx - spike.x);
                        if (dist < 0.05) {
                            y -= (1 - dist / 0.05) * spike.energy * spike.life * amp * 2;
                        }
                    }
                }

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Bright core (thin)
            ctx.lineWidth = 1;
            ctx.strokeStyle = `hsla(${traceHue}, 80%, 85%, ${0.3 + energy * 0.2})`;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
                const nx = x / w;
                let y = traceY + this._waveValue(nx, t, trace, complexity);

                for (const spike of this.spikes) {
                    if (spike.trace === ti) {
                        const dist = Math.abs(nx - spike.x);
                        if (dist < 0.05) {
                            y -= (1 - dist / 0.05) * spike.energy * spike.life * amp * 2;
                        }
                    }
                }

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let y = 0; y < h; y += 2) {
            ctx.fillRect(0, y, w, 1);
        }

        // Screen edge vignette
        const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
        vigGrad.addColorStop(0, 'transparent');
        vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);
    }

    _waveValue(nx, t, trace, complexity) {
        const amp = trace.amp * 100;
        let val = 0;
        val += Math.sin((nx * trace.freq * 8 + t + trace.phase) * Math.PI) * amp;
        val += Math.sin((nx * trace.freq * 16 + t * 1.3) * Math.PI) * amp * 0.3 * complexity;
        val += Math.sin((nx * trace.freq * 32 + t * 0.7) * Math.PI) * amp * 0.1 * complexity;
        return val;
    }
}
