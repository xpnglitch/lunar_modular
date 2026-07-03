import { PixelSortMath } from '../math/PixelSortMath.js';

/**
 * PixelSortMode — Glitch art pixel column sorting.
 * 
 * Generates a base image from noise/gradients, then "sorts" pixel
 * columns based on brightness thresholds, creating the signature
 * stretched/melted glitch art look. Notes trigger sort waves.
 */
export class PixelSortMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new PixelSortMath();
        this.buffer = null;
        this.bufCtx = null;
        this.sortWaves = [];
    }

    _initBuffer(w, h) {
        // Half resolution for performance
        this.fullW = w;
        this.fullH = h;
        this.bufW = Math.floor(w / 2);
        this.bufH = Math.floor(h / 2);
        this.buffer = document.createElement('canvas');
        this.buffer.width = this.bufW;
        this.buffer.height = this.bufH;
        this.bufCtx = this.buffer.getContext('2d');
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this._initBuffer(w, h);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.sortWaves.push({
            x: noteInfo.normalizedPosition,
            radius: 0,
            speed: 0.2 + noteInfo.velocity * 0.4,
            intensity: noteInfo.velocity,
            life: 1.0
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        if (!this.bufCtx || this.fullW !== w || this.fullH !== h) this._initBuffer(w, h);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;
        const t = this.time;

        const bw = this.bufW;
        const bh = this.bufH;

        // Generate base image at half resolution
        const bctx = this.bufCtx;
        const imgData = bctx.createImageData(bw, bh);
        const data = imgData.data;

        for (let y = 0; y < bh; y++) {
            for (let x = 0; x < bw; x++) {
                const nx = x / bw;
                const ny = y / bh;

                // Base gradient
                let r = Math.sin(nx * 3 + t * speed * 0.2) * 0.5 + 0.5;
                let g = Math.sin(ny * 4 + t * speed * 0.15 + 2) * 0.5 + 0.5;
                let b = Math.sin((nx + ny) * 2.5 + t * speed * 0.1 + 4) * 0.5 + 0.5;

                // Add noise texture
                const noise = this._hash(x * 0.01 + t * 0.1, y * 0.01);
                r += noise * 0.2;
                g += noise * 0.15;
                b += noise * 0.25;

                // Hue-shift the base
                const hueShift = hue / 360;
                const temp = r;
                r = r * (1 - hueShift) + b * hueShift;
                b = b * (1 - hueShift) + temp * hueShift;

                const idx = (y * w + x) * 4;
                data[idx] = Math.floor(Math.min(255, r * 200 + 30));
                data[idx + 1] = Math.floor(Math.min(255, g * 180 + 20));
                data[idx + 2] = Math.floor(Math.min(255, b * 220 + 20));
                data[idx + 3] = 255;
            }
        }

        // Apply pixel sorting effect
        // Sort columns within brightness threshold ranges
        const threshold = 0.3 + (1 - complexity) * 0.4;

        // Update sort waves
        for (let i = this.sortWaves.length - 1; i >= 0; i--) {
            this.sortWaves[i].radius += this.sortWaves[i].speed * dt;
            this.sortWaves[i].life -= dt * 0.5;
            if (this.sortWaves[i].life <= 0) this.sortWaves.splice(i, 1);
        }

        // Sort pixels in each column
        const sortStep = Math.max(2, Math.floor(4 - complexity * 2));
        for (let x = 0; x < bw; x += sortStep) {
            const nx = x / bw;

            // Calculate sort intensity for this column
            let sortForce = 0.1 + energy * 0.3;
            for (const wave of this.sortWaves) {
                const dist = Math.abs(nx - wave.x);
                if (dist < wave.radius + 0.1 && dist > wave.radius - 0.1) {
                    sortForce += wave.intensity * wave.life * (1 - Math.abs(dist - wave.radius) / 0.1);
                }
            }
            sortForce = Math.min(1, sortForce);

            if (sortForce < 0.15) continue;

            // Collect bright pixels in this column
            const pixels = [];
            for (let y = 0; y < bh; y++) {
                const idx = (y * bw + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 765;
                pixels.push({
                    r: data[idx], g: data[idx + 1], b: data[idx + 2],
                    brightness, y
                });
            }

            // Find spans above threshold and sort them
            let spanStart = -1;
            for (let y = 0; y <= bh; y++) {
                const bright = y < bh ? pixels[y].brightness : 0;
                if (bright > threshold && spanStart === -1) {
                    spanStart = y;
                } else if ((bright <= threshold || y === bh) && spanStart !== -1) {
                    // Sort this span by brightness (descending)
                    const span = pixels.slice(spanStart, y);
                    span.sort((a, b) => b.brightness - a.brightness);

                    // Mix sorted with original based on sortForce
                    for (let s = 0; s < span.length; s++) {
                        const origIdx = ((spanStart + s) * bw + x) * 4;
                        const mix = sortForce;
                        data[origIdx] = Math.floor(data[origIdx] * (1 - mix) + span[s].r * mix);
                        data[origIdx + 1] = Math.floor(data[origIdx + 1] * (1 - mix) + span[s].g * mix);
                        data[origIdx + 2] = Math.floor(data[origIdx + 2] * (1 - mix) + span[s].b * mix);
                    }

                    spanStart = -1;
                }
            }
        }

        bctx.putImageData(imgData, 0, 0);

        // Draw scaled to main canvas
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.buffer, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;

        // Sort wave visualization (subtle highlight lines)
        for (const wave of this.sortWaves) {
            const wx = wave.x * w;
            const left = (wave.x - wave.radius) * w;
            const right = (wave.x + wave.radius) * w;
            ctx.strokeStyle = `hsla(${hue + 40}, 100%, 70%, ${wave.life * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(left, 0); ctx.lineTo(left, h);
            ctx.moveTo(right, 0); ctx.lineTo(right, h);
            ctx.stroke();
        }

        while (this.sortWaves.length > 10) this.sortWaves.shift();
    }

    _hash(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }
}
