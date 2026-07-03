import { PhysicsCore } from './PhysicsCore.js';

/**
 * CircuitMath — Simulates a digital logical network.
 * A graph of "Nodes" and "Traces" that carry logical signals.
 * MIDI notes act as high-frequency 'Input Pins', triggering 
 * current flows through the grid.
 */
export class CircuitMath {
    constructor() {
        this.nodes = []; // Points of logic
        this.traces = []; // Connections
        this.packets = []; // Moving logic signals
        this.reset();
    }

    /**
     * Initial PCB layout.
     */
    reset() {
        this.nodes = [];
        this.traces = [];
        this.packets = [];

        // 1. Create a structured grid of nodes
        const gridSize = 100;
        for (let x = 100; x <= 700; x += gridSize) {
            for (let y = 100; y <= 500; y += gridSize) {
                this.nodes.push({
                    x, y, 
                    active: 0,
                    id: this.nodes.length
                });
            }
        }

        // 2. Connect nodes logically (Orthogonal traces)
        for (const n1 of this.nodes) {
            for (const n2 of this.nodes) {
                if (n1 === n2) continue;
                const dx = Math.abs(n1.x - n2.x);
                const dy = Math.abs(n1.y - n2.y);
                
                // Only connect neighbors
                if ((dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize)) {
                    if (!this._traceExists(n1, n2)) {
                        this.traces.push({ n1, n2, active: 0 });
                    }
                }
            }
        }
    }

    _traceExists(n1, n2) {
        return this.traces.some(t => (t.n1 === n1 && t.n2 === n2) || (t.n1 === n2 && t.n2 === n1));
    }

    /**
     * Update the logical flow.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');

        // 1. Input Logic from MIDI
        for (const n of this.nodes) {
            n.active *= 0.85; // Decay
            for (const note of notes) {
                const distSq = (n.x - note.x)**2 + (n.y - note.y)**2;
                if (distSq < 2500) {
                    n.active = 1.0;
                    // Spawn a 'Data Packet' if intensity and complexity allow
                    if (Math.random() < 0.1 + intensity * 0.2) {
                        this._spawnPacket(n);
                    }
                }
            }
        }

        // 2. Update Packet Propagation
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const p = this.packets[i];
            
            // Move along the trace
            p.t += dt * (1.0 + complexity * 2.0);
            
            if (p.t >= 1.0) {
                // Packet reached target node
                p.target.active = 1.0;
                
                // Chance to bifurcate or continue
                if (Math.random() < 0.3 + intensity * 0.4 && p.life > 0) {
                    this._spawnPacket(p.target, p.life - 1);
                }
                this.packets.splice(i, 1);
            }
        }

        // 3. Update Trace activity based on neighbors
        for (const t of this.traces) {
            t.active = (t.n1.active + t.n2.active) * 0.5;
        }
    }

    _spawnPacket(startNode, life = 3) {
        // Find outgoing traces
        const connections = this.traces.filter(t => t.n1 === startNode || t.n2 === startNode);
        if (connections.length === 0) return;

        const trace = connections[Math.floor(Math.random() * connections.length)];
        const target = trace.n1 === startNode ? trace.n2 : trace.n1;

        this.packets.push({
            start: startNode,
            target,
            t: 0,
            life
        });
    }
}
