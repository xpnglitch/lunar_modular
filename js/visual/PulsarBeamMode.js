import { PulsarBeamMath } from '../math/PulsarBeamMath.js';

/**
 * PulsarBeamMode — Magnetogram Singularity.
 * A high-fidelity cinematic simulation of a rapidly rotating neutron star.
 * Features sweeping electromagnetic beams, warping magnetic field arcs, 
 * and intense polar jet bursts triggered by note transients.
 */
export class PulsarBeamMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new PulsarBeamMath();
        this.initialized = false;
        this.rings = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Emit an electromagnetic expansion ring
        this.rings.push({
            r: 0,
            life: 1.0,
            vel: noteInfo.velocity,
            hueShift: noteInfo.normalizedPosition * 60 - 30
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue');

        this.mathInstance.step(dt, complexity);
        const energy = this.mathInstance.energy;
        const rotation = this.mathInstance.rotation;
        const spin = this.mathInstance.spinRate;

        const cx = w / 2, cy = h / 2;
        const maxR = Math.min(w, h) * 0.45;

        // --- Deep Magnetic Void ---
        ctx.fillStyle = '#020006';
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Magnetic Field Lines (Magnetosphere) ---
        const arcs = 16;
        for (let i = 0; i < arcs; i++) {
            const angle = rotation + (i / arcs) * Math.PI * 2;
            const arcHue = (hue + 200 + i * 10) % 360;
            const arcAlpha = (0.15 + energy * 0.2) * intensity;
            
            ctx.strokeStyle = `hsla(${arcHue}, 80%, 65%, ${arcAlpha})`;
            ctx.lineWidth = 0.5 + energy * 1.5;
            
            ctx.beginPath();
            for (let t = -1; t <= 1; t += 0.1) {
                // Dipole field line approximation
                const theta = angle + t * Math.PI * 0.4;
                const r = maxR * 0.9 * Math.pow(Math.cos(t * Math.PI * 0.5), 2);
                const ex = cx + Math.cos(theta) * r;
                const ey = cy + Math.sin(theta) * r * 0.7; // flatten for 3D feel
                if (t === -1) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
            }
            ctx.stroke();
        }

        // --- Sweeping Electromagnetic Beams ---
        for (let b = 0; b < 2; b++) {
            const beamAngle = rotation + b * Math.PI;
            const beamLen = maxR * 1.5;
            // The "flicker" of the beam as it sweeps towards/away
            const scale = Math.abs(Math.cos(beamAngle)); 
            const bAlpha = (0.2 + 0.5 * scale) * (0.5 + energy * 0.5) * intensity;
            const bWidth = 0.05 + 0.1 * scale;

            const bGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(beamAngle) * beamLen, cy + Math.sin(beamAngle) * beamLen);
            bGrad.addColorStop(0, `hsla(${hue}, 100%, 95%, ${bAlpha})`);
            bGrad.addColorStop(0.3, `hsla(${(hue + 40) % 360}, 100%, 70%, ${bAlpha * 0.4})`);
            bGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, beamLen, beamAngle - bWidth, beamAngle + bWidth);
            ctx.fill();
            
            // Core beam streak
            if (scale > 0.8) {
                ctx.strokeStyle = `hsla(${hue}, 100%, 95%, ${bAlpha * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(beamAngle) * beamLen * 0.8, cy + Math.sin(beamAngle) * beamLen * 0.8);
                ctx.stroke();
            }
        }

        // --- Electromagnetic Rings ---
        this.rings = this.rings.filter(r => r.life > 0.01);
        for (const r of this.rings) {
            r.r += dt * 300 * (1 + r.vel);
            r.life -= dt * 0.8;
            if (r.r > maxR * 2) { r.life = 0; continue; }
            
            const rHue = (hue + r.hueShift) % 360;
            const rAlpha = r.life * 0.3 * intensity;
            
            const rGrad = ctx.createRadialGradient(cx, cy, r.r * 0.9, cx, cy, r.r);
            rGrad.addColorStop(0, 'transparent');
            rGrad.addColorStop(0.5, `hsla(${rHue}, 100%, 75%, ${rAlpha})`);
            rGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = rGrad;
            ctx.beginPath(); ctx.arc(cx, cy, r.r, 0, Math.PI * 2); ctx.fill();
        }

        // --- Polar Jets ---
        for (const j of this.mathInstance.jets) {
            const jAlpha = j.life * intensity;
            const jLen = maxR * 1.5 * j.vel;
            const jHue = (hue + 180) % 360;
            
            for (let pole = 0; pole < 2; pole++) {
                const angle = rotation + (pole === 0 ? Math.PI/2 : -Math.PI/2);
                const jGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * jLen, cy + Math.sin(angle) * jLen);
                jGrad.addColorStop(0, `hsla(${jHue}, 100%, 95%, ${jAlpha})`);
                jGrad.addColorStop(0.6, `hsla(${jHue}, 100%, 70%, ${jAlpha * 0.4})`);
                jGrad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = jGrad;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, jLen, angle - 0.05, angle + 0.05);
                ctx.fill();
            }
        }

        // --- Pulsar Singularity (Core) ---
        const coreR = 6 + energy * 12;
        const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
        coreG.addColorStop(0, '#fff');
        coreG.addColorStop(0.2, `hsla(${hue}, 100%, 85%, 1)`);
        coreG.addColorStop(0.5, `hsla(${(hue + 20) % 360}, 100%, 60%, 0.5)`);
        coreG.addColorStop(1, 'transparent');
        
        ctx.fillStyle = coreG;
        ctx.beginPath(); ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2); ctx.fill();
        
        // Small hard core
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.6, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}
