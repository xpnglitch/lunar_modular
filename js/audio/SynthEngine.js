/**
 * SynthEngine — Modern Polyphonic Web Audio synthesizer for Harmonia.
 * Uses SynthVoice for FM synthesis, waveshaping, sub-oscillators, noise,
 * unison, LFO modulation, and per-voice effects chains.
 */
import { SynthVoice, ChorusEffect, StereoDelay } from './SynthVoice.js';
import { PRESETS } from './SynthPresets.js';

export class SynthEngine {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.ctx = null;
        this.master = null;
        this.compressor = null;
        this.pendulumMaster = null;
        this.reverb = null;
        this.reverbGain = null;
        this.dryGain = null;
        this.analyser = null;
        this.voices = new Map();
        this.maxVoices = 32;
        this.initialized = false;
        this.currentMode = 'attractor';
        this.presets = PRESETS;

        // Effects
        this.chorus = null;
        this.delay = null;

        // Internal LFO phase tracker (for aud_lfoPhase bus output)
        this._lfoPhaseAccum = 0;
    }

    async init() {
        if (this.initialized) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)({
            latencyHint: 'interactive'
        });

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        // ─── Effects chain ───────────────────────────────────────
        this.chorus = new ChorusEffect(this.ctx);
        this.delay = new StereoDelay(this.ctx);

        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 0.55;

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;

        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._generateReverb(2.5, 2.2);

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;

        this.pendulumMaster = this.ctx.createGain();
        this.pendulumMaster.gain.value = 0.45;

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(0, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(20, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

        // Routing: master → chorus → delay → dry/reverb → compressor → analyser → out
        this.master.connect(this.chorus.input);
        this.chorus.output.connect(this.delay.input);
        this.delay.output.connect(this.dryGain);
        this.delay.output.connect(this.reverbGain);
        this.reverbGain.connect(this.reverb);

        this.reverb.connect(this.compressor);
        this.dryGain.connect(this.compressor);
        this.pendulumMaster.connect(this.compressor);

        this.compressor.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        this.math.setAnalyser(this.analyser);
        this.pitchBendCents = 0;
        this.initialized = true;

        // Apply initial mode effects
        this._applyModeEffects();
    }

    /**
     * Apply per-mode effects settings (chorus depth, delay, reverb mix)
     */
    _applyModeEffects() {
        const preset = this.presets[this.currentMode] || this.presets.default;

        if (this.chorus) {
            this.chorus.setDepth(preset.chorus || 0);
        }

        if (this.delay) {
            const delayMix  = preset.delay    || 0;
            const delayTime = preset.delayTime || 0.375;
            const delayFb   = preset.delayFb  || 0.3;
            this.delay.set(delayMix, delayTime, delayFb);
        }

        if (this.reverbGain) {
            let reverbAmount;
            if (preset.reverb !== undefined) {
                // Preset has explicit reverb control — use it directly
                reverbAmount = preset.reverb;
            } else {
                // Default: very light reverb based on release time
                const r = preset.r || 1;
                reverbAmount = Math.min(0.25, 0.04 + r * 0.02);
            }
            this.reverbGain.gain.setTargetAtTime(reverbAmount, this.ctx.currentTime, 0.1);
        }
    }

    setPitchBend(semitones) {
        this.pitchBendCents = semitones * 100;
        // Pitch bend is applied via detune in updateFromMath
    }

    _generateReverb(duration, decay) {
        const length = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                const t = i / length;
                // Early reflections + diffuse tail
                const early = i < this.ctx.sampleRate * 0.05
                    ? Math.random() * 0.5 * (1 - t * 20)
                    : 0;
                const tail = Math.pow(1 - t, decay) * (Math.random() * 2 - 1);
                // Slight stereo spread
                const stereo = ch === 0 ? 1 : 0.95;
                data[i] = (early + tail) * stereo;
            }
        }
        return buffer;
    }

    noteOn(noteIndex, frequency, velocity = 0.7) {
        if (!this.initialized) return;

        if (this.voices.has(noteIndex)) this._releaseVoice(noteIndex, false);
        if (this.voices.size >= this.maxVoices) {
            const oldest = this.voices.keys().next().value;
            this._releaseVoice(oldest, true);
        }

        const preset = this.presets[this.currentMode] || this.presets.default;
        const out = this.currentMode === 'pendulum' ? this.pendulumMaster : this.master;

        const voice = new SynthVoice(this.ctx, preset, frequency, velocity, out);
        // Apply current signature setting from math engine
        voice.setSignature(this.math.params.reactivity);
        this.voices.set(noteIndex, voice);
    }

    setSignature(value) {
        if (!this.initialized) return;
        for (const [, voice] of this.voices) {
            voice.setSignature(value);
        }
    }

    noteOff(noteIndex) { this._releaseVoice(noteIndex, false); }

    _releaseVoice(noteIndex, immediate = false) {
        const voice = this.voices.get(noteIndex);
        if (!voice) return;
        voice.release(immediate);
        this.voices.delete(noteIndex);
    }

    updateFromMath(dt) {
        if (!this.initialized) return;
        const preset = this.presets[this.currentMode] || this.presets.default;
        const m = this.math;
        const sp = m.smoothParams;

        // ── Read vis_* from bus ────────────────────────────────
        const visFilter  = sp.vis_filterMod;          // 0-1
        const visDetune  = (sp.vis_detune - 0.5) * 2; // -1 to +1
        const visLFORate = sp.vis_lfoRate * 12;        // 0-12 Hz

        // Filter cutoff: preset base + dial offset + visual modulation
        const fBase = preset.fFreq || 2000;
        const fEnv  = preset.fEnv  || 4000;
        const cutoff = fBase
            + sp.filterCutoff * fEnv * 0.3
            + visFilter       * fEnv;

        // Detune: dial + visual
        const detuneRange = preset.spread || 20;
        const detune = sp.detune * detuneRange
            + visDetune * detuneRange
            + this.pitchBendCents;

        for (const [, voice] of this.voices) {
            voice.setFilterFreq(cutoff);
            voice.setDetune(detune);
        }

        // ── Write aud_* to bus ────────────────────────────────

        // aud_envelope: average live gain value across all active voices
        let envSum = 0;
        for (const [, voice] of this.voices) {
            if (voice.envelope) envSum += voice.envelope.gain.value;
        }
        const envLevel = this.voices.size > 0
            ? Math.min(1, envSum / this.voices.size)
            : Math.max(0, (m.params.aud_envelope || 0) - (dt || 0.016) * 3); // decay to 0
        m.write('aud_envelope', envLevel);

        // aud_lfoPhase: advance internal phase accumulator at the preset LFO rate
        const lfoHz = visLFORate > 0.1 ? visLFORate : (preset.lfoRate || 1);
        if (dt) this._lfoPhaseAccum = (this._lfoPhaseAccum + lfoHz * dt) % 1;
        m.write('aud_lfoPhase', this._lfoPhaseAccum);

        // aud_filterPos: normalized position of current cutoff in audible range (20-20000)
        const normFilter = Math.log2(Math.max(20, cutoff) / 20) / Math.log2(20000 / 20);
        m.write('aud_filterPos', Math.max(0, Math.min(1, normFilter)));

        // aud_voiceCount: polyphony density
        m.write('aud_voiceCount', Math.min(1, this.voices.size / this.maxVoices));
    }

    setMode(mode) {
        this.currentMode = mode;
        if (this.initialized) {
            this.allNotesOff();
            this._applyModeEffects();
        }
    }

    allNotesOff() {
        for (const [noteIndex] of this.voices) {
            this._releaseVoice(noteIndex, true);
        }
        this.voices.clear();
    }

    getAnalyserData() {
        if (!this.analyser) return null;
        const d = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(d);
        return d;
    }

    getAudioContext() {
        return this.ctx;
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}
