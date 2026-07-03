import { GalacticSpiralMath } from '../math/GalacticSpiralMath.js';

/**
 * GalacticSpiralMode — Barred spiral galaxy with logarithmic spiral arms, galactic core, dust lanes.
 * Stars orbit at different rates. Notes trigger star-formation bursts along arm regions.
 */
export class GalacticSpiralMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new GalacticSpiralMath();
        this.time = 0;
        this.stars = [];
        this.bursts = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildGalaxy(w, h);
        this.initialized = true;
    }

    _buildGalaxy(w, h) {
        this.stars = [];
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.44;
        const armCount = 2;

        // Core bulge stars
        for (let i = 0; i < 600; i++) {
            const r = Math.pow(Math.random(), 1.5) * maxR * 0.22;
            const a = Math.random() * Math.PI * 2;
            this.stars.push({
                r, a,
                baseA: a,
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r * 0.55,
                orbitSpeed: 0.08 / (0.08 + r / maxR),
                size: 0.5 + Math.random() * 1.2,
                bright: 0.6 + Math.random() * 0.4,
                type: 'bulge',
                hueShift: (Math.random() - 0.5) * 30,
            });
        }

        // Spiral arm stars
        for (let arm = 0; arm < armCount; arm++) {
            const armOffset = (arm / armCount) * Math.PI * 2;
            for (let i = 0; i < 800; i++) {
                const t = Math.pow(i / 800, 0.7);
                const r = 0.08 * maxR + t * maxR * 0.88;
                const windingAngle = t * Math.PI * 3.5; // tight spiral
                const scatter = (Math.random() - 0.5) * 0.38;
                const a = armOffset + windingAngle + scatter;
                this.stars.push({
                    r, a,
                    baseA: a,
                    orbitSpeed: 0.12 / (0.1 + r / maxR),
                    size: 0.4 + Math.random() * 1.8,
                    bright: 0.3 + Math.pow(Math.random(), 1.5) * 0.7,
                    type: 'arm',
                    arm,
                    hueShift: (Math.random() - 0.5) * 50,
                    ageColor: Math.random(), // 0=blue young, 1=red old
                });
            }
        }

        // Halo stars (sparse outer field)
        for (let i = 0; i < 200; i++) {
            const r = maxR * (0.5 + Math.random() * 0.8);
            const a = Math.random() * Math.PI * 2;
            this.stars.push({
                r, a, baseA: a,
                orbitSpeed: 0.015,
                size: 0.4 + Math.random() * 0.6,
                bright: 0.15 + Math.random() * 0.35,
                type: 'halo', hueShift: 0,
                ageColor: 0.5,
            });
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;
        const maxR = Math.min(w, h) * 0.44;
        const r = 0.1 * maxR + noteInfo.normalizedPosition * maxR * 0.8;
        const a = this.time * 0.03 + noteInfo.normalizedPosition * Math.PI * 2;
        this.bursts.push({
            x: w / 2 + Math.cos(a) * r,
            y: h / 2 + Math.sin(a) * r * 0.55,
            life: 1.0, vel: noteInfo.velocity,
            r: 0,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.44;

        // Slow fade (long trails for galactic persistence)
        ctx.fillStyle = `rgba(0,0,8,${0.04 + (1 - (mathEngine.get('intensity') || 0.5)) * 0.04})`;
        ctx.fillRect(0, 0, w, h);

        // Core glow
        const coreR = maxR * 0.16;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
        cg.addColorStop(0, `hsla(${(hue + 30) % 360},80%,92%,${0.55 + energy * 0.25})`);
        cg.addColorStop(0.2, `hsla(${(hue + 20) % 360},100%,70%,${0.35 + energy * 0.2})`);
        cg.addColorStop(0.6, `hsla(${hue},80%,45%,${0.15 + energy * 0.1})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);

        // Stars — rendered as glowing circles for visual quality
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.stars) {
            s.a += s.orbitSpeed * dt * (0.8 + energy * 0.5);
            const px = cx + Math.cos(s.a) * s.r;
            const py = cy + Math.sin(s.a) * s.r * 0.55;

            let sh;
            if (s.type === 'bulge') {
                sh = (hue + s.hueShift + 30) % 360;
            } else {
                const youngHue = (hue + 200) % 360;
                const oldHue = (hue + 20) % 360;
                sh = youngHue + (s.ageColor || 0.5) * (oldHue - youngHue);
            }
            const a = s.bright * (0.5 + energy * 0.45) * (s.type === 'halo' ? 0.5 : 1);
            const sat = s.type === 'arm' ? 85 : 55;

            // Bright/arm stars get a glow halo
            if (s.bright > 0.65 && s.type !== 'halo' && s.size > 1.0) {
                const gr = ctx.createRadialGradient(px, py, 0, px, py, s.size * 4);
                gr.addColorStop(0, `hsla(${sh},${sat}%,90%,${a * 0.5})`);
                gr.addColorStop(1, 'transparent');
                ctx.fillStyle = gr;
                ctx.beginPath(); ctx.arc(px, py, s.size * 4, 0, Math.PI * 2); ctx.fill();
            }

            ctx.fillStyle = `hsla(${sh},${sat}%,85%,${a})`;
            ctx.beginPath();
            ctx.arc(px, py, s.size * 0.75, 0, Math.PI * 2);
            ctx.fill();
        }

        // Star formation bursts
        this.bursts = this.bursts.filter(b => b.life > 0.01);
        for (const b of this.bursts) {
            b.r += 40 * dt;
            b.life -= dt * 0.9;
            const bg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r + 20 * b.vel);
            bg.addColorStop(0, `hsla(${(hue + 200) % 360},100%,95%,${b.life * b.vel})`);
            bg.addColorStop(0.4, `hsla(${(hue + 180) % 360},100%,70%,${b.life * 0.6})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 20 * b.vel, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';

        // Dust lanes (dark overlay arcs)
        for (let arm = 0; arm < 2; arm++) {
            const armOff = arm * Math.PI;
            ctx.save();
            ctx.globalAlpha = 0.12 + energy * 0.04;
            ctx.strokeStyle = `rgba(0,0,0,0.5)`;
            ctx.lineWidth = maxR * 0.06;
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.01) {
                const r = 0.12 * maxR + t * maxR * 0.75;
                const a = armOff + this.time * 0.015 + t * Math.PI * 3.2;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r * 0.55;
                if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }
}
