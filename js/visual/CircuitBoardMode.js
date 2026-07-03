import { CircuitBoardMath } from '../math/CircuitBoardMath.js';

/**
 * CircuitBoardMode — Neural Synapse Grid.
 * A living neural network visualization: glowing nodes connected by
 * pulsing axon pathways. Electrical signals travel along connections,
 * triggering cascading activation waves. The grid breathes — nodes
 * oscillate and connections flare with current. Note events fire
 * action potentials that cascade through the entire network topology.
 */
export class CircuitBoardMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new CircuitBoardMath();
        this.time = 0;
        this._nodes = [];
        this._edges = [];
        this._signals = [];   // traveling pulses along edges
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildNetwork(w, h);
        this.initialized = true;
    }

    _buildNetwork(w, h) {
        // Place nodes on a grid with organic jitter
        const cols = 10 + Math.floor(w / 100);
        const rows = 7  + Math.floor(h / 100);
        this._nodes = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._nodes.push({
                    x:      (c / (cols-1)) * w * 0.9 + w * 0.05 + (Math.random()-0.5) * 30,
                    y:      (r / (rows-1)) * h * 0.9 + h * 0.05 + (Math.random()-0.5) * 25,
                    r:      2 + Math.random() * 3,
                    hueOff: Math.random() * 80 - 40,
                    phase:  Math.random() * Math.PI * 2,
                    energy: 0,
                    type:   Math.random() < 0.12 ? 'hub' : 'node',
                });
            }
        }

        // Build edges: connect to nearest 2-3 neighbors
        this._edges = [];
        for (let i = 0; i < this._nodes.length; i++) {
            const a = this._nodes[i];
            // Find closest nodes
            const dists = this._nodes
                .map((b, j) => ({ j, d: Math.hypot(a.x-b.x, a.y-b.y) }))
                .filter(e => e.j !== i)
                .sort((x, y) => x.d - y.d)
                .slice(0, 2 + (a.type === 'hub' ? 2 : 0));

            for (const { j, d } of dists) {
                if (!this._edges.find(e => (e.i===i&&e.j===j)||(e.i===j&&e.j===i))) {
                    this._edges.push({ i, j, len: d, signalProgress: -1, hueOff: Math.random()*60-30 });
                }
            }
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;

        // Fire the node nearest to the note position
        const targetX = noteInfo.normalizedPosition * w;
        let nearest = 0, bestD = Infinity;
        for (let i = 0; i < this._nodes.length; i++) {
            const d = Math.abs(this._nodes[i].x - targetX);
            if (d < bestD) { bestD = d; nearest = i; }
        }
        this._nodes[nearest].energy = noteInfo.velocity;

        // Send signals from this node along all its edges
        for (const e of this._edges) {
            if (e.i === nearest || e.j === nearest) {
                this._signals.push({
                    edgeIdx:   this._edges.indexOf(e),
                    progress:  0,
                    vel:       noteInfo.velocity,
                    forward:   e.i === nearest,
                    life:      1.0,
                    hue:       noteInfo.normalizedPosition * 360,
                });
            }
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, Number(mathEngine.get('complexity')) || 0);

        const hue        = Number(mathEngine.get('colorHue'))   || 0;
        const intensity  = Number(mathEngine.get('intensity'))  || 0.5;
        const speed      = Number(mathEngine.get('speed'))      || 1.0;
        const energy     = Number(this.mathInstance.energy)     || 0;

        ctx.fillStyle = `rgba(0,1,3,${0.10 + (1-intensity)*0.06})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Update node energy decay
        for (const n of this._nodes) {
            n.energy *= Math.pow(0.92, dt * 60);
        }

        // Ambient random signal
        if (Math.random() < 0.04 + energy * 0.08) {
            const ri = Math.floor(Math.random() * this._edges.length);
            this._signals.push({
                edgeIdx: ri, progress: 0, vel: 0.2 + Math.random() * 0.4,
                forward: Math.random() < 0.5, life: 0.5 + Math.random() * 0.5,
                hue: (hue + Math.random() * 120) % 360,
            });
        }

        // Draw edges (base connections)
        for (const e of this._edges) {
            const a = this._nodes[e.i], b = this._nodes[e.j];
            const eBoost = (a.energy + b.energy) * 0.5;
            const alpha  = (0.04 + eBoost * 0.15 + energy * 0.04) * (0.4 + intensity * 0.4);
            const eHue   = (hue + e.hueOff) % 360;
            ctx.strokeStyle = `hsla(${eHue}, 70%, 40%, ${alpha})`;
            ctx.lineWidth   = 0.5 + eBoost * 1.5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // Update and draw signals
        this._signals = this._signals.filter(s => s.life > 0.01 && s.progress <= 1.0);
        for (const sig of this._signals) {
            sig.progress += sig.vel * speed * dt * 1.5;
            sig.life     -= dt * 0.3;

            if (sig.progress >= 1.0) {
                // Activate destination node and cascade
                const e = this._edges[sig.edgeIdx];
                if (!e) continue;
                const destIdx = sig.forward ? e.j : e.i;
                const dest = this._nodes[destIdx];
                if (dest && sig.vel > 0.3) {
                    dest.energy = Math.min(1.0, dest.energy + sig.vel * 0.6);
                    // Cascade to one random neighbor
                    const outEdges = this._edges.filter((oe, oi) =>
                        (oe.i === destIdx || oe.j === destIdx) && oi !== sig.edgeIdx
                    );
                    if (outEdges.length && sig.vel > 0.4) {
                        const next = outEdges[Math.floor(Math.random() * outEdges.length)];
                        this._signals.push({
                            edgeIdx:  this._edges.indexOf(next),
                            progress: 0, vel: sig.vel * 0.7,
                            forward:  next.i === destIdx, life: sig.life * 0.8,
                            hue: sig.hue,
                        });
                    }
                }
                continue;
            }

            const e = this._edges[sig.edgeIdx];
            if (!e) continue;
            const a = this._nodes[e.i], b = this._nodes[e.j];
            const t  = sig.forward ? sig.progress : 1 - sig.progress;
            const sx = a.x + (b.x - a.x) * t;
            const sy = a.y + (b.y - a.y) * t;
            const sHue  = (sig.hue) % 360;
            const alpha = sig.life * sig.vel * 0.8 * intensity;

            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10 + sig.vel * 12);
            sg.addColorStop(0, `hsla(${sHue},100%,95%,${alpha})`);
            sg.addColorStop(0.4, `hsla(${sHue},100%,70%,${alpha*0.4})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(sx, sy, 10+sig.vel*12, 0, Math.PI*2); ctx.fill();
        }

        // Draw nodes
        for (const n of this._nodes) {
            const tw    = 0.5 + 0.5 * Math.sin(this.time * 1.5 + n.phase);
            const nHue  = (hue + n.hueOff) % 360;
            const boost = n.energy;
            const nR    = n.r * (1 + boost * 2) * (n.type === 'hub' ? 1.8 : 1.0);
            const alpha = (0.3 + tw * 0.3 + boost * 0.5) * (0.4 + intensity * 0.4) * (0.5 + energy * 0.5);

            if (n.type === 'hub' || boost > 0.2) {
                const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, nR * 5);
                ng.addColorStop(0, `hsla(${nHue},100%,80%,${alpha*0.6})`);
                ng.addColorStop(1, 'transparent');
                ctx.fillStyle = ng;
                ctx.beginPath(); ctx.arc(n.x, n.y, nR*5, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = `hsla(${nHue}, 80%, ${60+boost*30}%, ${alpha})`;
            ctx.beginPath(); ctx.arc(n.x, n.y, nR, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
