import { VoxelsMath } from '../math/VoxelsMath.js';
import { PerspectiveCore } from '../math/PerspectiveCore.js';

/**
 * VoxelsMode — High-fidelity 3D Voxel Terrain.
 * 
 * Properly shaded isometric cubes with lit faces, depth fog,
 * neon edge glow, and ground-plane grid. Each note spawns or
 * activates voxel columns that pulse with energy.
 */
export class VoxelsMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.voxelsMath = new VoxelsMath();
    }

    resize(w, h) {
        this.voxelsMath.reset();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.voxelsMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;

        const voxels = this.voxelsMath.voxels;
        const screenFov = Math.min(w, h) * 1.4;

        const projOpts = {
            fov: screenFov,
            center: { x: w / 2, y: h / 2 + h * 0.12 },
            depthOffset: screenFov * 0.18 + complexity * screenFov * 0.10
        };

        // Project and sort
        const projected = voxels.map(v => {
            const p = PerspectiveCore.project(
                { x: v.wx, y: -v.wy * (0.3 + intensity * 4.0), z: v.wz },
                projOpts
            );
            return { ...p, hue: v.hue, wy: v.wy };
        }).filter(p => p.scale > 0.01);

        PerspectiveCore.zSort(projected);

        // --- LAYER 1: Ground plane grid ---
        ctx.globalCompositeOperation = 'lighter';
        const gridLines = 12 + Math.floor(complexity * 8);
        const gridSpread = screenFov * 1.5;
        const gridAlpha = 0.03 + intensity * 0.04;
        ctx.strokeStyle = `hsla(${hue}, 40%, 40%, ${gridAlpha})`;
        ctx.lineWidth = 0.5;

        for (let i = -gridLines; i <= gridLines; i++) {
            const offset = (i / gridLines) * gridSpread;
            // Lines along Z (converge to center)
            const p1 = PerspectiveCore.project({ x: offset, y: 0, z: -gridSpread }, projOpts);
            const p2 = PerspectiveCore.project({ x: offset, y: 0, z: gridSpread }, projOpts);
            if (p1.scale > 0 && p2.scale > 0) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            // Lines along X
            const p3 = PerspectiveCore.project({ x: -gridSpread, y: 0, z: offset }, projOpts);
            const p4 = PerspectiveCore.project({ x: gridSpread, y: 0, z: offset }, projOpts);
            if (p3.scale > 0 && p4.scale > 0) {
                ctx.beginPath();
                ctx.moveTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.stroke();
            }
        }

        // --- LAYER 2: Voxel cubes ---
        for (const p of projected) {
            const fog = Math.max(0, 1.0 - p.z / (screenFov * 3));
            const alpha = fog * (0.3 + intensity * 0.7);
            if (alpha < 0.03) continue;

            const pHue = (hue + p.hue * 0.5) % 360;
            const cubeSize = 46 * p.scale;
            if (cubeSize < 2) continue;

            const cx = p.x;
            const cy = p.y;

            // Isometric offsets
            const isoX = cubeSize;
            const isoY = cubeSize * 0.5;

            // --- Filled faces with directional shading ---
            // Top face (brightest)
            ctx.beginPath();
            ctx.moveTo(cx, cy - isoY);
            ctx.lineTo(cx + isoX, cy);
            ctx.lineTo(cx, cy + isoY);
            ctx.lineTo(cx - isoX, cy);
            ctx.closePath();
            ctx.fillStyle = `hsla(${pHue}, 80%, ${55 + intensity * 20}%, ${alpha * 0.5})`;
            ctx.fill();

            // Left face (medium)
            ctx.beginPath();
            ctx.moveTo(cx - isoX, cy);
            ctx.lineTo(cx, cy + isoY);
            ctx.lineTo(cx, cy + isoY + cubeSize * 0.6);
            ctx.lineTo(cx - isoX, cy + cubeSize * 0.6);
            ctx.closePath();
            ctx.fillStyle = `hsla(${pHue}, 70%, ${35 + intensity * 15}%, ${alpha * 0.4})`;
            ctx.fill();

            // Right face (darkest)
            ctx.beginPath();
            ctx.moveTo(cx + isoX, cy);
            ctx.lineTo(cx, cy + isoY);
            ctx.lineTo(cx, cy + isoY + cubeSize * 0.6);
            ctx.lineTo(cx + isoX, cy + cubeSize * 0.6);
            ctx.closePath();
            ctx.fillStyle = `hsla(${pHue}, 60%, ${25 + intensity * 10}%, ${alpha * 0.35})`;
            ctx.fill();

            // --- Neon wireframe edges ---
            const edgeAlpha = alpha * 0.6;
            ctx.strokeStyle = `hsla(${pHue}, 90%, 75%, ${edgeAlpha})`;
            ctx.lineWidth = 0.8;

            // Top face outline
            ctx.beginPath();
            ctx.moveTo(cx, cy - isoY);
            ctx.lineTo(cx + isoX, cy);
            ctx.lineTo(cx, cy + isoY);
            ctx.lineTo(cx - isoX, cy);
            ctx.closePath();
            ctx.stroke();

            // Vertical edges
            ctx.beginPath();
            ctx.moveTo(cx - isoX, cy);
            ctx.lineTo(cx - isoX, cy + cubeSize * 0.6);
            ctx.moveTo(cx + isoX, cy);
            ctx.lineTo(cx + isoX, cy + cubeSize * 0.6);
            ctx.moveTo(cx, cy + isoY);
            ctx.lineTo(cx, cy + isoY + cubeSize * 0.6);
            ctx.stroke();

            // Glow halo for nearby/active cubes
            if (fog > 0.5 && cubeSize > 5) {
                const glowR = cubeSize * 2;
                const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
                glowGrad.addColorStop(0, `hsla(${pHue}, 80%, 60%, ${alpha * 0.08})`);
                glowGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- LAYER 3: Ambient fog at depth ---
        const fogGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
        fogGrad.addColorStop(0, 'transparent');
        fogGrad.addColorStop(0.7, `hsla(${hue}, 30%, 20%, ${0.02 + intensity * 0.03})`);
        fogGrad.addColorStop(1, `hsla(${hue}, 20%, 10%, ${0.05 + intensity * 0.05})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'source-over';
    }

    getAudioModulation() {
        return {
            harmonicity: 1.0 + this.math.get('intensity') * 3.0,
            feedback: 0.2 + this.math.get('complexity') * 0.6
        };
    }
}
