import { BoidsMath } from '../math/BoidsMath.js';

/**
 * BoidsMode — Bio-Kinetic Swarming.
 * A high-fidelity flocking simulation where organic-looking entities 
 * navigate fluidly with tapered ribbon trails and audio-reactive behavior.
 */
export class BoidsMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new BoidsMath();
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.energy = Math.min(1.0, this.mathInstance.energy + noteInfo.velocity * 0.4);
        
        // Add a few boids at the note position
        for (let i = 0; i < 3; i++) {
            this.mathInstance.addBoid(
                noteInfo.normalizedPosition, 
                0.3 + Math.random() * 0.4, 
                noteInfo.frequency, 
                noteInfo.velocity
            );
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity') || 0.5;
        const speed = mathEngine.get('speed') || 1.0;
        const hue = mathEngine.get('colorHue') || 0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);

        const energy = this.mathInstance.energy;

        // --- Fluid Backdrop ---
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, `hsla(${hue}, 60%, 5%, 1)`);
        bgGrad.addColorStop(1, `hsla(${(hue + 20) % 360}, 80%, 10%, 1)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Draw Boids and Ribbon Trails ---
        for (const b of this.mathInstance.boids) {
            const bx = b.x * w, by = b.y * h;
            const bHue = (hue + (b.hue || 0)) % 360;
            const bAlpha = (0.3 + (b.energy || 0) * 0.5 + energy * 0.3) * intensity;
            
            // 1. Ribbon Trail
            if (b.history.length > 2) {
                ctx.beginPath();
                ctx.moveTo(b.history[0].x * w, b.history[0].y * h);
                
                for (let i = 1; i < b.history.length; i++) {
                    const p1 = b.history[i - 1];
                    const p2 = b.history[i];
                    
                    // Bezier curves for smoother ribbons
                    const mx = (p1.x + p2.x) / 2 * w;
                    const my = (p1.y + p2.y) / 2 * h;
                    ctx.quadraticCurveTo(p1.x * w, p1.y * h, mx, my);
                }

                // Ribbon width tapers off at the end
                const trailWidth = b.baseSize * (1 + b.energy * 3);
                ctx.lineWidth = trailWidth;
                ctx.strokeStyle = `hsla(${bHue}, 80%, 60%, ${bAlpha * 0.2})`;
                ctx.stroke();

                // Core glow line in ribbon
                ctx.lineWidth = 1 + b.energy;
                ctx.strokeStyle = `hsla(${bHue}, 100%, 80%, ${bAlpha * 0.6})`;
                ctx.stroke();
            }

            // 2. Boid Entity (Bio-Body)
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.atan2(b.vy, b.vx));

            const s = Math.min(100, Math.max(0.1, b.baseSize * (1 + b.energy * 2)));
            if (!isFinite(s)) continue;
            
            // Outer Body Glow
            const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 4);
            bodyGrad.addColorStop(0, `hsla(${bHue}, 100%, 80%, ${bAlpha})`);
            bodyGrad.addColorStop(0.5, `hsla(${bHue}, 100%, 60%, ${bAlpha * 0.3})`);
            bodyGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath(); ctx.arc(0, 0, s * 4, 0, Math.PI * 2); ctx.fill();

            // Core Entity
            ctx.fillStyle = '#fff';
            // Tapered Ellipse Body
            ctx.beginPath();
            ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Fins / Kinetic Accents
            ctx.strokeStyle = `hsla(${bHue}, 100%, 70%, ${bAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-s * 0.5, -s * 0.4); ctx.lineTo(-s, -s * 1.5);
            ctx.moveTo(-s * 0.5, s * 0.4); ctx.lineTo(-s, s * 1.5);
            ctx.stroke();

            ctx.restore();
        }

        // --- Global Bloom Pulse ---
        if (energy > 0.4) {
             const pulseSize = Math.max(w, h) * 0.4 * energy;
             const pg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, pulseSize);
             pg.addColorStop(0, `hsla(${hue}, 100%, 70%, ${energy * 0.1})`);
             pg.addColorStop(1, 'transparent');
             ctx.fillStyle = pg;
             ctx.fillRect(0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
