/**
 * AttractorMath â€” Multi-system Strange Attractor engine
 * Supports: Lorenz, RÃ¶ssler, Thomas, Dadras, Halvorsen, Aizawa,
 *           Burke-Shaw, Sprott B, Chen, Dequan Li
 */
export class AttractorMath {
    constructor() {
        this.presets = {
            lorenz:    { sys: 'lorenz',   p: { sigma:10, rho:28, beta:8/3 },         bounds: { x:[-25,25], y:[-30,30], z:[0,55] } },
            rossler:   { sys: 'rossler',  p: { a:0.2, b:0.2, c:5.7 },               bounds: { x:[-12,12], y:[-12,12], z:[0,25] } },
            thomas:    { sys: 'thomas',   p: { b:0.19 },                             bounds: { x:[-5,5],   y:[-5,5],   z:[-5,5] } },
            dadras:    { sys: 'dadras',   p: { a:3, b:2.7, c:1.7, d:2, e:9 },       bounds: { x:[-10,10], y:[-10,10], z:[-10,10] } },
            halvorsen: { sys: 'halvorsen',p: { a:1.4 },                              bounds: { x:[-10,10], y:[-10,10], z:[-10,10] } },
            aizawa:    { sys: 'aizawa',   p: { a:0.95, b:0.7, c:0.6, d:3.5, e:0.25, f:0.1 }, bounds: { x:[-2,2], y:[-2,2], z:[-2,2] } },
            burkeshaw: { sys: 'burkeshaw',p: { s:10, e:13 },                         bounds: { x:[-3,3],   y:[-3,3],   z:[-3,3] } },
            sprottb:   { sys: 'sprottb',  p: { a:0.4, b:1.2, c:1 },                 bounds: { x:[-3,3],   y:[-3,3],   z:[-3,3] } },
            chen:      { sys: 'chen',     p: { a:35, b:3, c:28 },                    bounds: { x:[-25,25], y:[-30,30], z:[0,50] } },
            dequanli:  { sys: 'dequanli', p: { a:40, b:1.833, c:0.16, d:0.65, e:55, f:20 }, bounds: { x:[-60,60], y:[-60,60], z:[0,100] } },
        };

        this.currentPreset = 'lorenz';
        this._applyPreset('lorenz');

        this.x = 0.1; this.y = 0; this.z = 0;
        this.nx = 0.5; this.ny = 0.5; this.nz = 0.5;
        this.xMin = -25; this.xMax = 25;
        this.yMin = -25; this.yMax = 25;
        this.zMin = 0;   this.zMax = 50;
        this.history = [];
        this.maxHistory = 2500;
        this.speed = 0;
    }

    _applyPreset(name) {
        const p = this.presets[name];
        if (!p) return;
        this.currentPreset = name;
        this._sys = p.sys;
        this._p = p.p;
        const b = p.bounds;
        this.xMin = b.x[0]; this.xMax = b.x[1];
        this.yMin = b.y[0]; this.yMax = b.y[1];
        this.zMin = b.z[0]; this.zMax = b.z[1];
        // Reset state
        this.x = (Math.random() - 0.5) * 0.1 + 0.01;
        this.y = (Math.random() - 0.5) * 0.1;
        this.z = (Math.random() - 0.5) * 0.1;
        this.history = [];
    }

    setPreset(name) { this._applyPreset(name); }

