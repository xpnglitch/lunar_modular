/**
 * FlowFieldMode — Particle system driven by Perlin noise flow field
 * Particles follow the noise gradient. Notes spawn bursts of particles.
 * The same noise field modulates the synth (honest coupling).
 */
import { FlowFieldMath } from '../math/FlowFieldMath.js';

export class FlowFieldMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.flowMath = new FlowFieldMath();
        this.particles = [];
        this.maxParticles = 3000;
        this.width = 0;
        this.height = 0;
        this.time = 0;

        // Note burst queue — when a note plays, spawn particles here
        this.noteBursts = [];
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this._initParticles();
    }

    /**
     * Initialize particle pool
     */
    _initParticles() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this._createParticle());
        }
    }

    /**
     * Create a single particle at random position
     */
    _createParticle(x, y, energy) {
        return {
            x: x ?? Math.random() * this.width,
            y: y ?? Math.random() * this.height,
            vx: 0,
            vy: 0,
            life: Math.random(),  // 0-1, used for fading
            maxLife: 0.6 + Math.random() * 0.4,
            energy: energy ?? 0.3 + Math.random() * 0.3, // Affects brightness/size
            hueOffset: (Math.random() - 0.5) * 30, // Slight color variation
        };
    }

    /**
     * Called when a note is played — spawn a burst of particles
     */
    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        // Position the burst based on note position (low=left, high=right)
        const x = noteInfo.normalizedPosition * this.width * 0.7 + this.width * 0.15;
        const y = this.height * (0.3 + Math.random() * 0.4);

        this.noteBursts.push({
            x, y,
            energy: 0.7 + noteInfo.velocity * 0.3,
            count: 40 + Math.floor(noteInfo.velocity * 30),
            hueShift: (noteInfo.normalizedPosition - 0.5) * 60,
        });
    }

    /**
     * Get audio modulation values from the flow field
     * This is the HONEST COUPLING
     */
    getAudioModulation() {
        return this.flowMath.getAudioModulation(this.time, this.math.get('complexity'));
    }

    /**
     * Main render method
     */
    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.width = w;
        this.height = h;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const noteCount = mathEngine.noteCount;
        const reactivity = mathEngine.get('reactivity');

        // Process note bursts — spawn new particles
        for (const burst of this.noteBursts) {
            for (let i = 0; i < burst.count; i++) {
                // Find a low-energy particle to recycle
                const idx = this._findRecyclable();
                if (idx >= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 50;
                    this.particles[idx] = this._createParticle(
                        burst.x + Math.cos(angle) * dist,
                        burst.y + Math.sin(angle) * dist,
                        burst.energy
                    );
                    this.particles[idx].hueOffset = burst.hueShift + (Math.random() - 0.5) * 20;
                    this.particles[idx].life = 0;
                    this.particles[idx].vx = Math.cos(angle) * burst.energy * 3;
                    this.particles[idx].vy = Math.sin(angle) * burst.energy * 3;
                }
            }
        }
        this.noteBursts = [];

        // Update and render particles
        const baseSpeed = (0.5 + speed * 2.5) * 60 * dt;
        const noteBoost = 1 + noteCount * 0.15;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Get flow field angle and magnitude
            const angle = this.flowMath.getAngle(p.x, p.y, this.time, complexity);
            const mag = this.flowMath.getMagnitude(p.x, p.y, this.time, intensity);

            // Apply flow force (reactivity scales the force magnitude)
            const flowForce = baseSpeed * 0.1 * (0.3 + reactivity * 1.4);
            p.vx += Math.cos(angle) * mag * flowForce;
            p.vy += Math.sin(angle) * mag * flowForce;

            // Damping
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Move
            p.x += p.vx * noteBoost;
            p.y += p.vy * noteBoost;

            // Age
            p.life += dt * 0.15;

            // Recycle if dead or off-screen
            if (p.life > p.maxLife || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
                this.particles[i] = this._createParticle();
                continue;
            }

            // Render particle
            const lifeRatio = p.life / p.maxLife;
            const alpha = p.energy * (1 - lifeRatio * lifeRatio) * (0.4 + noteCount * 0.06);
            const size = (1.5 + p.energy * 2.5) * (1 - lifeRatio * 0.5);

            const particleHue = (hue + p.hueOffset + 360) % 360;
            const saturation = 70 + intensity * 25;
            const lightness = 50 + p.energy * 25;

            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${particleHue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.fill();

            // Glow effect for high-energy particles
            if (p.energy > 0.5 && alpha > 0.2) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${particleHue}, ${saturation}%, ${lightness + 15}%, ${alpha * 0.15})`;
                ctx.fill();
            }
        }
    }

    /**
     * Find a particle that can be recycled (low life / low energy)
     */
    _findRecyclable() {
        // Find a nearly-dead particle
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].life > this.particles[i].maxLife * 0.85) return i;
        }
        // Fallback: random particle
        return Math.floor(Math.random() * this.particles.length);
    }
}
