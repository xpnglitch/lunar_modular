import { GlitchGridMath } from '../math/GlitchGridMath.js';

/**
 * GlitchGridMode — Grid distortion with RGB channel splitting.
 * 
 * A mosaic of tiles that warp, shift, and split into RGB channels.
 * Combines datamosh aesthetics with structured grid patterns.
 * Notes trigger localized glitch bursts with tile displacement.
 */
export class GlitchGridMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new GlitchGridMath();
        this.glitches = [];
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.glitches.push({
            x: noteInfo.normalizedPosition,
            y: 0.2 + Math.random() * 0.6,
            radius: 0.05 + noteInfo.velocity * 0.15,
            energy: noteInfo.velocity,
            life: 1.0,
            type: Math.floor(Math.random() * 3) // 0=shift, 1=invert, 2=corrupt
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

        const tileSize = Math.max(8, Math.floor(50 - complexity * 38));
        const cols = Math.ceil(w / tileSize);
        const rows = Math.ceil(h / tileSize);

        // Update glitches
        for (let i = this.glitches.length - 1; i >= 0; i--) {
            this.glitches[i].life -= dt * 1.5;
            if (this.glitches[i].life <= 0) this.glitches.splice(i, 1);
        }

        // Render tiles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const nx = col / cols;
                const ny = row / rows;
                let ox = 0, oy = 0;
                let tileHue = hue + Math.sin(nx * 4 + t * speed * 0.2) * 30 +
                    Math.cos(ny * 6 + t * speed * 0.15) * 20;
                let tileSat = 40 + intensity * 40;
                let tileLight = 10 + Math.sin(nx * 8 + ny * 5 + t * 0.3) * 15 + 10;
                let tileAlpha = 0.8;
                let rgbSplit = false;

                // Glitch influence
                for (const g of this.glitches) {
                    const dx = nx - g.x;
                    const dy = ny - g.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < g.radius) {
                        const influence = (1 - dist / g.radius) * g.energy * g.life;
                        if (g.type === 0) {
                            // Shift - displace tiles
                            ox = (Math.random() - 0.5) * tileSize * 4 * influence;
                            oy = (Math.random() - 0.5) * tileSize * 2 * influence;
                        } else if (g.type === 1) {
                            // Invert colors
                            tileLight = 90 - tileLight;
                            tileSat = 100;
                            tileHue += 180;
                        } else {
                            // Corrupt - RGB split
                            rgbSplit = true;
                            tileLight += influence * 30;
                        }
                    }
                }

                // Ambient wave distortion
                const waveOx = Math.sin(ny * 10 + t * speed) * energy * 5;
                ox += waveOx;

                const x = col * tileSize + ox;
                const y = row * tileSize + oy;

                if (rgbSplit) {
                    // Draw RGB channels offset
                    ctx.globalAlpha = 0.6;
                    ctx.fillStyle = `hsla(0, 100%, ${tileLight}%, 0.6)`;
                    ctx.fillRect(x - 3, y, tileSize - 1, tileSize - 1);
                    ctx.fillStyle = `hsla(120, 100%, ${tileLight}%, 0.6)`;
                    ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
                    ctx.fillStyle = `hsla(240, 100%, ${tileLight}%, 0.6)`;
                    ctx.fillRect(x + 3, y, tileSize - 1, tileSize - 1);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = `hsla(${tileHue}, ${tileSat}%, ${tileLight}%, ${tileAlpha})`;
                    ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
                }
            }
        }

        // Horizontal glitch bands
        const bandCount = Math.floor(energy * 5);
        for (let b = 0; b < bandCount; b++) {
            const by = Math.random() * h;
            const bh = 2 + Math.random() * 8;
            const box = (Math.random() - 0.5) * 30 * energy;
            ctx.drawImage(ctx.canvas, 0, by, w, bh, box, by, w, bh);
        }

        // Scanline overlay
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let y = 0; y < h; y += 2) {
            ctx.fillRect(0, y, w, 1);
        }

        // Global RGB fringe on high energy
        if (energy > 0.4) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = energy * 0.04;
            ctx.drawImage(ctx.canvas, 2, 0);
            ctx.drawImage(ctx.canvas, -2, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
