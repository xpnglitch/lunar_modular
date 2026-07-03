/**
 * IFSMath — Iterated Function Systems with note-seeded walkers.
 * Each NOTE spawns an independent walker seeded from the note's pitch.
 * Walkers accumulate a trail of positions (ring buffer) so the fractal
 * shape builds up visibly without needing millions of points per frame.
 */
export class IFSMath {
    constructor() {
        this.presets = {
            fern: {
                name: 'Barnsley Fern',
                transforms: [
                    { a:0,    b:0,    c:0,    d:0.16, e:0,    f:0,    p:0.01 },
                    { a:0.85, b:0.04, c:-0.04,d:0.85, e:0,    f:1.6,  p:0.85 },
                    { a:0.2,  b:-0.26,c:0.23, d:0.22, e:0,    f:1.6,  p:0.07 },
                    { a:-0.15,b:0.28, c:0.26, d:0.24, e:0,    f:0.44, p:0.07 },
                ],
                bounds: { x:[-2.5,2.5], y:[0,10] },
            },
            sierpinski: {
                name: 'Sierpinski Triangle',
                transforms: [
                    { a:0.5, b:0, c:0, d:0.5, e:0,    f:0,   p:0.33 },
                    { a:0.5, b:0, c:0, d:0.5, e:0.5,  f:0,   p:0.33 },
                    { a:0.5, b:0, c:0, d:0.5, e:0.25, f:0.43,p:0.34 },
                ],
                bounds: { x:[0,1], y:[0,1] },
            },
            dragon: {
                name: 'Dragon Curve',
                transforms: [
                    { a:0.5,  b:-0.5, c:0.5,  d:0.5,  e:0, f:0, p:0.5 },
                    { a:-0.5, b:-0.5, c:0.5,  d:-0.5, e:1, f:0, p:0.5 },
                ],
                bounds: { x:[-0.5,1.5], y:[-0.5,1.5] },
            },
            coral: {
                name: 'Coral',
                transforms: [
                    { a:0.307, b:0.531, c:-0.155, d:0.058, e:0.397,  f:0.278,  p:0.4  },
                    { a:0.307, b:-0.534,c:0.533,  d:0.327, e:-0.011, f:-0.214, p:0.35 },
                    { a:0.602, b:0,     c:0,      d:0.602, e:0.183,  f:0.320,  p:0.25 },
                ],
                bounds: { x:[-0.5,1], y:[-0.5,1] },
            },
            tree: {
                name: 'Tree',
                transforms: [
                    { a:0,    b:0,    c:0,    d:0.5,  e:0, f:0,   p:0.05 },
                    { a:0.42, b:-0.42,c:0.42, d:0.42, e:0, f:0.2, p:0.40 },
                    { a:0.42, b:0.42, c:-0.42,d:0.42, e:0, f:0.2, p:0.40 },
                    { a:0.1,  b:0,    c:0,    d:0.1,  e:0, f:0.2, p:0.15 },
                ],
                bounds: { x:[-0.5,0.5], y:[0,1] },
            },
            maple: {
                name: 'Maple Leaf',
                transforms: [
                    { a:0.14, b:0.01,  c:0,     d:0.51, e:-0.08, f:-1.31, p:0.20 },
                    { a:0.43, b:0.52,  c:-0.45, d:0.5,  e:1.49,  f:-0.75, p:0.35 },
                    { a:0.45, b:-0.49, c:0.47,  d:0.47, e:-1.62, f:-0.74, p:0.30 },
                    { a:0.49, b:0,     c:0,     d:0.51, e:0.02,  f:1.62,  p:0.15 },
                ],
                bounds: { x:[-2.5,2.5], y:[-2,2] },
            },
            snowflake: {
                name: 'Snowflake',
                transforms: [
                    { a:0.382,b:0, c:0, d:0.382, e:0.309, f:0.309,  p:0.17 },
                    { a:0.382,b:0, c:0, d:0.382, e:0.618, f:0,      p:0.17 },
                    { a:0.382,b:0, c:0, d:0.382, e:0.309, f:-0.309, p:0.17 },
                    { a:0.382,b:0, c:0, d:0.382, e:0,     f:0,      p:0.17 },
                    { a:0.382,b:0, c:0, d:0.382, e:1,     f:0,      p:0.16 },
                    { a:0.382,b:0, c:0, d:0.382, e:0.5,   f:0.5,    p:0.16 },
                ],
                bounds: { x:[0,1], y:[-0.5,0.5] },
            },
            spiral: {
                name: 'Spiral',
                transforms: [
                    { a:0.787879,  b:-0.424242, c:0.242424, d:0.859848, e:1.758647,  f:1.408065, p:0.9  },
                    { a:-0.121212, b:0.257576,  c:0.151515, d:0.053030, e:-6.721654, f:1.377236, p:0.05 },
                    { a:0.181818,  b:-0.136364, c:0.090909, d:0.181818, e:6.086107,  f:1.568035, p:0.05 },
                ],
                bounds: { x:[-8,8], y:[-1,12] },
            },
        };

        this._walkers    = [];
        this._maxWalkers = 12;
        this._TRAIL      = 300;

        // ── Modulation state ──────────────────────────────────────────────
        // Notes drive these targets; values decay back to 0 when silent.
        // rotation: nudges b,c off-diagonal → rotates/leans branches
        // scale:    nudges a,d diagonal     → stretches/shrinks branches
        // twist:    shifts probability weights between transforms
        this._mod = { rotation: 0, scale: 0, twist: 0 };
        this._modTarget = { rotation: 0, scale: 0, twist: 0 };
        this._liveTransforms = null; // computed each frame

        // Ambient walker — always running so fractal is visible without notes
        this._ambient = this._makeWalker(0.01, 0.01, 180, 0.3);

        this.energy = 0;
        this.nx = 0.5;
        this.ny = 0.5;

        this.setPreset('fern');
    }

