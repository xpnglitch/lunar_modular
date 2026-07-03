/**
 * PendulumMode — Tracking V-Basin Perspective
 * 
 * Each pendulum bob is electronically linked to a structural side panel.
 * The panels on the side of the "Leader Bob" (the one with the largest 
 * displacement) light up, creating a scanning effect that tracks the wave.
 */
import { PendulumMath } from '../math/PendulumMath.js';

export class PendulumMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.pendulumMath = new PendulumMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.vAngle = 0.46;

        this.trails = [];
        this.maxTrailLength = 12;
        this.sparks = [];
        this.maxSparks = 100;
        this.flashBrightness = [];

        this.onWallHit = null;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.trails = [];
        this.flashBrightness = [];
        for (let i = 0; i < this.pendulumMath.numPendulums; i++) {
            this.trails.push([]);
            this.flashBrightness.push(0);
        }
    }

    setWallHitCallback(cb) { this.onWallHit = cb; }

    setAngle(angle) {
        this.vAngle = Math.max(0.1, Math.min(1.2, angle));
        this.pendulumMath.vAngle = this.vAngle;
        this.pendulumMath._buildPendulums();
    }

    reset() {
        this.time = 0;
        this.pendulumMath._buildPendulums();
        this.trails = [];
        this.sparks = [];
        this.flashBrightness = [];
        for (let i = 0; i < this.pendulumMath.numPendulums; i++) {
            this.trails.push([]);
            this.flashBrightness.push(0);
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.pendulumMath.perturb(noteInfo.velocity, noteInfo.normalizedPosition);
    }

    getAudioModulation() {
        return this.pendulumMath.getAudioModulation();
    }

    _project(xNorm, yNorm, depth, cx, cy, w, h) {
        const scale = 1.0 / (1.0 + depth * 3.8);
        const vanishY = h * 0.15;
        const nearPlaneY = h * 0.82; // Shifted back from 0.98 to clear overlays
        const sY = nearPlaneY + (vanishY - nearPlaneY) * depth;
        const spread = w * 1.0 * scale;
        const screenX = cx + xNorm * spread * this.vAngle;
        const heightScale = h * 0.65 * scale;
        const screenY = sY - (yNorm * heightScale);
        return { x: screenX, y: screenY, scale };
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');

        const cx = w * 0.5;
        const cy = h * 0.5;
        const numP = this.pendulumMath.numPendulums;

        const t = this.time * (0.3 + speed * 0.7);
        const hits = this.pendulumMath.step(dt, t, complexity);

        // Track bob positions and find the "Leader" (largest displacement)
        const bobStates = [];
        let leaderIdx = 0;
        let maxDist = -1;
        
        for (let i = 0; i < numP; i++) {
            const p = this.pendulumMath.pendulums[i];
            const phase = (t / p.period + p.phase / (2 * Math.PI)) % 1;
            const pos = 4 * Math.abs(phase - 0.5) - 1;
            const isMovingRight = phase < 0.5; // Triangle wave ascending phase
            
            const dist = Math.abs(pos);
            bobStates.push({ pos, dist, direction: isMovingRight ? 1 : -1 });
            if (dist > maxDist) {
                maxDist = dist;
                leaderIdx = i;
            }
        }
        
        // Active side is the side the leader is MOVING TOWARDS
        const activeSide = bobStates[leaderIdx].direction;

        for (const hit of hits) {
            this.flashBrightness[hit.index] = 1.0;
            if (this.onWallHit) this.onWallHit(hit.index, hit.force);
        }

        // --- 1. SIDE SLATS (Horizontal Energy Panels) ---
        ctx.save();
        for (let i = 0; i < numP; i++) {
            // Use the same depth calculation as the bobs for perfect alignment
            const depth = i / (numP - 1);
            const thickness = 0.5 / numP; // Proportional thickness
            const d0 = Math.max(0, depth - thickness);
            const d1 = Math.min(1, depth + thickness);
            
            const bobState = bobStates[i];
            
            for (let side of [-1, 1]) {
                // Inner edge (1.02) tracks the wall projection (1.0) with consistent minimal gap
                const p_inner_top = this._project(side * 1.02, 0.4, d0, cx, cy, w, h);
                const p_inner_bot = this._project(side * 1.02, 0.4, d1, cx, cy, w, h);
                const p_outer_top = this._project(side * 1.6, 0.4, d0, cx, cy, w, h);
                const p_outer_bot = this._project(side * 1.6, 0.4, d1, cx, cy, w, h);

                ctx.beginPath();
                ctx.moveTo(p_inner_top.x, p_inner_top.y);
                ctx.lineTo(p_outer_top.x, p_outer_top.y);
                ctx.lineTo(p_outer_bot.x, p_outer_bot.y);
                ctx.lineTo(p_inner_bot.x, p_inner_bot.y);
                ctx.closePath();
                
                const proximity = Math.pow(bobState.dist, 6);
                const flash = this.flashBrightness[i] || 0;
                const flareAlpha = (side === activeSide) ? (proximity * 0.3 + flash * 0.7) * (1 - depth) : 0;
                
                if (flareAlpha > 0.01) {
                    const bobHue = (hue + (i / numP) * 280) % 360;
                    const grad = ctx.createLinearGradient(p_inner_top.x, 0, p_outer_top.x, 0);
                    grad.addColorStop(0, `hsla(${bobHue}, 90%, 65%, ${flareAlpha * 0.6})`);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.fill();
                    
                    ctx.strokeStyle = `hsla(${bobHue}, 95%, 75%, ${flareAlpha * 0.8})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        ctx.restore();

        // --- 2. THE V-WALL LINES ---
        ctx.save();
        ctx.lineWidth = 4;
        for (let side of [-1, 1]) {
            ctx.beginPath();
            for (let s = 0; s <= 20; s++) {
                const d = s / 20;
                const p = this._project(side, 0, d, cx, cy, w, h);
                if (s === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            const wallGrad = ctx.createLinearGradient(cx, h * 0.9, cx, h * 0.1);
            wallGrad.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.9)`);
            wallGrad.addColorStop(1, `hsla(${hue}, 50%, 40%, 0.1)`);
            ctx.strokeStyle = wallGrad;
            ctx.stroke();
        }
        ctx.restore();

        // --- 3. PENDULUMS ---
        for (let i = numP - 1; i >= 0; i--) {
            const bobState = bobStates[i];
            const depth = i / (numP - 1);
            const bob = this._project(bobState.pos, 0, depth, cx, cy, w, h);
            const pivot = this._project(0, 0.95, depth, cx, cy, w, h);
            const scale = bob.scale;

            const flash = this.flashBrightness[i] || 0;
            const bobHue = (hue + (i / numP) * 280) % 360;
            const saturation = 95 + intensity * 5;
            const lightness = 65 + flash * 30;

            // STRINGS
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(bob.x, bob.y);
            ctx.strokeStyle = `hsla(${bobHue}, 30%, 60%, ${0.05 * scale})`;
            ctx.lineWidth = 0.5 * scale;
            ctx.stroke();

            // BOB
            const bSize = (14 + intensity * 8 + flash * 18) * scale;
            const glow = ctx.createRadialGradient(bob.x, bob.y, 0, bob.x, bob.y, bSize * 3);
            glow.addColorStop(0, `hsla(${bobHue}, ${saturation}%, ${lightness}%, ${0.6 * scale})`);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(bob.x, bob.y, bSize * 3, 0, Math.PI * 2); ctx.fill();

            ctx.beginPath(); ctx.arc(bob.x, bob.y, bSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${bobHue}, ${saturation}%, ${lightness}%, ${scale})`;
            ctx.fill();

            // Highlight
            ctx.beginPath(); ctx.arc(bob.x - bSize * 0.3, bob.y - bSize * 0.3, bSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * scale})`;
            ctx.fill();

            // Sparks
            if (flash > 0.9) {
                for (let s = 0; s < 12; s++) {
                    const ang = Math.random() * Math.PI * 2;
                    this.sparks.push({
                        x: bob.x, y: bob.y,
                        vx: Math.cos(ang) * (4 + Math.random() * 5) * scale,
                        vy: Math.sin(ang) * (4 + Math.random() * 5) * scale - 2,
                        life: 1.0, hue: bobHue, size: 4 * scale
                    });
                }
            }

            if (this.flashBrightness[i] > 0) this.flashBrightness[i] *= 0.91;
        }

        // --- 4. SPARKS ---
        ctx.globalCompositeOperation = 'screen';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.3;
            s.life -= dt * 2.2;
            if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 95%, 85%, ${s.life})`;
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
