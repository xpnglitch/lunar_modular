/**
 * VisualAnalyser — Reads the *rendered pixels* of the vis canvas and extracts
 * perceptual features, mode-agnostically. No changes to any Mode class needed.
 *
 * Features (all 0-1, smoothed):
 *   energy       — mean luminance ("how much light is on screen")
 *   edgeDensity  — spatial gradient density (smooth flowing forms ↔ sharp angular geometry)
 *   motion       — mean frame-to-frame pixel delta ("how much is moving")
 *   jerk         — variance/instability of motion (calm drift ↔ erratic spasm)
 *   swellStrength— confidence that a repetitive luminance swell exists (autocorrelation peak)
 *   swellPeriod  — detected swell period in seconds (0 if none)
 *   swellPhase   — 0-1 phase accumulator locked to the detected swell
 *
 * Cost: one 32×32 drawImage + getImageData every N frames. Negligible.
 */
export class VisualAnalyser {
    constructor(sourceCanvas, { size = 32, sampleEvery = 2 } = {}) {
        this.source = sourceCanvas;
        this.size = size;
        this.sampleEvery = sampleEvery;
        this._frame = 0;

        this.off = document.createElement('canvas');
        this.off.width = size;
        this.off.height = size;
        this.offCtx = this.off.getContext('2d', { willReadFrequently: true });

        this.prevLuma = null;
        this.lastMotion = 0;

        // ── Feature outputs (smoothed) ────────────────────────
        this.energy = 0;
        this.edgeDensity = 0;
        this.motion = 0;
        this.jerk = 0;

        // ── Swell detection ───────────────────────────────────
        // Energy history sampled at ~20 Hz into a ring buffer (~4.8 s window)
        this.histRate = 20;              // Hz
        this.histLen = 96;               // samples
        this.hist = new Float32Array(this.histLen);
        this.histIdx = 0;
        this.histFilled = 0;
        this._histAccum = 0;

        this.swellStrength = 0;
        this.swellPeriod = 0;            // seconds
        this.swellPhase = 0;             // 0-1
        this._acCooldown = 0;            // recompute autocorrelation every ~0.5 s

        // Smoothing factors (per-update lerp)
        this._sFast = 0.35;              // motion/jerk react quickly
        this._sSlow = 0.12;              // energy/edges glide
    }

    /** Call once per render frame with dt in seconds. */
    update(dt) {
        this._frame++;
        if (this._frame % this.sampleEvery !== 0) {
            this._advanceSwellPhase(dt);
            return;
        }

        const s = this.size, ctx = this.offCtx;
        try {
            ctx.drawImage(this.source, 0, 0, s, s);
        } catch (e) { return; } // canvas not ready
        const data = ctx.getImageData(0, 0, s, s).data;

        // ── Luma plane ────────────────────────────────────────
        const n = s * s;
        const luma = new Float32Array(n);
        let sum = 0;
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            // Rec.601 luma, normalized 0-1
            const l = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255;
            luma[i] = l;
            sum += l;
        }
        const energy = sum / n;

        // ── Edge density (Sobel magnitude mean, interior pixels) ──
        let edgeSum = 0;
        for (let y = 1; y < s - 1; y++) {
            for (let x = 1; x < s - 1; x++) {
                const i = y * s + x;
                const gx = -luma[i - s - 1] - 2 * luma[i - 1] - luma[i + s - 1]
                         +  luma[i - s + 1] + 2 * luma[i + 1] + luma[i + s + 1];
                const gy = -luma[i - s - 1] - 2 * luma[i - s] - luma[i - s + 1]
                         +  luma[i + s - 1] + 2 * luma[i + s] + luma[i + s + 1];
                edgeSum += Math.sqrt(gx * gx + gy * gy);
            }
        }
        // Normalize: max Sobel mag ≈ 5.66; typical imagery sits well below.
        // Scale so "very angular" content approaches 1.
        const edgeDensity = Math.min(1, (edgeSum / ((s - 2) * (s - 2))) / 1.2);

