/**
 * Conductor — maps VisualAnalyser features onto the audio engine.
 *
 * COUPLING PHILOSOPHY (non-diagonal / cross-axis, per design discussion):
 * Nothing modulates its own axis, so the vis↔aud loop cannot self-reinforce:
 *
 *   VISUAL quality            →  AUDIO quality (orthogonal)
 *   ─────────────────────────────────────────────────────────
 *   edgeDensity (spatial)     →  wet/dry + brightness (timbre)
 *        smooth flow          →  wet, warm: reverb up, cutoff eased down
 *        sharp angles         →  dry, present: reverb down, brighter
 *   jerk (temporal chaos)     →  LFO rate + chaos bus (movement character)
 *   swell (periodicity)       →  master gain *phase*, not level:
 *                                a bounded ± breath locked to the visual's
 *                                own detected period. Timing, not loudness.
 *   motion (velocity)         →  detune spread (fast visuals shimmer wider)
 *
 * Audio→visual coupling (aud_envelope → intensity) already exists upstream;
 * because we never route visual *energy* → audio *level* directly, the loop
 * gain on the amplitude axis stays < 1 by construction. The swell breath is
 * additionally depth-capped and slew-limited.
 *
 * ASYMMETRIC SLEW: wetness blooms in slowly (rooms fade in), dryness bites
 * fast (rooms don't slam shut, but presence should). Matches perception.
 *
 * Writes to:
 *   - mathEngine bus: vis_filterMod, vis_lfoRate, vis_detune, vis_chaos
 *     (SynthEngine.updateFromMath() already consumes all of these)
 *   - engine.reverbGain / engine.dryGain (Web Audio, setTargetAtTime)
 *   - engine.master.gain (swell breath, bounded ±depth)
 */
export class Conductor {
    constructor(analyser, synthEngine, mathEngine) {
        this.va = analyser;
        this.engine = synthEngine;
        this.math = mathEngine;

        /** Master coupling amount, 0-1. 0 = fully decoupled (bypass). */
        this.coupling = 0.6;

        // Baselines captured on first run (so we return home at coupling=0)
        this._baseReverb = null;
        this._baseDry = null;
        this._baseMaster = null;

        // Slew state for wet/dry (we do our own asymmetric smoothing,
        // then hand near-instant targets to setTargetAtTime)
        this._wet = 0.3;

        // Swell breath depth cap (fraction of master gain). Keep humble:
        // this is the one place amplitude is touched, and it is bounded.
        this.breathDepth = 0.22;

        this._lastBreath = 0;
    }

    /** Call once per render frame with dt in seconds. Safe pre-init. */
    update(dt) {
        const e = this.engine;
        if (!e || !e.initialized || !e.ctx) return;
        const va = this.va, m = this.math, k = this.coupling;
        const now = e.ctx.currentTime;

        // Capture baselines once, after engine init
        if (this._baseReverb === null) {
            this._baseReverb = e.reverbGain.gain.value;
            this._baseDry    = e.dryGain.gain.value;
            this._baseMaster = e.master.gain.value;
        }

        // ══ 1. SPATIAL QUALITY → WET/DRY + BRIGHTNESS ══════════
        // smoothness = 1 - edgeDensity. Smooth → wet & warm. Sharp → dry & bright.
        const smooth = 1 - va.edgeDensity;
        const wetTarget = smooth;                       // 0 (bone dry) … 1 (lush)

        // Asymmetric slew: bloom slow (τ≈0.9s), dry fast (τ≈0.15s)
        const rising = wetTarget > this._wet;
        const tau = rising ? 0.9 : 0.15;
        this._wet += (wetTarget - this._wet) * Math.min(1, dt / tau);

        const wet = this._wet * k;
        // Reverb swings around its baseline: up to +0.35 lush, down to -60% dry
        const reverbVal = this._baseReverb * (1 - wet * 0.0) // keep floor
                        + wet * 0.35
                        - (1 - this._wet) * k * this._baseReverb * 0.6;
        const dryVal = this._baseDry + (1 - this._wet) * k * 0.25 - wet * 0.12;

        e.reverbGain.gain.setTargetAtTime(Math.max(0.02, reverbVal), now, 0.05);
        e.dryGain.gain.setTargetAtTime(Math.max(0.15, dryVal), now, 0.05);

        // Brightness via existing bus: sharp visuals push cutoff up,
        // smooth visuals ease it below center (warmth).
        // vis_filterMod center 0.5 = neutral in updateFromMath's mapping.
        const bright = 0.5 + (va.edgeDensity - 0.4) * 0.9 * k;
        m.write('vis_filterMod', Math.max(0, Math.min(1, bright)));

        // ══ 2. TEMPORAL CHAOS → MOVEMENT CHARACTER ═════════════
        // Erratic visuals → faster LFO + chaos (waveshape blend upstream).
        m.write('vis_lfoRate', Math.min(1, va.jerk * 1.6) * k + (1 - k) * 0.2);
        m.write('vis_chaos',   Math.min(1, va.jerk * 1.2) * k);

        // ══ 3. VELOCITY → DETUNE SHIMMER ═══════════════════════
        // Fast-moving visuals spread the unison; still centered at 0.5.
        m.write('vis_detune', 0.5 + (va.motion - 0.15) * 0.6 * k);

        // ══ 4. SWELL → BREATH (phase-locked, bounded) ══════════
        // The ONLY amplitude touch. Depth scales with detection confidence
        // and coupling; phase comes from the visual's own detected period.
        let breath = 0;
        if (va.swellPeriod > 0.05 && va.swellStrength > 0.2) {
            breath = Math.sin(va.swellPhase * Math.PI * 2)
                   * this.breathDepth * va.swellStrength * k;
        }
        // Slew the breath itself so appearing/vanishing swells don't step.
        this._lastBreath += (breath - this._lastBreath) * Math.min(1, dt / 0.25);
        e.master.gain.setTargetAtTime(
            this._baseMaster * (1 + this._lastBreath), now, 0.08);
    }

    /** UI helper: 0-1 */
    setCoupling(v) {
        this.coupling = Math.max(0, Math.min(1, v));
    }
}
