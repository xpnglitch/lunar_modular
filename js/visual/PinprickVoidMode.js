import { PinprickVoidMath } from '../math/PinprickVoidMath.js';

/**
 * PinprickVoidMode — Deep space void: needle-thin star rays, quantum foam,
 * cosmic voids ripping open, note-triggered gravitational lensing events.
 */
export class PinprickVoidMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new PinprickVoidMath();
        this.time = 0;
        this.stars = [];
        this.voids = [];    // expanding dark tears in space
        this.rays = [];     // note-triggered needle rays
        this.quantum = [];  // quantum foam particles
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initStars(w, h);
        this.initialized = true;
    }

    _initStars(w, h) {
        this.stars = Array.from({ length: 400 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: 0.2 + Math.random() * 2.5,
            brightness: 0.1 + Math.random() * 0.9,
            hue: 180 + Math.random() * 80 - 40,
            twinkle: Math.random() * Math.PI * 2,
            twSpeed: 0.3 + Math.random() * 2,
            type: Math.random() < 0.08 ? 'bright' : 'normal',
        }));
        // Quantum foam
        this.quantum = Array.from({ length: 120 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            r: 0.3 + Math.random() * 1.5,
            life: Math.random(),
            speed: 1 + Math.random() * 2,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;
        const cx = noteInfo.normalizedPosition * w;
        const cy = h * (0.3 + Math.random() * 0.4);

        // Void tear
        this.voids.push({
            x: cx, y: cy,
            r: 0, maxR: 30 + noteInfo.velocity * 120,
            life: 1.0, vel: noteInfo.velocity,
        });

        // Needle star rays burst
        const count = 12 + Math.floor(noteInfo.velocity * 20);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.rays.push({
                x: cx, y: cy,
                angle,
                len: 0,
                maxLen: 80 + Math.random() * 250 * noteInfo.velocity,
                life: 1.0,
                vel: noteInfo.velocity,
                hue: noteInfo.normalizedPosition * 360,
                speed: 200 + Math.random() * 300,
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const energy = this.mathInstance.energy;

        // Parallax star drift (layers based on brightness)
        for (const s of this.stars) {
            const driftFactor = (s.s - 1.35) * 5;
            s.x += driftFactor * dt * (0.8 + energy * 0.5);
            s.y += (s.twSpeed - 1.5) * 0.8 * dt;
            if (s.x < 0) s.x += w;
            if (s.x > w) s.x -= w;
            if (s.y < 0) s.y += h;
            if (s.y > h) s.y -= h;
        }

        // === Deep space blackout (trail fade) ===
        ctx.fillStyle = `rgba(1,0,3,${0.12 + (1 - intensity) * 0.08})`;
        ctx.fillRect(0, 0, w, h);

        // === Star field ===
        for (const s of this.stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * s.twSpeed + s.twinkle);
            const alpha = s.brightness * tw * (0.3 + intensity * 0.3);
            if (s.type === 'bright') {
                // Diffraction spike cross
                const spikeLen = s.s * (4 + energy * 6);
                ctx.strokeStyle = `hsla(${s.hue},30%,92%,${alpha * 0.6})`;
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(s.x - spikeLen, s.y); ctx.lineTo(s.x + spikeLen, s.y);
                ctx.moveTo(s.x, s.y - spikeLen); ctx.lineTo(s.x, s.y + spikeLen);
                ctx.stroke();
                // Diagonal spikes (fainter)
                const dLen = spikeLen * 0.5;
                ctx.strokeStyle = `hsla(${s.hue},20%,90%,${alpha * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(s.x - dLen, s.y - dLen); ctx.lineTo(s.x + dLen, s.y + dLen);
                ctx.moveTo(s.x + dLen, s.y - dLen); ctx.lineTo(s.x - dLen, s.y + dLen);
                ctx.stroke();
            }
            ctx.fillStyle = `hsla(${s.hue},${s.type === 'bright' ? 20 : 10}%,${80 + s.brightness * 15}%,${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.s * tw, 0, Math.PI * 2);
            ctx.fill();
        }

        // === Quantum foam ===
        ctx.globalCompositeOperation = 'lighter';
        for (const q of this.quantum) {
            q.x += q.vx * dt;
            q.y += q.vy * dt;
            q.life += q.speed * dt;
            if (q.life >= 1) {
                q.life = 0;
                q.x = Math.random() * w;
                q.y = Math.random() * h;
                q.vx = (Math.random() - 0.5) * 15;
                q.vy = (Math.random() - 0.5) * 15;
            }
            const qa = Math.sin(q.life * Math.PI) * 0.18 * (0.4 + energy * 0.8);
            ctx.fillStyle = `hsla(${(hue + 180) % 360},80%,70%,${qa})`;
            ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Cosmic void tears ===
        this.voids = this.voids.filter(v => v.life > 0.01);
        for (const v of this.voids) {
            v.r += (120 + v.vel * 80) * dt;
            v.life -= dt * 0.7;
            if (v.r > v.maxR) v.life -= dt * 2;

            // Dark void core
            const vg = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r);
            vg.addColorStop(0, `rgba(0,0,0,${v.life * 0.95})`);
            vg.addColorStop(0.7, `rgba(0,0,0,${v.life * 0.4})`);
            vg.addColorStop(1, 'transparent');
            ctx.fillStyle = vg;
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2); ctx.fill();

            // Lensing ring around void
            ctx.globalCompositeOperation = 'lighter';
            const lg = ctx.createRadialGradient(v.x, v.y, v.r * 0.9, v.x, v.y, v.r * 1.3);
            lg.addColorStop(0, `hsla(${(hue + 200) % 360},100%,80%,${v.life * v.vel * 0.4})`);
            lg.addColorStop(1, 'transparent');
            ctx.fillStyle = lg;
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // === Needle rays ===
        ctx.globalCompositeOperation = 'lighter';
        this.rays = this.rays.filter(r => r.life > 0.01);
        for (const r of this.rays) {
            r.len += r.speed * dt;
            r.life = Math.max(0, 1 - r.len / r.maxLen);
            const ex = r.x + Math.cos(r.angle) * r.len;
            const ey = r.y + Math.sin(r.angle) * r.len;
            const rg = ctx.createLinearGradient(r.x, r.y, ex, ey);
            rg.addColorStop(0, `hsla(${r.hue},90%,95%,${r.vel * r.life})`);
            rg.addColorStop(0.4, `hsla(${r.hue},80%,70%,${r.vel * r.life * 0.5})`);
            rg.addColorStop(1, 'transparent');
            ctx.strokeStyle = rg;
            ctx.lineWidth = 0.5 + r.vel * r.life;
            ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(ex, ey); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === Deep space nebula haze ===
        const nHaze = ctx.createRadialGradient(w * 0.4, h * 0.45, 0, w * 0.4, h * 0.45, w * 0.6);
        nHaze.addColorStop(0, `hsla(${(hue + 240) % 360},40%,15%,${0.04 + energy * 0.06})`);
        nHaze.addColorStop(1, 'transparent');
        ctx.fillStyle = nHaze; ctx.fillRect(0, 0, w, h);
    }
}
