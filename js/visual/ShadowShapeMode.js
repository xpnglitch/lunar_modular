import { ShadowShapeMath } from '../math/ShadowShapeMath.js';

/**
 * ShadowShapeMode — Monolithic architecture with cinematic 2.5D lighting.
 * A giant floating central geometric structure casts massive soft shadows 
 * on an infinite grid floor. Notes trigger monolith fractures and orbiters.
 */
export class ShadowShapeMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new ShadowShapeMath();
        this.orbiters = [];
        this.impacts = [];
        this.initialized = false;
        this.rotX = 0;
        this.rotY = 0;
    }

    resize(w, h) { this.width = w; this.height = h; this.initialized = true; }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Spin the monolith hard
        this.rotX += (Math.random() - 0.5) * noteInfo.velocity;
        this.rotY += (Math.random() - 0.5) * noteInfo.velocity;
        
        // Floor impact flash
        const rPos = (noteInfo.normalizedPosition - 0.5) * 2; // -1 to 1
        this.impacts.push({
            x: rPos * 300, z: -100 + Math.random() * 200,
            life: 1.0, vel: noteInfo.velocity, hueShift: rPos * 60
        });

        // Launch an orbiter
        if (this.orbiters.length < 15) {
            this.orbiters.push({
                angle: Math.random() * Math.PI * 2,
                dist: 150 + Math.random() * 150,
                speed: (1 + Math.random() * 2) * (Math.random() < 0.5 ? 1 : -1),
                yOsc: Math.random() * Math.PI * 2,
                size: 8 + Math.random() * 15,
                hueShift: rPos * 80
            });
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _project(x, y, z, cx, cy, camZ, fov) {
        const scale = fov / (fov + z + camZ);
        return {
            x: cx + x * scale,
            y: cy + y * scale,
            scale, z
        };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.step(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity') || 0.5;
        const energy = this.mathInstance.energy;
        const cx = w / 2, cy = h / 2;
        const fov = 500;
        const camZ = 300;

        // Auto spin
        this.rotX += dt * 0.2 * (1 + energy);
        this.rotY += dt * 0.3 * (1 + energy);

        // --- Environment Backdrop ---
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, `hsla(${hue}, 40%, 15%, 1)`);
        bgGrad.addColorStop(1, `hsla(${hue}, 20%, 5%, 1)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // --- Virtual Grid Floor (Draw & Cast Shadows) ---
        const floorY = 200; // relative to center 3D space
        ctx.save();
        
        // Floor perspective grid
        ctx.lineWidth = 1;
        ctx.strokeStyle = `hsla(${hue}, 30%, 30%, 0.4)`;
        ctx.beginPath();
        for (let x = -800; x <= 800; x += 100) {
            const p1 = this._project(x, floorY, -400, cx, cy, camZ, fov);
            const p2 = this._project(x, floorY, 800, cx, cy, camZ, fov);
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        }
        for (let z = -400; z <= 800; z += 100) {
            const p1 = this._project(-800, floorY, z, cx, cy, camZ, fov);
            const p2 = this._project(800, floorY, z, cx, cy, camZ, fov);
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();

        // Floor Impact Flashes
        ctx.globalCompositeOperation = 'lighter';
        this.impacts = this.impacts.filter(i => i.life > 0.01);
        for (const imp of this.impacts) {
            imp.life -= dt * 1.5;
            const center = this._project(imp.x, floorY, imp.z, cx, cy, camZ, fov);
            const r = Math.max(0.1, 200 * imp.vel * imp.life * center.scale);
            const ig = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, r);
            ig.addColorStop(0, `hsla(${(hue + imp.hueShift) % 360},100%,70%,${imp.life * 0.8})`);
            ig.addColorStop(1, 'transparent');
            ctx.fillStyle = ig;
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, r, r * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Shadows of Monolith ---
        // We simulate a light source coming from top-front
        const lightY = -800;
        const shadowOffset = 180 + energy * 50; 
        
        ctx.fillStyle = `rgba(0,0,0,${0.7 - intensity * 0.2})`;
        ctx.shadowColor = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 60 + energy * 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const mainSize = 120 + Math.sin(this.time) * 10 + energy * 30;
        const mP = this._project(0, shadowOffset, 100, cx, cy, camZ, fov);
        ctx.beginPath();
        // Just draw an elliptical shadow blob for the monolith
        ctx.ellipse(mP.x, mP.y + 100, mainSize * mP.scale * 1.5, mainSize * mP.scale * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // remove shadow effects

        // --- Orbiting Sub-primitives ---
        this.orbiters = this.orbiters.filter(o => o.dist > 10);
        ctx.globalCompositeOperation = 'lighter';
        for (const orb of this.orbiters) {
            orb.angle += orb.speed * dt;
            const ox = Math.cos(orb.angle) * orb.dist;
            const oz = Math.sin(orb.angle) * orb.dist;
            const oy = Math.sin(this.time * 2 + orb.yOsc) * 80;
            
            const p = this._project(ox, oy, oz, cx, cy, camZ, fov);
            
            const r = orb.size * p.scale;
            const og = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
            og.addColorStop(0, `hsla(${(hue + orb.hueShift) % 360},100%,80%,${0.8 + energy * 0.2})`);
            og.addColorStop(1, 'transparent');
            ctx.fillStyle = og;
            ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2); ctx.fill();
            
            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- The Monolith (Octahedron/Cube hybrid) ---
        // Vertices of an octahedron
        const verts = [
            [0, -mainSize, 0], [0, mainSize, 0], // top, bottom
            [-mainSize, 0, 0], [mainSize, 0, 0], // left, right
            [0, 0, -mainSize], [0, 0, mainSize]  // front, back
        ];

        // Rotate vertices
        const rx = this.rotX, ry = this.rotY;
        const cosX = Math.cos(rx), sinX = Math.sin(rx);
        const cosY = Math.cos(ry), sinY = Math.sin(ry);
        
        const projVerts = verts.map(v => {
            // Rot Y
            let x = v[0] * cosY - v[2] * sinY;
            let z = v[0] * sinY + v[2] * cosY;
            // Rot X
            let y = v[1] * cosX - z * sinX;
            z = v[1] * sinX + z * cosX;
            return this._project(x, y, z, cx, cy, camZ, fov);
        });

        // Faces (indices of verts)
        const faces = [
            [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], // top half
            [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]  // bottom half
        ];

        // Sort faces by average Z depth (Painter's algorithm)
        const sortedFaces = faces.map(face => {
            const p1 = projVerts[face[0]], p2 = projVerts[face[1]], p3 = projVerts[face[2]];
            const avgZ = (p1.z + p2.z + p3.z) / 3;
            // Cross product to find normal/facing
            const vx1 = p2.x - p1.x, vy1 = p2.y - p1.y;
            const vx2 = p3.x - p1.x, vy2 = p3.y - p1.y;
            const normal = vx1 * vy2 - vy1 * vx2;
            return { face, p1, p2, p3, avgZ, normal };
        }).filter(f => f.normal < 0) // Front-face culling geometry!
          .sort((a, b) => b.avgZ - a.avgZ);

        for (let i = 0; i < sortedFaces.length; i++) {
            const f = sortedFaces[i];
            
            ctx.beginPath();
            ctx.moveTo(f.p1.x, f.p1.y);
            ctx.lineTo(f.p2.x, f.p2.y);
            ctx.lineTo(f.p3.x, f.p3.y);
            ctx.closePath();

            // Lighting based on normal intensity (fake diffuse)
            const lightVal = Math.abs(f.normal) / (mainSize * mainSize * 2);
            const faceHue = (hue + i * 15) % 360;
            
            const lum = 20 + lightVal * 60 + energy * 30;
            ctx.fillStyle = `hsla(${faceHue}, 60%, ${lum}%, 0.85)`;
            ctx.fill();

            // Wireframe wire edges
            ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.5 + energy * 0.5})`;
            ctx.lineWidth = 1 + energy * 2;
            ctx.stroke();
        }

        // --- Fracture Glow ---
        // If high energy, draw an overlaid wireframe that's scaled out slightly to look like it's shattering
        if (energy > 0.4) {
            ctx.globalCompositeOperation = 'lighter';
            const fracScale = 1.05 + energy * 0.15;
            ctx.lineWidth = energy * 4;
            ctx.strokeStyle = `hsla(${hue + 40}, 100%, 70%, ${energy * 0.8})`;
            for (const f of sortedFaces) {
                const cxF = (f.p1.x + f.p2.x + f.p3.x) / 3;
                const cyF = (f.p1.y + f.p2.y + f.p3.y) / 3;
                ctx.beginPath();
                ctx.moveTo(cxF + (f.p1.x - cxF) * fracScale, cyF + (f.p1.y - cyF) * fracScale);
                ctx.lineTo(cxF + (f.p2.x - cxF) * fracScale, cyF + (f.p2.y - cyF) * fracScale);
                ctx.lineTo(cxF + (f.p3.x - cxF) * fracScale, cyF + (f.p3.y - cyF) * fracScale);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    }
}
