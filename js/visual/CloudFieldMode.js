import { CloudFieldMath } from '../math/CloudFieldMath.js';

/**
 * CloudFieldMode — Cinematic thunderstorm: volumetric cumulonimbus clouds,
 * realistic multi-branch lightning, rain, and dramatic note-triggered illumination.
 */
export class CloudFieldMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new CloudFieldMath();
        this.clouds = [];
        this.stars = [];
        this.rain = [];
        this.lightningBolts = [];
        this.illuminations = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initScene(w, h);
        this.initialized = true;
    }

    _initScene(w, h) {
        // Volumetric cloud layers
        this.clouds = [];
        for (let layer = 0; layer < 5; layer++) {
            const count = 6 + layer * 3;
            for (let i = 0; i < count; i++) {
                this.clouds.push({
                    x: Math.random() * 1.4 - 0.2,
                    y: 0.05 + layer * 0.14 + (Math.random() - 0.5) * 0.08,
                    layer,
                    puffs: this._makePuffs(6 + Math.floor(Math.random() * 8)),
                    baseW: 100 + Math.random() * 280,
                    speed: 0.003 + layer * 0.006 + Math.random() * 0.004,
                    dark: layer > 2,  // dark storm clouds at lower layers
                });
            }
        }
        // Background stars
        this.stars = Array.from({ length: 80 }, () => ({
            x: Math.random(), y: Math.random() * 0.35,
            s: 0.5 + Math.random() * 1.5, a: 0.1 + Math.random() * 0.5,
            tw: Math.random() * Math.PI * 2, twS: 0.5 + Math.random() * 1.5,
        }));
        // Rain
        this.rain = Array.from({ length: 200 }, () => ({
            x: Math.random(), y: Math.random(),
            len: 12 + Math.random() * 25,
            speed: 500 + Math.random() * 350,
            alpha: 0.04 + Math.random() * 0.1,
        }));
    }

    _makePuffs(count) {
        return Array.from({ length: count }, () => ({
            ox: (Math.random() - 0.5) * 1.4,
            oy: (Math.random() - 0.5) * 0.5,
            r: 0.25 + Math.random() * 0.75,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800;
        // Lightning bolt from cloud base to ground
        this.lightningBolts.push({
            x: noteInfo.normalizedPosition * w,
            life: 1.0, vel: noteInfo.velocity,
            seed: Math.random() * 100,
        });
        // Cloud illumination burst
        this.illuminations.push({
            x: noteInfo.normalizedPosition,
            life: 1.0, vel: noteInfo.velocity,
            hueShift: (noteInfo.normalizedPosition - 0.5) * 60,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawLightningBolt(ctx, startX, startY, endY, seed, alpha, lineW) {
        const segments = 12;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let bx = startX;
        for (let s = 0; s < segments; s++) {
            const t = (s + 1) / segments;
            const y = startY + (endY - startY) * t;
            bx += (Math.sin(seed * (s + 1) * 127.1) * 2 - 1) * (30 + (1 - t) * 40);
            ctx.lineTo(bx, y);
        }
        ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
        ctx.lineWidth = lineW;
        ctx.stroke();
        // Branch
        if (alpha > 0.3) {
            const branchSeg = Math.floor(segments * 0.5);
            const bby = startY + (endY - startY) * (branchSeg / segments);
            const bbx = bx - 20;
            ctx.beginPath();
            ctx.moveTo(bbx, bby);
            let cx2 = bbx;
            for (let s = 0; s < 5; s++) {
                cx2 += (Math.sin(seed * (s + 7) * 311.7) * 2 - 1) * 20;
                ctx.lineTo(cx2, bby + (endY - bby) * ((s + 1) / 5) * 0.6);
            }
            ctx.strokeStyle = `rgba(200,220,255,${alpha * 0.5})`;
            ctx.lineWidth = lineW * 0.4;
            ctx.stroke();
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;

        // === Sky gradient ===
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `hsl(${230 + hue*0.05},22%,7%)`);
        skyGrad.addColorStop(0.5, `hsl(${220 + hue*0.05},28%,10%)`);
        skyGrad.addColorStop(1, `hsl(${210},22%,5%)`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Stars (peeking through cloud gaps)
        for (const s of this.stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * s.twS + s.tw);
            ctx.fillStyle = `rgba(220,230,255,${s.a * tw * 0.4})`;
            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.s, 0, Math.PI * 2);
            ctx.fill();
        }

        // === Cloud illumination (from lightning) ===
        for (let i = this.illuminations.length - 1; i >= 0; i--) {
            const ill = this.illuminations[i];
            ill.life -= dt * 3;
            if (ill.life <= 0) { this.illuminations.splice(i, 1); continue; }
            const ix = ill.x * w;
            const iGrad = ctx.createRadialGradient(ix, h * 0.25, 0, ix, h * 0.25, w * 0.5);
            const illHue = (hue + ill.hueShift + 200) % 360;
            iGrad.addColorStop(0, `hsla(${illHue},60%,75%,${ill.life * ill.vel * 0.35})`);
            iGrad.addColorStop(0.4, `hsla(${illHue},40%,50%,${ill.life * 0.1})`);
            iGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = iGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // === Clouds (back to front) ===
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed * speed * dt;
            if (cloud.x > 1.3) cloud.x = -0.3;

            const cx = cloud.x * w;
            const cy = cloud.y * h;
            const depth = cloud.layer / 5;
            const cw = cloud.baseW * (0.6 + depth * 0.6);
            const isDark = cloud.dark;

            for (const puff of cloud.puffs) {
                const px = cx + puff.ox * cw;
                const py = cy + puff.oy * cw * 0.35;
                const pr = puff.r * cw * 0.38;

                // Dark storm cloud vs. light upper cloud
                const baseLight = isDark ? 12 + depth * 8 : 28 + depth * 18;
                const baseAlpha = isDark ? 0.18 + depth * 0.12 : 0.09 + depth * 0.1;
                const energyLight = energy * (isDark ? 8 : 15);

                const grad = ctx.createRadialGradient(
                    px, py - pr * 0.1, 0,
                    px, py, pr
                );
                grad.addColorStop(0, `hsla(${220 + hue*0.08},${isDark?5:15}%,${baseLight + energyLight}%,${baseAlpha * 1.4})`);
                grad.addColorStop(0.55, `hsla(${220},${isDark?3:10}%,${baseLight - 5}%,${baseAlpha})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
            }
        }

        // === Rain ===
        ctx.save();
        for (const r of this.rain) {
            r.y += (r.speed * dt) / h;
            if (r.y > 1) { r.y = 0; r.x = Math.random(); }
            const rx = r.x * w, ry = r.y * h;
            ctx.strokeStyle = `rgba(140,172,210,${r.alpha * (0.3 + energy * 0.7)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + r.len * 0.08, ry + r.len);
            ctx.stroke();
        }
        ctx.restore();

        // === Lightning bolts ===
        this.lightningBolts = this.lightningBolts.filter(l => l.life > 0.01);
        for (const l of this.lightningBolts) {
            l.life -= dt * 5;
            const cloudBase = h * 0.45;
            const alpha = l.life * l.vel;

            // Screen flash
            if (l.life > 0.6) {
                ctx.fillStyle = `rgba(180,200,255,${alpha * 0.08})`;
                ctx.fillRect(0, 0, w, h);
            }
            // Main bolt
            this._drawLightningBolt(ctx, l.x, cloudBase, h * 0.98, l.seed, alpha * 0.95, 2 + l.vel * 2.5);
            // Glow
            ctx.shadowColor = `rgba(180,200,255,${alpha * 0.8})`;
            ctx.shadowBlur = 20;
            this._drawLightningBolt(ctx, l.x, cloudBase, h * 0.98, l.seed, alpha * 0.3, 5);
            ctx.shadowBlur = 0;
        }

        // === Ground fog/mist ===
        const mistGrad = ctx.createLinearGradient(0, h * 0.82, 0, h);
        mistGrad.addColorStop(0, 'transparent');
        mistGrad.addColorStop(1, `hsla(${220 + hue*0.05},20%,12%,${0.5 + energy*0.2})`);
        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
    }
}