        // ── Motion & jerk ─────────────────────────────────────
        let motion = 0;
        if (this.prevLuma) {
            let d = 0;
            for (let i = 0; i < n; i++) d += Math.abs(luma[i] - this.prevLuma[i]);
            motion = Math.min(1, (d / n) * 8); // scale: 0.125 mean delta → 1.0
        }
        const jerkRaw = Math.min(1, Math.abs(motion - this.lastMotion) * 10);
        this.lastMotion = motion;
        this.prevLuma = luma;

        // ── Smooth outputs ────────────────────────────────────
        this.energy      += (energy      - this.energy)      * this._sSlow;
        this.edgeDensity += (edgeDensity - this.edgeDensity) * this._sSlow;
        this.motion      += (motion      - this.motion)      * this._sFast;
        this.jerk        += (jerkRaw     - this.jerk)        * this._sFast;

        // ── Swell: feed history & periodically autocorrelate ──
        const effDt = dt * this.sampleEvery;
        this._histAccum += effDt;
        const histStep = 1 / this.histRate;
        while (this._histAccum >= histStep) {
            this._histAccum -= histStep;
            this.hist[this.histIdx] = this.energy;
            this.histIdx = (this.histIdx + 1) % this.histLen;
            if (this.histFilled < this.histLen) this.histFilled++;
        }

        this._acCooldown -= effDt;
        if (this._acCooldown <= 0 && this.histFilled >= this.histLen) {
            this._acCooldown = 0.5;
            this._detectSwell();
        }

        this._advanceSwellPhase(dt);
    }

    /**
     * Autocorrelation over lags 8..64 samples (0.4 s – 3.2 s periods).
     * A clear peak = a repetitive swell. Sets swellStrength/Period.
     */
    _detectSwell() {
        const L = this.histLen, h = this.hist;
        // De-mean
        let mean = 0;
        for (let i = 0; i < L; i++) mean += h[i];
        mean /= L;
        let var0 = 0;
        for (let i = 0; i < L; i++) { const d = h[i] - mean; var0 += d * d; }
        if (var0 < 1e-6) { // flat signal — no swell
            this.swellStrength += (0 - this.swellStrength) * 0.3;
            return;
        }

        let bestLag = 0, bestR = 0;
        for (let lag = 8; lag <= 64; lag++) {
            let r = 0;
            for (let i = 0; i < L - lag; i++) {
                r += (h[(this.histIdx + i) % L] - mean) * (h[(this.histIdx + i + lag) % L] - mean);
            }
            r /= (var0 * (L - lag) / L);
            if (r > bestR) { bestR = r; bestLag = lag; }
        }

        const strength = Math.max(0, Math.min(1, bestR));
        this.swellStrength += (strength - this.swellStrength) * 0.3;
        if (strength > 0.35) {
            const period = bestLag / this.histRate;
            // Glide period to avoid jumps re-phasing the LFO harshly
            this.swellPeriod = this.swellPeriod > 0
                ? this.swellPeriod + (period - this.swellPeriod) * 0.3
                : period;
        } else if (this.swellStrength < 0.15) {
            this.swellPeriod = 0;
        }
    }

    _advanceSwellPhase(dt) {
        if (this.swellPeriod > 0.05) {
            this.swellPhase = (this.swellPhase + dt / this.swellPeriod) % 1;
            // Soft phase-lock: nudge phase so sin() peak aligns with energy rising above mean.
            // (Gentle — 2% per frame — so it converges without snapping.)
            const rising = this.energy > this._phaseRefEnergy;
            if (rising && this.swellPhase > 0.5) {
                this.swellPhase += (1 - this.swellPhase) * 0.02;
            }
            this._phaseRefEnergy = this.energy;
        } else {
            this.swellPhase = 0;
        }
    }
}
