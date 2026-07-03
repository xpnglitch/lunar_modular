/**
 * AuroraMath — Northern lights curtain simulation
 * Curtains of light defined by bezier curves with 1D wave propagation
 * along them. Notes pulse energy through the curtains.
 * Upgraded for higher curtain density and smoother physics.
 */
export class AuroraMath {
    constructor() {
        this.numCurtains = 8;
        this.pointsPerCurtain = 80;
        this.curtains = [];
        this.time = 0;

        // Wave pulses traveling along curtains
        this.pulses = [];

        this._initCurtains();
    }

    _initCurtains() {
        this.curtains = [];
        for (let c = 0; c < this.numCurtains; c++) {
            const points = [];
            const baseY = 0.12 + (c / this.numCurtains) * 0.45;
            for (let i = 0; i < this.pointsPerCurtain; i++) {
                const t = i / (this.pointsPerCurtain - 1);
                points.push({
                    x: t,
                    y: baseY,
                    displacement: 0,   
                    brightness: 0.2 + Math.random() * 0.3,
                });
            }
            this.curtains.push({
                points,
                baseY,
                phase: Math.random() * Math.PI * 2,
                speed: 0.2 + Math.random() * 0.5,
                hueOffset: c * 22,
                drift: (Math.random() - 0.5) * 0.05
            });
        }
    }

    addPulse(normalizedX, energy) {
        // Find closest curtain to the pulse position
        const curtainIdx = Math.floor(normalizedX * this.numCurtains) % this.numCurtains;
        this.pulses.push({
            curtainIdx,
            position: normalizedX,
            energy,
            speed: 0.4 + energy * 0.5,
            width: 0.1 + energy * 0.1,
            age: 0,
            maxAge: 4.0,
            direction: Math.random() > 0.5 ? 1 : -1,
        });
    }

    update(dt, complexity) {
        this.time += dt;

        for (const curtain of this.curtains) {
            const cSpeed = curtain.speed * (1 + complexity * 0.5);
            for (let i = 0; i < curtain.points.length; i++) {
                const t = i / (curtain.points.length - 1);
                const p = curtain.points[i];

                // Advanced noise-like undulation using multiple octaves of sine
                const noise = Math.sin(t * 4 + this.time * cSpeed + curtain.phase) * 0.025
                    + Math.sin(t * 8 - this.time * cSpeed * 0.7) * 0.012
                    + Math.sin(t * 15 + this.time * 0.4) * 0.005;
                
                p.displacement = noise * (1 + complexity * 0.8);
                p.brightness = 0.2 + Math.sin(t * 6 + this.time * 0.6 + curtain.phase) * 0.15;
            }
        }

        // Process wave pulses
        for (let pi = this.pulses.length - 1; pi >= 0; pi--) {
            const pulse = this.pulses[pi];
            pulse.position += pulse.speed * pulse.direction * dt;
            pulse.age += dt;

            if (pulse.age > pulse.maxAge || pulse.position < -0.3 || pulse.position > 1.3) {
                this.pulses.splice(pi, 1);
                continue;
            }

            const curtain = this.curtains[pulse.curtainIdx];
            if (!curtain) continue;

            const fadeEnergy = pulse.energy * Math.pow(1 - pulse.age / pulse.maxAge, 1.5);

            for (let i = 0; i < curtain.points.length; i++) {
                const t = i / (curtain.points.length - 1);
                const dist = Math.abs(t - pulse.position);
                if (dist < pulse.width) {
                    const influence = (1 - dist / pulse.width) * fadeEnergy;
                    curtain.points[i].displacement += influence * 0.08;
                    curtain.points[i].brightness += influence * 0.6;
                }
            }
        }
    }

    getAudioModulation() {
        let totalDisp = 0;
        let count = 0;
        for (const curtain of this.curtains) {
            for (const p of curtain.points) {
                totalDisp += Math.abs(p.displacement);
                count++;
            }
        }
        const avgDisp = count > 0 ? totalDisp / count : 0;

        return {
            filterMod: Math.min(1, avgDisp * 12),
            detuneMod: Math.min(1, this.pulses.length * 0.15),
            harmonics: Math.min(1, this.pulses.length / 8),
        };
    }
}