    _derivatives(x, y, z) {
        const p = this._p;
        switch (this._sys) {
            case 'lorenz':
                return [p.sigma*(y-x), x*(p.rho-z)-y, x*y - p.beta*z];
            case 'rossler':
                return [-(y+z), x + p.a*y, p.b + z*(x - p.c)];
            case 'thomas':
                return [Math.sin(y) - p.b*x, Math.sin(z) - p.b*y, Math.sin(x) - p.b*z];
            case 'dadras':
                return [y - p.a*x + p.b*y*z, p.c*y - x*z + z, p.d*x*y - p.e*z];
            case 'halvorsen':
                return [-p.a*x - 4*y - 4*z - y*y, -p.a*y - 4*z - 4*x - z*z, -p.a*z - 4*x - 4*y - x*x];
            case 'aizawa':
                return [(z-p.b)*x - p.d*y, p.d*x + (z-p.b)*y, p.c + p.a*z - z*z*z/3 - (x*x+y*y)*(1+p.e*z) + p.f*z*x*x*x];
            case 'burkeshaw':
                return [-p.s*(x + y), -y - p.s*x*z, p.s*x*y + p.e];
            case 'sprottb':
                return [p.a*y*z, p.b - p.b*y, p.c - x*y];
            case 'chen':
                return [p.a*(y-x), (p.c-p.a)*x - x*z + p.c*y, x*y - p.b*z];
            case 'dequanli':
                return [p.a*(y-x) + p.d*x*z, p.f*y - x*z, p.c*z + x*y - p.b*x*x];
            default:
                return [0, 0, 0];
        }
    }

    step(dt, complexity = 0.3) {
        const h = Math.min(dt * (1 + complexity * 2) * 4, 0.015);

        const [k1x,k1y,k1z] = this._derivatives(this.x, this.y, this.z);
        const [k2x,k2y,k2z] = this._derivatives(this.x+h/2*k1x, this.y+h/2*k1y, this.z+h/2*k1z);
        const [k3x,k3y,k3z] = this._derivatives(this.x+h/2*k2x, this.y+h/2*k2y, this.z+h/2*k2z);
        const [k4x,k4y,k4z] = this._derivatives(this.x+h*k3x, this.y+h*k3y, this.z+h*k3z);

        const prevX = this.x, prevY = this.y;
        this.x += h/6*(k1x+2*k2x+2*k3x+k4x);
        this.y += h/6*(k1y+2*k2y+2*k3y+k4y);
        this.z += h/6*(k1z+2*k2z+2*k3z+k4z);
        this.speed = Math.hypot(this.x-prevX, this.y-prevY);

        // Safety reset on divergence
        if (!isFinite(this.x)||!isFinite(this.y)||!isFinite(this.z)||
            Math.abs(this.x)>1e4||Math.abs(this.y)>1e4||Math.abs(this.z)>1e4) {
            this.x=0.1; this.y=0; this.z=0;
        }

        // Adaptive range (smooth)
        const sm = 0.001;
        this.xMin = Math.min(this.xMin, this.x)*(1-sm)+this.x*sm;
        this.xMax = Math.max(this.xMax, this.x)*(1-sm)+this.x*sm;
        this.yMin = Math.min(this.yMin, this.y)*(1-sm)+this.y*sm;
        this.yMax = Math.max(this.yMax, this.y)*(1-sm)+this.y*sm;
        this.zMin = Math.min(this.zMin, this.z)*(1-sm)+this.z*sm;
        this.zMax = Math.max(this.zMax, this.z)*(1-sm)+this.z*sm;

        const xR = Math.max(this.xMax-this.xMin,0.1);
        const yR = Math.max(this.yMax-this.yMin,0.1);
        const zR = Math.max(this.zMax-this.zMin,0.1);
        this.nx = Math.max(0,Math.min(1,(this.x-this.xMin)/xR));
        this.ny = Math.max(0,Math.min(1,(this.y-this.yMin)/yR));
        this.nz = Math.max(0,Math.min(1,(this.z-this.zMin)/zR));

        this.history.push({ x:this.x, y:this.y, z:this.z, nx:this.nx, ny:this.ny, nz:this.nz, speed:this.speed });
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    perturb(amount = 1) {
        this.x += (Math.random()-0.5)*8*amount;
        this.y += (Math.random()-0.5)*8*amount;
        this.z += (Math.random()-0.5)*4*amount;
    }

    getAudioModulation() {
        return { filterMod: this.ny, lfoRate: this.nz, detuneMod: (this.nx-0.5)*0.8 };
    }
}
