import { GravityMath } from '../math/GravityMath.js';

/**
 * GravityMode — Cinematic spacetime curvature visualization.
 * Features:
 *   - Depth-mapped grid mesh with per-vertex hue/luminance shifting
 *   - Multi-layered gravitational lensing halos around singularities
 *   - Accretion disk particles with motion trails
 *   - Gravitational wave ripple rings
 *   - Warping star field background
 *   - Afterglow trail (translucent fade)
 */
export class GravityMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.gravityMath = new GravityMath();
        this.isInitialized = false;
        this.frameCount = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.gravityMath.reset(w, h);
        this.isInitialized = true;
    }

    /**
     * Main render pipeline.
     */
    render(ctx, w, h, mathEngine, dt) {
        if (!this.isInitialized) this.resize(w, h);
        this.frameCount++;

        this.gravityMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = this.gravityMath.time;

        // --- Background: translucent fade for afterglow trails ---
        ctx.fillStyle = `rgba(2, 2, 8, ${0.12 + (1 - intensity) * 0.15})`;
        ctx.fillRect(0, 0, w, h);

        // === LAYER 1: Star field ===
        this._renderStars(ctx, w, h, hue, intensity, time);

        // === LAYER 2: Debris field (pulled toward wells) ===
        this._renderDebris(ctx, w, h, hue, intensity);

        // === LAYER 3: Gravitational wave ripples ===
        this._renderWaves(ctx, w, h, hue, intensity);

        // === LAYER 4: Depth-mapped grid mesh ===
        this._renderGrid(ctx, w, h, hue, intensity, complexity);

        // === LAYER 5: Accretion particles (additive) ===
        ctx.globalCompositeOperation = 'lighter';
        this._renderAccretion(ctx, w, h, hue, intensity);
        ctx.globalCompositeOperation = 'source-over';

        // === LAYER 6: Singularity cores — autonomous wells + note wells ===
        const wells = this.gravityMath.wells;
        const notes = mathEngine.getActiveNotes();

        // Always-on wells (smaller, blue-shifted)
        for (const well of wells) {
            this._renderSingularity(ctx, well.x * w, well.y * h, intensity * 0.7 + 0.25, (hue + 180) % 360, time, well.mass * 0.6);
        }

        // Note-triggered wells (full size, main hue)
        for (const note of notes) {
            const nx = (note.x / 800) * w;
            const ny = (note.y / 600) * h;
            this._renderSingularity(ctx, nx, ny, intensity, hue, time, 1.0);
        }
    }

    // ─── Stars ──────────────────────────────────────────────
    _renderStars(ctx, w, h, hue, intensity, time) {
        const stars = this.gravityMath.stars;
        for (const star of stars) {
            const sx = star.x * w;
            const sy = star.y * h;

            // Twinkle
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
            const alpha = star.brightness * (0.5 + twinkle * 0.3) * (0.4 + intensity * 0.3);
            const size = star.size * (0.8 + twinkle * 0.2);

            const starHue = (hue + star.hueShift + 270) % 360; // cool tones for stars

            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.3, size), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${starHue}, 30%, ${70 + star.brightness * 20}%, ${alpha})`;
            ctx.fill();

            // Bright stars get a subtle cross-spike
            if (star.brightness > 0.8 && intensity > 0.2) {
                const spikeLen = size * 4;
                ctx.strokeStyle = `hsla(${starHue}, 20%, 80%, ${alpha * 0.25})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx - spikeLen, sy);
                ctx.lineTo(sx + spikeLen, sy);
                ctx.moveTo(sx, sy - spikeLen);
                ctx.lineTo(sx, sy + spikeLen);
                ctx.stroke();
            }
        }
    }

    // ─── Gravitational wave rings ────────────────────────────
    _renderWaves(ctx, w, h, hue, intensity) {
        const waves = this.gravityMath.gravitationalWaves;
        for (const wave of waves) {
            const cx = wave.cx * w;
            const cy = wave.cy * h;
            const r = wave.radius * Math.min(w, h);
            const alpha = wave.life * wave.strength * 0.35;

            if (alpha < 0.01) continue;

            // Outer ring
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
            ctx.lineWidth = 1.5 + wave.life * 2;
            ctx.stroke();

            // Inner echo ring
            const innerR = r * 0.7;
            if (innerR > 5) {
                ctx.beginPath();
                ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 60%, 50%, ${alpha * 0.4})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // ─── Depth-mapped grid ───────────────────────────────────
    _renderGrid(ctx, w, h, baseHue, intensity, complexity) {
        const grid = this.gravityMath.grid;
        const cols = this.gravityMath.cols;
        const rows = this.gravityMath.rows;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Draw grid as individual segments with per-vertex color
        // Horizontal lines
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols - 1; i++) {
                const p1 = grid[j * cols + i];
                const p2 = grid[j * cols + i + 1];
                this._drawDepthSegment(ctx, p1, p2, w, h, baseHue, intensity);
            }
        }

        // Vertical lines
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows - 1; j++) {
                const p1 = grid[j * cols + i];
                const p2 = grid[(j + 1) * cols + i];
                this._drawDepthSegment(ctx, p1, p2, w, h, baseHue, intensity);
            }
        }
    }

    _drawDepthSegment(ctx, p1, p2, w, h, baseHue, intensity) {
        const z = (p1.z + p2.z) / 2;

        // Only render where the grid is actually deformed
        if (z < 0.04) return;

        // Depth-based hue shift: deeper = warmer (toward red/orange)
        const depthHue = (baseHue + z * 120) % 360;
        // Depth-based brightness
        const lightness = 25 + Math.min(z * 65, 55);
        // Alpha is ZERO at rest, only shows where spacetime is bent
        const alpha = z * 0.75 + intensity * z * 0.2;
        const lineWidth = 0.3 + z * 3.5 + intensity * 0.6;

        const x1 = p1.x * w, y1 = p1.y * h;
        const x2 = p2.x * w, y2 = p2.y * h;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${depthHue}, 80%, ${lightness}%, ${Math.min(alpha, 0.92)})`;
        ctx.lineWidth = Math.min(lineWidth, 4.5);
        ctx.stroke();
    }


    // ─── Accretion particles ─────────────────────────────────
    _renderAccretion(ctx, w, h, hue, intensity) {
        const particles = this.gravityMath.accretionParticles;

        for (const p of particles) {
            const sx = p.x * w;
            const sy = p.y * h;
            const pHue = (hue + p.hueOffset + 360) % 360;
            const alpha = p.life * (0.4 + intensity * 0.5);
            const size = p.size * p.life * (0.8 + intensity * 0.5);

            // Trail
            if (p.trail.length > 2) {
                ctx.beginPath();
                const t0 = p.trail[0];
                ctx.moveTo(t0.x * w, t0.y * h);
                for (let t = 1; t < p.trail.length; t++) {
                    ctx.lineTo(p.trail[t].x * w, p.trail[t].y * h);
                }
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = `hsla(${pHue}, 90%, 65%, ${alpha * 0.25})`;
                ctx.lineWidth = size * 0.6;
                ctx.stroke();
            }

            // Particle core
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${pHue}, 100%, 75%, ${alpha})`;
            ctx.fill();

            // Hot glow for larger particles
            if (size > 1.5) {
                const glowR = size * 4;
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
                grad.addColorStop(0, `hsla(${pHue}, 90%, 60%, ${alpha * 0.15})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ─── Singularity (multi-layer event horizon) ─────────────
    _renderSingularity(ctx, x, y, intensity, hue, time, sizeScale = 1.0) {
        const pulse = Math.sin(time * 3) * 0.15;
        const baseSize = (12 + intensity * 45) * sizeScale;

        // Layer 1: Outermost gravitational lensing halo
        const outerR = baseSize * 3.5;
        const outerGrad = ctx.createRadialGradient(x, y, baseSize * 0.8, x, y, outerR);
        outerGrad.addColorStop(0, `hsla(${hue}, 60%, 40%, ${0.06 + intensity * 0.08})`);
        outerGrad.addColorStop(0.5, `hsla(${(hue + 40) % 360}, 50%, 25%, ${0.02 + intensity * 0.03})`);
        outerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(x, y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Layer 2: Photon sphere ring
        const ringR = baseSize * 1.8 + pulse * baseSize;
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${0.15 + intensity * 0.35})`;
        ctx.lineWidth = 1.5 + intensity * 2;
        ctx.stroke();

        // Layer 3: Inner accretion glow (additive)
        ctx.globalCompositeOperation = 'lighter';
        const innerR = baseSize * 1.2;
        const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, innerR);
        innerGrad.addColorStop(0, `hsla(${(hue + 20) % 360}, 100%, 85%, ${0.3 + intensity * 0.5})`);
        innerGrad.addColorStop(0.3, `hsla(${hue}, 90%, 55%, ${0.15 + intensity * 0.2})`);
        innerGrad.addColorStop(0.7, `hsla(${(hue - 20 + 360) % 360}, 70%, 30%, 0.05)`);
        innerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(x, y, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Layer 4: Event horizon — the pure black core
        const coreR = baseSize * 0.35 + pulse * 3;
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fill();

        // Layer 5: Tiny bright accretion ring inside the edge
        ctx.beginPath();
        ctx.arc(x, y, coreR + 1, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${(hue + 10) % 360}, 100%, 80%, ${0.2 + intensity * 0.4})`;
        ctx.lineWidth = 0.8 + intensity;
        ctx.stroke();
    }

    // ─── Debris field ────────────────────────────────────────
    _renderDebris(ctx, w, h, hue, intensity) {
        const debris = this.gravityMath.debris;

        for (const d of debris) {
            const sx = d.x * w;
            const sy = d.y * h;
            const dHue = (hue + d.hueShift + 200) % 360; // slightly offset from main hue

            if (d.captured) {
                // Shrinking/fading as it's swallowed
                const elapsed = this.gravityMath.time - d.captureTime;
                const fade = Math.max(0, 1 - elapsed / 1.5);
                if (fade <= 0) continue;
                const size = d.size * fade;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0.3, size), 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${dHue}, 60%, 70%, ${fade * 0.3})`;
                ctx.fill();
                continue;
            }

            // Speed-based stretch (shows motion)
            const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
            const alpha = d.brightness * (0.3 + intensity * 0.3);

            // Motion trail line
            if (speed > 0.8) {
                const trailLen = Math.min(speed * 4, 20);
                const angle = Math.atan2(d.vy, d.vx);
                ctx.beginPath();
                ctx.moveTo(sx - Math.cos(angle) * trailLen, sy - Math.sin(angle) * trailLen);
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = `hsla(${dHue}, 50%, 60%, ${alpha * 0.4})`;
                ctx.lineWidth = d.size * 0.4;
                ctx.stroke();
            }

            // Debris chunk
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.5, d.size * (0.7 + speed * 0.05)), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${dHue}, 40%, ${55 + d.brightness * 20}%, ${alpha})`;
            ctx.fill();

            // Subtle glow for larger pieces
            if (d.size > 2.5) {
                const gr = d.size * 3;
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
                grad.addColorStop(0, `hsla(${dHue}, 50%, 65%, ${alpha * 0.12})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx, sy, gr, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    getAudioModulation() {
        return {
            detune: this.math.get('intensity') * 50,
            filterFreq: 500 + this.math.get('intensity') * 4000
        };
    }
}

