import { VoronoiMath } from '../math/VoronoiMath.js';

/**
 * VoronoiMode — Cellular tessellation visualization
 * Renders proper Voronoi cells via nearest-seed pixel classification,
 * with filled cell interiors, glowing edges, seed cores, and 
 * energy-driven fracture effects.
 */
export class VoronoiMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.vMath = new VoronoiMath();
        this.width = 0;
        this.height = 0;
        this.cellBuffer = null;
        this.cellCtx = null;
        this.cellW = 0;
        this.cellH = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.cellW = Math.floor(w / 4);
        this.cellH = Math.floor(h / 4);
        this.cellBuffer = document.createElement('canvas');
        this.cellBuffer.width = this.cellW;
        this.cellBuffer.height = this.cellH;
        this.cellCtx = this.cellBuffer.getContext('2d');
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.vMath.addSeed(noteInfo.normalizedPosition, 0.3 + Math.random() * 0.4, noteInfo.frequency, noteInfo.velocity);
    }

    onNoteOff(noteInfo) {}
    getAudioModulation() { return this.vMath.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();
        const time = this.vMath.time;

        this.vMath.step(dt, complexity, speed, lightPressure);

        const seeds = this.vMath.seeds;
        if (seeds.length < 2) return;

        if (!this.cellCtx || this.cellW === 0) {
            this.resize(w, h);
            if (!this.cellCtx) return;
        }

        const fw = this.cellW;
        const fh = this.cellH;
        const fctx = this.cellCtx;

        // --- LAYER 1: Voronoi cell field (pixel-classified) ---
        const imgData = fctx.createImageData(fw, fh);
        const data = imgData.data;

        for (let py = 0; py < fh; py++) {
            const ny = py / fh;
            for (let px = 0; px < fw; px++) {
                const nx = px / fw;

                // Find nearest seed and second nearest
                let minD = Infinity, minIdx = 0;
                let secD = Infinity;
                for (let s = 0; s < seeds.length; s++) {
                    const dx = seeds[s].x - nx;
                    const dy = seeds[s].y - ny;
                    const d = dx * dx + dy * dy;
                    if (d < minD) {
                        secD = minD;
                        minD = d;
                        minIdx = s;
                    } else if (d < secD) {
                        secD = d;
                    }
                }

                const seed = seeds[minIdx];
                const edgeDist = Math.sqrt(secD) - Math.sqrt(minD);
                const isEdge = edgeDist < 0.015 + complexity * 0.01;

                const cHue = (hue + seed.hue) % 360;
                const cellAlpha = (0.15 + seed.energy * 0.3 * intensity) * seed.life;

                const idx = (py * fw + px) * 4;

                if (isEdge) {
                    // Bright edge
                    const edgeBright = Math.max(0, 1 - edgeDist / 0.02);
                    const rgb = this._hsl2rgb(((cHue + 30) % 360) / 360, 0.8, 0.7 + edgeBright * 0.2);
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = Math.floor((cellAlpha + edgeBright * 0.5) * 255);
                } else {
                    // Cell interior (subtle fill based on distance from own seed)
                    const seedDist = Math.sqrt(minD);
                    const interiorBright = Math.max(0, 1 - seedDist * 5) * 0.3;
                    const rgb = this._hsl2rgb(cHue / 360, 0.5, 0.15 + interiorBright * 0.3);
                    data[idx] = rgb[0];
                    data[idx + 1] = rgb[1];
                    data[idx + 2] = rgb[2];
                    data[idx + 3] = Math.floor(cellAlpha * 0.6 * 255);
                }
            }
        }
        fctx.putImageData(imgData, 0, 0);

        // Draw upscaled
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this.cellBuffer, 0, 0, w, h);

        // --- LAYER 2: Vector edge lines (high-res crisp edges) ---
        // For each pair of seeds, draw the perpendicular bisector segment
        for (let i = 0; i < seeds.length; i++) {
            for (let j = i + 1; j < seeds.length; j++) {
                const a = seeds[i], b = seeds[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.hypot(dx, dy);
                const threshold = 0.2 + complexity * 0.15;

                if (d < threshold) {
                    const midX = (a.x + b.x) / 2 * w;
                    const midY = (a.y + b.y) / 2 * h;
                    const perpX = -dy / d;
                    const perpY = dx / d;
                    const len = (1 - d / threshold) * 80 * (0.5 + intensity * 0.5);

                    const edgeHue = (hue + (a.hue + b.hue) / 2) % 360;
                    const edgeAlpha = Math.min(a.life, b.life) * (0.2 + intensity * 0.3);

                    // Glow line
                    ctx.beginPath();
                    ctx.moveTo(midX - perpX * len, midY - perpY * len);
                    ctx.lineTo(midX + perpX * len, midY + perpY * len);
                    ctx.strokeStyle = `hsla(${edgeHue}, 70%, 65%, ${edgeAlpha * 0.2})`;
                    ctx.lineWidth = 4 + intensity * 4;
                    ctx.stroke();

                    // Sharp edge
                    ctx.strokeStyle = `hsla(${edgeHue}, 80%, 80%, ${edgeAlpha})`;
                    ctx.lineWidth = 0.8 + intensity;
                    ctx.stroke();
                }
            }
        }

        // --- LAYER 3: Seed core glows ---
        for (const s of seeds) {
            const sx = s.x * w;
            const sy = s.y * h;
            const sHue = (hue + s.hue) % 360;
            const sAlpha = s.energy * s.life;
            const glowR = 15 + s.energy * 35;

            // Outer glow
            const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
            glowGrad.addColorStop(0, `hsla(${sHue}, 90%, 85%, ${sAlpha * 0.4})`);
            glowGrad.addColorStop(0.4, `hsla(${sHue}, 80%, 65%, ${sAlpha * 0.1})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + s.energy * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${sHue}, 90%, 95%, ${sAlpha * 0.9})`;
            ctx.fill();

            // Pulse ring
            const pulseR = ((time * 1.5 + s.hue * 0.01) % 1) * glowR;
            const pulseAlpha = (1 - pulseR / glowR) * sAlpha * 0.2;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(1, pulseR), 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${sHue}, 80%, 80%, ${pulseAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _hsl2rgb(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}
