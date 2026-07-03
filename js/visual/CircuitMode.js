import { CircuitMath } from '../math/CircuitMath.js';

/**
 * CircuitMode — Digital Logic Visualization.
 * Visualizes the motherboard of the Harmonia engine. 
 * Orchestrated current flows along PCB-style traces, carrying 'Data Packets' 
 * that illuminate the system's logical pathways.
 */
export class CircuitMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.circuitMath = new CircuitMath();
    }

    resize(w, h) {
        this.circuitMath.reset();
    }

    /**
     * Render the digital network.
     */
    render(ctx, w, h, mathEngine, dt) {
        this.circuitMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');

        // Deep Silicon/Electronic background
        ctx.fillStyle = '#020505';
        ctx.fillRect(0, 0, w, h);

        // 1. Render Traces (The Wiring)
        ctx.lineCap = 'square';
        for (const t of this.circuitMath.traces) {
            const x1 = (t.n1.x / 800) * w;
            const y1 = (t.n1.y / 600) * h;
            const x2 = (t.n2.x / 800) * w;
            const y2 = (t.n2.y / 600) * h;

            // Base Wire (Idle)
            ctx.strokeStyle = `hsla(${hue}, 30%, 20%, 0.3)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Active Current (Pulse)
            if (t.active > 0.05) {
                const alpha = t.active * (0.2 + intensity * 0.8);
                ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
                ctx.lineWidth = 2 + intensity * 2;
                ctx.stroke();
            }
        }

        // 2. Render Logic Nodes (The Junctions)
        for (const n of this.circuitMath.nodes) {
            const nx = (n.x / 800) * w;
            const ny = (n.y / 600) * h;
            
            if (n.active > 0.05) {
                this._drawLogicNode(ctx, nx, ny, n.active, hue, intensity);
            }
        }

        // 3. Render Data Packets (The Signals)
        for (const p of this.circuitMath.packets) {
            this._drawDataPacket(ctx, p, w, h, hue, intensity);
        }
    }

    /**
     * Draws a luminous junction node.
     */
    _drawLogicNode(ctx, x, y, active, hue, intensity) {
        const r = 3 + active * 4;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        grad.addColorStop(0, `hsla(${hue}, 100%, 90%, ${active * 0.8})`);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Node Core
        ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${active})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draws a high-speed data packet traveling along a trace.
     */
    _drawDataPacket(ctx, p, w, h, hue, intensity) {
        const x1 = (p.start.x / 800) * w;
        const y1 = (p.start.y / 600) * h;
        const x2 = (p.target.x / 800) * w;
        const y2 = (p.target.y / 600) * h;

        const px = x1 + (x2 - x1) * p.t;
        const py = y1 + (y2 - y1) * p.t;

        const size = 6 + intensity * 10;
        
        ctx.fillStyle = `hsla(${hue}, 100%, 85%, 0.9)`;
        // Draw trailing bit (The digital tail)
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - (x2 - x1) * 0.1, py - (y2 - y1) * 0.1);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `hsla(${hue}, 100%, 85%, 0.4)`;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    getAudioModulation() {
        return {
            oscType: 'pulse',
            pulseWidth: 0.1 + this.math.get('intensity') * 0.8,
            detune: this.math.get('complexity') * 10
        };
    }
}
