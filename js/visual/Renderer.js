/**
 * Renderer — Canvas 2D rendering with trail effects
 * Manages the main canvas, render loop, and visual effects.
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.activeMode = null;
        this.trailOpacity = 0.06; // Lower = longer trails

        // Guard against negative radii (floating point rounding)
        const origArc = this.ctx.arc.bind(this.ctx);
        this.ctx.arc = function(x, y, radius, startAngle, endAngle, ccw) {
            origArc(x, y, Math.max(0, radius), startAngle, endAngle, ccw);
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Re-initialize active mode if it has a resize handler
        if (this.activeMode && this.activeMode.resize) {
            this.activeMode.resize(this.width, this.height);
        }
    }

    /**
     * Set the active visualization mode
     */
    setMode(mode) {
        this.activeMode = mode;
        if (mode.resize) {
            mode.resize(this.width, this.height);
        }
        // Clear canvas when switching modes
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Main render call (called from animation loop)
     */
    render(mathEngine, dt) {
        const ctx = this.ctx;

        // Full clear each frame (no ghosting trails)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.width, this.height);

        // Render the active mode
        if (this.activeMode) {
            this.activeMode.render(ctx, this.width, this.height, mathEngine, dt);
        }
    }

    /**
     * Get canvas for capture/recording
     */
    getCanvas() {
        return this.canvas;
    }
}
