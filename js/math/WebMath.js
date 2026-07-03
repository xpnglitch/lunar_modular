/**
 * WebMath — Neural Synapse Lattice Physics
 * Simulates a complex network of interconnected nodes (neurons).
 * Signals propagate between nodes on musical triggers.
 */
export class WebMath {
    constructor() {
        this.nodes = [];
        this.synapses = [];
        this.signalPulses = [];
        this.time = 0;
        this.energy = 0;
        this.initialized = false;
    }

    /**
     * Initialize a stable lattice of neurons.
     */
    initLattice(count) {
        this.nodes = [];
        this.synapses = [];
        this.signalPulses = [];
        
        // Poisson-ish distribution for organic look
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.01,
                vy: (Math.random() - 0.5) * 0.01,
                anchorX: 0, 
                anchorY: 0,
                firing: 0,  // 0-1 brightness
                refractory: 0,
                hue: Math.random() * 60 - 30, // Local hue variance
                neighbors: []
            });
            this.nodes[i].anchorX = this.nodes[i].x;
            this.nodes[i].anchorY = this.nodes[i].y;
        }

        // Connect nearby nodes into synapses
        const connectDist = 0.18;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
                if (d < connectDist) {
                    const synapse = { a: i, b: j, weight: 0.1 + Math.random() * 0.9, activity: 0 };
                    this.synapses.push(synapse);
                    n1.neighbors.push({ nodeIdx: j, synapse });
                    n2.neighbors.push({ nodeIdx: i, synapse });
                }
            }
        }
        this.initialized = true;
    }

    /**
     * Trigger a node ignition from a musical note.
     */
    addPulse(x, vel) {
        this.energy = Math.min(1.5, this.energy + vel * 0.5);
        
        // Find nearest node to the note position
        let bestDist = Infinity;
        let bestNode = null;
        for (let n of this.nodes) {
            const d = Math.abs(n.x - x);
            if (d < bestDist) {
                bestDist = d;
                bestNode = n;
            }
        }

        if (bestNode) {
            this._fireNode(bestNode, vel, 0);
        }
    }

    _fireNode(node, intensity, depth) {
        if (node.firing > 0.5 || depth > 5) return; // Prevent infinite feedback/flooding
        
        node.firing = intensity;
        node.refractory = 1.0;

        // Propagate to neighbors
        for (let edge of node.neighbors) {
            if (Math.random() < 0.7) { // Partial propagation for organic feel
                this.signalPulses.push({
                    from: node,
                    to: this.nodes[edge.nodeIdx],
                    synapse: edge.synapse,
                    progress: 0,
                    speed: 2.0 + intensity * 3.0,
                    intensity: intensity * 0.8
                });
            }
        }
    }

    step(dt, complexity, speed, lightPressure) {
        if (!this.initialized || this.nodes.length < 10) {
            this.initLattice(Math.floor(40 + complexity * 60));
        }

        this.time += dt;
        this.energy *= 0.95;

        // 1. Organic Brownian Drift
        for (let n of this.nodes) {
            n.vx += (Math.random() - 0.5) * 0.005 * speed;
            n.vy += (Math.random() - 0.5) * 0.005 * speed;
            
            // Interaction with light pressure
            if (lightPressure.force > 0) {
                const dx = lightPressure.x - n.x;
                const dy = lightPressure.y - n.y;
                const d = Math.hypot(dx, dy);
                if (d < 0.3) {
                    n.vx += dx * lightPressure.force * 0.1;
                    n.vy += dy * lightPressure.force * 0.1;
                }
            }

            // Spring back to anchor
            n.vx += (n.anchorX - n.x) * 0.1;
            n.vy += (n.anchorY - n.y) * 0.1;

            n.x += n.vx * dt;
            n.y += n.vy * dt;
            n.vx *= 0.9; n.vy *= 0.9;

            // Decay firing state
            n.firing *= 0.92;
            n.refractory *= 0.95;
        }

        // 2. Signal Propagation
        for (let i = this.signalPulses.length - 1; i >= 0; i--) {
            const p = this.signalPulses[i];
            p.progress += dt * p.speed;
            p.synapse.activity = Math.max(p.synapse.activity, (1.0 - Math.abs(p.progress - 0.5) * 2) * p.intensity);

            if (p.progress >= 1.0) {
                // Reach destination node and potentially trigger it
                if (p.to.refractory < 0.2) {
                    this._fireNode(p.to, p.intensity * 0.9, 1);
                }
                this.signalPulses.splice(i, 1);
            }
        }

        // Decay synapse activity
        for (let s of this.synapses) {
            s.activity *= 0.9;
        }
    }

    getAudioModulation() {
        return {
            cutoff: 0.2 + this.energy * 0.5,
            resonance: 0.5 + this.energy * 1.5
        };
    }
}
