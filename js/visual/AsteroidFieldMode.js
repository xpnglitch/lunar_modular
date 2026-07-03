import { AsteroidFieldMath } from '../math/AsteroidFieldMath.js';

/**
 * AsteroidFieldMode — 3D Debris Field.
 * A high-fidelity cinematic simulation of traveling through a dense asteroid belt.
 * Features 3D projected geometry, motion-blur starfield, and explosive note-reactivity.
 */
export class AsteroidFieldMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new AsteroidFieldMath();
        this.asteroids = [];
        this.stars = [];
        this.debris = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initField(w, h);
        this.initialized = true;
    }

    _initField(w, h) {
        // Initialize 3D starfield
        this.stars = Array.from({ length: 250 }, () => ({
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4,
            z: Math.random() * 20,
            s: 1.0 + Math.random() * 2.5
        }));

        // Initialize asteroids
        this.asteroids = Array.from({ length: 35 }, () => this._createAsteroid());
    }

    _createAsteroid(zOverride) {
        const sides = 6 + Math.floor(Math.random() * 6);
        const radius = 0.05 + Math.random() * 0.15;
        const verts = Array.from({ length: sides }, (_, i) => {
            const ang = (i / sides) * Math.PI * 2;
            const r = radius * (0.7 + Math.random() * 0.6);
            return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
        });

        return {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4,
            z: zOverride !== undefined ? zOverride : Math.random() * 20,
            verts,
            radius,
            rot: Math.random() * Math.PI * 2,
            rotV: (Math.random() - 0.5) * 2,
            hueOff: Math.random() * 30 - 15
        };
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Explosion particles at the screen center (as if something hit us or a nearby rock shattered)
        const count = 15 + Math.floor(noteInfo.velocity * 30);
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.0;
            this.debris.push({
                x: (noteInfo.normalizedPosition - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: 2.0 + Math.random() * 5.0,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                vz: -speed * 0.5,
                life: 1.0,
                hue: Math.random() * 40
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _project(x, y, z, w, h) {
        const fov = 1.0;
        const factor = fov / z;
        return {
            px: w / 2 + x * factor * w,
            py: h / 2 + y * factor * h,
            scale: factor
        };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue');

        this.mathInstance.step(dt, complexity);
        const zVel = this.mathInstance.zVelocity;
        const energy = this.mathInstance.energy;

        // --- Deep Space Backdrop ---
        ctx.fillStyle = '#010005';
        ctx.fillRect(0, 0, w, h);

        // Subtle nebula nebula glow
        const nGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h));
        nGrad.addColorStop(0, `hsla(${hue}, 40%, 8%, 0.4)`);
        nGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- 3D Starfield ---
        for (const s of this.stars) {
            s.z -= zVel * dt;
            if (s.z <= 0.1) s.z += 20;

            const p = this._project(s.x, s.y, s.z, w, h);
            if (p.px < 0 || p.px > w || p.py < 0 || p.py > h) continue;

            const size = (s.s * p.scale * 2);
            const alpha = Math.min(1.0, (20 - s.z) / 10) * intensity;
            
            // Draw star with motion blur streak
            const streak = zVel * 5 * p.scale;
            ctx.strokeStyle = `hsla(${(hue + 20) % 360}, 100%, 90%, ${alpha})`;
            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.px, p.py - streak); // Streaking towards camera
            ctx.stroke();
        }

        // --- Asteroids ---
        for (const a of this.asteroids) {
            a.z -= zVel * dt;
            a.rot += a.rotV * dt;
            if (a.z <= 0.2) {
                Object.assign(a, this._createAsteroid(20));
            }

            const p = this._project(a.x, a.y, a.z, w, h);
            const aHue = (hue + a.hueOff) % 360;
            const alpha = Math.min(1.0, (20 - a.z) / 5) * (0.8 + energy * 0.2);

            ctx.save();
            ctx.translate(p.px, p.py);
            ctx.rotate(a.rot);
            
            const r = a.radius * p.scale * w;
            if (r < 0.5) { ctx.restore(); continue; }

            // Draw projected irregular polygon
            ctx.beginPath();
            for (let i = 0; i < a.verts.length; i++) {
                const vx = a.verts[i].x * p.scale * w;
                const vy = a.verts[i].y * p.scale * h;
                if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
            }
            ctx.closePath();

            // Rock shading
            const rockGrad = ctx.createRadialGradient(-r/3, -r/3, 0, 0, 0, r);
            rockGrad.addColorStop(0, `hsla(${aHue}, 30%, 70%, ${alpha})`);
            rockGrad.addColorStop(1, `hsla(${aHue}, 20%, 20%, ${alpha})`);
            ctx.fillStyle = rockGrad;
            ctx.fill();

            // Crater details
            if (r > 10) {
                ctx.fillStyle = `rgba(0,0,0,${0.3 * alpha})`;
                for (let k = 0; k < 3; k++) {
                    const cx = Math.cos(k * 2) * r * 0.4;
                    const cy = Math.sin(k * 2) * r * 0.4;
                    ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
                }
            }
            
            ctx.restore();
        }

        // --- Debris Particles ---
        this.debris = this.debris.filter(d => d.life > 0.01);
        for (const d of this.debris) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.z += d.vz * dt;
            d.life -= dt * 0.8;
            
            const p = this._project(d.x, d.y, d.z, w, h);
            if (d.z <= 0.1) { d.life = 0; continue; }
            
            const dSize = 2 + d.life * 10 * p.scale;
            ctx.fillStyle = `hsla(${(hue + d.hue) % 360}, 100%, 80%, ${d.life * intensity})`;
            ctx.beginPath(); ctx.arc(p.px, p.py, dSize, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
