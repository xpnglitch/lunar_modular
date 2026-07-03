import { LavaFlowMath } from '../math/LavaFlowMath.js';

/**
 * LavaFlowMode — Molten lava with glowing cracks and cooling crust.
 * 
 * Low-res pixel buffer (like SolarFlare) with multi-octave noise
 * creating flowing magma. Bright orange/yellow channels between
 * dark cooling rock plates. Notes create eruption bursts.
 */
export class LavaFlowMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new LavaFlowMath();
        this.width = 0;
        this.height = 0;
        this.buffer = null;
        this.bufCtx = null;
        this.bw = 0;
        this.bh = 0;
        this.eruptions = [];
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.bw = Math.floor(w / 4);
        this.bh = Math.floor(h / 4);
        this.buffer = document.createElement('canvas');
        this.buffer.width = this.bw;
        this.buffer.height = this.bh;
        this.bufCtx = this.buffer.getContext('2d');
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        this.eruptions.push({
            x: noteInfo.normalizedPosition,
            y: 0.3 + Math.random() * 0.4,
            energy: noteInfo.velocity,
            life: 1.0
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    // Simple noise approximation
    _noise(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }

    _fbm(x, y, octaves) {
        let val = 0, amp = 0.5, freq = 1;
        for (let i = 0; i < octaves; i++) {
            val += amp * this._noise(x * freq, y * freq);
            freq *= 2.1;
            amp *= 0.5;
        }
        return val;
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const complexity = mathEngine.get('complexity');
        const energy = this.mathInstance.energy;

        if (!this.bufCtx || this.bw === 0) {
            this.resize(w, h);
            if (!this.bufCtx) return;
        }

        const bw = this.bw;
        const bh = this.bh;
        const imgData = this.bufCtx.createImageData(bw, bh);
        const data = imgData.data;
        const t = this.time * speed * 0.3;
        const octaves = 3 + Math.floor(complexity * 3);

        for (let py = 0; py < bh; py++) {
            const ny = py / bh;
            for (let px = 0; px < bw; px++) {
                const nx = px / bw;

                // Flow distortion
                const dx = this._fbm(nx * 3 + t * 0.2, ny * 3 + t * 0.15, octaves);
                const dy = this._fbm(nx * 3 + 5.2 + t * 0.18, ny * 3 + 1.3 + t * 0.12, octaves);

                let val = this._fbm(nx * 4 + dx * 1.5, ny * 4 + dy * 1.5 + t * 0.1, octaves);

                // Eruption influence
                for (const e of this.eruptions) {
                    const edx = nx - e.x;
                    const edy = ny - e.y;
                    const dist = Math.sqrt(edx * edx + edy * edy);
                    if (dist < 0.25) {
                        val += (1 - dist / 0.25) * e.energy * e.life * 0.5;
                    }
                }

                val = Math.max(0, Math.min(1, val + energy * 0.2));

                // Lava color mapping
                let r, g, b;
                if (val < 0.35) {
                    // Cooled crust — dark rock
                    const t2 = val / 0.35;
                    r = 15 + t2 * 25;
                    g = 5 + t2 * 10;
                    b = 5 + t2 * 8;
                } else if (val < 0.5) {
                    // Crack glow — deep red
                    const t2 = (val - 0.35) / 0.15;
                    r = 40 + t2 * 140;
                    g = 15 + t2 * 15;
                    b = 13 - t2 * 5;
                } else if (val < 0.65) {
                    // Hot lava — orange
                    const t2 = (val - 0.5) / 0.15;
                    r = 180 + t2 * 75;
                    g = 30 + t2 * 80;
                    b = 8;
                } else if (val < 0.8) {
                    // Bright lava — yellow-orange
                    const t2 = (val - 0.65) / 0.15;
                    r = 255;
                    g = 110 + t2 * 100;
                    b = 8 + t2 * 30;
                } else {
                    // White-hot
                    const t2 = (val - 0.8) / 0.2;
                    r = 255;
                    g = 210 + t2 * 45;
                    b = 38 + t2 * 180;
                }

                const idx = (py * bw + px) * 4;
                data[idx] = Math.floor(r);
                data[idx + 1] = Math.floor(g);
                data[idx + 2] = Math.floor(b);
                data[idx + 3] = 255;
            }
        }

        this.bufCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.buffer, 0, 0, w, h);

        // Heat haze glow overlay
        const hazeGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        hazeGrad.addColorStop(0, `rgba(255, 100, 20, ${0.03 + energy * 0.08})`);
        hazeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = hazeGrad;
        ctx.fillRect(0, 0, w, h);

        // Update eruptions
        for (let i = this.eruptions.length - 1; i >= 0; i--) {
            this.eruptions[i].life -= dt * 0.5;
            if (this.eruptions[i].life <= 0) this.eruptions.splice(i, 1);
        }
    }
}
