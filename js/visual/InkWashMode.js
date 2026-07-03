import { InkWashMath } from '../math/InkWashMath.js';

/**
 * InkWashMode — Organic Fluid Dispersion (Sumi-e Style).
 * Multi-layered ink rendering with bleeding tendrils, paper texture grain,
 * brush stroke directionality, wet-edge darkening, and atmospheric mist.
 */
export class InkWashMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.inkMath = new InkWashMath();
        // Paper grain noise field (pre-generated)
        this.grainField = [];
        for (let i = 0; i < 200; i++) {
            this.grainField.push({
                x: Math.random() * 800, y: Math.random() * 600,
                size: 1 + Math.random() * 4,
                opacity: 0.02 + Math.random() * 0.05,
                angle: Math.random() * Math.PI
            });
        }
        
        this.subsets = ["PARCHMENT", "SUMI-E", "CHARCOAL"];
        this.subIndex = 0;
    }

    resize(w, h) {
        this.inkMath.reset();
    }

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        // The render function can use this.subIndex to shift colors/textures
    }

    render(ctx, w, h, mathEngine, dt) {
        this.inkMath.step(mathEngine, dt);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const time = performance.now() * 0.001;
        const blobs = this.inkMath.blobs;
        const sat = this.subIndex === 0 ? 70 : (this.subIndex === 1 ? 15 : 0); // Saturation shift

        // --- Paper texture base ---
        let bgColor = `rgba(8, 6, 12, ${0.08 + (1 - intensity) * 0.06})`;
        if (this.subIndex === 0) bgColor = `rgba(12, 10, 8, ${0.08 + (1 - intensity) * 0.06})`; // Warm parchment
        if (this.subIndex === 2) bgColor = `rgba(5, 5, 5, ${0.1 + (1 - intensity) * 0.05})`; // Dark charcoal
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // --- LAYER 1: Paper grain texture ---
        if (complexity > 0.3) {
            for (const g of this.grainField) {
                const gx = (g.x / 800) * w;
                const gy = (g.y / 600) * h;
                ctx.beginPath();
                ctx.ellipse(gx, gy, g.size * (w / 800), g.size * 0.3 * (h / 600), g.angle, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(30, 25, 20, ${g.opacity * complexity})`;
                ctx.fill();
            }
        }

        for (const b of blobs) {
            const sx = (b.x / 800) * w;
            const sy = (b.y / 600) * h;
            const r = b.radius * (w / 800);
            const pHue = (hue + b.hueOffset + 360) % 360;
            const alpha = b.opacity * (0.2 + intensity * 0.6);

            // Multiple bleed rings (feathered edge effect)
            const rings = 3 + Math.floor(complexity * 3);
            for (let ring = 0; ring < rings; ring++) {
                const ringRatio = ring / rings;
                const ringR = r * (0.3 + ringRatio * 0.8);
                const ringAlpha = alpha * (1 - ringRatio) * 0.5;
                // Offset each ring slightly for organic feel
                const ox = Math.sin(ring * 2.3 + b.hueOffset) * r * 0.05;
                const oy = Math.cos(ring * 1.7 + b.hueOffset) * r * 0.05;

                const grad = ctx.createRadialGradient(sx + ox, sy + oy, 0, sx + ox, sy + oy, ringR);
                grad.addColorStop(0, `hsla(${pHue}, ${sat}%, 45%, ${ringAlpha * 1.5})`);
                grad.addColorStop(0.5, `hsla(${pHue}, ${sat}%, 35%, ${ringAlpha * 0.5})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx + ox, sy + oy, ringR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Dense ink core (darkest center)
            if (b.life > 0.5) {
                const coreR = r * 0.25;
                const coreGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR);
                coreGrad.addColorStop(0, `hsla(${pHue}, ${Math.min(100, sat + 10)}%, 25%, ${alpha * 0.8})`);
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- LAYER 3: Bleeding tendrils (ink flowing outward from blobs) ---
        for (const b of blobs) {
            if (b.life < 0.3 || b.opacity < 0.1) continue;
            const sx = (b.x / 800) * w;
            const sy = (b.y / 600) * h;
            const r = b.radius * (w / 800);
            const pHue = (hue + b.hueOffset + 360) % 360;
            const alpha = b.opacity * intensity * 0.15;

            const numTendrils = 3 + Math.floor(complexity * 5);
            for (let t = 0; t < numTendrils; t++) {
                const baseAngle = (t / numTendrils) * Math.PI * 2 + b.hueOffset * 0.1;
                const tendrilLen = r * (0.5 + Math.random() * 0.8);

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                let tx = sx, ty = sy;
                const segs = 6 + Math.floor(complexity * 4);
                for (let s = 0; s < segs; s++) {
                    const segRatio = s / segs;
                    const angle = baseAngle + Math.sin(time * 0.5 + t * 3 + s * 0.7) * 0.5 * complexity;
                    const segLen = tendrilLen / segs;
                    tx += Math.cos(angle) * segLen;
                    ty += Math.sin(angle) * segLen;
                    ctx.lineTo(tx, ty);
                }

                ctx.strokeStyle = `hsla(${pHue}, ${Math.max(0, sat - 20)}%, 20%, ${alpha * (1 - 0.5 * Math.random())})`;
                ctx.lineWidth = 0.5 + (1 - b.life) * 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }

        // --- LAYER 4: Wet-edge darkening (rim around fresh blobs) ---
        for (const b of blobs) {
            if (b.life < 0.6) continue;
            const sx = (b.x / 800) * w;
            const sy = (b.y / 600) * h;
            const r = b.radius * (w / 800);
            const pHue = (hue + b.hueOffset + 360) % 360;
            const edgeAlpha = b.opacity * b.life * 0.2;

            // Dark ring at the expanding edge
            const edgeGrad = ctx.createRadialGradient(sx, sy, r * 0.7, sx, sy, r);
            edgeGrad.addColorStop(0, 'transparent');
            edgeGrad.addColorStop(0.6, `hsla(${pHue}, ${Math.max(0, sat - 10)}%, 10%, ${edgeAlpha})`);
            edgeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = edgeGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- LAYER 5: Brush stroke grain detail ---
        for (const b of blobs) {
            if (b.life < 0.7 || intensity < 0.4) continue;
            const sx = (b.x / 800) * w;
            const sy = (b.y / 600) * h;
            const r = b.radius * (w / 800);
            const pHue = (hue + b.hueOffset + 360) % 360;
            const grainAlpha = b.opacity * 0.08;

            // Directional grain lines inside the blob
            const numGrains = 8 + Math.floor(complexity * 12);
            ctx.beginPath();
            for (let g = 0; g < numGrains; g++) {
                const angle = b.hueOffset * 0.05 + (Math.random() - 0.5) * 0.3;
                const startR = Math.random() * r * 0.8;
                const len = 5 + Math.random() * r * 0.4;
                const gx = sx + Math.cos(angle + Math.PI / 2) * (Math.random() - 0.5) * r * 0.6;
                const gy = sy + Math.sin(angle + Math.PI / 2) * (Math.random() - 0.5) * r * 0.6;

                ctx.moveTo(gx, gy);
                ctx.lineTo(gx + Math.cos(angle) * len, gy + Math.sin(angle) * len);
            }
            ctx.strokeStyle = `hsla(${pHue}, 40%, 35%, ${grainAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // --- LAYER 6: Atmospheric mist (top area) ---
        const mistAlpha = 0.02 + intensity * 0.03;
        const mistGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        mistGrad.addColorStop(0, `hsla(${hue}, 20%, 60%, ${mistAlpha})`);
        mistGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, 0, w, h * 0.4);
    }

    getAudioModulation() {
        return {
            decay: 0.1 + this.math.get('intensity') * 0.4,
            feedback: 0.5 + this.math.get('complexity') * 0.4
        };
    }
}
