import { AuraMath } from '../math/AuraMath.js';

/**
 * AuraMode — Shimmering Aurora Borealis.
 * 
 * Multi-layered vertical curtain ribbons with dramatic audio reactivity.
 * Notes cause curtains to flare brighter with intense ray columns
 * and coronal shimmer bursts. Idle = gentle ambient sway.
 */
export class AuraMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.auraMath = new AuraMath();
        this.noteFlares = []; // Visual-only note-triggered brightness bursts
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random(), y: Math.random(),
                size: 0.3 + Math.random() * 1.2,
                brightness: 0.2 + Math.random() * 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    resize(w, h) {
        this.auraMath.reset(800, 600);
        this.noteFlares = [];
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        // Spawn a visual flare at the note's horizontal position
        this.noteFlares.push({
            x: noteInfo.normalizedPosition,
            energy: 0.5 + noteInfo.velocity * 0.5,
            life: 1.0,
            decay: 0.4 + Math.random() * 0.3,
            hueShift: Math.random() * 40 - 20
        });
        if (this.noteFlares.length > 20) this.noteFlares.shift();
    }

    onNoteOff(noteInfo) {}

    render(ctx, w, h, mathEngine, dt) {
        this.auraMath.step(mathEngine, dt);

        const hue = (mathEngine.get('colorHue') + 120) % 360;
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        // Update note flares
        for (let i = this.noteFlares.length - 1; i >= 0; i--) {
            this.noteFlares[i].life -= dt * this.noteFlares[i].decay;
            if (this.noteFlares[i].life <= 0) this.noteFlares.splice(i, 1);
        }

        // Calculate per-ribbon note influence (which ribbons are near active flares)
        const ribbonBoost = new Array(this.auraMath.ribbons.length).fill(0);
        for (const flare of this.noteFlares) {
            for (let ri = 0; ri < this.auraMath.ribbons.length; ri++) {
                const ribbonX = ri / (this.auraMath.ribbons.length - 1);
                const dist = Math.abs(flare.x - ribbonX);
                if (dist < 0.3) {
                    ribbonBoost[ri] += (1 - dist / 0.3) * flare.energy * flare.life;
                }
            }
        }

        // Deep night sky
        ctx.fillStyle = '#000008';
        ctx.fillRect(0, 0, w, h);

        // --- LAYER 1: Star field ---
        for (const s of this.stars) {
            const twinkle = 0.3 + 0.7 * Math.sin(time * 1.5 + s.twinkle);
            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 210, 255, ${s.brightness * twinkle * 0.4})`;
            ctx.fill();
        }

        const ribbons = this.auraMath.ribbons;
        ctx.globalCompositeOperation = 'lighter';

        // --- LAYER 2: Wide atmospheric corona glow (boosted by notes) ---
        for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const points = r.points;
            const rHue = (hue + i * 20) % 360;
            const boost = ribbonBoost[i];

            ctx.beginPath();
            for (let j = 0; j < points.length; j++) {
                const sx = (points[j].x / 800) * w;
                const sy = (points[j].y / 600) * h;
                if (j === 0) ctx.moveTo(sx, sy);
                else {
                    const prev = points[j - 1];
                    const psx = (prev.x / 800) * w;
                    const psy = (prev.y / 600) * h;
                    ctx.quadraticCurveTo(psx, psy, (sx + psx) / 2, (sy + psy) / 2);
                }
            }
            // Base glow + boost from notes
            const baseAlpha = 0.015 + intensity * 0.02;
            const boostAlpha = boost * 0.08;
            ctx.strokeStyle = `hsla(${rHue}, 60%, 50%, ${baseAlpha + boostAlpha})`;
            ctx.lineWidth = 25 + intensity * 30 + boost * 40;
            ctx.stroke();
        }

        // --- LAYER 3: Vertical ray columns (dramatically boosted by notes) ---
        for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const points = r.points;
            const rHue = (hue + i * 20) % 360;
            const boost = ribbonBoost[i];

            for (let j = 0; j < points.length; j += 2) {
                const p = points[j];
                const sx = (p.x / 800) * w;
                const sy = (p.y / 600) * h;

                // Ray height dramatically increases with notes
                const baseHeight = 60 + Math.sin(time * 0.8 + j * 0.3 + i) * 30;
                const noteHeight = boost * 250;
                const rayHeight = baseHeight + intensity * 100 + noteHeight;
                const rayWidth = 2 + intensity * 3 + boost * 6;
                const baseAlpha = 0.02 + intensity * 0.06;
                const rayAlpha = baseAlpha + boost * 0.2;

                // Color gradient along ray (shifts with boost)
                const colGrad = ctx.createLinearGradient(sx, sy, sx, sy + rayHeight);
                colGrad.addColorStop(0, `hsla(${rHue}, 85%, ${70 + boost * 20}%, ${rayAlpha * 1.5})`);
                colGrad.addColorStop(0.3, `hsla(${(rHue + 30) % 360}, 90%, 65%, ${rayAlpha})`);
                colGrad.addColorStop(0.7, `hsla(${(rHue + 60) % 360}, 70%, 50%, ${rayAlpha * 0.4})`);
                colGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = colGrad;
                ctx.fillRect(sx - rayWidth / 2, sy, rayWidth, rayHeight);

                // Glow envelope (wider when boosted)
                if (rayAlpha > 0.03) {
                    const glowW = rayWidth * 3 + boost * 10;
                    const glowGrad = ctx.createLinearGradient(sx, sy, sx, sy + rayHeight * 0.6);
                    glowGrad.addColorStop(0, `hsla(${rHue}, 70%, 60%, ${rayAlpha * 0.2})`);
                    glowGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGrad;
                    ctx.fillRect(sx - glowW, sy, glowW * 2, rayHeight * 0.6);
                }
            }
        }

        // --- LAYER 4: Primary ribbon stroke (inner curtain edge) ---
        for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const points = r.points;
            const rHue = (hue + i * 20) % 360;
            const boost = ribbonBoost[i];
            const alpha = 0.05 + intensity * 0.12 + boost * 0.3;

            ctx.beginPath();
            for (let j = 0; j < points.length; j++) {
                const sx = (points[j].x / 800) * w;
                const sy = (points[j].y / 600) * h;
                if (j === 0) ctx.moveTo(sx, sy);
                else {
                    const prev = points[j - 1];
                    const psx = (prev.x / 800) * w;
                    const psy = (prev.y / 600) * h;
                    ctx.quadraticCurveTo(psx, psy, (sx + psx) / 2, (sy + psy) / 2);
                }
            }

            // Bright inner line (pulses with notes)
            ctx.strokeStyle = `hsla(${rHue}, 90%, ${75 + boost * 15}%, ${alpha})`;
            ctx.lineWidth = 1.5 + intensity * 2 + boost * 4;
            ctx.stroke();

            // Medium glow
            ctx.strokeStyle = `hsla(${rHue}, 80%, 65%, ${alpha * 0.35})`;
            ctx.lineWidth = 5 + intensity * 6 + boost * 12;
            ctx.stroke();
        }

        // --- LAYER 5: Coronal shimmer (more frequent and brighter with notes) ---
        for (let i = 0; i < ribbons.length; i++) {
            const r = ribbons[i];
            const points = r.points;
            const rHue = (hue + i * 20) % 360;
            const boost = ribbonBoost[i];

            for (let j = 0; j < points.length; j += 3) {
                const p = points[j];
                const shimmer = 0.5 + 0.5 * Math.sin(time * 3 + j * 0.7 + i * 2.1);
                // Lower threshold when notes are active
                const threshold = 0.6 - boost * 0.4;
                if (shimmer < threshold) continue;

                const sx = (p.x / 800) * w;
                const sy = (p.y / 600) * h;
                const shimmerR = 10 + shimmer * 18 + intensity * 12 + boost * 25;
                const shimmerAlpha = (shimmer - threshold) * intensity * 0.3 + boost * 0.15;

                const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(0, shimmerR));
                sGrad.addColorStop(0, `hsla(${(rHue + 40) % 360}, 90%, 90%, ${shimmerAlpha})`);
                sGrad.addColorStop(0.5, `hsla(${(rHue + 20) % 360}, 80%, 70%, ${shimmerAlpha * 0.3})`);
                sGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = sGrad;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0, shimmerR), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- LAYER 6: Note flare flash (bright burst at note position) ---
        for (const flare of this.noteFlares) {
            if (flare.life < 0.3) continue;
            const fx = flare.x * w;
            const fy = h * 0.3; // upper region where aurora lives
            const fR = 40 + flare.energy * 80;
            const fAlpha = flare.life * flare.energy * 0.15;
            const fHue = (hue + flare.hueShift + 360) % 360;

            const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fR);
            fGrad.addColorStop(0, `hsla(${fHue}, 90%, 90%, ${fAlpha})`);
            fGrad.addColorStop(0.4, `hsla(${fHue}, 80%, 70%, ${fAlpha * 0.3})`);
            fGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(fx, fy, fR, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 7: Horizon glow ---
        const horizonY = h * 0.85;
        const horizonGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        horizonGrad.addColorStop(0, 'transparent');
        horizonGrad.addColorStop(0.5, `hsla(${hue}, 40%, 25%, ${0.03 + intensity * 0.05})`);
        horizonGrad.addColorStop(1, `hsla(${hue}, 30%, 15%, ${0.02 + intensity * 0.03})`);
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        ctx.globalCompositeOperation = 'source-over';
    }

    getAudioModulation() {
        return {
            oscType: 'triangle',
            filterQ: 1.0 + this.math.get('complexity') * 20,
            harmonicity: 0.5 + this.math.get('intensity') * 2.5
        };
    }
}
