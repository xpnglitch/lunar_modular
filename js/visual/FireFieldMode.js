import { FireFieldMath } from '../math/FireFieldMath.js';

/**
 * FireFieldMode — Solar Corona Eruption.
 * The surface of a star: seething plasma with roiling convection cells,
 * magnetic loop prominences that arc overhead, and coronal mass ejections
 * that blast particles into space on note transients. The solar surface
 * is a field of granulation — bright rising cells and dark cool lanes.
 * Additive blending makes overlapping plasma streams bloom brilliantly.
 */
export class FireFieldMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new FireFieldMath();
        this.time = 0;
        this._plumes   = [];  // rising plasma columns
        this._loops    = [];  // magnetic prominence loops
        this._ejecta   = [];  // coronal mass ejection particles
        this._granules = [];  // surface convection granules
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildSurface(w, h);
        this.initialized = true;
    }

    _buildSurface(w, h) {
        // Pre-bake surface granule positions
        this._granules = Array.from({ length: 60 }, () => ({
            x:     Math.random() * w,
            y:     h * 0.75 + Math.random() * h * 0.3,
            r:     20 + Math.random() * 50,
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,
        }));

        // Seed some initial plumes
        for (let i = 0; i < 8; i++) {
            this._spawnPlume(Math.random() * w, h, 0.3);
        }
    }

    _spawnPlume(x, h, vel) {
        this._plumes.push({
            x,
            segments: [{ x, y: h * 0.78 }],
            vy:      -(80 + Math.random() * 160 + vel * 200),
            life:    1.0,
            vel,
            hueOff:  (Math.random() - 0.5) * 40,
            width:   4 + Math.random() * 12 + vel * 20,
            sway:    (Math.random() - 0.5) * 60,
        });
    }

    _spawnLoop(x, h, vel, hue) {
        const span = 60 + vel * 200;
        this._loops.push({
            x1:    x - span/2,
            x2:    x + span/2,
            y:     h * 0.78,
            height: 80 + vel * 250,
            life:  1.0,
            hue,
            vel,
            phase: 0,
        });
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const x = noteInfo.normalizedPosition * w;

        // Major eruption plume
        this._spawnPlume(x, h, noteInfo.velocity);

        // Magnetic prominence loop
        this._spawnLoop(x, h, noteInfo.velocity, noteInfo.normalizedPosition * 360);

        // CME particle burst
        const n = 20 + Math.floor(noteInfo.velocity * 60);
        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            this._ejecta.push({
                x, y: h * 0.78,
                vx: Math.cos(angle) * (200 + Math.random() * 400) * noteInfo.velocity,
                vy: Math.sin(angle) * (300 + Math.random() * 400) * noteInfo.velocity,
                life: 1.0,
                hue:  noteInfo.normalizedPosition * 360,
                size: 2 + Math.random() * 6,
            });
        }
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

        const surfaceY = h * 0.78;

        // --- Deep corona space ---
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#000004');
        bg.addColorStop(0.6, `hsla(${(hue+20)%360},60%,5%,1)`);
        bg.addColorStop(1, `hsla(${(hue+10)%360},80%,12%,1)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Granulation surface ---
        for (const g of this._granules) {
            const pulse = 0.5 + 0.5 * Math.sin(this.time * g.speed + g.phase);
            const gHue  = (hue + 20) % 360;
            const gg    = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r * (1 + energy * 0.3));
            gg.addColorStop(0, `hsla(${gHue},90%,${55+pulse*20}%,${0.08+pulse*0.08+energy*0.05})`);
            gg.addColorStop(0.6, `hsla(${(gHue-15+360)%360},80%,${35+pulse*10}%,${0.04+pulse*0.04})`);
            gg.addColorStop(1, 'transparent');
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.arc(g.x, g.y, g.r*(1+energy*0.3), 0, Math.PI*2); ctx.fill();
        }

        // --- Plasma plumes ---
        // Ambient spawn
        if (Math.random() < 0.05 + energy * 0.12) {
            this._spawnPlume(Math.random() * w, h, 0.1 + Math.random() * 0.2);
        }
        while (this._plumes.length > 40) this._plumes.shift();

        this._plumes = this._plumes.filter(p => p.life > 0.01);
        for (const p of this._plumes) {
            p.life -= dt * (0.4 + (1 - p.vel) * 0.3);

            // Extend plume segment
            const last = p.segments[p.segments.length - 1];
            const newX = last.x + Math.sin(this.time * 2 + last.y * 0.01) * p.sway * dt * speed;
            const newY = last.y + p.vy * dt * speed;
            if (newY > 0 && newY < h) {
                p.segments.push({ x: newX, y: newY });
                if (p.segments.length > 30) p.segments.shift();
            }

            // Draw as gradient line
            if (p.segments.length < 2) continue;
            for (let s = 1; s < p.segments.length; s++) {
                const frac = s / p.segments.length;
                const sp   = p.segments[s-1], sn = p.segments[s];
                const pHue = (hue + p.hueOff + (1-frac)*30) % 360;
                const alpha= frac * p.life * 0.4 * (0.5 + intensity * 0.5);
                ctx.strokeStyle = `hsla(${pHue}, 100%, ${55+frac*35}%, ${alpha})`;
                ctx.lineWidth   = p.width * frac * (0.5 + energy * 0.5);
                ctx.lineCap     = 'round';
                ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sn.x, sn.y); ctx.stroke();
            }
        }

        // --- Magnetic prominence loops ---
        this._loops = this._loops.filter(l => l.life > 0.01);
        for (const l of this._loops) {
            l.life  -= dt * 0.5;
            l.phase += dt * 0.5;

            const lHue  = (hue + l.hue) % 360;
            const alpha = l.life * 0.4 * (0.4 + intensity * 0.4);
            ctx.strokeStyle = `hsla(${lHue}, 100%, 70%, ${alpha})`;
            ctx.lineWidth   = 2 + l.vel * 4;
            ctx.beginPath();
            // Bezier arc loop
            const mx = (l.x1 + l.x2) / 2;
            const my = surfaceY - l.height * (0.8 + 0.2 * Math.sin(l.phase));
            ctx.moveTo(l.x1, l.y);
            ctx.quadraticCurveTo(mx, my, l.x2, l.y);
            ctx.stroke();

            // Glow
            const sg = ctx.createRadialGradient(mx, my, 0, mx, my, 30 + l.vel*40);
            sg.addColorStop(0, `hsla(${lHue},100%,80%,${l.life*0.25*intensity})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg;
            ctx.fillRect(0, 0, w, h);
        }

        // --- CME ejecta particles ---
        this._ejecta = this._ejecta.filter(e => e.life > 0.01 && e.y > -50);
        for (const e of this._ejecta) {
            e.x    += e.vx * dt * speed;
            e.y    += e.vy * dt * speed;
            e.vy   -= 100 * dt; // slight gravity resistance → momentum
            e.life -= dt * 0.8;
            const eHue  = (hue + e.hue) % 360;
            const alpha = e.life * 0.6 * intensity;
            const eg    = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size*3);
            eg.addColorStop(0, `hsla(${eHue},100%,90%,${alpha})`);
            eg.addColorStop(1, 'transparent');
            ctx.fillStyle = eg;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.size*3, 0, Math.PI*2); ctx.fill();
        }

        // --- Surface bright band ---
        const sunG = ctx.createLinearGradient(0, surfaceY - 20, 0, surfaceY + 30);
        sunG.addColorStop(0, `hsla(${(hue+30)%360},100%,${55+energy*25}%,${0.2+energy*0.3})`);
        sunG.addColorStop(0.5, `hsla(${(hue+15)%360},100%,${45+energy*20}%,${0.15+energy*0.2})`);
        sunG.addColorStop(1, 'transparent');
        ctx.fillStyle = sunG;
        ctx.fillRect(0, surfaceY - 20, w, 50);

        ctx.globalCompositeOperation = 'source-over';
    }
}
