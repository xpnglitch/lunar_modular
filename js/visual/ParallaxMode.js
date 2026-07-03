import { ParallaxMath } from '../math/ParallaxMath.js';

/**
 * ParallaxMode — Ultra High-Performance Parallax Surface.
 * Implementation derived from 'gtest' shader.js.
 * Features: 
 * - Multi-octave Procedural FBM Heightmapping
 * - Parallax Offset Projection logic for view-dependent depth
 * - Phong Specular Reflection & 5th Order Polynomial Color Mapping
 */
export class ParallaxMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ParallaxMath();
        this.offscreen = null;
        this.offCtx = null;
        this.offData = null;
        this.SCALE = 4;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        const rw = Math.ceil(w / this.SCALE);
        const rh = Math.ceil(h / this.SCALE);
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = rw;
        this.offscreen.height = rh;
        this.offCtx = this.offscreen.getContext('2d');
        this.offData = this.offCtx.createImageData(rw, rh);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() {
        return this.mathInstance.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        if (!this.offscreen) this.resize(w, h);

        const rw = this.offscreen.width;
        const rh = this.offscreen.height;
        const pix = this.offData.data;
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;

        // --- High-Calibre Parameters (from shader.js) ---
        const mt = this.time * 2.0;
        const viewDirX = Math.cos(mt) * 0.4;
        const viewDirY = Math.sin(mt * 0.7) * 0.4;
        const viewDirZ = 2.0; 
        
        const lightDirX = 0.5, lightDirY = 0.5, lightDirZ = 1.0;
        const hScale = 0.2 + energy * 0.3; // Intensity of parallax

        for (let py = 0; py < rh; py++) {
            for (let px = 0; px < rw; px++) {
                const u = px/rw, v = py/rh;
                
                // 1. Initial Height sample 
                const h1 = this.mathInstance.getHeight(u, v);
                
                // 2. Parallax Offset logic (UV distortion)
                const offsetU = u + (h1 - 0.5) * hScale * (viewDirX / viewDirZ);
                const offsetV = v + (h1 - 0.5) * hScale * (viewDirY / viewDirZ);

                // 3. Normal calculation at Offset UV
                const h0 = this.mathInstance.getHeight(offsetU, offsetV);
                const hx = this.mathInstance.getHeight(offsetU + 0.005, offsetV);
                const hy = this.mathInstance.getHeight(offsetU, offsetV + 0.005);
                
                const nxi = (h0 - hx) * 30.0;
                const nyi = (h0 - hy) * 30.0;
                const nlen = Math.sqrt(nxi*nxi + nyi*nyi + 1.0);
                const nx = nxi/nlen, ny = nyi/nlen, nz = 1/nlen;

                // 4. Phong Lighting (Ambient, Diffuse, Specular)
                const dotLN = nx * lightDirX + ny * lightDirY + nz * lightDirZ;
                const rx = -lightDirX + 2 * dotLN * nx;
                const ry = -lightDirY + 2 * dotLN * ny;
                const rz = -lightDirZ + 2 * dotLN * nz;
                const rvdot = Math.max(0, (viewDirX/viewDirZ) * rx + (viewDirY/viewDirZ) * ry + (1/viewDirZ) * rz);
                const spec = Math.pow(rvdot, 40) * 0.8;
                const diff = Math.max(0, dotLN);
                const ambient = 0.2;

                // 5. Polynomial Twilight Palette (Standard from 'gtest')
                const t = h0;
                // Red Polynomial approximation
                const cr = (0.903 - t * 2.93 + t * t * 45.7 - t * t * t * 82.8) * 255;
                // Green Polynomial approximation
                const cg = (0.873 - t * 1.41 + t * t * 8.89 - t * t * t * 8.9) * 255;
                // Blue Polynomial approximation
                const cb = (0.919 - t * 4.75 + t * t * 132.2 - t * t * t * 192.8) * 255;

                const lit = (ambient + diff + spec) * (1.1 + energy * 0.5);
                
                const idx = (py * rw + px) * 4;
                pix[idx] = Math.max(0, Math.min(255, cr * lit));
                pix[idx+1] = Math.max(0, Math.min(255, cg * lit));
                pix[idx+2] = Math.max(0, Math.min(255, cb * lit));
                pix[idx+3] = 255;
            }
        }

        this.offCtx.putImageData(this.offData, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.offscreen, 0, 0, w, h);
        ctx.restore();
    }
}
