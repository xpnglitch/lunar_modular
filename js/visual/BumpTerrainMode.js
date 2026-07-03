import { BumpTerrainMath } from '../math/BumpTerrainMath.js';

/**
 * BumpTerrainMode — Procedural alien terrain with real-time lighting.
 * Height-mapped surface rendered with multi-light normal mapping.
 * Notes cause seismic events: eruptions, lava cracks, terrain heave.
 */
export class BumpTerrainMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new BumpTerrainMath();
        this.seismic = [];   // note-triggered quake ripples
        this.eruptions = []; // lava upwellings
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
        this.rw = 0; this.rh = 0;
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        // Render terrain at 1/3 resolution, upscale
        this.rw = Math.floor(w / 3);
        this.rh = Math.floor(h / 3);
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.rw;
        this.offscreen.height = this.rh;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.rw, this.rh);
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const nx = noteInfo.normalizedPosition;
        this.seismic.push({
            cx: nx, cy: 0.4 + Math.random() * 0.25,
            r: 0, maxR: 0.4 + noteInfo.velocity * 0.45,
            life: 1.0, vel: noteInfo.velocity,
        });
        if (noteInfo.velocity > 0.5) {
            this.eruptions.push({
                x: nx,
                y: 0.5 + Math.random() * 0.2,
                life: 1.0, vel: noteInfo.velocity,
                time: 0,
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _noise(x, y, t) {
        // Multi-octave sine-based noise
        const v1 = Math.sin(x * 4.1 + t * 0.4) * Math.cos(y * 3.7 + t * 0.3);
        const v2 = Math.sin(x * 8.7 - t * 0.2) * Math.cos(y * 7.3 + t * 0.5) * 0.5;
        const v3 = Math.sin(x * 17.2 + t * 0.7) * Math.cos(y * 15.1 - t * 0.4) * 0.25;
        const v4 = Math.sin(x * 34.5 - t * 1.1) * Math.cos(y * 29.8 + t * 0.8) * 0.125;
        return (v1 + v2 + v3 + v4 + 1) * 0.5;  // normalize 0-1
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;
        const t = this.time;

        // Update seismic events
        this.seismic = this.seismic.filter(s => s.life > 0.01);
        for (const s of this.seismic) {
            s.r += 0.35 * dt;
            s.life -= dt * 1.2;
        }
        this.eruptions = this.eruptions.filter(e => e.life > 0.01);
        for (const e of this.eruptions) {
            e.life -= dt * 0.8;
            e.time += dt;
        }

        // === Terrain pixel render ===
        const pix = this.imageData.data;
        const rw = this.rw, rh = this.rh;

        // Light source: orbiting + energy boost
        const lightAngle = t * 0.25;
        const lx = 0.5 + Math.cos(lightAngle) * 0.4;
        const ly = 0.5 + Math.sin(lightAngle * 0.7) * 0.3;

        for (let py = 0; py < rh; py++) {
            const v = py / rh;
            for (let px = 0; px < rw; px++) {
                const u = px / rw;

                // Base height
                let height = this._noise(u * (1 + complexity), v * (1 + complexity * 0.7), t * 0.15);

                // Seismic deformation
                for (const s of this.seismic) {
                    const dx = u - s.cx, dy = v - s.cy;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < s.r + 0.05) {
                        const wave = Math.sin((d - s.r) * 40) * Math.exp(-Math.abs(d - s.r) * 30);
                        height += wave * s.life * s.vel * 0.25;
                    }
                }
                height = Math.max(0, Math.min(1, height));

                // Normal estimation (central differences)
                const eps = 1.5 / rw;
                const dh_dx = this._noise((u + eps) * (1 + complexity), v * (1 + complexity * 0.7), t * 0.15)
                            - this._noise((u - eps) * (1 + complexity), v * (1 + complexity * 0.7), t * 0.15);
                const dh_dy = this._noise(u * (1 + complexity), (v + eps) * (1 + complexity * 0.7), t * 0.15)
                            - this._noise(u * (1 + complexity), (v - eps) * (1 + complexity * 0.7), t * 0.15);
                const nx = -dh_dx, ny = -dh_dy, nz = 0.08;
                const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);

                // Lambertian diffuse
                const ldx = lx - u, ldy = ly - v, ldz = 0.5;
                const ll = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
                const diffuse = Math.max(0, (nx / nl) * (ldx / ll) + (ny / nl) * (ldy / ll) + (nz / nl) * (ldz / ll));

                // Specular (Phong)
                const spec = Math.pow(Math.max(0, diffuse), 16) * (0.3 + intensity * 0.4);

                // Color: terrain type by height
                let r, g, b;
                if (height < 0.25) {
                    // Deep rock / low valleys — dark slate
                    const f = height / 0.25;
                    r = Math.floor(f * 40 + 10);
                    g = Math.floor(f * 35 + 8);
                    b = Math.floor(f * 55 + 15);
                } else if (height < 0.5) {
                    // Mid terrain — hue-shifted stone
                    const f = (height - 0.25) / 0.25;
                    const h1 = (hue + 20) % 360;
                    r = Math.floor(30 + f * 50 + Math.sin(h1 * 0.0175) * 20);
                    g = Math.floor(25 + f * 42);
                    b = Math.floor(35 + f * 60 + Math.cos(h1 * 0.0175) * 15);
                } else if (height < 0.78) {
                    // High terrain — rock + energy glow
                    const f = (height - 0.5) / 0.28;
                    r = Math.floor(70 + f * 80 + energy * 40);
                    g = Math.floor(55 + f * 50 + energy * 20);
                    b = Math.floor(80 + f * 60);
                } else {
                    // Peaks — bright, lava-like with energy
                    const f = (height - 0.78) / 0.22;
                    r = Math.floor(140 + f * 115 + energy * 60);
                    g = Math.floor(90 + f * 80 + energy * 30);
                    b = Math.floor(60 + f * 40);
                }

                // Eruption lava glow
                for (const e of this.eruptions) {
                    const dx = u - e.x, dy = v - e.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const glow = Math.max(0, 1 - d / (0.08 + e.vel * 0.1)) * e.life;
                    r = Math.min(255, r + glow * 200);
                    g = Math.min(255, g + glow * 60);
                    b = Math.max(0, b - glow * 40);
                }

                // Apply lighting
                const lit = diffuse * 0.85 + 0.15;
                const idx = (py * rw + px) * 4;
                pix[idx]   = Math.min(255, r * lit + spec * 255);
                pix[idx+1] = Math.min(255, g * lit + spec * 200);
                pix[idx+2] = Math.min(255, b * lit + spec * 180);
                pix[idx+3] = 255;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreen, 0, 0, w, h);

        // === Atmospheric haze overlay ===
        const haze = ctx.createLinearGradient(0, 0, 0, h);
        haze.addColorStop(0, `hsla(${(hue + 220) % 360},30%,5%,0.55)`);
        haze.addColorStop(0.4, 'transparent');
        haze.addColorStop(0.9, 'transparent');
        haze.addColorStop(1, `hsla(${hue},20%,8%,0.3)`);
        ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);

        // === Eruption particle sparks ===
        if (this.eruptions.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const e of this.eruptions) {
                const ex = e.x * w, ey = e.y * h;
                const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 60 + e.vel * 100 * e.life);
                eg.addColorStop(0, `hsla(20,100%,80%,${e.life * 0.6})`);
                eg.addColorStop(0.4, `hsla(10,100%,55%,${e.life * 0.25})`);
                eg.addColorStop(1, 'transparent');
                ctx.fillStyle = eg;
                ctx.beginPath(); ctx.arc(ex, ey, 60 + e.vel * 100 * e.life, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