    _makeWalker(x, y, hue, vel) {
        return { x, y, life: 1, maxLife: 1, hue, vel, pts: [] };
    }

    setPreset(name) {
        const p = this.presets[name];
        if (!p) return;
        this._preset = p;
        this._walkers = [];
        this._ambient.pts = [];
        this._ambient.x = 0.01; this._ambient.y = 0.01;
        // Reset modulation
        this._mod = { rotation: 0, scale: 0, twist: 0 };
        this._modTarget = { rotation: 0, scale: 0, twist: 0 };
        this._buildLiveTransforms();
        for (let i = 0; i < 50; i++) this._step(this._ambient);
    }

    // ── Build modulated transforms from base preset + current mod state ──
    _buildLiveTransforms() {
        const base = this._preset.transforms;
        const { rotation, scale, twist } = this._mod;
        const n = base.length;

        this._liveTransforms = base.map((t, i) => {
            // Rotation: add offset to off-diagonal (b, c)
            // Sign alternates per transform so they fan out rather than all lean same way
            const sign = (i % 2 === 0) ? 1 : -1;
            const bMod = t.b + rotation * sign * 0.25;
            const cMod = t.c + rotation * sign * 0.25;

            // Scale: multiply diagonal by (1 + scale * 0.4)
            // Clamp to avoid collapse or explosion
            const sMult = Math.max(0.4, Math.min(1.6, 1 + scale * 0.4));
            const aMod = t.a * sMult;
            const dMod = t.d * sMult;

            // Probability twist: shift weight toward higher-index transforms
            // twist > 0 → later transforms dominate; twist < 0 → first dominates
            const pShift = twist * (i / (n - 1) - 0.5) * 0.4;
            const pMod = Math.max(0.01, t.p + pShift);

            return { a: aMod, b: bMod, c: cMod, d: dMod, e: t.e, f: t.f, p: pMod };
        });

        // Normalise probabilities so they sum to 1
        const total = this._liveTransforms.reduce((s, t) => s + t.p, 0);
        for (const t of this._liveTransforms) t.p /= total;
    }

