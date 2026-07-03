import { StipplePointMath } from '../math/StipplePointMath.js';

/**
 * StipplePointMode — Living Constellation Web.
 * Thousands of luminous nodes drift in slow Brownian motion, connected by
 * dynamic energy strings when they draw close. The network breathes and
 * pulses — nodes flare and strings glow when audio energy peaks.
 * Note events create radiant supernodes that attract nearby nodes and
 * send cascading activation waves through the web.
 */
export class StipplePointMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new StipplePointMath();
        this.time = 0;
        this._nodes = [];
        this._supernodes = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildNodes(w, h);
        this.initialized = true;
    }

    _buildNodes(w, h) {
        const count = 180 + Math.floor(w * h / 8000);
        this._nodes = Array.from({ length: count }, () => ({
            x:      Math.random() * w,
            y:      Math.random() * h,
            vx:     (Math.random() - 0.5) * 12,
            vy:     (Math.random() - 0.5) * 12,
            r:      1.0 + Math.random() * 2.0,
            bright: 0.3 + Math.random() * 0.7,
            hueOff: Math.random() * 120 - 60,
            phase:  Math.random() * Math.PI * 2,
            energy: 0,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const sx = noteInfo.normalizedPosition * w;
        const sy = h * (0.2 + Math.random() * 0.6);

        // Ignite nodes near the supernode
        for (const n of this._nodes) {
            const dx = n.x - sx, dy = n.y - sy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 180) {
                n.energy = Math.min(1.0, noteInfo.velocity * (1 - dist/180));
            }
        }

        this._supernodes.push({
            x: sx, y: sy,
            life: 1.0,
            vel: noteInfo.velocity,
            hue: noteInfo.normalizedPosition * 360,
            r: 0,
            maxR: 80 + noteInfo.velocity * 150,
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const complexity = Number(mathEngine.get('complexity')) || 0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        ctx.fillStyle = `rgba(0,0,4,${0.08 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        const connectDist = 80 + complexity * 80;

        // Update nodes
        for (const n of this._nodes) {
            n.x  += n.vx * speed * dt;
            n.y  += n.vy * speed * dt;
            n.vx += (Math.random() - 0.5) * 8 * dt;
            n.vy += (Math.random() - 0.5) * 8 * dt;
            // Speed limit
            const sp = Math.sqrt(n.vx*n.vx + n.vy*n.vy);
            if (sp > 25) { n.vx *= 25/sp; n.vy *= 25/sp; }
            // Wrap
            if (n.x < 0) n.x += w; if (n.x > w) n.x -= w;
            if (n.y < 0) n.y += h; if (n.y > h) n.y -= h;
            // Energy decay
            n.energy *= 0.97;
        }

        // Draw connections
        for (let i = 0; i < this._nodes.length; i++) {
            const a = this._nodes[i];
            for (let j = i + 1; j < this._nodes.length; j++) {
                const b = this._nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > connectDist) continue;

                const frac  = 1 - dist / connectDist;
                const eBoost= (a.energy + b.energy) * 0.5;
                const alpha = frac * frac * 0.25 * (0.3 + intensity * 0.4) * (0.6 + eBoost * 2 + energy * 0.5);
                const cHue  = (hue + (a.hueOff + b.hueOff) * 0.5) % 360;

                ctx.strokeStyle = `hsla(${cHue}, 80%, ${55 + frac * 30}%, ${alpha})`;
                ctx.lineWidth   = 0.5 + frac * 1.5 + eBoost * 2;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
        }

        // Draw nodes
        for (const n of this._nodes) {
            const tw    = 0.5 + 0.5 * Math.sin(this.time * 1.5 + n.phase);
            const nHue  = (hue + n.hueOff) % 360;
            const boost = n.energy;
            const alpha = (n.bright * tw * 0.7 + boost * 0.8) * (0.4 + intensity * 0.4);
            const nR    = n.r * (1 + boost * 3) * (1 + energy * 0.3);

            // Glow halo for energized nodes
            if (boost > 0.1 || energy > 0.3) {
                const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, nR * 6);
                ng.addColorStop(0, `hsla(${nHue}, 100%, 80%, ${alpha * 0.5})`);
                ng.addColorStop(1, 'transparent');
                ctx.fillStyle = ng;
                ctx.beginPath(); ctx.arc(n.x, n.y, nR*6, 0, Math.PI*2); ctx.fill();
            }

            ctx.fillStyle = `hsla(${nHue}, ${70+boost*30}%, ${65+boost*25}%, ${alpha})`;
            ctx.beginPath(); ctx.arc(n.x, n.y, nR, 0, Math.PI*2); ctx.fill();
        }

        // Supernodes
        this._supernodes = this._supernodes.filter(s => s.life > 0.01);
        for (const sn of this._supernodes) {
            sn.r    += 180 * dt;
            sn.life -= dt * 1.2;
            const snHue = (hue + sn.hue) % 360;
            const sg  = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, sn.r * 1.5);
            sg.addColorStop(0, `hsla(${snHue},100%,95%,${sn.life * sn.vel * 0.7})`);
            sg.addColorStop(0.4, `hsla(${(snHue+40)%360},100%,70%,${sn.life * 0.3})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r*1.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
