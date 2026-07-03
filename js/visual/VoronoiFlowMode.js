import { VoronoiFlowMath } from '../math/VoronoiFlowMath.js';

/**
 * VoronoiFlowMode — Full-canvas flowing Voronoi diagram with colored cells, smooth site motion,
 * boundary tension highlights, and note-triggered cell explosions.
 */
export class VoronoiFlowMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new VoronoiFlowMath();
        this.time = 0;
        this.sites = [];
        this.bursts = [];
        this.initialized = false;
        this.siteCount = 28;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initSites(w, h);
        this.initialized = true;
    }

    _initSites(w, h) {
        this.sites = Array.from({ length: this.siteCount }, (_, i) => ({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - 0.5) * 35, vy: (Math.random() - 0.5) * 35,
            hueOff: (i / this.siteCount) * 120 - 60,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: (Math.random() - 0.5) * 0.4,
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width || 800, h = this.height || 600;
        this.bursts.push({
            x: noteInfo.normalizedPosition * w,
            y: h * (0.3 + Math.random() * 0.4),
            life: 1.0, vel: noteInfo.velocity,
            r: 0,
        });
        // Jolt nearby sites
        for (const s of this.sites) {
            const dx = s.x - noteInfo.normalizedPosition * w;
            const dy = s.y - h / 2;
            const dist = Math.hypot(dx, dy);
            if (dist < 200) {
                const force = (200 - dist) / 200 * noteInfo.velocity * 150;
                s.vx += (dx / (dist + 1)) * force;
                s.vy += (dy / (dist + 1)) * force;
            }
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    // Fast approximate Voronoi via pixel sampling on a downsampled grid
    _drawVoronoi(ctx, w, h, hue, energy) {
        const step = 8; // pixel step for approximation
        const cols = Math.ceil(w / step);
        const rows = Math.ceil(h / step);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const px = col * step + step / 2;
                const py = row * step + step / 2;

                // Find nearest site
                let minDist = Infinity, nearest = 0, secondDist = Infinity;
                for (let s = 0; s < this.sites.length; s++) {
                    const dx = px - this.sites[s].x;
                    const dy = py - this.sites[s].y;
                    const d = dx * dx + dy * dy;
                    if (d < minDist) { secondDist = minDist; minDist = d; nearest = s; }
                    else if (d < secondDist) { secondDist = d; }
                }

                const site = this.sites[nearest];
                const edgeDist = Math.sqrt(secondDist) - Math.sqrt(minDist);
                const isEdge = edgeDist < 4 + energy * 4;

                const pulse = Math.sin(site.phase) * 0.12;
                const cellHue = (hue + site.hueOff) % 360;

                if (isEdge) {
                    // Cell boundary: bright line
                    ctx.fillStyle = `hsla(${(cellHue + 30) % 360},90%,${70 + energy * 20}%,${0.6 + energy * 0.35})`;
                } else {
                    const light = 18 + Math.abs(pulse) * 30 + energy * 15;
                    ctx.fillStyle = `hsla(${cellHue},60%,${light}%,0.9)`;
                }

                ctx.fillRect(col * step, row * step, step, step);
            }
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;
        const complexity = mathEngine.get('complexity');

        // Move sites
        for (const s of this.sites) {
            s.vx += Math.sin(this.time * 0.3 + s.phase) * 5 * dt * (0.5 + complexity);
            s.vy += Math.cos(this.time * 0.25 + s.phase * 1.3) * 5 * dt * (0.5 + complexity);
            s.vx *= 0.985; s.vy *= 0.985;
            s.x += s.vx * dt * (0.8 + energy * 0.8);
            s.y += s.vy * dt * (0.8 + energy * 0.8);
            s.phase += s.phaseSpeed * dt;
            // Bounce off walls
            if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
            if (s.x > w) { s.x = w; s.vx = -Math.abs(s.vx); }
            if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
            if (s.y > h) { s.y = h; s.vy = -Math.abs(s.vy); }
        }

        // Draw Voronoi cells
        this._drawVoronoi(ctx, w, h, hue, energy);

        // Site markers (nucleus glow)
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.sites) {
            const ng = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 18 + energy * 15);
            ng.addColorStop(0, `hsla(${(hue + s.hueOff + 40) % 360},100%,90%,${0.5 + energy * 0.4})`);
            ng.addColorStop(1, 'transparent');
            ctx.fillStyle = ng;
            ctx.beginPath(); ctx.arc(s.x, s.y, 18 + energy * 15, 0, Math.PI * 2); ctx.fill();
        }

        // Note burst shockwaves
        this.bursts = this.bursts.filter(b => b.life > 0.01);
        for (const b of this.bursts) {
            b.r += (80 + b.vel * 160) * dt;
            b.life -= dt * 1.1;
            const bg = ctx.createRadialGradient(b.x, b.y, b.r * 0.8, b.x, b.y, b.r * 1.2);
            bg.addColorStop(0, 'transparent');
            bg.addColorStop(0.5, `hsla(${hue},100%,85%,${b.life * b.vel * 0.7})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
