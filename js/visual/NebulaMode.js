import { NebulaMath } from '../math/NebulaMath.js';

/**
 * NebulaMode — Deep Space Nursery.
 * A high-fidelity cinematic simulation of interstellar gas clouds, 
 * featuring multi-pass volumetric gaseous layers, dark dust filament absorption, 
 * and embedded star-forming protostars that ignite on audio transients.
 */
export class NebulaMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new NebulaMath();
        this.initialized = false;
        this._stars = [];
        this._filaments = [];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._initBackdrop(w, h);
        this.initialized = true;
    }

    _initBackdrop(w, h) {
        // Distant Starfield
        this._stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            s: 0.5 + Math.random() * 1.5,
            a: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2
        }));

        // Dark Dust Filaments
        this._filaments = Array.from({ length: 12 }, () => {
             const pts = [];
             let fx = Math.random(), fy = Math.random();
             const ang = Math.random() * Math.PI * 2;
             for (let i = 0; i < 15; i++) {
                 pts.push({ x: fx, y: fy });
                 fx += Math.cos(ang + Math.sin(i * 0.5) * 1.2) * 0.05;
                 fy += Math.sin(ang + Math.cos(i * 0.5) * 0.8) * 0.05;
             }
             return { pts, opacity: 0.2 + Math.random() * 0.4, speed: (Math.random() - 0.5) * 0.2 };
        });
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        const x = noteInfo.normalizedPosition;
        const y = 0.2 + Math.random() * 0.6;
        this.mathInstance.addCloud(x, y, noteInfo.frequency, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 0;
        const speed = Number(mathEngine.get('speed')) || 1.0;

        this.mathInstance.step(dt, complexity, speed, mathEngine.getLightPressure());
        const totalEnergy = Number(this.mathInstance.clouds.reduce((s,c) => s + c.energy, 0) / 5) || 0;

        // --- Deep Cosmic Void ---
        ctx.fillStyle = '#010008';
        ctx.fillRect(0, 0, w, h);

        // Twinkling Starfield
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this._stars) {
            const tw = 0.5 + 0.5 * Math.sin(this.time * 2 + s.phase);
            ctx.fillStyle = `hsla(220, 100%, 90%, ${s.a * tw * intensity})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // --- Dark Dust Lanes (Absorption) ---
        ctx.save();
        ctx.strokeStyle = `rgba(0,0,0,${0.2 * (0.5 + intensity * 0.5)})`;
        ctx.lineCap = 'round';
        ctx.lineWidth = 15 + complexity * 30;
        for (const f of this._filaments) {
            const drift = Math.sin(this.time * f.speed) * 0.02;
            ctx.beginPath();
            ctx.moveTo((f.pts[0].x + drift) * w, f.pts[0].y * h);
            for (let i = 1; i < f.pts.length; i++) {
                ctx.lineTo((f.pts[i].x + drift) * w, f.pts[i].y * h);
            }
            ctx.stroke();
        }
        ctx.restore();

        // --- Volumetric Gaseous Clouds ---
        ctx.globalCompositeOperation = 'screen';
        for (const c of this.mathInstance.clouds) {
            const cx = c.x * w, cy = c.y * h;
            const cHue = (hue + c.hue) % 360;
            const cR = c.radius * Math.min(w, h) * (0.8 + complexity * 0.4);
            const cAlpha = c.life * 0.15 * intensity;

            // Multi-pass volumetric layers
            const layers = 5 + Math.floor(complexity * 8);
            for (let l = 0; l < layers; l++) {
                const lRatio = 1 - (l / layers) * 0.5;
                const lR = cR * lRatio;
                const lAlpha = cAlpha * (1 - (l / layers) * 0.8) / layers * 2.5;
                
                // Offset each layer slight for depth
                const ox = Math.sin(this.time * 0.5 + l) * lR * 0.1;
                const oy = Math.cos(this.time * 0.4 + l) * lR * 0.08;

                const cg = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, lR);
                cg.addColorStop(0, `hsla(${cHue}, 80%, 65%, ${lAlpha})`);
                cg.addColorStop(0.4, `hsla(${(cHue + 20) % 360}, 60%, 40%, ${lAlpha * 0.5})`);
                cg.addColorStop(1, 'transparent');
                
                ctx.fillStyle = cg;
                ctx.beginPath(); ctx.arc(cx + ox, cy + oy, lR, 0, Math.PI * 2); ctx.fill();
            }

            // Embedded Protostars (Nursery Ignition)
            for (const s of c.stars) {
                if (s.bright < 0.05) continue;
                const sx = cx + s.ox * w;
                const sy = cy + s.oy * h;
                const sSize = 2 + s.bright * 10 * intensity;
                const sHue = (cHue + 60) % 360;
                
                const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sSize * 5);
                sg.addColorStop(0, `hsla(${sHue}, 100%, 95%, ${s.bright * intensity})`);
                sg.addColorStop(0.3, `hsla(${sHue}, 80%, 70%, ${s.bright * 0.3 * intensity})`);
                sg.addColorStop(1, 'transparent');
                ctx.fillStyle = sg;
                ctx.beginPath(); ctx.arc(sx, sy, sSize * 5, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(sx, sy, sSize * 0.4, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
