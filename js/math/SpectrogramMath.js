/**
 * SpectrogramMath — SpectralTunnel physics
 * Manages a history of FFT snapshots projected into a 3D tunnel.
 * Each snapshot is a 'ribbon' that moves toward the viewer (Z depth).
 * High-fidelity spectral decomposition driven by SynthEngine's analyser.
 */
export class SpectrogramMath {
    constructor() {
        this.ribbons = [];
        this.maxRibbons = 60;
        this.time = 0;
        this.zSpeed = 2.0;
        this.spectralCentroid = 0;
        this.totalEnergy = 0;
    }

    /**
     * Add new spectral data as a new ribbon slice
     */
    addRibbon(analyserData, hue) {
        if (!analyserData) return;
        
        const binCount = analyserData.length;
        const magnitudes = new Float32Array(binCount);
        let weightedSum = 0;
        let totalMag = 0;

        for (let i = 0; i < binCount; i++) {
            const mag = analyserData[i] / 255;
            magnitudes[i] = mag;
            weightedSum += i * mag;
            totalMag += mag;
        }

        this.spectralCentroid = totalMag > 0 ? (weightedSum / totalMag) / binCount : 0;
        this.totalEnergy = Math.min(1, totalMag / (binCount * 0.3));

        this.ribbons.push({
            mags: magnitudes,
            z: 0, // Starts at the "far" end of the tunnel
            hue: hue,
            energy: this.totalEnergy,
            time: this.time
        });

        if (this.ribbons.length > this.maxRibbons) this.ribbons.shift();
    }

    step(dt, speed, complexity) {
        this.time += dt;
        this.zSpeed = 0.5 + speed * 10;

        for (let r of this.ribbons) {
            r.z += dt * this.zSpeed;
        }

        // Cleanup out-of-screen ribbons
        if (this.ribbons.length > 0 && this.ribbons[0].z > 1.2) {
            this.ribbons.shift();
        }
    }

    getAudioModulation() {
        return {
            filterMod: 0.2 + this.spectralCentroid * 0.6,
            reverbMix: 0.1 + this.totalEnergy * 0.4
        };
    }
}
