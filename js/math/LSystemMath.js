/**
 * LSystemMath Ã¢â‚¬â€ Full L-System grammar engine
 * Named rulesets each define axiom, production rules, angle, and depth.
 * The turtle interpreter renders F=forward, +=turn right, -=turn left,
 * [=push state, ]=pop state, |=180Ã‚Â°, X/Y/A/B=structural (non-drawing).
 */
export class LSystemMath {
    constructor() {
        this.presets = {
            tree: {
                name: 'Tree',
                axiom: 'F',
                rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
                angle: 25, depth: 5, startAngle: -90,
            },
            fern: {
                name: 'Fern',
                axiom: 'X',
                rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
                angle: 25, depth: 6, startAngle: -90,
            },
            dragon: {
                name: 'Dragon',
                axiom: 'FX',
                rules: { X: 'X+YF+', Y: '-FX-Y' },
                angle: 90, depth: 12, startAngle: 0,
            },
            sierpinski: {
                name: 'Sierpinski',
                axiom: 'F-G-G',
                rules: { F: 'F-G+F+G-F', G: 'GG' },
                angle: 120, depth: 6, startAngle: 0,
            },
            coral: {
                name: 'Coral',
                axiom: 'F',
                rules: { F: 'F[+F]F[-F][F]' },
                angle: 20, depth: 5, startAngle: -90,
            },
            snowflake: {
                name: 'Snowflake',
                axiom: 'F++F++F',
                rules: { F: 'F-F++F-F' },
                angle: 60, depth: 5, startAngle: 0,
            },
            seaweed: {
                name: 'Seaweed',
                axiom: 'F',
                rules: { F: 'F[+F[-F]][-F[+F]]' },
                angle: 22, depth: 5, startAngle: -90,
            },
            hilbert: {
                name: 'Hilbert',
                axiom: 'A',
                rules: { A: '+BF-AFA-FB+', B: '-AF+BFB+FA-' },
                angle: 90, depth: 6, startAngle: 0,
            },
            bush: {
                name: 'Bush',
                axiom: 'Y',
                rules: { X: 'X[-FFF][+FFF]FX', Y: 'YFX[+Y][-Y]' },
                angle: 25.7, depth: 5, startAngle: -90,
            },
            crystal: {
                name: 'Crystal',
                axiom: 'F+F+F+F',
                rules: { F: 'FF+F++F+F' },
                angle: 90, depth: 4, startAngle: 0,
            },
            levy: {
                name: 'LÃƒÂ©vy',
                axiom: 'F',
                rules: { F: '+F--F+' },
                angle: 45, depth: 10, startAngle: 0,
            },
            peano: {
                name: 'Peano',
                axiom: 'F',
                rules: { F: 'F+F-F-F-F+F+F+F-F' },
                angle: 90, depth: 4, startAngle: 0,
            },
        };

        this.time   = 0;
        this.energy = 0;
        this.complexity = 0;
        this._currentPreset = 'tree';
        this._string = '';
        this._dirty  = true;
        this._generate();
    }

    setStyle(name) {
        if (this.presets[name]) {
            this._currentPreset = name;
            this._dirty = true;
            this._generate();
        }
    }

    _generate() {
        const p = this.presets[this._currentPreset];
        let s = p.axiom;
        const depth = Math.min(p.depth, 8);
        for (let i = 0; i < depth; i++) {
            let next = '';
            for (const ch of s) {
                next += p.rules[ch] || ch;
            }
            s = next;
            if (s.length > 80000) break;
        }
        this._string = s;
        this._dirty = false;
        this._bounds = this._computeBounds(p);
    }

    // Dry-run the turtle at unit step length to get actual bounding box
    _computeBounds(p) {
        const angle  = p.angle * Math.PI / 180;
        const startA = ((p.startAngle ?? -90)) * Math.PI / 180;
        let cx = 0, cy = 0, ca = startA;
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        const stack = [];
        for (const ch of this._string) {
            switch (ch) {
                case 'F': case 'G': {
                    cx += Math.cos(ca);
                    cy += Math.sin(ca);
                    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                    break;
                }
                case '+': ca += angle; break;
                case '-': ca -= angle; break;
                case '|': ca += Math.PI; break;
                case '[': stack.push({ cx, cy, ca }); break;
                case ']': if (stack.length) ({ cx, cy, ca } = stack.pop()); break;
            }
        }
        return { minX, maxX, minY, maxY,
            w: Math.max(maxX - minX, 0.01),
            h: Math.max(maxY - minY, 0.01) };
    }

    addPulse(x, energy) {
        this.energy = Math.min(1.0, this.energy + energy);
    }

    step(dt, complexity) {
        this.time += dt;
        this.complexity = complexity;
        this.energy *= 0.96;
    }

    getAudioModulation() {
        return { filterMod: this.energy * 0.4, resonance: 1 + this.energy * 2 };
    }

    render(ctx, w, h, hue) {
        const p = this.presets[this._currentPreset];
        if (!this._string || !this._bounds) return;

        const pad  = 0.1;
        const b    = this._bounds;
        const angle = (p.angle + this.energy * 3) * Math.PI / 180;
        const startA = ((p.startAngle ?? -90)) * Math.PI / 180;

        // Scale unit-step bounding box to fit the screen with padding
        const scaleX = (w * (1 - pad * 2)) / b.w;
        const scaleY = (h * (1 - pad * 2)) / b.h;
        const scale  = Math.min(scaleX, scaleY);

        // Offset so bounding box is centred on screen
        const offX = w * 0.5 - (b.minX + b.w * 0.5) * scale;
        const offY = h * 0.5 - (b.minY + b.h * 0.5) * scale;

        ctx.save();
        ctx.translate(offX, offY);

        const stack = [];
        let cx = 0, cy = 0, ca = startA, depth = 0;

        for (const ch of this._string) {
            switch (ch) {
                case 'F': case 'G': {
                    const nx = cx + Math.cos(ca);
                    const ny = cy + Math.sin(ca);
                    const d  = Math.min(depth, 12);
                    const t  = d / 12;
                    const alpha = (0.45 + t * 0.55) * (0.6 + this.energy * 0.4);
                    const lw    = Math.max(0.5, (3 - t * 2.5) * Math.min(1, scale * 0.5));
                    const segHue = (hue + d * 15) % 360;
                    ctx.strokeStyle = `hsla(${segHue},80%,${45 + t * 30}%,${alpha})`;
                    ctx.lineWidth = lw;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(cx * scale, cy * scale);
                    ctx.lineTo(nx * scale, ny * scale);
                    ctx.stroke();
                    cx = nx; cy = ny;
                    break;
                }
                case '+': ca += angle + Math.sin(this.time * 1.3 + depth) * 0.03 * this.energy; break;
                case '-': ca -= angle + Math.sin(this.time * 1.7 + depth) * 0.03 * this.energy; break;
                case '|': ca += Math.PI; break;
                case '[': stack.push({ cx, cy, ca }); depth++; break;
                case ']':
                    if (stack.length) { ({ cx, cy, ca } = stack.pop()); depth = Math.max(0, depth - 1); }
                    break;
            }
        }

        ctx.restore();
    }
}
