/**
 * SmokeMode — Dual-Layer Volumetric + Cascade Smoke
 * 
 * Layer 1 (background): Large, soft, blurred smoke volume via offscreen canvas
 * Layer 2 (foreground): Original cascade particles — crisp, waveform-linked embers
 * 
 * Zero emission when idle — dense billowing when triggered.
 */
export class SmokeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;

        // --- Volume layer (background smoke) ---
        this.volParticles = [];
        this.VOL_MAX = 600;
        this.offCanvas = null;
        this.offCtx = null;

        // --- Cascade layer (foreground embers — original style) ---
        this.cascParticles = [];
        this.CASC_MAX = 6000;

        // Hash noise for cascade turbulence (original)
        this._noise = (x, y) => {
            const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
            return (n - Math.floor(n)) * 2 - 1;
        };

        // Permutation table for smooth volume noise
        this._perm = new Uint8Array(512);
        for (let i = 0; i < 256; i++) this._perm[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._perm[i], this._perm[j]] = [this._perm[j], this._perm[i]];
        }
        for (let i = 0; i < 256; i++) this._perm[i + 256] = this._perm[i];
    }

    resize(w, h) {
        this.offCanvas = document.createElement('canvas');
        this.offCanvas.width = Math.floor(w / 2);
        this.offCanvas.height = Math.floor(h / 2);
        this.offCtx = this.offCanvas.getContext('2d');
    }

    onNoteOn() {}
    onNoteOff() {}

    // ── Smooth value noise for volume layer ──
    _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

    _valueNoise(x, y) {
        const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x), yf = y - Math.floor(y);
        const u = this._fade(xf), v = this._fade(yf);
        const aa = this._perm[this._perm[xi] + yi] / 255;
        const ab = this._perm[this._perm[xi] + yi + 1] / 255;
        const ba = this._perm[this._perm[xi + 1] + yi] / 255;
        const bb = this._perm[this._perm[xi + 1] + yi + 1] / 255;
        return ((aa + u * (ba - aa)) + v * ((ab + u * (bb - ab)) - (aa + u * (ba - aa)))) * 2 - 1;
    }

    _fbm(x, y, t) {
        let nx = 0, ny = 0, amp = 0.5, freq = 1;
        for (let o = 0; o < 3; o++) {
            nx += this._valueNoise(x * freq * 0.002 + t * 0.18 * freq, y * freq * 0.002 + t * 0.1) * amp;
            ny += this._valueNoise(x * freq * 0.002 + 100 + t * 0.12, y * freq * 0.002 + 200 - t * 0.06 * freq) * amp;
            amp *= 0.5; freq *= 2.2;
        }
        return { x: nx, y: ny };
    }

    // ── Hash turbulence for cascade layer (original) ──
    _getTurbulence(x, y, t) {
        const s = 0.003;
        let nx = this._noise(x * s + t * 0.25, y * s + t * 0.13) * 0.55;
        nx += this._noise(x * s * 2.1 + t * 0.4, y * s * 2.3 - t * 0.15) * 0.3;
        nx += this._noise(x * s * 5.2 - t * 0.55, y * s * 4.1 + t * 0.3) * 0.15;
        let ny = this._noise(x * s + 100 + t * 0.18, y * s + 200 - t * 0.1) * 0.4;
        ny += this._noise(x * s * 2.1 + 100 + t * 0.3, y * s * 2.3 + 200 + t * 0.2) * 0.25;
        ny += this._noise(x * s * 5.2 + 100 - t * 0.45, y * s * 4.1 + 200 - t * 0.25) * 0.1;
        return { x: nx, y: ny };
    }

    // ── Spawn volume smoke (large, soft, transparent) ──
    _spawnVolume(w, h, energy, timeBuf) {
        if (!timeBuf || energy < 0.02) return;
        const sliceW = w / timeBuf.length;
        const count = 1 + Math.floor(energy * 12);

        for (let i = 0; i < count; i++) {
            if (this.volParticles.length >= this.VOL_MAX) break;
            const idx = Math.floor(Math.random() * timeBuf.length);
            const waveY = (timeBuf[idx] / 255) * h;
            const deviation = Math.abs((timeBuf[idx] - 128) / 128);
            const baseLife = 3.0 + Math.random() * 5.0;

            this.volParticles.push({
                x: idx * sliceW, y: waveY,
                vx: (Math.random() - 0.5) * 0.7,
                vy: 0.2 + Math.random() * 0.4 + deviation * 0.4,
                life: baseLife, maxLife: baseLife,
                size: 35 + Math.random() * 55 + deviation * 40,
                growRate: 8 + Math.random() * 12,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.006,
                turbSeed: Math.random() * 1000,
                tempOffset: (Math.random() - 0.5) * 20,
                birthEnergy: energy
            });
        }
    }

    // ── Spawn cascade embers (original style — small, crisp) ──
    _spawnCascade(w, h, energy, timeBuf) {
        if (!timeBuf || energy < 0.02) return;
        const sliceW = w / timeBuf.length;
        const count = 5 + Math.floor(energy * 45);

        for (let i = 0; i < count; i++) {
            if (this.cascParticles.length >= this.CASC_MAX) break;
            const idx = Math.floor(Math.random() * timeBuf.length);
            const waveY = (timeBuf[idx] / 255) * h;
            const deviation = Math.abs((timeBuf[idx] - 128) / 128);
            const baseLife = 2.0 + Math.random() * 3.5;

            this.cascParticles.push({
                x: idx * sliceW, y: waveY,
                vx: (Math.random() - 0.5) * 1.2,
                vy: 0.4 + Math.random() * 0.6 + deviation * 1.0,
                life: baseLife, maxLife: baseLife,
                size: 4 + Math.random() * 10 + deviation * 14,
                growRate: 0.5 + Math.random() * 0.7 + deviation * 0.6,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.015,
                turbSeed: Math.random() * 1000
            });
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;

        if (!this.offCanvas || this.offCanvas.width !== Math.floor(w / 2)) {
            this.resize(w, h);
        }

        const timeBuf = mathEngine.getByteTimeDomainData();
        const energy = mathEngine.getRaw('aud_envelope') || 0;
        const hue = mathEngine.get('colorHue');

        // Spawn both layers
        this._spawnVolume(w, h, energy, timeBuf);
        this._spawnCascade(w, h, energy, timeBuf);

        // ═══════════════════════════════════════
        // LAYER 1: Volumetric smoke (offscreen → blurred)
        // ═══════════════════════════════════════
        const oc = this.offCtx;
        const ow = this.offCanvas.width;
        const oh = this.offCanvas.height;
        oc.clearRect(0, 0, ow, oh);
        oc.globalCompositeOperation = 'screen';

        for (let i = this.volParticles.length - 1; i >= 0; i--) {
            const p = this.volParticles[i];
            p.life -= dt;
            if (p.life <= 0 || p.y > h * 1.5) { this.volParticles.splice(i, 1); continue; }

            // Same cascade physics as layer 2
            const turb = this._getTurbulence(p.x + p.turbSeed, p.y, this.time);
            p.vx += turb.x * 0.18;
            p.vy += turb.y * 0.08;
            p.vy += 0.025;
            const lifeFrac = 1 - (p.life / p.maxLife);
            if (lifeFrac > 0.3) p.vx += turb.x * 0.1;
            p.vx *= 0.982; p.vy *= 0.992;
            p.x += p.vx; p.y += p.vy;
            p.size += p.growRate * dt;
            p.rotation += p.rotSpeed;

            let alpha;
            if (lifeFrac < 0.05) alpha = lifeFrac / 0.05;
            else if (lifeFrac < 0.2) alpha = 1;
            else alpha = Math.pow(1 - (lifeFrac - 0.2) / 0.8, 1.5);

            const finalAlpha = alpha * 0.06 * (0.5 + p.birthEnergy * 0.8);
            if (finalAlpha < 0.002) continue;

            const cool = lifeFrac * 0.5;
            const brightness = 190 + Math.sin(hue * 0.01) * 15 + p.tempOffset;
            const r = Math.floor(brightness * (1 - cool * 0.1));
            const g = Math.floor((brightness + 5) * (1 - cool * 0.08));
            const b = Math.floor((brightness + 15) * (1 - cool * 0.05));

            const hx = p.x / 2, hy = p.y / 2, hs = p.size / 2;
            oc.save();
            oc.translate(hx, hy);
            oc.rotate(p.rotation);
            const grad = oc.createRadialGradient(0, 0, 0, 0, 0, hs);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalAlpha})`);
            grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${finalAlpha * 0.7})`);
            grad.addColorStop(0.6, `rgba(${r - 20}, ${g - 25}, ${b + 8}, ${finalAlpha * 0.3})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            oc.fillStyle = grad;
            oc.fillRect(-hs, -hs, hs * 2, hs * 2);
            oc.restore();
        }
        oc.globalCompositeOperation = 'source-over';

        // Composite smoke volume onto main canvas (blurred + sharp passes)
        ctx.save();
        ctx.filter = 'blur(6px)';
        ctx.drawImage(this.offCanvas, 0, 0, w, h);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(this.offCanvas, 0, 0, w, h);
        ctx.restore();

        // ═══════════════════════════════════════
        // LAYER 2: Cascade embers (original style, direct to main canvas)
        // ═══════════════════════════════════════
        for (let i = this.cascParticles.length - 1; i >= 0; i--) {
            const p = this.cascParticles[i];
            p.life -= dt;
            if (p.life <= 0 || p.y > h * 1.5) { this.cascParticles.splice(i, 1); continue; }

            const turb = this._getTurbulence(p.x + p.turbSeed, p.y, this.time);
            p.vx += turb.x * 0.18;
            p.vy += turb.y * 0.08;
            p.vy += 0.025;
            const lifeFrac = 1 - (p.life / p.maxLife);
            if (lifeFrac > 0.3) p.vx += turb.x * 0.1;
            p.vx *= 0.982; p.vy *= 0.992;
            p.x += p.vx; p.y += p.vy;
            p.size += p.growRate * dt * 14;
            p.rotation += p.rotSpeed;

            let alpha;
            if (lifeFrac < 0.04) alpha = lifeFrac / 0.04;
            else alpha = Math.pow(1 - (lifeFrac - 0.04) / 0.96, 2.2);

            const finalAlpha = alpha * (0.35 + energy * 0.6);
            if (finalAlpha < 0.005) continue;

            const brightness = 210 + Math.sin(hue * 0.01) * 20;
            const r = Math.floor(brightness);
            const g = Math.floor(brightness + 5);
            const b = Math.floor(brightness + 10);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalAlpha})`);
            grad.addColorStop(0.4, `rgba(${r - 20}, ${g - 30}, ${b}, ${finalAlpha * 0.4})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            ctx.restore();
        }
    }
}
