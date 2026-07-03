import { OceanWaveMath } from '../math/OceanWaveMath.js';

/**
 * OceanWaveMode — Cinematic 3D Ocean Surface (Cinematic Upgrade)
 * Renders a perspective-projected 3D mesh representing a deep ocean surface.
 * Features multi-octave Gerstner-like swells, specular glints on wave peaks,
 * depth-based color scattering, and energetic spray bursts.
 */
export class OceanWaveMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new OceanWaveMath();
        this.width = 0;
        this.height = 0;
        this.sprays = [];
        
        // Specular glint pool
        this.glints = [];
    }

    resize(w, h) { this.width = w; this.height = h; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Spawn energetic spray burst
        const count = 12 + Math.floor(noteInfo.velocity * 20);
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
            const speed = 0.05 + Math.random() * 0.15 * noteInfo.velocity;
            this.sprays.push({
                x: noteInfo.normalizedPosition,
                y: 0.1, // Initial height offset
                z: Math.random(), // Random depth in mesh
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 1 + Math.random() * 4,
                hue: 190 + Math.random() * 40
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _project(x, y, z, w, h, intensity) {
        // Simple perspective projection
        // x: 0..1, y: wave height, z: 0..1 (0=near, 1=far)
        const perspective = 0.5 + z * 0.8;
        const scale = 1.0 / perspective;
        
        const cx = w / 2, cy = h * 0.45;
        const px = cx + (x - 0.5) * w * 1.4 * scale;
        const py = cy + (y * h * 0.25) + (z * h * 0.6);
        
        return { x: px, y: py, scale };
    }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const complexity = mathEngine.get('complexity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;

        // --- 1. Background: Cinematic Sky & Deep Void ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, `hsla(${210 + hue * 0.1}, 60%, 5%, 1)`);
        skyGrad.addColorStop(0.5, `hsla(${220 + hue * 0.1}, 40%, 10%, 1)`);
        skyGrad.addColorStop(1, '#000');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Atmosphere glow near horizon
        const hGlow = ctx.createRadialGradient(w/2, h*0.4, 0, w/2, h*0.4, w*0.8);
        hGlow.addColorStop(0, `hsla(${200 + hue * 0.1}, 80%, 20%, 0.1)`);
        hGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = hGlow;
        ctx.fillRect(0, 0, w, h);

        // --- 2. 3D Wave Mesh Rendering ---
        const rows = 12 + Math.floor(complexity * 12); // Z-axis density
        const cols = 25 + Math.floor(complexity * 25); // X-axis density
        const t = this.time * speed * 0.4;

        ctx.lineWidth = 1;
        
        // Draw waves back-to-front for occlusion
        for (let j = rows; j >= 0; j--) {
            const z = j / rows;
            const depthAlpha = (1 - z) * (0.3 + intensity * 0.7);
            if (depthAlpha < 0.01) continue;

            ctx.beginPath();
            let first = true;

            const layerHue = (200 + hue * 0.15 + (1 - z) * 40) % 360;
            const lightness = 10 + (1 - z) * 35 + energy * 15;

            for (let i = 0; i <= cols; i++) {
                const x = i / cols;
                
                // Calculate Wave Height (Y)
                let y = 0;
                const freq = 6 + (1 - z) * 4 + complexity * 10;
                const amp = (0.05 + (1 - z) * 0.1 + energy * 0.15) * (0.8 + intensity * 0.4);
                
                // Multi-octave wave interference
                y += Math.sin(x * freq + t * 2.5 + z * 5) * amp;
                y += Math.sin(x * freq * 2.1 - t * 1.8 + z * 3) * amp * 0.4;
                y += Math.sin(x * freq * 4.5 + t * 4.2) * amp * 0.15;
                
                // Note-pulse perturbation
                for (const p of this.mathInstance.pulses) {
                    const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(z - 0.5, 2));
                    if (dist < 0.3) {
                        const falloff = Math.pow(1 - dist / 0.3, 2);
                        y += Math.sin((dist - p.age * 0.5) * 25) * p.energy * 0.2 * falloff * Math.max(0, 1 - p.age/3);
                    }
                }

                const p = this._project(x, y, z, w, h, intensity);
                if (first) {
                    ctx.moveTo(p.x, p.y);
                    first = false;
                } else {
                    ctx.lineTo(p.x, p.y);
                }

                // Add random specular glints on crests
                if (y < -amp * 0.6 && Math.random() < 0.02 * intensity && j % 2 === 0) {
                    this.glints.push({ x: p.x, y: p.y, life: 1, s: 0.5 + Math.random() * 1.5 });
                }
            }

            // Fill wave body down to "sea level"
            const bottomL = this._project(1, 0.5, z, w, h, intensity);
            const bottomR = this._project(0, 0.5, z, w, h, intensity);
            ctx.lineTo(bottomL.x, bottomL.y + h);
            ctx.lineTo(bottomR.x, bottomR.y + h);
            ctx.closePath();

            // Depth-based gradient
            const waveGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
            waveGrad.addColorStop(0, `hsla(${layerHue}, 80%, ${lightness}%, ${depthAlpha * 0.9})`);
            waveGrad.addColorStop(0.5, `hsla(${layerHue + 20}, 70%, ${lightness * 0.6}%, ${depthAlpha * 0.7})`);
            waveGrad.addColorStop(1, `hsla(${layerHue + 40}, 60%, 5%, 0)`);
            
            ctx.fillStyle = waveGrad;
            ctx.fill();

            // Foam highlight on peaks
            ctx.strokeStyle = `hsla(${layerHue - 20}, 90%, ${lightness + 20}%, ${depthAlpha * 0.4})`;
            ctx.lineWidth = 1 + (1 - z) * 2;
            ctx.stroke();
        }

        // --- 3. Specular Glints ---
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this.glints.length - 1; i >= 0; i--) {
            const g = this.glints[i];
            g.life -= dt * 2.5;
            if (g.life <= 0) { this.glints.splice(i, 1); continue; }
            
            const alpha = g.life * 0.8 * intensity;
            ctx.fillStyle = `hsla(200, 100%, 95%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.s * g.life, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- 4. Spray Particles ---
        for (let i = this.sprays.length - 1; i >= 0; i--) {
            const s = this.sprays[i];
            s.x += s.vx * dt * 40;
            s.vy += 0.008 * dt * 40; // gravity
            s.y += s.vy * dt * 40;
            s.life -= dt * 0.8;

            if (s.life <= 0) { this.sprays.splice(i, 1); continue; }

            const p = this._project(s.x, s.y, s.z, w, h, intensity);
            const alpha = s.life * intensity;
            ctx.fillStyle = `hsla(${s.hue}, 90%, 90%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s.size * s.life * p.scale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- 5. Moonlight / Horizon Shine ---
        ctx.globalCompositeOperation = 'lighter';
        const shineX = w * 0.5 + Math.sin(this.time * 0.15) * w * 0.2;
        const shineGrad = ctx.createRadialGradient(shineX, h * 0.45, 0, shineX, h * 0.45, w * 0.4);
        shineGrad.addColorStop(0, `hsla(200, 100%, 90%, ${0.08 + energy * 0.1})`);
        shineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shineGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }
}
