import { WebMath } from '../math/WebMath.js';

/**
 * WebMode — Neural Synapse Lattice.
 * A high-fidelity atmospheric neural network visualization where notes trigger 
 * signal waves that propagate through a dynamic lattice of neurons.
 */
export class WebMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new WebMath();
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, intensity, lightPressure);

        const energy = this.mathInstance.energy;

        // --- Deep Atmospheric Backdrop ---
        const bgRadius = Math.max(0.1, Math.max(w, h));
        const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, bgRadius);
        bgGrad.addColorStop(0, `hsla(${hue}, 40%, 8%, 1)`);
        bgGrad.addColorStop(1, `hsla(${(hue + 40) % 360}, 60%, 2%, 1)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Draw Synapses (Connections) ---
        ctx.lineCap = 'round';
        for (const s of this.mathInstance.synapses) {
            const n1 = this.mathInstance.nodes[s.a];
            const n2 = this.mathInstance.nodes[s.b];
            
            const x1 = n1.x * w, y1 = n1.y * h;
            const x2 = n2.x * w, y2 = n2.y * h;
            
            const activity = s.activity;
            const alpha = (0.05 + activity * 0.4) * intensity;
            const lw = 0.5 + activity * 3.0;

            const sHue = (hue + (n1.hue + n2.hue) * 0.5) % 360;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${sHue}, 80%, ${50 + activity * 30}%, ${alpha})`;
            ctx.lineWidth = lw;
            ctx.stroke();
            
            // Sub-glow for active synapses
            if (activity > 0.2) {
                ctx.strokeStyle = `hsla(${sHue}, 100%, 70%, ${alpha * 0.5})`;
                ctx.lineWidth = lw * 3;
                ctx.stroke();
            }
        }

        // --- Signal Pulses (Traveling Data) ---
        for (const p of this.mathInstance.signalPulses) {
            const x = (p.from.x + (p.to.x - p.from.x) * p.progress) * w;
            const y = (p.from.y + (p.to.y - p.from.y) * p.progress) * h;
            
            const pSize = 2 + p.intensity * 6;
            const pHue = (hue + p.from.hue) % 360;
            
            const pulseRadius = Math.max(0.1, pSize * 2);
            const pGrad = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
            pGrad.addColorStop(0, `hsla(${pHue}, 100%, 95%, ${p.intensity})`);
            pGrad.addColorStop(0.5, `hsla(${pHue}, 100%, 70%, ${p.intensity * 0.5})`);
            pGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = pGrad;
            ctx.beginPath(); ctx.arc(x, y, pSize * 2, 0, Math.PI * 2); ctx.fill();
        }

        // --- Firing Neurons (Nodes) ---
        for (const n of this.mathInstance.nodes) {
            const nx = n.x * w, ny = n.y * h;
            const nHue = (hue + n.hue) % 360;
            const firing = n.firing;
            
            // Firing Glow
            if (firing > 0.05) {
                const fSize = 10 + firing * 50 * intensity;
                const fireRadius = Math.max(0.1, isFinite(fSize) ? fSize : 10);
                const fGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, fireRadius);
                fGrad.addColorStop(0, `hsla(${nHue}, 100%, 80%, ${firing * 0.6})`);
                fGrad.addColorStop(0.4, `hsla(${nHue}, 100%, 60%, ${firing * 0.2})`);
                fGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = fGrad;
                ctx.beginPath(); ctx.arc(nx, ny, fireRadius, 0, Math.PI * 2); ctx.fill();
            }

            // Core Neuron
            const coreSize = 2 + (n.refractory * 4) + (firing * 6);
            ctx.fillStyle = `hsla(${nHue}, 100%, ${50 + firing * 50}%, ${0.3 + n.refractory * 0.7})`;
            ctx.beginPath(); ctx.arc(nx, ny, coreSize, 0, Math.PI * 2); ctx.fill();
            
            // Hotspot core
            if (firing > 0.3) {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(nx, ny, coreSize * 0.4, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
