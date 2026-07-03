import { CommandLogMath } from '../math/CommandLogMath.js';

/**
 * CommandLogMode — AI Consciousness Data Stream.
 * A cinematic 3D data visualization: dense streams of encoded information
 * cascade from multiple vanishing points, converging on a central
 * consciousness cluster. Semantic patterns emerge as attractor orbits.
 * Think: the inside of a mind — alive with flowing thought-data.
 * Note events inject new "thought bursts" that ripple through the network.
 */
export class CommandLogMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new CommandLogMath();
        this.time = 0;
        this._streams = [];
        this._particles = [];
        this._bursts = [];
        this.chars = '01アイウエオカキ▲◆★░▒▓█∞≡≈∂∇∑∫ABCDEF0123456789';
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildStreams(w, h);
        this._buildParticles(w, h);
        this.initialized = true;
    }

    _buildStreams(w, h) {
        // Multiple cascading text streams from screen edges converging inward
        const streamCount = 30 + Math.floor(w / 40);
        this._streams = Array.from({ length: streamCount }, (_, i) => {
            const side = Math.floor(i / (streamCount / 4)) % 4;
            let x, y, vx, vy;
            switch (side) {
                case 0: x = Math.random()*w;  y = -20; vx=(Math.random()-0.5)*20; vy=40+Math.random()*80; break;
                case 1: x = w+20; y = Math.random()*h; vx=-(40+Math.random()*80); vy=(Math.random()-0.5)*20; break;
                case 2: x = Math.random()*w;  y = h+20; vx=(Math.random()-0.5)*20; vy=-(40+Math.random()*80); break;
                default: x = -20; y = Math.random()*h; vx=40+Math.random()*80; vy=(Math.random()-0.5)*20; break;
            }
            return {
                x, y, vx, vy,
                chars: Array.from({ length: 20 }, () => this.chars[Math.floor(Math.random()*this.chars.length)]),
                hueOff:  (i / streamCount) * 280,
                speed:   0.8 + Math.random() * 1.2,
                length:  6 + Math.floor(Math.random() * 12),
                mutateT: 0,
                trail:   [],
                side,
            };
        });
    }

    _buildParticles(w, h) {
        // Central consciousness orbit particles
        this._particles = Array.from({ length: 120 }, () => ({
            angle:  Math.random() * Math.PI * 2,
            radius: 30 + Math.random() * 80,
            speed:  (0.5 + Math.random() * 1.5) * (Math.random() < 0.5 ? 1 : -1),
            phase:  Math.random() * Math.PI * 2,
            size:   1 + Math.random() * 2.5,
            hueOff: Math.random() * 120,
            z:      Math.random(),
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        this._bursts.push({
            x:    noteInfo.normalizedPosition * w,
            y:    h * 0.5,
            r:    0,
            life: 1.0,
            vel:  noteInfo.velocity,
            hue:  noteInfo.normalizedPosition * 360,
        });
        // Energize central particles
        for (const p of this._particles) p.speed *= 1.0 + noteInfo.velocity * 0.5;
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

        ctx.fillStyle = `rgba(0,1,3,${0.08 + (1-intensity)*0.05})`;
        ctx.fillRect(0, 0, w, h);

        const cx = w/2, cy = h/2;
        const fontSize = Math.max(10, Math.floor(w/70));
        ctx.font = `${fontSize}px monospace`;

        ctx.globalCompositeOperation = 'lighter';

        // Draw cascading streams
        for (const s of this._streams) {
            s.x += s.vx * speed * dt;
            s.y += s.vy * speed * dt;

            // Attract toward center consciousness
            const dx = cx - s.x, dy = cy - s.y;
            const dist = Math.sqrt(dx*dx+dy*dy)+1;
            const attract = 0.02 + energy * 0.04;
            s.vx += dx/dist * attract * dt * 60;
            s.vy += dy/dist * attract * dt * 60;

            // Speed limit
            const sp = Math.sqrt(s.vx*s.vx+s.vy*s.vy);
            const maxSp = 120 + energy * 60;
            if (sp > maxSp) { s.vx *= maxSp/sp; s.vy *= maxSp/sp; }

            // Wrap when offscreen
            if (s.x < -50 || s.x > w+50 || s.y < -50 || s.y > h+50) {
                const restart = (n) => {
                    switch(s.side) {
                        case 0: s.x=Math.random()*w;s.y=-20;s.vx=(Math.random()-0.5)*20;s.vy=50+Math.random()*80;break;
                        case 1: s.x=w+20;s.y=Math.random()*h;s.vx=-(50+Math.random()*80);s.vy=(Math.random()-0.5)*20;break;
                        case 2: s.x=Math.random()*w;s.y=h+20;s.vx=(Math.random()-0.5)*20;s.vy=-(50+Math.random()*80);break;
                        default:s.x=-20;s.y=Math.random()*h;s.vx=50+Math.random()*80;s.vy=(Math.random()-0.5)*20;break;
                    }
                };
                restart();
            }

            // Mutate chars
            s.mutateT -= dt;
            if (s.mutateT <= 0) {
                s.mutateT = 0.05 + Math.random() * 0.15;
                const idx = Math.floor(Math.random() * s.chars.length);
                s.chars[idx] = this.chars[Math.floor(Math.random()*this.chars.length)];
            }

            // Draw char column along direction
            const norm  = Math.sqrt(s.vx*s.vx+s.vy*s.vy)+0.001;
            const sHue  = (hue + s.hueOff) % 360;
            for (let c = 0; c < s.length; c++) {
                const frac  = c / s.length;
                const cx2   = s.x - (s.vx/norm) * c * fontSize * 0.9;
                const cy2   = s.y - (s.vy/norm) * c * fontSize * 0.9;
                if (cx2 < -10 || cx2 > w+10 || cy2 < -10 || cy2 > h+10) continue;
                const alpha = (c === 0 ? 0.9 : (1-frac)*0.55) * (0.4+intensity*0.4) * (0.5+energy*0.5) * s.speed;
                const light = c === 0 ? 95 : 40 + (1-frac)*35;
                ctx.fillStyle = `hsla(${sHue}, 90%, ${light}%, ${alpha})`;
                ctx.fillText(s.chars[c % s.chars.length], cx2, cy2);
            }
        }

        // Central orbit particles (consciousness attractor)
        for (const p of this._particles) {
            p.angle += p.speed * speed * dt * (0.8 + energy * 0.5);
            p.speed += (Math.sign(p.speed) * 1.0 - p.speed) * dt * 0.2; // attract to base speed
            const wobbleR = p.radius * (1 + 0.15 * Math.sin(this.time * 0.8 + p.phase));
            const px = cx + Math.cos(p.angle) * wobbleR;
            const py = cy + Math.sin(p.angle) * wobbleR * 0.7;
            const alpha = (0.3 + energy * 0.4) * (0.4 + intensity * 0.4);
            const pHue  = (hue + p.hueOff) % 360;
            ctx.fillStyle = `hsla(${pHue}, 100%, 75%, ${alpha})`;
            ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();
        }

        // Central core glow
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + energy * 40);
        cg.addColorStop(0, `hsla(${hue}, 80%, 90%, ${0.15 + energy * 0.2})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);

        // Burst rings on note events
        this._bursts = this._bursts.filter(b => b.life > 0.01);
        for (const b of this._bursts) {
            b.r    += 250 * dt;
            b.life -= dt * 1.5;
            const bg = ctx.createRadialGradient(b.x, b.y, b.r*0.8, b.x, b.y, b.r*1.2);
            bg.addColorStop(0, 'transparent');
            bg.addColorStop(0.5, `hsla(${(hue+b.hue)%360},100%,80%,${b.life*b.vel*0.4})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r*1.2, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
