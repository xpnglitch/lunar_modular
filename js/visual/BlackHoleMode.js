import { BlackHoleMath } from '../math/BlackHoleMath.js';

/**
 * BlackHoleMode — Gravitational Lens on a Living Cosmos.
 * 
 * The black hole is not drawn — it is the ABSENCE of light,
 * and the WARPING of everything around it.
 * 
 * The environment is a dense 1px starfield with nebula gas.
 * Audio energy increases gravity, pulling more matter inward.
 * Stars near the center orbit faster, stretch tangentially,
 * redshift as they approach, and vanish at the event horizon.
 */
export class BlackHoleMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new BlackHoleMath();
        this.initialized = false;
        this._lastW = 0;
        this._lastH = 0;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._lastW = w; this._lastH = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized || w !== this._lastW || h !== this._lastH) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0.5;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed, mathEngine.getLightPressure());
        const energy = this.mathInstance.energy;
        const mass = this.mathInstance.mass;

        const cx = w / 2, cy = h / 2;
        const evR = w * 0.025 * mass; // Event horizon radius on screen

        // ============================================================
        // 1. THE VOID — Pure black, the canvas of space
        // ============================================================
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // ============================================================
        // 2. NEBULA GAS — Soft volumetric dust clouds
        // ============================================================
        ctx.globalCompositeOperation = 'lighter';
        for (const d of this.mathInstance.dust) {
            const sx = d.x * w;
            const sy = d.y * h;
            const dx = d.x - 0.5;
            const dy = d.y - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Closer dust gets warmer (redshift)
            const hue = dist < 0.15 ? d.hue - 80 : d.hue;
            const alpha = d.alpha * (0.5 + intensity * 0.5);

            if (alpha < 0.005) continue;

            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, d.size * (w * 0.015));
            g.addColorStop(0, `hsla(${hue}, 40%, 60%, ${alpha})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(sx - d.size * w * 0.015, sy - d.size * w * 0.015,
                         d.size * w * 0.03, d.size * w * 0.03);
        }

        // ============================================================
        // 3. THE STARFIELD — Every star is a real gravitating body
        // ============================================================
        for (const s of this.mathInstance.stars) {
            const sx = s.x * w;
            const sy = s.y * h;

            // Distance from singularity (normalized)
            const dx = s.x - 0.5;
            const dy = s.y - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Velocity magnitude for motion blur / stretching
            const vMag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

            // --- Color: Gravitational Redshift ---
            // Far stars: blue-white. Close stars: shift toward orange-red.
            let hue = s.hue;
            let sat = 30;
            let lum = 85 + s.brightness * 15;

            if (dist < 0.2) {
                // Redshift increases as stars approach the horizon
                const shift = (0.2 - dist) / 0.2;
                hue = s.hue - shift * 160; // blue → orange → red
                sat = 30 + shift * 70;
                lum = 85 + shift * 15; // Gets brighter from compression
            }

            // --- Alpha: Fade at horizon edge ---
            let alpha = s.brightness * (0.4 + intensity * 0.6);
            if (dist < evR / w * 2) {
                alpha *= dist / (evR / w * 2); // Fade into the void
            }

            if (alpha < 0.01) continue;

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lum}%, ${alpha})`;

            // --- Shape: Tangential stretching near the hole ---
            const stretch = vMag * 800;
            if (stretch > 1.5 && dist < 0.3) {
                // Draw as a tiny arc/streak tangent to the orbit
                const angle = Math.atan2(s.vy, s.vx);
                const len = Math.min(stretch, 12);
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angle);
                ctx.fillRect(-len / 2, -s.size * 0.3, len, s.size * 0.6);
                ctx.restore();
            } else {
                // Normal 1px-ish star
                ctx.fillRect(sx - s.size * 0.5, sy - s.size * 0.5, s.size, s.size);
            }
        }

        // ============================================================
        // 4. PHOTON RING — The thin bright edge where light orbits
        // ============================================================
        const ringR = evR * 1.5;
        const ringG = ctx.createRadialGradient(cx, cy, ringR * 0.85, cx, cy, ringR * 1.15);
        ringG.addColorStop(0, 'transparent');
        ringG.addColorStop(0.4, `hsla(30, 100%, 90%, ${0.15 + energy * 0.15})`);
        ringG.addColorStop(0.6, `hsla(20, 100%, 80%, ${0.08 + energy * 0.1})`);
        ringG.addColorStop(1, 'transparent');
        ctx.fillStyle = ringG;
        ctx.beginPath(); ctx.arc(cx, cy, ringR * 1.2, 0, Math.PI * 2); ctx.fill();

        // ============================================================
        // 5. THE EVENT HORIZON — Pure absence
        // ============================================================
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx, cy, evR, 0, Math.PI * 2); ctx.fill();

        // Subtle edge glow — gravitational redshift at the boundary
        const edgeGlow = ctx.createRadialGradient(cx, cy, evR * 0.8, cx, cy, evR * 1.1);
        edgeGlow.addColorStop(0, 'transparent');
        edgeGlow.addColorStop(0.7, `hsla(15, 100%, 12%, ${0.3 + energy * 0.3})`);
        edgeGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGlow;
        ctx.beginPath(); ctx.arc(cx, cy, evR * 1.2, 0, Math.PI * 2); ctx.fill();

        // ============================================================
        // 6. GRAVITATIONAL LENSING — Bright ring of bent background light
        // ============================================================
        if (intensity > 0.3) {
            ctx.globalCompositeOperation = 'lighter';
            // Einstein ring — background light bent around the shadow
            const einsteinR = evR * 1.8;
            const eG = ctx.createRadialGradient(cx, cy, einsteinR * 0.9, cx, cy, einsteinR * 1.1);
            eG.addColorStop(0, 'transparent');
            eG.addColorStop(0.5, `hsla(220, 30%, 80%, ${0.04 + energy * 0.06})`);
            eG.addColorStop(1, 'transparent');
            ctx.fillStyle = eG;
            ctx.beginPath(); ctx.arc(cx, cy, einsteinR * 1.2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
