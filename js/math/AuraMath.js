import { PhysicsCore } from './PhysicsCore.js';

/**
 * AuraMath — Simulates magnetic field lines and atmospheric aurorae.
 * Tracks a series of undulating 'curtains' (bezier points) that 
 * shimmer and shift based on high-frequency spectral wind.
 */
export class AuraMath {
    constructor() {
        this.ribbons = [];
        this.numRibbons = 6;
        this.numPointsPerRibbon = 30; // High-res curvature
        this.reset();
    }

    /**
     * Initial aurora state.
     */
    reset(w = 800, h = 600) {
        this.ribbons = [];
        for (let r = 0; r < this.numRibbons; r++) {
            const points = [];
            const xOffset = (r / (this.numRibbons - 1)) * w;
            const seed = Math.random() * 1000;
            
            for (let i = 0; i < this.numPointsPerRibbon; i++) {
                const y = (i / (this.numPointsPerRibbon - 1)) * h;
                points.push({
                    ox: xOffset, oy: y,
                    x: xOffset, y: y,
                    vx: 0, vy: 0,
                    seed: seed + i * 0.1
                });
            }
            this.ribbons.push({ points, speed: 0.5 + Math.random(), offset: Math.random() * Math.PI * 2 });
        }
    }

    /**
     * Magnetosphere update cycle.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        for (const r of this.ribbons) {
            const rTime = time * r.speed;

            for (let i = 0; i < r.points.length; i++) {
                const p = r.points[i];

                // 1. Auroral Winds (Low-frequency oscillation)
                const windX = Math.sin(p.seed + rTime) * 80 * complexity;
                const windY = Math.cos(p.seed * 0.5 + rTime * 0.8) * 40 * intensity;

                // 2. Note Modulation (Spectral shimmer)
                let spectralShift = 0;
                for (const note of notes) {
                    const distSq = (p.ox - note.x)**2 + (p.oy - note.y)**2;
                    const range = 200 + note.velocity * 300;
                    if (distSq < range * range) {
                        spectralShift += (1.0 - Math.sqrt(distSq) / range) * 40 * note.velocity;
                    }
                }

                // Apply displacement
                p.x = p.ox + windX + spectralShift;
                p.y = p.oy + windY;
            }
        }
    }
}
