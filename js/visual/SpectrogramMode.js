import { SpectrogramMath } from '../math/SpectrogramMath.js';

/**
 * SpectrogramMode — SpectralTunnel overhaul
 * Visualizes the frequency spectrum as a 3D tunnel.
 * New spectral 'ribbons' are spawned every frame from the analyser.
 * High-fidelity Z-depth 'flight' and additive 'pulse' highlights.
 */
export class SpectralTunnelMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.sMath = new SpectrogramMath();
        this.width = 0;
        this.height = 0;
        this.trailOpacity = 0.05;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    onNoteOn(noteInfo) {}

    onNoteOff(noteInfo) {}

    getAudioModulation() {
        return this.sMath.getAudioModulation();
    }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const lightPressure = mathEngine.getLightPressure();

        // Get FFT data from main-engine analyser if available
        // Note: main.js must make this available
        const analyserData = mathEngine.getAnalyserData();
        this.sMath.addRibbon(analyserData, hue);
        this.sMath.step(dt, speed, complexity);

        const cx = w * 0.5;
        const cy = h * 0.5;
        const baseRadius = Math.min(w, h) * 0.7;

        ctx.globalCompositeOperation = 'screen';

        for (let r of this.sMath.ribbons) {
            // Z-Depth Projection: distance from viewer
            // z=0 is 'far', z=1 is 'near'
            const z = r.z;
            if (z < 0.1) continue; // Not visible yet

            const perspective = 1 / (1 + (1 - z) * 8);
            const radius = baseRadius * perspective;
            const rAlpha = (0.25 + r.energy * intensity * 1.2) * (1 - z) * 0.8;
            const rHue = (hue + z * 360) % 360;

            if (rAlpha < 0.01) continue;

            ctx.beginPath();
            const segments = r.mags.length;
            const angleStep = (Math.PI * 2) / segments;

            for (let i = 0; i <= segments; i++) {
                const angle = i * angleStep;
                const magIdx = i % segments;
                const mag = r.mags[magIdx];
                
                const rMag = radius + (mag * baseRadius * 0.8 * perspective);
                const rx = cx + Math.cos(angle) * rMag;
                const ry = cy + Math.sin(angle) * rMag;

                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();

            ctx.strokeStyle = `hsla(${rHue}, 80%, 75%, ${rAlpha})`;
            ctx.lineWidth = 1 + intensity * 2;
            ctx.stroke();

            // Symmetrial inner glow
            if (r.energy > 0.5) {
                ctx.strokeStyle = `hsla(${rHue}, 80%, 75%, ${rAlpha * 0.2})`;
                ctx.lineWidth = 5 + intensity * 10;
                ctx.stroke();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
