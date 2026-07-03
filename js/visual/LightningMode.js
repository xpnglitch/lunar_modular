/**
 * LightningMode — Electrical discharge bolts on a dark sky
 * Notes trigger bright branching bolts with glow halos.
 * Ambient floating sparks fill the background.
 */
import { LightningMath } from '../math/LightningMath.js';

export class LightningMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.lightningMath = new LightningMath();
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.trailOpacity = 1.0; // We manage our own clearing

        // Ambient spark particles
        this.sparks = [];
        this.maxSparks = 300;

        // Fading bolt ghosts
        this.ghostBolts = [];
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this._initSparks();
    }

    _initSparks() {
        this.sparks = [];
        for (let i = 0; i < this.maxSparks; i++) {
            this.sparks.push({
                x: Math.random() * (this.width || 1200),
                y: Math.random() * (this.height || 800),
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: 0.5 + Math.random() * 1.8,
                brightness: 0.05 + Math.random() * 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 1 + Math.random() * 3,
            });
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.lightningMath.triggerBolt(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.lightningMath.getAudioModulation();
    }

    setIntensity(val) {
        this.lightningMath.setIntensity(val);
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const noteCount = mathEngine.noteCount;

        this.lightningMath.update(dt);

        // --- Clear with dark background ---
        ctx.fillStyle = 'rgba(4, 6, 18, 1)';
        ctx.fillRect(0, 0, w, h);

        // --- Ambient sparks ---
        const lightPressure = mathEngine.getLightPressure();
        
        for (const spark of this.sparks) {
            spark.pulse += spark.pulseSpeed * dt;
            spark.x += spark.vx;
            spark.y += spark.vy;

            if (spark.x < 0) spark.x = w;
            if (spark.x > w) spark.x = 0;
            if (spark.y < 0) spark.y = h;
            if (spark.y > h) spark.y = 0;

            // --- HONEST COUPLING: Light-Pressure Attraction ---
            // Pull sparks toward Light-Pressure center
            const dx = (lightPressure.x * w) - spark.x;
            const dy = (lightPressure.y * h) - spark.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 300) {
                const pull = (1.0 - dist / 300) * lightPressure.force * 0.2;
                spark.x += dx * pull;
                spark.y += dy * pull;
            }

            const excitation = 1 + noteCount * 0.3;
            const pulse = (Math.sin(spark.pulse) + 1) * 0.5;
            const alpha = spark.brightness * pulse * excitation * (0.3 + intensity * 0.3);

            if (alpha < 0.02) continue;

            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue + 210 + pulse * 30}, 50%, 70%, ${alpha})`;
            ctx.fill();

            if (alpha > 0.12 && spark.size > 1.2) {
                ctx.beginPath();
                ctx.arc(spark.x, spark.y, spark.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue + 210}, 50%, 65%, ${alpha * 0.12})`;
                ctx.fill();
            }
        }

        // --- Ghost bolts (fading afterimages of previous bolts) ---
        for (let i = this.ghostBolts.length - 1; i >= 0; i--) {
            const ghost = this.ghostBolts[i];
            ghost.life -= dt;
            if (ghost.life <= 0) {
                this.ghostBolts.splice(i, 1);
                continue;
            }
            const alpha = (ghost.life / ghost.maxLife) * 0.15;
            this._drawBoltSegments(ctx, ghost.segments, w, h, hue, alpha, 0.4);
        }

        // --- Active bolts ---
        for (const bolt of this.lightningMath.bolts) {
            if (bolt.life <= 0) continue;
            const boltAlpha = bolt.life / bolt.maxLife;

            // Save segments for ghost trail (only on first frame)
            if (bolt.age < dt * 2 && this.ghostBolts.length < 20) {
                this.ghostBolts.push({
                    segments: bolt.segments.map(s => ({ ...s })),
                    life: 2.0,
                    maxLife: 2.0,
                });
            }

            // Draw the bolt with multiple glow layers
            this._drawBoltSegments(ctx, bolt.segments, w, h, hue, boltAlpha, 1.0);

            // Flash at bolt origin
            if (boltAlpha > 0.6) {
                const ox = bolt.originX * w;
                const oy = bolt.originY * h;
                const flashR = 30 + bolt.energy * 60;
                const flashAlpha = (boltAlpha - 0.6) * 2.5;

                // --- Ground Surge Glow ---
                const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, flashR * 2);
                grd.addColorStop(0, `hsla(${hue + 215}, 50%, 95%, ${flashAlpha * 0.6})`);
                grd.addColorStop(0.3, `hsla(${hue + 215}, 65%, 80%, ${flashAlpha * 0.3})`);
                grd.addColorStop(0.6, `hsla(${hue + 215}, 70%, 70%, ${flashAlpha * 0.1})`);
                grd.addColorStop(1, `hsla(${hue + 215}, 60%, 60%, 0)`);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(ox, oy, flashR * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Draw bolt segments with 3-layer glow
     */
    _drawBoltSegments(ctx, segments, w, h, hue, boltAlpha, scale) {
        for (const seg of segments) {
            const sx1 = seg.x1 * w;
            const sy1 = seg.y1 * h;
            const sx2 = seg.x2 * w;
            const sy2 = seg.y2 * h;
            const energy = seg.energy || seg.brightness || 0.5;
            const lineW = (2 + energy * 4) * boltAlpha * scale;

            // Outer glow
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.strokeStyle = `hsla(${hue + 210}, 80%, 70%, ${boltAlpha * 0.08 * scale})`;
            ctx.lineWidth = lineW * 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Mid glow
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.strokeStyle = `hsla(${hue + 215}, 75%, 75%, ${boltAlpha * 0.25 * scale})`;
            ctx.lineWidth = lineW * 3;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Bright core
            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.strokeStyle = `hsla(${hue + 220}, 30%, 95%, ${boltAlpha * 0.85 * scale})`;
            ctx.lineWidth = lineW;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Branch node glow
            if (seg.isBranch && energy > 0.3) {
                const grd = ctx.createRadialGradient(sx1, sy1, 0, sx1, sy1, lineW * 4);
                grd.addColorStop(0, `hsla(${hue + 210}, 50%, 90%, ${boltAlpha * 0.3 * scale})`);
                grd.addColorStop(1, `hsla(${hue + 210}, 50%, 90%, 0)`);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(sx1, sy1, lineW * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
