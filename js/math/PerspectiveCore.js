/**
 * PerspectiveCore — Specialized tools for simulating 3D depth in 2D Canvas.
 * Used by 'Digital Dreams' modes (Voxels, CyberSpire, etc.) to ensure 
 * consistent vanishing points and high-performance depth sorting.
 */
export class PerspectiveCore {
    /**
     * Standard vanishing-point projection.
     * @param {Object} vertex {x, y, z} — World coordinates (Z=0 is the screen plane, positive is inward)
     * @param {Object} options {fov, center, tilt, roll}
     */
    static project(vertex, options = {}) {
        const fov = options.fov || 400;
        const center = options.center || { x: 400, y: 300 };
        
        // Z=0 is the screen. If Z goes too deep or too close, clamp to prevent distortion.
        const z = vertex.z + (options.depthOffset || 0);
        const perspective = fov / Math.max(1, fov + z);
        
        return {
            x: center.x + vertex.x * perspective,
            y: center.y + vertex.y * perspective,
            scale: perspective,
            z: z // Keep raw depth for Z-sorting
        };
    }

    /**
     * Painter's Algorithm: Sort entities by Z-depth (descending).
     * This ensures 'near' elements are drawn on top of 'far' ones.
     */
    static zSort(entities) {
        return entities.sort((a, b) => b.z - a.z);
    }

    /**
     * Perspective-Aware Line: Draws a line between two 3D vertices.
     */
    static line3D(ctx, v1, v2, options = {}) {
        const p1 = this.project(v1, options);
        const p2 = this.project(v2, options);
        
        // Don't draw if behind the camera
        if (p1.scale <= 0.05 || p2.scale <= 0.05) return;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    /**
     * Instanced Buffer Stamping: Use a pre-rendered offscreen buffer to draw
     * complex shapes (like 3D cubes/voxels) at varying scales.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLCanvasElement} buffer 
     * @param {number} x Screen X
     * @param {number} y Screen Y
     * @param {number} scale Perspective scale
     * @param {number} alpha Global alpha for depth-fog
     */
    static stamp(ctx, buffer, x, y, scale, alpha = 1.0) {
        if (scale <= 0.01) return;
        
        const w = buffer.width * scale;
        const h = buffer.height * scale;
        
        ctx.globalAlpha = alpha;
        ctx.drawImage(buffer, x - w / 2, y - h / 2, w, h);
    }
}