    // ── Note seeding + modulation ─────────────────────────────────────────
    // pitch   → rotation mod  (high notes lean branches one way, low the other)
    // velocity → scale mod    (loud = longer/bigger branches)
    // note count → twist mod  (chords shift probability weights)
    addNote(info) {
        const vel  = info.velocity           ?? 0.5;
        const note = info.midiNote           ?? 60;
        const np   = info.normalizedPosition ?? 0.5;  // 0–1 across keyboard

        // Push mod targets — centred at 0 so silence = base shape
        this._modTarget.rotation = (np - 0.5) * 2;   // -1 to +1
        this._modTarget.scale    = vel - 0.3;         // -0.3 to +0.7
        this._modTarget.twist    = (np - 0.5) * 1.5;

        // Walker for visual trail (uses same live transforms, so it draws the morphed fractal)
        const presetNames = Object.keys(this.presets);
        const idx = Math.floor(np * presetNames.length);
        const presetName = presetNames[Math.max(0, Math.min(presetNames.length - 1, idx))];
        const preset = this.presets[presetName];
        const b = preset.bounds;
        const seedX = b.x[0] + Math.random() * (b.x[1] - b.x[0]);
        const seedY = b.y[0] + Math.random() * (b.y[1] - b.y[0]);

        const walker = this._makeWalker(seedX, seedY, (note * 8) % 360, vel);
        walker.maxLife = 1.0 + vel * 2.0;
        walker._preset = preset;

        for (let i = 0; i < 20; i++) this._step(walker);

        this._walkers.push(walker);
        if (this._walkers.length > this._maxWalkers) this._walkers.shift();
        this.energy = Math.min(1, this.energy + vel * 0.4);
    }

    addPulse(energy) { this.energy = Math.min(1, this.energy + energy); }


    _step(w) {
        // Note walkers carry their own preset; ambient uses live (modulated) transforms
        const ts = w._preset
            ? w._preset.transforms
            : (this._liveTransforms || this._preset.transforms);
        let r = Math.random(), acc = 0, t;
        for (const tr of ts) { acc += tr.p; if (r <= acc) { t = tr; break; } }
        if (!t) t = ts[ts.length - 1];
        const nx = t.a * w.x + t.b * w.y + t.e;
        const ny = t.c * w.x + t.d * w.y + t.f;
        w.x = nx; w.y = ny;
    }

    _stepRecord(w) {
        this._step(w);
        const b  = (w._preset || this._preset).bounds;
        const nx = (w.x - b.x[0]) / (b.x[1] - b.x[0]);
        const ny = (w.y - b.y[0]) / (b.y[1] - b.y[0]);
        if (w.pts.length >= this._TRAIL) w.pts.shift();
        w.pts.push({ nx, ny });
    }

    // ── Main frame step ───────────────────────────────────────────────────
    step(dt, complexity) {
        this.energy *= 0.97;

        // Smooth mod values toward targets, decay targets toward 0
        const mSmooth = 1 - Math.exp(-dt * 3);
        const mDecay  = 1 - Math.exp(-dt * 0.8);
        for (const k of ['rotation', 'scale', 'twist']) {
            this._mod[k] += (this._modTarget[k] - this._mod[k]) * mSmooth;
            this._modTarget[k] *= (1 - mDecay); // decay target back toward 0
        }
        this._buildLiveTransforms();

        // Decay note walkers
        for (const w of this._walkers) w.life -= dt / w.maxLife;
        this._walkers = this._walkers.filter(w => w.life > 0);

        // Ambient: 200 recorded steps/frame
        for (let i = 0; i < 200; i++) this._stepRecord(this._ambient);

        // Note walkers: 150 recorded steps each/frame
        for (const w of this._walkers) {
            for (let i = 0; i < 150; i++) this._stepRecord(w);
        }

        const ref = this._walkers.length > 0
            ? this._walkers[this._walkers.length - 1]
            : this._ambient;
        const b = this._preset.bounds;
        this.nx = Math.max(0, Math.min(1, (ref.x - b.x[0]) / (b.x[1] - b.x[0])));
        this.ny = Math.max(0, Math.min(1, (ref.y - b.y[0]) / (b.y[1] - b.y[0])));
    }

    getAudioModulation() {
        return { filterMod: this.nx, lfoRate: this.ny, detuneMod: (this.nx - 0.5) * 0.8 };
    }

    // ── Render ────────────────────────────────────────────────────────────
    render(ctx, w, h, baseHue) {
        // Ambient trail — dim, baseHue coloured
        for (const pt of this._ambient.pts) {
            const sx = pt.nx * w;
            const sy = (1 - pt.ny) * h;
            ctx.fillStyle = `hsla(${baseHue},55%,65%,0.07)`;
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }

        // Note walker trails — brighter, pitch-coloured
        for (const walker of this._walkers) {
            const alpha = walker.life * (0.4 + walker.vel * 0.35);
            ctx.fillStyle = `hsla(${walker.hue},90%,70%,${alpha})`;
            for (const pt of walker.pts) {
                const sx = pt.nx * w;
                const sy = (1 - pt.ny) * h;
                if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
                    ctx.fillRect(sx - 1, sy - 1, 2, 2);
                }
            }
        }
    }
}
