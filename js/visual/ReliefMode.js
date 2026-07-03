import { ReliefMath } from '../math/ReliefMath.js';

/**
 * ReliefMode — Ultra High-Calibre 2.5D Parallax Surface.
 * Standard-setting implementation derived from 'gtest' shader standards.
 * Features: 
 * - Parallax Offset Mapping (View-dependent UV distortion)
 * - Phong Specular Reflection & 4D Polynomial Color Mapping (Twilight)
 * - High-Precision Finite-Difference Normal Generation
 */
export class ReliefMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ReliefMath();
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
        const audioData = mathEngine.getAnalyserData();
        this.mathInstance.update(dt, mathEngine.get('complexity'), audioData);

        if (!this.offscreen) this.resize(w, h);

        const rw = this.offscreen.width;
        const rh = this.offscreen.height;
        const pix = this.offData.data;
        const hue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;

        // Pro-Level Lighting & View Params
        const mt = this.time * 2.0;
        const viewDirX = Math.cos(mt) * 0.4;
        const viewDirY = Math.sin(mt * 0.7) * 0.4;
        const viewDirZ = 2.0; // Simulated camera distance
        
        const lightDirX = 0.5, lightDirY = 0.5, lightDirZ = 1.0;
        const hScale = 0.15 + energy * 0.1; // Intensity of parallax

        for (let py = 0; py < rh; py++) {
            for (let px = 0; px < rw; px++) {
                const u = px / rw, v = py / rh;
                
                // 1. Initial Height sample for Parallax Offset
                const hStart = this.mathInstance.getHeight(u, v);
                
                // 2. Parallax Mapping logic (UV distortion based on view direction)
                // uv + (height - 0.5) * hScale * viewDir.xy
                const offsetU = u + (hStart - 0.5) * hScale * (viewDirX / viewDirZ);
                const offsetV = v + (hStart - 0.5) * hScale * (viewDirY / viewDirZ);

                // 3. Final Height sample at Offset UV
                const hFinal = this.mathInstance.getHeight(offsetU, offsetV);
                
                // 4. Normal calculation at Offset UV (finite differences)
                const hx = this.mathInstance.getHeight(offsetU + 0.005, offsetV);
                const hy = this.mathInstance.getHeight(offsetU, offsetV + 0.005);
                
                const nxi = (hFinal - hx) * 20.0;
                const nyi = (hFinal - hy) * 20.0;
                const nlen = Math.sqrt(nxi*nxi + nyi*nyi + 1.0);
                const nx = nxi / nlen, ny = nyi / nlen, nz = 1 / nlen;

                // 5. Phong Lighting
                const diff = Math.max(0, nx * lightDirX + ny * lightDirY + nz * lightDirZ);
                const ambient = 0.25;

                // Specular: reflect(-light, normal) . view
                const dotLN = nx * lightDirX + ny * lightDirY + nz * lightDirZ;
                const rx = -lightDirX + 2 * dotLN * nx;
                const ry = -lightDirY + 2 * dotLN * ny;
                const rz = -lightDirZ + 2 * dotLN * nz;
                const rvdot = Math.max(0, (viewDirX/viewDirZ) * rx + (viewDirY/viewDirZ) * ry + (1/viewDirZ) * rz);
                const spec = Math.pow(rvdot, 30) * 0.6;

                // 6. Polynomial Twilight Color Mapping (Simplified from shader.js)
                const t = hFinal;
                const cr = (0.5 + t * (0.5 + t * -0.2)) * 255;
                const cg = (0.3 + t * (0.6 + t * -0.1)) * 255;
                const cb = (0.8 + t * (0.2 + t * -0.5)) * 255;

                const lit = (ambient + diff + spec) * (1.0 + energy * 0.3);
                
                const idx = (py * rw + px) * 4;
                pix[idx] = Math.min(255, cr * lit);
                pix[idx+1] = Math.min(255, cg * lit);
                pix[idx+2] = Math.min(255, cb * lit);
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
