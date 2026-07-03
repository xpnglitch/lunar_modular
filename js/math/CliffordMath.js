/**
 * CliffordMath — Native 3D De Jong Strange Attractors
 * 
 * "Indestructible Cloud" Mode: Uses 3D De Jong equations which are 
 * mathematically guaranteed to produce high-density 3D volumes.
 */
export class CliffordMath {
    constructor() {
        this.presets = {
            classic: { a: 1.4, b:-2.3, c: 2.4, d:-2.1, e: 1.2, f: 1.5, name: 'Classic' },
            galaxy:  { a:-2.7, b:-0.1, c:-0.9, d:-2.2, e: 1.8, f:-1.2, name: 'Galaxy' },
            mandala: { a:-0.7, b: 1.7, c:-0.9, d: 2.6, e: 0.6, f: 1.2, name: 'Mandala' },
            chaos:   { a: 2.0, b: 2.2, c: 1.8, d: 2.1, e: 1.9, f: 2.3, name: 'Hyper Chaos' }
        };

        this._RES   = 384;
        this._hist  = new Int32Array(this._RES * this._RES);
        this._active = []; 
        this._maxDensity = 1;
        
        this._x = 0.1; this._y = 0.1; this._z = 0.1;
        
        this._baseParams = { a:1, b:1, c:1, d:1, e:1, f:1 };
        this._curParams  = { a:1, b:1, c:1, d:1, e:1, f:1 };
        this._modTargets = { a:0, b:0, c:0, d:0, e:0, f:0 };
        
        this._rotY = 0;
        this._rotX = 0.5;
        
        this.energy = 0;
        this.nx = 0.5; this.ny = 0.5;

        this.setPreset('classic');
    }

    setPreset(name) {
        const p = this.presets[name] || this.presets.classic;
        this._preset = p;
        // Add a tiny unique seed offset so no two "Nebulas" are identical
        const s = () => (Math.random() - 0.5) * 0.08;
        this._baseParams = { a: p.a + s(), b: p.b + s(), c: p.c + s(), d: p.d + s(), e: p.e + s(), f: p.f + s() };
        this._curParams  = { ...this._baseParams };
        this._modTargets = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
        this._x = Math.random() * 0.2; this._y = Math.random() * 0.2; this._z = Math.random() * 0.2;
    }

    onNoteOn(info) {
        const vel = info.velocity || 0.5;
        const np = info.normalizedPosition || 0.5;
        
        this._modTargets.a = (np - 0.5) * 0.5;
        this._modTargets.b = (np - 0.5) * -0.5;
        this._modTargets.c = (vel - 0.5) * 0.4;
        this._modTargets.d = (vel - 0.5) * 0.4;
        this._modTargets.e = (np - 0.5) * 0.3;
        
        this._rotY += (np - 0.5) * 0.8;
        this.energy = Math.min(1.0, this.energy + vel * 0.8);
    }

    _iterate(n) {
        const { a, b, c, d, e, f } = this._curParams;
        const R = this._RES;
        const hist = this._hist;
        
        for (const idx of this._active) hist[idx] = 0;
        this._active = [];
        this._maxDensity = 1;

        let x = this._x, y = this._y, z = this._z;
        const cosY = Math.cos(this._rotY), sinY = Math.sin(this._rotY);
        const cosX = Math.cos(this._rotX), sinX = Math.sin(this._rotX);

        for (let i = 0; i < n; i++) {
            // 3D De Jong Equations
            // x' = sin(a*y) - cos(b*x)
            // y' = sin(c*z) - cos(d*y)
            // z' = sin(e*x) - cos(f*z)
            const nx = Math.sin(a * y) - Math.cos(b * x);
            const ny = Math.sin(c * z) - Math.cos(d * y);
            const nz = Math.sin(e * x) - Math.cos(f * z);
            x = nx; y = ny; z = nz;

            if (isNaN(x)) { x = 0.1; y = 0.1; z = 0.1; break; }

            // 3D Projection
            let tx = x * cosY + z * sinY;
            let tz = -x * sinY + z * cosY;
            let ty = y * cosX - tz * sinX;
            let finalZ = y * sinX + tz * cosX;

            const pScale = (2.2 + this.energy * 1.5) / (4.0 + finalZ * 0.6);
            // Map [-2, 2] projected range to [0, R]
            const gx = (tx * pScale + 2) * 0.25 * R | 0;
            const gy = (ty * pScale + 2) * 0.25 * R | 0;
            
            if (gx >= 0 && gx < R && gy >= 0 && gy < R) {
                const idx = gy * R + gx;
                if (hist[idx] === 0) this._active.push(idx);
                const val = ++hist[idx];
                if (val > this._maxDensity) this._maxDensity = val;
            }
        }
        this._x = x; this._y = y; this._z = z;
        this.nx = (x + 2) / 4;
        this.ny = (y + 2) / 4;
    }

    step(dt, complexity) {
        this.energy *= 0.95;
        this._rotY += dt * (0.05 + this.energy * 0.4);
        
        const lerpRate = 1 - Math.exp(-dt * 3.5);
        const decayRate = 1 - Math.exp(-dt * 0.3);
        for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) {
            const target = this._baseParams[k] + this._modTargets[k];
            this._curParams[k] += (target - this._curParams[k]) * lerpRate;
            this._modTargets[k] *= (1 - decayRate);
        }

        const iters = Math.floor(150000 + complexity * 200000 + this.energy * 100000);
        this._iterate(iters);
    }

    getAudioModulation() {
        return { filterMod: this.nx, lfoRate: this.ny, detuneMod: (this.nx - 0.5) * 0.8 };
    }

    render(ctx, w, h, hue) {
        const R = this._RES;
        const hist = this._hist;
        const maxD = this._maxDensity;
        const scaleX = w / R;
        const scaleY = h / R;
        const logMax = Math.log(maxD + 1);

        for (const idx of this._active) {
            const v = hist[idx];
            if (v < 3) continue; // Slightly higher noise floor for cleaner contrast

            const gx = idx % R;
            const gy = (idx / R) | 0;

            const t = Math.log(v + 1) / logMax;
            // SHARPER CONTRAST: Use pow(t, 1.8) for deeper blacks and brighter highlights
            const contrast = Math.pow(t, 1.8);
            const alpha = contrast * (0.7 + this.energy * 0.3);
            const pColor = (hue + t * 120) % 360;
            const lightness = 35 + contrast * 55;
            
            ctx.fillStyle = `hsla(${pColor}, 90%, ${lightness}%, ${alpha})`;
            ctx.fillRect(gx * scaleX - 1, gy * scaleY - 1, scaleX + 1.2, scaleY + 1.2);
        }
    }
}
