/**
 * FluidMath — Chromodynamic Navier-Stokes Physics.
 * A high-performance grid-based fluid solver using Semi-Lagrangian advection.
 * Tracks velocity fields, density (dye) diffusion, and global turbulence energy.
 */
export class FluidMath {
    constructor(N = 64) {
        this.N = N;
        this.size = (N + 2) * (N + 2);
        
        // Velocity layers
        this.Vx = new Float32Array(this.size);
        this.Vy = new Float32Array(this.size);
        this.Vx0 = new Float32Array(this.size);
        this.Vy0 = new Float32Array(this.size);
        
        // Density (dye) layers
        this.density = new Float32Array(this.size);
        this.density0 = new Float32Array(this.size);

        this.energy = 0;
        this.initialized = false;
    }

    IX(x, y) {
        return x + y * (this.N + 2);
    }

    /**
     * Inject density and velocity.
     */
    addPulse(nx, ny, energy) {
        const N = this.N;
        const x = Math.floor(nx * N);
        const y = Math.floor(ny * N);
        const radius = 3;
        
        this.energy = Math.min(2.0, this.energy + energy * 0.8);

        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                const gx = x + i, gy = y + j;
                if (gx > 0 && gx <= N && gy > 0 && gy <= N) {
                    const idx = this.IX(gx, gy);
                    const d = 1 - (Math.hypot(i, j) / (radius + 1));
                    if (d > 0) {
                        this.density[idx] += energy * 500 * d;
                        this.Vx[idx] += (Math.random() - 0.5) * 100 * energy;
                        this.Vy[idx] += (Math.random() - 0.5) * 100 * energy;
                    }
                }
            }
        }
    }

    /**
     * Step the fluid simulation.
     */
    step(dt, complexity, speed, lightPressure) {
        const viscosity = 0.0001;
        const diffusion = 0.0001;
        const substeps = 1 + Math.floor(complexity * 2);
        const sDt = (dt * 6.0 * speed) / substeps;

        for (let i = 0; i < substeps; i++) {
            this._compute(sDt, viscosity, diffusion);
        }

        this.energy *= 0.96;

        // Interaction with light pressure
        if (lightPressure.force > 0.1) {
            this.addPulse(lightPressure.x, lightPressure.y, lightPressure.force * 0.2);
        }
    }

    _compute(dt, viscosity, diffusion) {
        // Velocity Step
        this.diffuse(1, this.Vx0, this.Vx, viscosity, dt);
        this.diffuse(2, this.Vy0, this.Vy, viscosity, dt);
        this.project(this.Vx0, this.Vy0, this.Vx, this.Vy);
        this.advect(1, this.Vx, this.Vx0, this.Vx0, this.Vy0, dt);
        this.advect(2, this.Vy, this.Vy0, this.Vx0, this.Vy0, dt);
        this.project(this.Vx, this.Vy, this.Vx0, this.Vy0);

        // Density Step
        this.diffuse(0, this.density0, this.density, diffusion, dt);
        this.advect(0, this.density, this.density0, this.Vx, this.Vy, dt);
        
        // Decay
        for (let i = 0; i < this.size; i++) {
            this.density[i] *= 0.985;
        }
    }

    diffuse(b, x, x0, diff, dt) {
        const a = dt * diff * this.N * this.N;
        this.lin_solve(b, x, x0, a, 1 + 6 * a);
    }

    lin_solve(b, x, x0, a, c) {
        const invC = 1.0 / c;
        for (let k = 0; k < 6; k++) { // Iterative solver iterations
            for (let j = 1; j <= this.N; j++) {
                const yOff = j * (this.N + 2);
                for (let i = 1; i <= this.N; i++) {
                    const idx = yOff + i;
                    x[idx] = (x0[idx] + a * (x[idx-1] + x[idx+1] + x[idx-(this.N+2)] + x[idx+(this.N+2)])) * invC;
                }
            }
            this.set_bnd(b, x);
        }
    }

    project(vx, vy, p, div) {
        const N = this.N;
        const h = 1.0 / N;
        for (let j = 1; j <= N; j++) {
            const yOff = j * (N + 2);
            for (let i = 1; i <= N; i++) {
                const idx = yOff + i;
                div[idx] = -0.5 * h * (vx[idx+1] - vx[idx-1] + vy[idx+(N+2)] - vy[idx-(N+2)]);
                p[idx] = 0;
            }
        }
        this.set_bnd(0, div); this.set_bnd(0, p);
        this.lin_solve(0, p, div, 1, 6);

        for (let j = 1; j <= N; j++) {
            const yOff = j * (N + 2);
            for (let i = 1; i <= N; i++) {
                const idx = yOff + i;
                vx[idx] -= 0.5 * (p[idx+1] - p[idx-1]) / h;
                vy[idx] -= 0.5 * (p[idx+(N+2)] - p[idx-(N+2)]) / h;
            }
        }
        this.set_bnd(1, vx); this.set_bnd(2, vy);
    }

    advect(b, d, d0, vx, vy, dt) {
        const N = this.N;
        const dtx = dt * N;
        const dty = dt * N;
        for (let j = 1; j <= N; j++) {
            const yOff = j * (N + 2);
            for (let i = 1; i <= N; i++) {
                const idx = yOff + i;
                let x = i - dtx * vx[idx];
                let y = j - dty * vy[idx];
                if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
                if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
                const i0 = Math.floor(x), i1 = i0 + 1;
                const j0 = Math.floor(y), j1 = j0 + 1;
                const s1 = x - i0, s0 = 1 - s1;
                const t1 = y - j0, t0 = 1 - t1;
                d[idx] = s0 * (t0 * d0[i0 + j0*(N+2)] + t1 * d0[i0 + j1*(N+2)]) + 
                         s1 * (t0 * d0[i1 + j0*(N+2)] + t1 * d0[i1 + j1*(N+2)]);
            }
        }
        this.set_bnd(b, d);
    }

    set_bnd(b, x) {
        const N = this.N;
        for (let i = 1; i <= N; i++) {
            x[this.IX(0, i)] = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
            x[this.IX(N + 1, i)] = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
            x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
            x[this.IX(i, N + 1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
        }
    }

    getAudioModulation() {
        return {
            vorticity: Math.min(1, this.energy),
            flowDensity: Math.min(1, this.energy * 1.5)
        };
    }
    
    clear() {
        this.Vx.fill(0); this.Vy.fill(0); this.density.fill(0);
    }
}
