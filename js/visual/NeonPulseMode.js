import { NeonPulseMath } from '../math/NeonPulseMath.js';

/**
 * NeonPulseMode — Cyberpunk Metropolis.
 * A high-fidelity cinematic simulation of a rain-slicked digital city.
 * Features multi-layer parallax building silhouettes, volumetric neon signage, 
 * reflective asphalt surfaces, and high-frequency atmospheric rain.
 */
export class NeonPulseMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new NeonPulseMath();
        this.initialized = false;
        this.buildings = [];
        this.rain = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildCity(w, h);
        this.initialized = true;
    }

    _buildCity(w, h) {
        this.buildings = [];
        const count = 15 + Math.floor(w / 100);
        for (let i = 0; i < count; i++) {
            const depth = 0.2 + (i / count) * 0.8; // Far to near
            this.buildings.push({
                x: Math.random() * w,
                w: 60 + Math.random() * 140,
                h: h * (0.2 + (1-depth) * 0.6),
                depth: depth,
                windows: Array.from({ length: 40 }, () => Math.random() > 0.4),
                sign: Math.random() > 0.7 ? {
                    type: ['rect', 'circle', 'text'][Math.floor(Math.random() * 3)],
                    hue: Math.random() * 360,
                    offsetY: Math.random() * 100,
                    size: 20 + Math.random() * 40
                } : null
            });
        }
        this.buildings.sort((a,b) => a.depth - b.depth);

        this.rain = Array.from({ length: 200 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            len: 10 + Math.random() * 20,
            speed: 600 + Math.random() * 400
        }));
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed);
        const energy = Number(this.mathInstance.energy) || 0;
        const rainInt = Number(this.mathInstance.rainIntensity) || 0;

        // --- LAYER 1: Deep Sky ---
        const skyG = ctx.createLinearGradient(0, 0, 0, h);
        skyG.addColorStop(0, '#020108');
        skyG.addColorStop(1, '#08051a');
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, w, h);

        // Sky flash on energy
        if (energy > 0.4) {
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${energy * 0.05})`;
            ctx.fillRect(0, 0, w, h);
        }

        // --- LAYER 2: Parallax Buildings ---
        const groundY = h * 0.9;
        for (const b of this.buildings) {
            const bx = (b.x + this.time * 10 * (1 - b.depth)) % (w + b.w) - b.w;
            const by = groundY - b.h;
            const bAlpha = 1.0; // Silhouettes
            
            // Building body
            const depthFactor = (1.5 - b.depth);
            ctx.fillStyle = `rgb(${2 * depthFactor}, ${1 * depthFactor}, ${5 * depthFactor})`;
            ctx.fillRect(bx, by, b.w, b.h);

            // Windows
            const winHue = (hue + 40) % 360;
            const winCols = 4;
            const winRows = Math.floor(b.h / 20);
            ctx.fillStyle = `hsla(${winHue}, 80%, 60%, ${0.1 + b.depth * 0.2})`;
            for (let r = 0; r < winRows; r++) {
                for (let c = 0; c < winCols; c++) {
                    if (b.windows[(r * winCols + c) % 40]) {
                        // Occasionally flicker windows
                        if (Math.random() > 0.995) continue;
                        ctx.fillRect(bx + 10 + c * (b.w / 5), by + 10 + r * 20, b.w / 10, 10);
                    }
                }
            }

            // Neon Signs
            if (b.sign && b.depth > 0.4) {
                const s = b.sign;
                const signHue = (hue + s.hue) % 360;
                const flicker = this.mathInstance.flickerState > 0.2 ? 1 : 0.2;
                const signAlpha = (0.4 + energy * 0.6) * flicker;
                
                ctx.save();
                ctx.translate(bx + b.w / 2, by + s.offsetY);
                
                // Glow
                ctx.shadowBlur = 15 * signAlpha;
                ctx.shadowColor = `hsla(${signHue}, 100%, 60%, 1)`;
                ctx.strokeStyle = `hsla(${signHue}, 100%, 80%, ${signAlpha})`;
                ctx.lineWidth = 2;
                
                if (s.type === 'rect') ctx.strokeRect(-s.size / 2, -10, s.size, 20);
                else if (s.type === 'circle') { ctx.beginPath(); ctx.arc(0, 0, s.size/2, 0, Math.PI*2); ctx.stroke(); }
                else {
                    ctx.font = 'bold 14px "Courier New"';
                    ctx.strokeText("NEON", -15, 5);
                }
                
                ctx.restore();
            }
        }

        // --- LAYER 3: Rain & Reflections ---
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const r of this.rain) {
            r.y += r.speed * dt * speed;
            if (r.y > groundY) {
                r.y = -r.len;
                r.x = Math.random() * w;
            }
            ctx.strokeStyle = `rgba(180, 200, 255, ${0.1 * rainInt})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.len); ctx.stroke();
        }

        // Wet Ground Reflection
        const floorG = ctx.createLinearGradient(0, groundY, 0, h);
        floorG.addColorStop(0, `hsla(${hue}, 100%, 10%, ${0.3 * energy})`);
        floorG.addColorStop(1, '#000');
        ctx.fillStyle = floorG;
        ctx.fillRect(0, groundY, w, h - groundY);
        
        ctx.restore();

        // --- LAYER 4: Atmospheric Fog ---
        const fogG = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        fogG.addColorStop(0, 'transparent');
        fogG.addColorStop(1, `hsla(${hue}, 20%, 5%, 0.6)`);
        ctx.fillStyle = fogG;
        ctx.fillRect(0, 0, w, h);
    }
}
