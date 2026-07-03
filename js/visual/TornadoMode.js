import { TornadoMath } from '../math/TornadoMath.js';

/**
 * TornadoMode — Plasma Vortex Storm.
 * An electrified plasma tornado that tears through the sky. The funnel wall
 * is built from thousands of charged particles spiraling in tight helical
 * bands, glowing in vivid electric colors. Plasma lightning arcs inside
 * the funnel. The vortex eye is a dark void rimmed with photon emission.
 * Note events widen the funnel and send shockwave rings through the plasma.
 */
export class TornadoMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new TornadoMath();
        this.time = 0;
        this._particles = [];
        this._lightning = [];
        this._rings = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildParticles(700);
        this.initialized = true;
    }

    _buildParticles(n) {
        for (let i = 0; i < n; i++) {
            this._particles.push(this._makeParticle(Math.random()));
        }
    }

    _makeParticle(yBias) {
        const band = Math.floor(Math.random() * 5); // 0=core, 4=outer
        return {
            angle:    Math.random() * Math.PI * 2,
            dist:     0.02 + band * 0.05 + Math.random() * 0.04,
            y:        yBias,
            vy:       0.03 + Math.random() * 0.08,
            rotSpeed: (2 + Math.random() * 4) * (Math.random() < 0.5 ? 1 : -1),
            size:     1 + Math.random() * 3,
            alpha:    0.4 + Math.random() * 0.5,
            hueOff:   (band / 5) * 120 + (Math.random() - 0.5) * 20,
            band,
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Debris surge
        const n = 30 + Math.floor(noteInfo.velocity * 60);
        for (let i = 0; i < n; i++) {
            const p = this._makeParticle(0.85 + Math.random() * 0.15);
            p.vy   *= 1.5 + noteInfo.velocity;
            p.size *= 1.5 + noteInfo.velocity;
            this._particles.push(p);
        }
        // Lightning
        this._lightning.push({ life: 0.8 + noteInfo.velocity * 0.5, vel: noteInfo.velocity, seed: Math.random() });
        // Shockwave ring
        this._rings.push({ r: 0, life: 1.0, vel: noteInfo.velocity });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const energy     = Number(this.mathInstance.energy)     || 0;
        const expansion  = Number(this.mathInstance.expansion)  || 0;

        const cx      = w * 0.5;
        const wFactor = 0.10 + energy * 0.08 + expansion * 0.06;

        // --- Stormy sky ---
        const bgG = ctx.createLinearGradient(0, 0, 0, h);
        bgG.addColorStop(0, `hsl(${hue+195},20%,5%)`);
        bgG.addColorStop(0.5, `hsl(${hue+185},25%,8%)`);
        bgG.addColorStop(1, `hsl(${hue+175},30%,4%)`);
        ctx.fillStyle = bgG;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Plasma funnel rings (structural) ---
        const ringCount = 40;
        for (let ri = 0; ri < ringCount; ri++) {
            const t        = ri / ringCount;
            const ringY    = h * (0.02 + t * 0.9);
            const ringW    = (0.02 + t * wFactor) * w;
            const rotAngle = this.time * speed * (2 + ri * 0.3) + ri * 0.5;
            const alpha    = (0.03 + t * 0.10 + energy * 0.08) * (0.5 + intensity * 0.5);
            const sat      = 60 + (1-t) * 30;
            const light    = 35 + (1-t) * 30;
            const rHue     = (hue + ri * 3 + (1-t)*60) % 360;

            ctx.strokeStyle = `hsla(${rHue}, ${sat}%, ${light}%, ${alpha})`;
            ctx.lineWidth   = 1.0 + t * 4;
            ctx.beginPath();
            ctx.ellipse(
                cx + Math.sin(rotAngle * 0.25) * ringW * 0.05,
                ringY,
                ringW * (0.7 + Math.sin(rotAngle) * 0.15),
                ringW * 0.25,
                Math.sin(this.time * 0.15 + ri*0.08) * 0.06,
                0, Math.PI * 2
            );
            ctx.stroke();
        }

        // --- Plasma particles ---
        while (this._particles.length < 700) this._particles.push(this._makeParticle());
        while (this._particles.length > 1200) this._particles.shift();

        for (const p of this._particles) {
            p.angle += p.rotSpeed * speed * dt * (1 + energy * 0.4);
            p.y     -= p.vy * speed * dt;

            const fw      = wFactor * (0.1 + p.y * 0.9);
            const leanX   = Math.sin(this.time * 0.25) * 0.015 * w;
            const px      = cx + leanX + Math.cos(p.angle) * p.dist * fw * w;
            const py      = p.y * h;

            p.dist += (0.004 - p.dist * 0.015) * dt;
            if (p.dist < 0.004) p.dist = 0.004 + Math.random() * 0.04;

            if (p.y < -0.02) {
                p.y     = 0.92 + Math.random() * 0.1;
                p.dist  = 0.02 + Math.random() * 0.1;
                p.angle = Math.random() * Math.PI * 2;
            }

            const ht     = 0.3 + p.y * 0.7;
            const pHue   = (hue + p.hueOff + ht * 40) % 360;
            const pAlpha = p.alpha * ht * (0.35 + energy * 0.65) * (0.4 + intensity*0.4);
            const pSize  = p.size * (0.4 + energy * 0.6) * (0.4 + p.y * 0.6);

            ctx.fillStyle = `hsla(${pHue}, ${55+p.band*8}%, ${50+(4-p.band)*8}%, ${pAlpha})`;
            ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI*2); ctx.fill();
        }

        // --- Funnel core void ---
        ctx.globalCompositeOperation = 'source-over';
        for (let ri = 0; ri < 10; ri++) {
            const t      = ri / 10;
            const coreY  = h * (0.02 + t * 0.5);
            const coreW  = (0.012 + t * 0.025) * w;
            const voidG  = ctx.createRadialGradient(cx, coreY, 0, cx, coreY, coreW);
            voidG.addColorStop(0, `rgba(0,0,0,${0.7 - t * 0.3})`);
            voidG.addColorStop(0.7, `rgba(0,0,0,${0.3 - t * 0.2})`);
            voidG.addColorStop(1, 'transparent');
            ctx.fillStyle = voidG;
            ctx.beginPath(); ctx.arc(cx, coreY, coreW, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- Lightning ---
        if (Math.random() < 0.05 + energy * 0.10) {
            this._lightning.push({ life: 0.4 + Math.random()*0.5, vel: 0.2+Math.random()*0.5, seed: Math.random() });
        }
        this._lightning = this._lightning.filter(l => l.life > 0.01);
        for (const l of this._lightning) {
            l.life -= dt * 5;
            ctx.strokeStyle = `hsla(${(hue+185)%360},80%,90%,${l.life * l.vel * 0.8})`;
            ctx.lineWidth   = 1 + l.vel * 2;
            ctx.beginPath();
            let lx = cx + (Math.random()-0.5)*60, ly = h*0.03;
            ctx.moveTo(lx, ly);
            for (let s = 0; s < 12; s++) {
                lx += (Math.random()-0.5) * (25 + l.seed*20);
                ly += h * 0.05 + Math.random() * h * 0.03;
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
        }

        // --- Shockwave rings ---
        this._rings = this._rings.filter(r => r.life > 0.01);
        for (const rg of this._rings) {
            rg.r    += 180 * dt;
            rg.life -= dt * 2.0;
            const sg = ctx.createRadialGradient(cx, h*0.45, rg.r*0.8, cx, h*0.45, rg.r*1.2);
            sg.addColorStop(0, 'transparent');
            sg.addColorStop(0.5, `hsla(${(hue+185)%360},100%,80%,${rg.life*rg.vel*0.4})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(cx, h*0.45, rg.r*1.2, 0, Math.PI*2); ctx.fill();
        }

        // --- Ground debris cloud ---
        const groundY = h * 0.93;
        const dustG   = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, w*0.4*(0.5+energy*0.5));
        dustG.addColorStop(0, `hsla(${hue+20},25%,45%,${0.1+energy*0.15})`);
        dustG.addColorStop(0.6, `hsla(${hue},18%,28%,${0.05+energy*0.07})`);
        dustG.addColorStop(1, 'transparent');
        ctx.fillStyle = dustG;
        ctx.fillRect(0, groundY-50, w, h - groundY + 50);

        ctx.globalCompositeOperation = 'source-over';
    }
}
