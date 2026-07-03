import { FissionMath } from '../math/FissionMath.js';

/**
 * FissionMode — Nuclear chain reaction visualization.
 * 
 * Multi-generation particle splitting with shockwave rings,
 * velocity trails, energy connection beams, and 3-layer
 * volumetric glow per particle. Notes trigger fission events.
 */
export class FissionMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.fissionMath = new FissionMath();
        this.shockwaves = [];  // visual-only shockwave rings
        this.flash = 0;
    }

    resize(w, h) {
        this.fissionMath.reset();
        this.shockwaves = [];
    }

    onNoteOn(noteInfo) {
        // FissionMath handles notes internally via getActiveNotes
    }

    onNoteOff(noteInfo) {}

    render(ctx, w, h, mathEngine, dt) {
        this.fissionMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const particles = this.fissionMath.particles;

        // Spawn shockwaves when fission events happen (small particles appearing)
        for (const p of particles) {
            if (p.gen > 0 && p.active > 0.95 && p.size > 10) {
                if (Math.random() < 0.3) {
                    this.shockwaves.push({
                        x: p.x, y: p.y,
                        radius: 0, maxRadius: 60 + p.gen * 30,
                        life: 1.0, hue: (hue + p.gen * 25) % 360
                    });
                }
            }
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += dt * 120;
            sw.life -= dt * 1.5;
            if (sw.life <= 0 || sw.radius > sw.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        ctx.globalCompositeOperation = 'lighter';

        // --- LAYER 1: Energy connection beams between nearby particles ---
        if (complexity > 0.3) {
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                const ax = (a.x / 800) * w;
                const ay = (a.y / 600) * h;
                for (let j = i + 1; j < Math.min(particles.length, i + 20); j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const threshold = 80 + complexity * 60;
                    if (dist < threshold && a.gen === b.gen) {
                        const bx = (b.x / 800) * w;
                        const by = (b.y / 600) * h;
                        const alpha = (1 - dist / threshold) * 0.15 * a.active * b.active * intensity;
                        ctx.beginPath();
                        ctx.moveTo(ax, ay);
                        ctx.lineTo(bx, by);
                        ctx.strokeStyle = `hsla(${(hue + a.gen * 25) % 360}, 70%, 60%, ${alpha})`;
                        ctx.lineWidth = 0.5 + (1 - dist / threshold) * 2;
                        ctx.stroke();
                    }
                }
            }
        }

        // --- LAYER 2: Shockwave rings at fission points ---
        for (const sw of this.shockwaves) {
            const sx = (sw.x / 800) * w;
            const sy = (sw.y / 600) * h;
            const sr = sw.radius * (w / 800);
            const alpha = sw.life * 0.4;

            // Outer ring
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${sw.hue}, 80%, 70%, ${alpha * 0.3})`;
            ctx.lineWidth = 6;
            ctx.stroke();

            // Inner bright ring
            ctx.strokeStyle = `hsla(${sw.hue}, 90%, 85%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Fill flash
            const swGrad = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr);
            swGrad.addColorStop(0, `hsla(${sw.hue}, 80%, 80%, ${alpha * 0.05})`);
            swGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = swGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 3: Velocity trails ---
        for (const p of particles) {
            const px = (p.x / 800) * w;
            const py = (p.y / 600) * h;
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const pHue = (hue + p.gen * 25) % 360;
            const alpha = p.active * (0.2 + intensity * 0.5);

            if (speed > 2 && alpha > 0.05) {
                const trailLen = Math.min(speed * 4, 40) * (w / 800);
                const angle = Math.atan2(p.vy, p.vx);
                const tx = px - Math.cos(angle) * trailLen;
                const ty = py - Math.sin(angle) * trailLen;

                const tGrad = ctx.createLinearGradient(tx, ty, px, py);
                tGrad.addColorStop(0, 'transparent');
                tGrad.addColorStop(1, `hsla(${pHue}, 80%, 75%, ${alpha * 0.5})`);
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(px, py);
                ctx.strokeStyle = tGrad;
                ctx.lineWidth = Math.max(0.5, (p.size / 800) * w * 0.3);
                ctx.stroke();

                // Wide glow trail
                ctx.strokeStyle = `hsla(${pHue}, 70%, 60%, ${alpha * 0.08})`;
                ctx.lineWidth = (p.size / 800) * w * 1.5;
                ctx.stroke();
            }
        }

        // --- LAYER 4: Particle cores with 3-pass glow ---
        for (const p of particles) {
            const px = (p.x / 800) * w;
            const py = (p.y / 600) * h;
            const sSize = Math.max(1, p.size * (w / 800));
            const pHue = (hue + p.gen * 25) % 360;
            const alpha = p.active * (0.3 + intensity * 0.6);
            if (alpha < 0.03) continue;

            // Outer glow envelope
            const glowR = sSize * 3;
            const outerGrad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
            outerGrad.addColorStop(0, `hsla(${pHue}, 70%, 60%, ${alpha * 0.1})`);
            outerGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(px, py, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Mid plasma
            const midGrad = ctx.createRadialGradient(px, py, 0, px, py, sSize * 1.5);
            midGrad.addColorStop(0, `hsla(${pHue}, 90%, 80%, ${alpha * 0.4})`);
            midGrad.addColorStop(0.7, `hsla(${pHue}, 80%, 60%, ${alpha * 0.1})`);
            midGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = midGrad;
            ctx.beginPath();
            ctx.arc(px, py, sSize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Hot core
            ctx.beginPath();
            ctx.arc(px, py, sSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(pHue + 30) % 360}, 100%, 95%, ${alpha * 0.8})`;
            ctx.fill();

            // Generation ring (older generations have a visible orbital ring)
            if (p.gen > 0 && sSize > 5) {
                const ringR = sSize * 0.8;
                ctx.beginPath();
                ctx.arc(px, py, ringR, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${pHue}, 90%, 80%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // --- LAYER 5: Global flash on heavy fission ---
        if (this.flash > 0.01) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 0.3})`;
            ctx.fillRect(0, 0, w, h);
            this.flash *= 0.82;
        }

        const notes = mathEngine.getActiveNotes();
        if (notes.some(n => n.velocity > 0.8 && Math.random() > 0.92)) {
            this.flash = 0.6;
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    getAudioModulation() {
        return {
            detune: this.math.get('intensity') * 100,
            feedback: 0.1 + this.math.get('complexity') * 0.7
        };
    }
}
