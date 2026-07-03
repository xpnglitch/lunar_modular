import { StargateMath } from '../math/StargateMath.js';

/**
 * StargateMode — Interdimensional Wormhole Vortex.
 * A deep hypnotic tunnel of rotating concentric rings spiraling toward a
 * singularity. The tunnel walls are built from dense rotating particle streams
 * that accelerate as they converge. Note events send shockwaves through the
 * tunnel and briefly reveal the void beyond the event horizon.
 */
export class StargateMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new StargateMath();
        this.time = 0;
        this._tunnelParticles = [];
        this._rings = [];
        this._shockwaves = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildTunnel(w, h);
        this.initialized = true;
    }

    _buildTunnel(w, h) {
        // Pre-bake tunnel particles: each lives at a given z-depth and orbit angle
        this._tunnelParticles = Array.from({ length: 600 }, (_, i) => ({
            z:       Math.random(),          // 0=close, 1=far
            angle:   Math.random() * Math.PI * 2,
            angVel:  (0.5 + Math.random() * 1.5) * (Math.random() < 0.5 ? 1 : -1),
            radius:  0.85 + (Math.random() - 0.5) * 0.3, // normalized tunnel radius
            hueOff:  Math.random() * 60 - 30,
            size:    0.5 + Math.random() * 2.0,
            bright:  0.4 + Math.random() * 0.6,
        }));

        // Static ring descriptors
        this._rings = Array.from({ length: 30 }, (_, i) => ({
            z:      (i / 30),   // 0=close, 1=far
            rot:    Math.random() * Math.PI * 2,
            rotVel: (0.3 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1),
            hueOff: i * 12,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this._shockwaves.push({
            z:    1.0,         // starts at the far end
            life: 1.0,
            vel:  noteInfo.velocity,
            hue:  noteInfo.normalizedPosition * 360,
            speed: 1.5 + noteInfo.velocity * 2.0,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _project(normRadius, angle, z, w, h) {
        // Perspective: far objects (z=1) appear small near center
        const fov     = 0.5;
        const scale   = fov / Math.max(0.001, fov + z);
        const maxR    = Math.min(w, h) * 0.48;
        const r       = normRadius * maxR * scale;
        return {
            x:     w/2 + Math.cos(angle) * r,
            y:     h/2 + Math.sin(angle) * r * 0.9,
            scale: scale,
            r:     r,
        };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const complexity = Number(mathEngine.get('complexity')) || 0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        // --- Void center ---
        ctx.fillStyle = '#000003';
        ctx.fillRect(0, 0, w, h);

        const cx = w/2, cy = h/2;

        ctx.globalCompositeOperation = 'lighter';

        // --- Tunnel rings (z sorted far→near) ---
        const sortedRings = [...this._rings].sort((a, b) => b.z - a.z);
        for (const ring of sortedRings) {
            ring.rot += ring.rotVel * speed * dt * (1 + energy * 0.5);

            const fov   = 0.5;
            const scale = fov / Math.max(0.001, fov + ring.z);
            const maxR  = Math.min(w, h) * 0.48;
            const rPx   = maxR * scale;
            const alpha = (0.04 + (1 - ring.z) * 0.12) * (0.4 + intensity * 0.6) * (0.6 + energy * 0.4);
            const rHue  = (hue + ring.hueOff + (1 - ring.z) * 60) % 360;
            const lw    = (0.5 + (1 - ring.z) * 3.0);

            ctx.strokeStyle = `hsla(${rHue}, 100%, ${50 + (1-ring.z)*30}%, ${alpha})`;
            ctx.lineWidth   = lw;
            ctx.beginPath();
            // Slightly polygonal ring with rotation for visual interest
            const sides = 6 + Math.floor(complexity * 6);
            for (let s = 0; s <= sides; s++) {
                const a = ring.rot + (s / sides) * Math.PI * 2;
                const rx = cx + Math.cos(a) * rPx;
                const ry = cy + Math.sin(a) * rPx * 0.9;
                if (s === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
            }
            ctx.stroke();

            // Glow on near rings
            if (ring.z < 0.3) {
                const ng = ctx.createRadialGradient(cx, cy, rPx*0.85, cx, cy, rPx*1.15);
                ng.addColorStop(0, 'transparent');
                ng.addColorStop(0.5, `hsla(${rHue},100%,80%,${alpha*0.5})`);
                ng.addColorStop(1, 'transparent');
                ctx.strokeStyle = ng;
                ctx.lineWidth = lw * 4;
                ctx.stroke();
            }
        }

        // --- Tunnel particles ---
        for (const p of this._tunnelParticles) {
            // Particles flow toward viewer (z decreases over time)
            p.z  -= speed * dt * (0.15 + (1 - p.z) * 0.25 + energy * 0.1);
            p.angle += p.angVel * speed * dt;
            if (p.z <= 0.01) {
                p.z     = 0.9 + Math.random() * 0.2;
                p.angle = Math.random() * Math.PI * 2;
            }

            const proj  = this._project(p.radius, p.angle, p.z, w, h);
            const alpha = p.bright * (0.02 + (1 - p.z) * 0.18) * (0.5 + intensity * 0.5) * (0.4 + energy * 0.6);
            const pHue  = (hue + p.hueOff + (1 - p.z) * 80) % 360;
            const pSize = p.size * proj.scale * 4;

            ctx.fillStyle = `hsla(${pHue}, 100%, ${65+(1-p.z)*25}%, ${alpha})`;
            ctx.beginPath(); ctx.arc(proj.x, proj.y, pSize, 0, Math.PI*2); ctx.fill();
        }

        // --- Shockwaves ---
        this._shockwaves = this._shockwaves.filter(s => s.life > 0.01);
        for (const sw of this._shockwaves) {
            sw.z    -= sw.speed * dt;
            sw.life -= dt * 0.9;
            if (sw.z <= 0) { sw.life = 0; continue; }

            const fov   = 0.5;
            const scale = fov / Math.max(0.001, fov + sw.z);
            const maxR  = Math.min(w, h) * 0.48 * scale;
            const swHue = (hue + sw.hue) % 360;
            const alpha = sw.life * sw.vel * 0.4;

            const sg = ctx.createRadialGradient(cx, cy, maxR*0.85, cx, cy, maxR*1.15);
            sg.addColorStop(0, 'transparent');
            sg.addColorStop(0.5, `hsla(${swHue},100%,90%,${alpha})`);
            sg.addColorStop(1, 'transparent');
            ctx.strokeStyle = sg;
            ctx.lineWidth = 4 * sw.life;
            ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI*2); ctx.stroke();
        }

        // --- Singularity core ---
        const coreR = 8 + energy * 20;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 5);
        cg.addColorStop(0, `hsla(${hue}, 80%, 95%, ${0.6 + energy * 0.4})`);
        cg.addColorStop(0.3, `hsla(${(hue+40)%360}, 100%, 70%, ${0.3 + energy * 0.2})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, coreR*5, 0, Math.PI*2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';

        // Vignette
        const vig = ctx.createRadialGradient(cx, cy, Math.min(w,h)*0.25, cx, cy, Math.min(w,h)*0.75);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
    }
}
