/**
 * AttractorMode — Lorenz Strange Attractor visualization
 * Massive, screen-filling chaotic trajectory with glowing trails.
 * Notes perturb the attractor state, causing dramatic visual shifts.
 * Attractor axes = synth parameters (honest coupling).
 */
import { AttractorMath } from '../math/AttractorMath.js';

export class AttractorMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.attractorMath = new AttractorMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 0.025; // Very long trails for dramatic attractor ghosting

        // Particle sparks emitted from the attractor head
        this.sparks = [];
        this.maxSparks = 150;
        
        this.subsets = Object.keys(this.attractorMath.presets).map(k => k.charAt(0).toUpperCase() + k.slice(1));
        this.subIndex = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        const key = Object.keys(this.attractorMath.presets)[this.subIndex];
        this.attractorMath.setPreset(key);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.attractorMath.perturb(noteInfo.velocity);

        // Spawn a burst of sparks from the current position
        const hist = this.attractorMath.history;
        if (hist.length > 0) {
            const current = hist[hist.length - 1];
            for (let i = 0; i < 15; i++) {
                this.sparks.push({
                    x: current.nx,
                    y: current.nz, // use z for y-axis in view
                    vx: (Math.random() - 0.5) * 0.02,
                    vy: (Math.random() - 0.5) * 0.02,
                    life: 1,
                    hueOffset: (Math.random() - 0.5) * 40,
                    size: 2 + Math.random() * 4,
                });
            }
        }
    }

    getAudioModulation() {
        return this.attractorMath.getAudioModulation();
    }

    /**
     * Project 3D attractor state to 2D screen coordinates
     * Uses x-z plane as the main view (classic butterfly view)
     */
    _project(point, w, h) {
        const math = this.attractorMath;
        const xRange = Math.max(math.xMax - math.xMin, 1);
        const zRange = Math.max(math.zMax - math.zMin, 1);

        // Normalize to screen with generous padding
        const padding = 0.08;
        const nx = (point.x - math.xMin) / xRange;
        const nz = (point.z - math.zMin) / zRange;

        // Map to screen: x → horizontal, z → vertical (inverted so high z is up)
        const screenX = (padding + nx * (1 - padding * 2)) * w;
        const screenY = ((1 - padding) - nz * (1 - padding * 2)) * h;

        // Use y for depth/color variation
        const ny = (point.y - math.yMin) / Math.max(math.yMax - math.yMin, 1);

        return { x: screenX, y: screenY, depth: ny };
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const hue = mathEngine.get('colorHue');
        const noteCount = mathEngine.noteCount;
        const reactivity = mathEngine.get('reactivity');

        // Step the attractor (reactivity scales iteration density → more chaos)
        const stepsPerFrame = 6 + Math.floor(complexity * 8 * (0.5 + reactivity));
        for (let i = 0; i < stepsPerFrame; i++) {
            this.attractorMath.step(dt / stepsPerFrame, complexity);
        }

        const history = this.attractorMath.history;
        if (history.length < 2) return;

        // --- Draw the trail ---
        // Use varying line width — thicker at the head, thinner at the tail
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            const p1 = this._project(prev, w, h);
            const p2 = this._project(curr, w, h);

            // Age: 0 = oldest, 1 = newest
            const age = i / history.length;

            // Alpha: old parts fade out, new parts bright
            const alpha = Math.pow(age, 2) * (0.4 + noteCount * 0.06 + intensity * 0.3);
            if (alpha < 0.01) continue;

            // Line width: thin tail, thick head
            const lineWidth = 0.5 + age * (2 + intensity * 2);

            // Color shifts along the trail and with depth
            const trailHue = (hue + age * 80 + p2.depth * 60) % 360;
            const saturation = 55 + intensity * 35;
            const lightness = 35 + age * 35;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${trailHue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // --- Draw glow bloom along the trail (every Nth point) ---
        const glowInterval = Math.max(1, Math.floor(history.length / 40));
        for (let i = Math.floor(history.length * 0.5); i < history.length; i += glowInterval) {
            const point = history[i];
            const p = this._project(point, w, h);
            if (!isFinite(p.x) || !isFinite(p.y)) continue;

            const age = i / history.length;
            const glowAlpha = Math.pow(age, 3) * (0.08 + noteCount * 0.02);

            if (glowAlpha > 0.01) {
                const spd = isFinite(point.speed) ? point.speed : 0;
                const glowSize = Math.max(1, 15 + age * 20 + spd * 2);
                const glowHue = (hue + age * 80 + p.depth * 60) % 360;
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
                gradient.addColorStop(0, `hsla(${glowHue}, 80%, 70%, ${glowAlpha})`);
                gradient.addColorStop(1, `hsla(${glowHue}, 80%, 70%, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Draw the head (current position) ---
        const current = history[history.length - 1];
        const head = this._project(current, w, h);
        const headSpeed = isFinite(this.attractorMath.speed) ? this.attractorMath.speed : 0;

        if (isFinite(head.x) && isFinite(head.y)) {
            // Large outer glow
            const outerGlowSize = Math.max(1, 30 + noteCount * 10 + headSpeed * 3);
            const outerGlow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, outerGlowSize);
            outerGlow.addColorStop(0, `hsla(${hue}, 90%, 85%, ${0.6 + noteCount * 0.05})`);
            outerGlow.addColorStop(0.3, `hsla(${hue}, 85%, 65%, 0.2)`);
            outerGlow.addColorStop(1, `hsla(${hue}, 85%, 65%, 0)`);
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(head.x, head.y, outerGlowSize, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            ctx.beginPath();
            ctx.arc(head.x, head.y, 4 + headSpeed * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 90%, 95%, 0.95)`;
            ctx.fill();
        }

        // --- Update and render sparks ---
        this._updateSparks(ctx, w, h, hue, dt);
    }

    _updateSparks(ctx, w, h, hue, dt) {
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.97;
            s.vy *= 0.97;
            s.life -= dt * 1.2;

            if (s.life <= 0) {
                this.sparks.splice(i, 1);
                continue;
            }

            const sx = s.x * w;
            const sy = (1 - s.y) * h;
            const sparkHue = (hue + s.hueOffset + 360) % 360;
            const alpha = s.life * 0.7;
            const size = Math.max(0, s.size * s.life);

            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${sparkHue}, 80%, 70%, ${alpha})`;
            ctx.fill();

            // Spark glow
            if (size > 2) {
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0, size * 2.5), 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${sparkHue}, 80%, 70%, ${alpha * 0.15})`;
                ctx.fill();
            }
        }

        // Cap sparks
        while (this.sparks.length > this.maxSparks) {
            this.sparks.shift();
        }
    }
}
