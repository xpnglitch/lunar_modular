import { CrystalMath } from '../math/CrystalMath.js';

/**
 * CrystalMode — Hypnotic Prism Array.
 * A 3D array of slowly rotating geometric prisms and polyhedra. Each crystal
 * is a multi-faceted gem that catches virtual light — faces flash with specular
 * highlights as they rotate, and internal refractions create caustic pools of
 * color beneath each crystal. Audio energy makes them spin faster and glow
 * from within. Note events shatter nearby crystals and scatter light fragments.
 */
export class CrystalMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new CrystalMath();
        this.time = 0;
        this._crystals = [];
        this._shards   = [];
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildArray(w, h);
        this.initialized = true;
    }

    _buildArray(w, h) {
        const cols = 7 + Math.floor(w / 140);
        const rows = 5 + Math.floor(h / 140);
        this._crystals = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._crystals.push({
                    x:       w * (c / (cols-1)) * 0.85 + w * 0.075,
                    y:       h * (r / (rows-1)) * 0.8  + h * 0.1,
                    z:       Math.random(),          // depth 0..1
                    rotX:    Math.random() * Math.PI * 2,
                    rotY:    Math.random() * Math.PI * 2,
                    rotVX:   (Math.random()-0.5) * 0.4,
                    rotVY:   (Math.random()-0.5) * 0.6,
                    size:    20 + Math.random() * 30,
                    hue:     ((c + r * cols) / (cols * rows)) * 360,
                    facets:  5 + Math.floor(Math.random() * 5),
                    energy:  0,
                    phase:   Math.random() * Math.PI * 2,
                });
            }
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        const w = this.width, h = this.height;
        const tx = noteInfo.normalizedPosition * w;

        // Energize and scatter nearby crystals
        for (const c of this._crystals) {
            const d = Math.abs(c.x - tx);
            if (d < 200) {
                c.energy     = Math.min(1.0, noteInfo.velocity * (1 - d/200));
                c.rotVX     += (Math.random()-0.5) * 3 * noteInfo.velocity;
                c.rotVY     += (Math.random()-0.5) * 3 * noteInfo.velocity;
            }
        }

        // Light shards burst
        const n = 15 + Math.floor(noteInfo.velocity * 30);
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            this._shards.push({
                x:    tx,
                y:    h * (0.2 + Math.random() * 0.6),
                vx:   Math.cos(angle) * (100 + Math.random() * 250) * noteInfo.velocity,
                vy:   Math.sin(angle) * (100 + Math.random() * 250) * noteInfo.velocity,
                life: 1.0,
                hue:  noteInfo.normalizedPosition * 360,
                size: 1 + Math.random() * 4,
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawCrystal(ctx, crystal, hue, intensity, energy) {
        const { x, y, rotX, rotY, size, hue: cHueOff, facets } = crystal;
        const cHue    = (hue + cHueOff) % 360;
        const boost   = crystal.energy;
        const pulse   = 0.5 + 0.5 * Math.sin(this.time * 1.2 + crystal.phase);
        const depthS  = 0.5 + crystal.z * 0.5;

        // Draw faceted polygon from projected 3D vertices
        // We approximate crystal as a layered polygon with normal-based shading
        const outerR = size * depthS * (1 + boost * 0.3);
        const innerR = outerR * 0.55;

        // Outer facets
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotY);

        // Back faces (darker, subtract from composite)
        ctx.beginPath();
        for (let f = 0; f <= facets; f++) {
            const a  = (f / facets) * Math.PI * 2 + rotX;
            const rx = Math.cos(a) * outerR;
            const ry = Math.sin(a) * outerR * Math.abs(Math.cos(rotX * 0.5 + 0.5));
            if (f === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        const faceAlpha = (0.04 + boost * 0.08 + pulse * 0.03) * depthS * (0.4 + intensity * 0.4);
        ctx.fillStyle   = `hsla(${cHue}, 70%, ${35+boost*20}%, ${faceAlpha})`;
        ctx.fill();

        // Bright edge glow
        const edgeAlpha = (0.08 + boost * 0.2 + pulse * 0.06 + energy * 0.05) * depthS * (0.5 + intensity * 0.4);
        ctx.strokeStyle = `hsla(${cHue}, 90%, ${65+boost*25}%, ${edgeAlpha})`;
        ctx.lineWidth   = 1.0 + boost * 2;
        ctx.stroke();

        // Inner refraction hexagon
        ctx.beginPath();
        for (let f = 0; f <= facets; f++) {
            const a  = (f / facets) * Math.PI * 2 + rotX + Math.PI / facets;
            const rx = Math.cos(a) * innerR;
            const ry = Math.sin(a) * innerR * 0.7;
            if (f === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        const innerAlpha = (0.03 + boost * 0.1 + energy * 0.04) * depthS * (0.4 + intensity * 0.4);
        ctx.strokeStyle  = `hsla(${(cHue+40)%360}, 100%, 80%, ${innerAlpha})`;
        ctx.lineWidth    = 0.5;
        ctx.stroke();

        // Specular glint on one face
        const glintAngle = rotX * 2;
        const specularBrightness = Math.max(0, Math.cos(glintAngle));
        if (specularBrightness > 0.5) {
            const sx = Math.cos(glintAngle) * outerR * 0.3;
            const sy = Math.sin(glintAngle) * outerR * 0.15;
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR * 0.3);
            sg.addColorStop(0, `hsla(${cHue}, 20%, 97%, ${(specularBrightness - 0.5) * 2 * 0.5 * (0.5+intensity*0.5)})`);
            sg.addColorStop(1, 'transparent');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(sx, sy, outerR*0.3, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();

        // Caustic pool beneath crystal
        const causticAlpha = (boost * 0.08 + energy * 0.03) * depthS * intensity;
        if (causticAlpha > 0.005) {
            const causticY = y + outerR * 0.6;
            const cg = ctx.createRadialGradient(x, causticY, 0, x, causticY, outerR * 0.8);
            cg.addColorStop(0, `hsla(${cHue}, 100%, 70%, ${causticAlpha})`);
            cg.addColorStop(1, 'transparent');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(x, causticY, outerR*0.8, 0, Math.PI*2); ctx.fill();
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.step(dt, Number(mathEngine.get('complexity')) || 0);

        const hue      = Number(mathEngine.get('colorHue'))  || 0;
        const intensity= Number(mathEngine.get('intensity')) || 0.5;
        const speed    = Number(mathEngine.get('speed'))     || 1.0;
        const energy   = Number(this.mathInstance.energy)   || 0;

        // Dark crystal cave — slow fade for caustic persistence
        ctx.fillStyle = `rgba(0,0,3,${0.10 + (1-intensity)*0.07})`;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // Sort crystals far→near for correct depth rendering
        const sorted = [...this._crystals].sort((a, b) => b.z - a.z);

        for (const c of sorted) {
            c.rotX   += c.rotVX * speed * dt * (1 + c.energy * 2 + energy * 0.3);
            c.rotY   += c.rotVY * speed * dt * (1 + c.energy * 2 + energy * 0.3);
            c.energy *= Math.pow(0.93, dt * 60);
            this._drawCrystal(ctx, c, hue, intensity, energy);
        }

        // Light shards
        this._shards = this._shards.filter(s => s.life > 0.01);
        for (const s of this._shards) {
            s.x    += s.vx * dt;
            s.y    += s.vy * dt;
            s.vy   += 150 * dt;  // gravity
            s.life -= dt * 1.2;
            const sHue  = (hue + s.hue) % 360;
            const alpha = s.life * 0.8 * intensity;
            ctx.fillStyle = `hsla(${sHue}, 100%, 85%, ${alpha})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI*2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
