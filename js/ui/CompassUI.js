/**
 * CompassUI — A tactile, directional navigator for Harmonia's 48-mode ecosystem.
 * Instead of scrolling a list, users can "tilt" toward a mood quadrant 
 * to filter and select modes instantly.
 */
export class CompassUI {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.isVisible = false;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 120;
        this.mousePos = { x: 0, y: 0 };
        this.angle = 0;
        this.activeQuadrant = -1;

        this.quadrants = [
            { id: 'north', label: 'CYBER / DREAM', color: '#00f2ff' }, // Kinetic/Synthetic
            { id: 'east',  label: 'GEOMETRIC',   color: '#ff00ff' }, // Structure
            { id: 'south', label: 'ORGANIC',     color: '#00ffaa' }, // Calm/Fluid
            { id: 'west',  label: 'CLASSIC',     color: '#ffaa00' }  // Known favorites
        ];
    }

    /**
     * Show the compass at a specific position (usually mouse click)
     */
    show(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.mousePos = { x, y };
        this.isVisible = true;
    }

    hide() {
        this.isVisible = false;
        this.activeQuadrant = -1;
    }

    update(mouseX, mouseY) {
        if (!this.isVisible) return;
        
        this.mousePos.x = mouseX;
        this.mousePos.y = mouseY;

        const dx = mouseX - this.centerX;
        const dy = mouseY - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 20) {
            // Calculate angle in 0..2PI
            this.angle = Math.atan2(dy, dx) + Math.PI / 2;
            if (this.angle < 0) this.angle += Math.PI * 2;

            // Determine quadrant (0=N, 1=E, 2=S, 3=W)
            const q = Math.floor(((this.angle + Math.PI/4) % (Math.PI * 2)) / (Math.PI/2));
            this.activeQuadrant = q;
        } else {
            this.activeQuadrant = -1;
        }
    }

    render(ctx) {
        if (!this.isVisible) return;

        const { centerX, centerY, radius, activeQuadrant } = this;
        const hue = this.math.get('colorHue');

        ctx.save();
        
        // Draw main ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw quadrants
        for (let i = 0; i < 4; i++) {
            const startAngle = (i * Math.PI / 2) - Math.PI / 2 - Math.PI / 4;
            const endAngle = startAngle + Math.PI / 2;
            const isActive = activeQuadrant === i;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.strokeStyle = isActive ? this.quadrants[i].color : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = isActive ? 8 : 4;
            ctx.stroke();

            // Label
            const textAngle = startAngle + Math.PI / 4;
            const tx = centerX + Math.cos(textAngle) * (radius + 25);
            const ty = centerY + Math.sin(textAngle) * (radius + 25);
            
            ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${isActive ? 'bold' : ''} 10px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.quadrants[i].label, tx, ty);
        }

        // Center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Returns the currently highlighted category ID
     */
    getActiveCategory() {
        if (this.activeQuadrant === -1) return null;
        return this.quadrants[this.activeQuadrant].id;
    }
}
