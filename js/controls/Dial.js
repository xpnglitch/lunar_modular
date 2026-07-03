/**
 * Dial — The radial controller
 * One gesture morphs everything: sound, color, motion, complexity.
 * Maps to the MathEngine's parameter vector.
 */
export class Dial {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.value = 0.3; // Starting dial position
        this.targetValue = 0.3;
        this.isDragging = false;
        this.dragStartY = 0;         // Y position when drag started
        this.dragStartValue = 0;     // Value when drag started
        this.sensitivity = 0.003;    // How fast the dial moves per pixel dragged
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 60;
        this.glowIntensity = 0;
        this.hoverGlow = 0;
        this.isHovering = false;

        // Initial param set
        this.math.setDialValue(this.value);
    }

    /**
     * Handle pointer events — VERTICAL DRAG style (like DAW knobs)
     * Click on dial, drag UP to increase, drag DOWN to decrease.
     */
    onPointerDown(x, y) {
        const dist = Math.hypot(x - this.centerX, y - this.centerY);
        if (dist < this.radius * 2.5) {
            this.isDragging = true;
            this.dragStartY = y;
            this.dragStartValue = this.targetValue;
            return true;
        }
        return false;
    }

    onPointerMove(x, y) {
        // Check hover state
        const dist = Math.hypot(x - this.centerX, y - this.centerY);
        this.isHovering = dist < this.radius * 2.5;

        if (!this.isDragging) return;

        // Vertical drag: up = increase, down = decrease
        const deltaY = this.dragStartY - y; // Positive = dragged up
        const deltaValue = deltaY * this.sensitivity;
        this.targetValue = Math.max(0, Math.min(1, this.dragStartValue + deltaValue));
    }

    onPointerUp() {
        this.isDragging = false;
    }

    /**
     * Handle scroll wheel on the dial
     */
    onWheel(x, y, deltaY) {
        const dist = Math.hypot(x - this.centerX, y - this.centerY);
        if (dist < this.radius * 2.5) {
            // Scroll up = increase, scroll down = decrease
            this.targetValue = Math.max(0, Math.min(1, this.targetValue - deltaY * 0.001));
            return true;
        }
        return false;
    }

    /**
     * Update dial state (called each frame)
     */
    update(dt) {
        // Smooth the dial value
        this.value += (this.targetValue - this.value) * 0.12;
        this.math.setDialValue(this.value);

        // Glow pulses with note activity
        const noteGlow = this.math.noteCount > 0 ? 0.5 + Math.sin(Date.now() * 0.003) * 0.2 : 0;
        this.glowIntensity += (noteGlow - this.glowIntensity) * 0.1;

        // Hover glow
        const hoverTarget = this.isHovering || this.isDragging ? 0.3 : 0;
        this.hoverGlow += (hoverTarget - this.hoverGlow) * 0.15;
    }

    /**
     * Render the dial
     */
    render(ctx, w, h, mathEngine) {
        this.centerX = w / 2;
        this.centerY = h / 2;

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const noteCount = mathEngine.noteCount;

        // Outer glow ring
        const glowAlpha = 0.1 + this.glowIntensity * 0.3 + this.hoverGlow;
        if (glowAlpha > 0.05) {
            const gradient = ctx.createRadialGradient(
                this.centerX, this.centerY, this.radius * 0.5,
                this.centerX, this.centerY, this.radius * 2.5
            );
            gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${glowAlpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.radius * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Main ring
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${0.15 + glowAlpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Background arc (full range, dim)
        const startAngle = -Math.PI * 0.75;
        const fullEndAngle = startAngle + Math.PI * 1.5;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, startAngle, fullEndAngle);
        ctx.strokeStyle = `hsla(${hue}, 30%, 30%, 0.15)`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Progress arc (shows dial value)
        const endAngle = startAngle + this.value * Math.PI * 1.5;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${0.5 + this.glowIntensity * 0.4})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Dial indicator dot
        const dotX = this.centerX + Math.cos(endAngle) * this.radius;
        const dotY = this.centerY + Math.sin(endAngle) * this.radius;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 75%, 0.9)`;
        ctx.fill();
        // Dot glow
        ctx.beginPath();
        ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 75%, 0.15)`;
        ctx.fill();

        // Center label: show percentage
        ctx.fillStyle = `hsla(${hue}, 40%, 70%, ${0.3 + this.hoverGlow})`;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(this.value * 100)}%`, this.centerX, this.centerY);

        // "Drag ↕" hint when hovering
        if (this.isHovering && !this.isDragging && this.hoverGlow > 0.1) {
            ctx.fillStyle = `hsla(${hue}, 30%, 60%, ${this.hoverGlow * 0.6})`;
            ctx.font = '9px Inter, sans-serif';
            ctx.fillText('drag ↕', this.centerX, this.centerY + 18);
        }
    }
}
