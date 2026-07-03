import { ChromeMath } from '../math/ChromeMath.js';

/**
 * ChromeMode — Liquid Mercury Surface.
 * A high-fidelity metallic simulation featuring mercurial metaballs, 
 * high-contrast environmental reflections, and ray-traced specular highlights.
 * Notes create surface tension distortions and high-energy chromatic ripples.
 */
export class ChromeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ChromeMath();
        this.initialized = false;
        this.ripples = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        this.mathInstance.addPulse(x, y, noteInfo.velocity);
        
        this.ripples.push({
            x, y,
            life: 1.0,
            vel: noteInfo.velocity,
            r: 0
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed, mathEngine.getLightPressure());
        const totalEnergy = Number(this.mathInstance.energy) || 0;

        // --- Environmental Backdrop ---
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // Subtle background gradient for "sky" reflection
        const bgG = ctx.createLinearGradient(0, 0, 0, h);
        bgG.addColorStop(0, `hsla(${hue}, 30%, 15%, 1)`);
        bgG.addColorStop(0.5, `hsla(${(hue + 20)%360}, 20%, 5%, 1)`);
        bgG.addColorStop(1, '#000');
        ctx.fillStyle = bgG;
        ctx.fillRect(0, 0, w, h);

        // --- Liquid Mercury Blobs (Metaballs) ---
        // Using high-contrast gradients to simulate metallic spheres
        for (const b of this.mathInstance.blobs) {
            const bx = b.x * w, by = b.y * h;
            const bR = b.radius * Math.min(w, h) * (0.8 + b.energy * 0.5) * (0.7 + intensity * 0.5);
            const bHue = (hue + b.hueOff) % 360;
            const bAlpha = 1.0;

            // 1. Dark Base Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = bR * 0.3;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(bx, by, bR, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // 2. Metallic Reflection Gradient
            // Offsetting the center to create a "top-down" lighting look
            const specX = bx - bR * 0.35, specY = by - bR * 0.35;
            const g = ctx.createRadialGradient(specX, specY, 0, bx, by, bR);
            g.addColorStop(0, `hsla(${bHue}, 10%, 95%, 1)`); // Hot highlight
            g.addColorStop(0.1, `hsla(${bHue}, 30%, 80%, 1)`);
            g.addColorStop(0.4, `hsla(${bHue}, 50%, 40%, 1)`); // Mid-tones
            g.addColorStop(0.8, `hsla(${bHue}, 70%, 10%, 1)`); // Deep shadow
            g.addColorStop(1.0, '#000');
            
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(bx, by, bR, 0, Math.PI * 2); ctx.fill();

            // 3. Surface Tension "Rim Light"
            ctx.strokeStyle = `hsla(${bHue}, 100%, 90%, ${0.1 + b.energy * 0.4})`;
            ctx.lineWidth = bR * 0.05;
            ctx.beginPath(); ctx.arc(bx, by, bR * 0.9, -0.5 * Math.PI, 0.2 * Math.PI); ctx.stroke();
            
            // 4. Energy-pulsing Core
            if (b.energy > 0.1) {
                const innerR = bR * 0.4 * b.energy;
                const innerG = ctx.createRadialGradient(bx, by, 0, bx, by, innerR);
                innerG.addColorStop(0, `hsla(${bHue}, 100%, 80%, ${b.energy * 0.6})`);
                innerG.addColorStop(1, 'transparent');
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = innerG;
                ctx.beginPath(); ctx.arc(bx, by, innerR, 0, Math.PI * 2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        // --- Mercurial Ripples ---
        this.ripples = this.ripples.filter(r => r.life > 0.01);
        ctx.globalCompositeOperation = 'screen';
        for (const r of this.ripples) {
            r.life -= dt * 0.8;
            r.r += (0.1 + r.vel * 0.3) * dt * 2;
            
            const rx = r.x * w, ry = r.y * h;
            const rr = r.r * Math.min(w, h);
            const rAlpha = r.life * r.vel * 0.5;
            
            const rg = ctx.createRadialGradient(rx, ry, rr * 0.8, rx, ry, rr);
            rg.addColorStop(0, 'transparent');
            rg.addColorStop(0.6, `hsla(${(hue + 180)%360}, 100%, 95%, ${rAlpha})`);
            rg.addColorStop(1, 'transparent');
            
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Specular Lens Flares (Post-process) ---
        if (totalEnergy > 0.2) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 0;
            const brightest = this.mathInstance.blobs.reduce((max, b) => b.energy > max.energy ? b : max, this.mathInstance.blobs[0]);
            
            if (brightest) {
                const bx = brightest.x * w - brightest.radius * w * 0.35;
                const by = brightest.y * h - brightest.radius * h * 0.35;
                const flareSize = 50 + brightest.energy * 150 * intensity;
                
                const fg = ctx.createRadialGradient(bx, by, 0, bx, by, flareSize);
                fg.addColorStop(0, `rgba(255, 255, 255, ${brightest.energy * intensity})`);
                fg.addColorStop(0.3, `hsla(${hue}, 100%, 90%, ${brightest.energy * 0.2})`);
                fg.addColorStop(1, 'transparent');
                
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(bx, by, flareSize, 0, Math.PI * 2); ctx.fill();
                
                // Diffraction Spike
                ctx.strokeStyle = `rgba(255, 255, 255, ${brightest.energy * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(bx - flareSize, by); ctx.lineTo(bx + flareSize, by);
                ctx.moveTo(bx, by - flareSize); ctx.lineTo(bx, by + flareSize);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
