import { BitCrushMath } from '../math/BitCrushMath.js';

/**
 * BitCrushMode — Pixelated mosaic with shifting bit-depth.
 * 
 * The screen is divided into a grid of color blocks that shift
 * and quantize. Lower complexity = larger blocks (lower "bit depth").
 * Notes trigger ripple waves of color change through the grid.
 */
export class BitCrushMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new BitCrushMath();
        this.grid = [];
        this.ripples = [];
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.ripples.push({
            x: noteInfo.normalizedPosition,
            y: 0.3 + Math.random() * 0.4,
            radius: 0,
            speed: 0.3 + noteInfo.velocity * 0.5,
            energy: noteInfo.velocity,
            hue: Math.random() * 360,
            life: 1.0
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;
        const t = this.time;

        // Block size inversely related to complexity (low complexity = big chunky blocks)
        const blockSize = Math.max(4, Math.floor(60 - complexity * 50));
        const cols = Math.ceil(w / blockSize);
        const rows = Math.ceil(h / blockSize);

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed * dt;
            r.life -= dt * 0.4;
            if (r.life <= 0 || r.radius > 2) {
                this.ripples.splice(i, 1);
            }
        }

        // Render grid
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const nx = col / cols;
                const ny = row / rows;

                // Base color from noise-like pattern
                let cellHue = hue + Math.sin(nx * 5 + t * speed * 0.3) * 40 +
                    Math.cos(ny * 7 + t * speed * 0.2) * 30;
                let cellLight = 15 + Math.sin(nx * 3 + ny * 4 + t * 0.5) * 10;
                let cellSat = 50 + intensity * 40;
                let cellAlpha = 0.7;

                // Ripple influence
                for (const r of this.ripples) {
                    const dx = nx - r.x;
                    const dy = ny - r.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const ringDist = Math.abs(dist - r.radius);
                    if (ringDist < 0.08) {
                        const rippleInfluence = (1 - ringDist / 0.08) * r.energy * r.life;
                        cellHue = r.hue + rippleInfluence * 60;
                        cellLight += rippleInfluence * 40;
                        cellSat = 80 + rippleInfluence * 20;
                        cellAlpha = Math.min(1, cellAlpha + rippleInfluence * 0.3);
                    }
                }

                // Quantize colors (bit crush effect)
                const levels = 4 + Math.floor(complexity * 12);
                cellHue = Math.round(cellHue / (360 / levels)) * (360 / levels);
                cellLight = Math.round(cellLight / (100 / levels)) * (100 / levels);

                // Glitch offset for some blocks
                let ox = 0, oy = 0;
                if (energy > 0.3 && Math.random() < energy * 0.1) {
                    ox = (Math.random() - 0.5) * blockSize * 2;
                    oy = (Math.random() - 0.5) * blockSize;
                }

                ctx.fillStyle = `hsla(${cellHue}, ${cellSat}%, ${cellLight}%, ${cellAlpha})`;
                ctx.fillRect(
                    col * blockSize + ox,
                    row * blockSize + oy,
                    blockSize - 1,
                    blockSize - 1
                );
            }
        }

        // CRT scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        for (let y = 0; y < h; y += 2) {
            ctx.fillRect(0, y, w, 1);
        }

        // Chromatic aberration border
        if (energy > 0.2) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255, 0, 0, ${energy * 0.03})`;
            ctx.fillRect(2, 0, w, h);
            ctx.fillStyle = `rgba(0, 0, 255, ${energy * 0.03})`;
            ctx.fillRect(-2, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
