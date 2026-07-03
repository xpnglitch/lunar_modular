import { QuantumStringMath } from '../math/QuantumStringMath.js';

/**
 * QuantumStringMode — Vibrating quantum strings in superposed harmonic states.
 * Strings resonate with probability amplitudes, interference between modes, wave packets.
 * Connected to sound: the sine/sine oscillator with detune creates audible beating →
 * the visual strings beat and interfere in exactly the same way.
 */
export class QuantumStringMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new QuantumStringMath();
        this.time = 0;
        this.strings = [];
        this.wavePkts = [];   // localized wave packet bursts
        this.interference = []; // interference pattern nodes
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initStrings(w, h);
        this.initialized = true;
    }

    _initStrings(w, h) {
        this.strings = [];
        const count = 7;
        for (let i = 0; i < count; i++) {
            const y0 = h * (0.12 + (i / (count - 1)) * 0.76);
            this.strings.push({
                y0,
                harmonics: [
                    { n: 1, amp: 0.4 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 },
                    { n: 2, amp: 0.2 + Math.random() * 0.2, phase: Math.random() * Math.PI * 2 },
                    { n: 3, amp: 0.1 + Math.random() * 0.15, phase: Math.random() * Math.PI * 2 },
                ],
                hueOff: (i / count) * 120 - 60,
                tension: 0.5 + Math.random() * 0.5,
                thickness: 1.2 + Math.random() * 0.8,
                excitation: 0,
            });
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;

        // Excite strings based on note pitch position
        const stringIdx = Math.floor(noteInfo.normalizedPosition * this.strings.length);
        for (let i = 0; i < this.strings.length; i++) {
            const dist = Math.abs(i - stringIdx);
            const transfer = Math.max(0, 1 - dist * 0.45);
            this.strings[i].excitation = Math.min(1, this.strings[i].excitation + noteInfo.velocity * transfer);
        }

        // Wave packet
        this.wavePkts.push({
            x: noteInfo.normalizedPosition * w,
            y: h * (0.12 + (stringIdx / this.strings.length) * 0.76),
            life: 1.0, vel: noteInfo.velocity,
            vx: (Math.random() < 0.5 ? 1 : -1) * (80 + noteInfo.velocity * 120),
            vy: (Math.random() - 0.5) * 30,
            hueShift: (noteInfo.normalizedPosition - 0.5) * 90,
            spread: 20 + noteInfo.velocity * 40,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');

        // Slow fade (quantum states persist briefly)
        ctx.fillStyle = `rgba(0,0,0,${0.08 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.06})`;
        ctx.fillRect(0, 0, w, h);

        // Decay excitations
        for (const s of this.strings) {
            s.excitation = Math.max(0, s.excitation - dt * 0.9);
        }

        // === Draw quantum strings ===
        const steps = 180;
        for (const s of this.strings) {
            const totalExcite = s.excitation + energy * 0.4;
            const sh = (hue + s.hueOff) % 360;

            // Compute string path
            const pts = [];
            for (let i = 0; i <= steps; i++) {
                const x = (i / steps) * w;
                let y = s.y0;
                for (const harm of s.harmonics) {
                    const freq = harm.n * s.tension * (0.8 + complexity * 0.4);
                    y += Math.sin(harm.n * Math.PI * i / steps) *
                         Math.sin(freq * this.time + harm.phase) *
                         harm.amp * h * 0.06 * (0.3 + totalExcite * 1.8);
                }
                pts.push({ x, y });
            }

            // Probability cloud (blurred amplitude envelope)
            ctx.globalCompositeOperation = 'lighter';
            for (let layer = 3; layer >= 0; layer--) {
                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
                    else ctx.lineTo(pts[i].x, pts[i].y);
                }
                const glowWidth = (s.thickness + layer * 3) * (0.5 + totalExcite * 1.5);
                const glowAlpha = (0.08 - layer * 0.015) * (0.3 + totalExcite * 0.8);
                ctx.strokeStyle = `hsla(${sh},90%,${60 + layer * 8}%,${glowAlpha})`;
                ctx.lineWidth = glowWidth;
                ctx.stroke();
            }

            // Sharp string line
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
                else ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = `hsla(${sh},80%,${65 + totalExcite * 20}%,${0.5 + totalExcite * 0.5})`;
            ctx.lineWidth = s.thickness;
            ctx.stroke();

            // Node points (standing wave nodes)
            for (let n = 1; n < 3; n++) {
                const nodeX = (n / 3) * w;
                const nodeIdx = Math.floor((n / 3) * steps);
                const ny = pts[Math.min(nodeIdx, pts.length - 1)].y;
                ctx.fillStyle = `hsla(${(sh + 40) % 360},100%,85%,${0.4 + totalExcite * 0.5})`;
                ctx.beginPath(); ctx.arc(nodeX, ny, 2.5 + totalExcite * 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // === Wave packets ===
        ctx.globalCompositeOperation = 'lighter';
        this.wavePkts = this.wavePkts.filter(p => p.life > 0.01);
        for (const p of this.wavePkts) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * 1.0;
            p.spread += dt * 20;
            if (p.x < 0 || p.x > w) { p.vx *= -1; p.life *= 0.7; }

            const pRadius = Math.max(0.1, p.spread * p.life);
            const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pRadius);
            pg.addColorStop(0, `hsla(${(hue + p.hueShift) % 360},100%,88%,${p.life * p.vel * 0.7})`);
            pg.addColorStop(0.5, `hsla(${(hue + p.hueShift + 30) % 360},100%,70%,${p.life * 0.3})`);
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(p.x, p.y, pRadius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Vertical probability density (background hint) ===
        const densitySteps = 80;
        for (let i = 0; i < densitySteps; i++) {
            const dx = (i / densitySteps) * w;
            // Sum all string amplitudes at this x
            let totalAmp = 0;
            for (const s of this.strings) {
                for (const harm of s.harmonics) {
                    totalAmp += Math.abs(Math.sin(harm.n * Math.PI * i / densitySteps)) * harm.amp * s.excitation;
                }
            }
            if (totalAmp > 0.05) {
                ctx.fillStyle = `hsla(${hue},70%,65%,${Math.min(0.08, totalAmp * 0.04)})`;
                ctx.fillRect(dx, 0, w / densitySteps, h);
            }
        }
    }
}
