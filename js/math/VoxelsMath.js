import { PerspectiveCore } from './PerspectiveCore.js';

/**
 * VoxelsMath — Simulates a dynamic 3D voxel landscape.
 * A 2D grid of 'pillars' that rise and fall based on MIDI activity 
 * and spectral frequency mapping.
 */
export class VoxelsMath {
    constructor() {
        this.gridSize = 25; // 25x25 grid = 625 voxels
        this.voxels = []; // Array of {x, y, z, targetY, lastY}
        this.reset();
    }

    /**
     * Rebuild the voxel grid.
     */
    reset() {
        this.voxels = [];
        const spacing = 45;
        const halfSize = (this.gridSize * spacing) / 2;

        for (let z = 0; z < this.gridSize; z++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.voxels.push({
                    // World coordinates (Y is up, Z is depth)
                    wx: x * spacing - halfSize,
                    wy: 0,
                    wz: z * spacing - halfSize,
                    targetY: 0,
                    hue: 0
                });
            }
        }
    }

    /**
     * Procedural terrain step.
     */
    step(mathEngine, dt) {
        const notes = mathEngine.getActiveNotes();
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        for (const v of this.voxels) {
            // 1. Ambient Undulation (Sin waves)
            const ambient = Math.sin(v.wx * 0.01 + time) * 20 + 
                            Math.cos(v.wz * 0.01 - time * 0.7) * 20;
            
            // 2. MIDI Note Reaction
            let noteReaction = 0;
            for (const note of notes) {
                // Distance in XZ plane
                const dx = v.wx - (note.x - 400); 
                const dz = v.wz - (note.y - 300);
                const distSq = dx * dx + dz * dz;
                const range = 150 + note.velocity * 300;
                
                if (distSq < range * range) {
                    const impact = (1.0 - Math.sqrt(distSq) / range) * 150 * note.velocity;
                    noteReaction += impact;
                }
            }

            // Target height combines base and notes
            v.targetY = ambient + noteReaction * intensity;
            
            // Smooth interpolation (Inertia)
            const inertia = 0.08 + complexity * 0.12;
            v.wy += (v.targetY - v.wy) * inertia;
            
            // Color based on height and time
            v.hue = (v.wy * 0.5 + time * 20) % 360;
        }
    }
}
