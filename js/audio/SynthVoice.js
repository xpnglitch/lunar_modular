/**
 * SynthVoice — Modern synthesis voice with FM, sub-osc, noise, waveshaping,
 * LFO modulation, and per-voice effects. Used by SynthEngine.
 */

// ─── Waveshaper curves ──────────────────────────────────────────────
function makeSoftClip(amount = 2) {
    const n = 8192, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.tanh(x * amount);
    }
    return curve;
}

function makeFoldback(amount = 2) {
    const n = 8192, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let x = ((i * 2) / n - 1) * amount;
        while (x > 1 || x < -1) x = x > 1 ? 2 - x : x < -1 ? -2 - x : x;
        curve[i] = x;
    }
    return curve;
}

function makeBitcrush(bits = 4) {
    const n = 8192, curve = new Float32Array(n), steps = Math.pow(2, bits);
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
}

// ─── Shared resources (created once per AudioContext) ────────────────
const sharedCache = new WeakMap();

function getShared(ctx) {
    if (sharedCache.has(ctx)) return sharedCache.get(ctx);

    const shared = {
        softClip: makeSoftClip(2),
        hardClip: makeSoftClip(6),
        foldback: makeFoldback(3),
        bitcrush: makeBitcrush(4),
        noiseBuffer: null,
    };

    // Pre-generate noise buffer (2 seconds stereo)
    const len = ctx.sampleRate * 2;
    shared.noiseBuffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = shared.noiseBuffer.getChannelData(ch);
        // Pink-ish noise (simple 1/f approximation)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
            data[i] = ch === 0 ? pink : white; // ch0=pink, ch1=white
        }
    }

    sharedCache.set(ctx, shared);
    return shared;
}

// ─── Voice class ─────────────────────────────────────────────────────
export class SynthVoice {
    /**
     * @param {AudioContext} ctx
     * @param {Object} preset - The voice preset configuration
     * @param {number} frequency
     * @param {number} velocity 0-1
     * @param {AudioNode} destination
     */
    constructor(ctx, preset, frequency, velocity, destination) {
        this.ctx = ctx;
        this.preset = preset;
        this.frequency = frequency;
        this.velocity = velocity;
        this.nodes = [];
        this.startTime = ctx.currentTime;
        this.creationTimestamp = Date.now();
        this.released = false;

        const now = ctx.currentTime;
        const p = preset;
        const shared = getShared(ctx);

        // ─── Main oscillator(s) with optional unison ─────────────
        const unisonCount = p.unison || 1;
        const spread = p.spread || 0;
        this.oscGains = [];
        this.oscs = [];

        const oscOutput = ctx.createGain();
        oscOutput.gain.value = 1.0;

        // ─── Physical Modeling: Triple-String Dispersive Waveguide ───
        this.strings = [];
        this.wgFeedbacks = [];
        
        if (p.waveguide) {
            // Real pianos have 3 strings per note (unison). 
            // We model them with slightly different detuning and dispersion.
            const stringCount = 2; // Optimized from 3 to 2 for high polyphony stability
            for (let s = 0; s < stringCount; s++) {
                // Detune: -0.15, +0.15 cents for unison beating
                const detuneCents = (s === 0 ? -0.15 : 0.15);
                const freq = frequency * Math.pow(2, detuneCents / 1200);
                const delayTime = 1 / freq;
                
                const delay = ctx.createDelay(0.1);
                delay.delayTime.value = delayTime;
                
                // Dispersion Filter (All-pass): Simulates string stiffness/inharmonicity
                const dispersion = ctx.createBiquadFilter();
                dispersion.type = 'allpass';
                dispersion.frequency.value = freq * (p.dispersion || 1.2);
                dispersion.Q.value = 0.2; // Much broader to avoid "ringing"

                // Damping Filter (Low-pass): High frequency absorption
                const damping = ctx.createBiquadFilter();
                damping.type = 'lowpass';
                damping.frequency.value = frequency * (p.damping || 8.0);
                damping.Q.value = 0.3; // Gentle slope
                
                const feedback = ctx.createGain();
                // Frequency-dependent feedback: Higher notes decay MUCH faster
                const baseFb = p.feedback !== undefined ? p.feedback : 0.98;
                // Velocity affects sustain: harder strikes ring slightly longer
                const velScaling = 0.98 + velocity * 0.02; 
                const freqScaling = Math.max(0.6, 1.0 - (frequency / 10000));
                // Hard Cap: Never allow feedback to exceed 0.995 to prevent infinite buildup
                feedback.gain.value = Math.min(0.995, baseFb * freqScaling * velScaling);
                this.wgFeedbacks.push(feedback);
                
                // The Loop: Delay -> Dispersion -> Damping -> Feedback -> Delay
                delay.connect(dispersion);
                dispersion.connect(damping);
                damping.connect(feedback);
                feedback.connect(delay);
                
                // Hammer Felt Exciter: Shaped noise burst
                const exciterGain = ctx.createGain();
                const strikeForce = velocity * (0.6 + Math.random() * 0.4);
                exciterGain.gain.setValueAtTime(0, now);
                exciterGain.gain.linearRampToValueAtTime(strikeForce * 0.2, now + 0.0005);
                exciterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.004); 
                
                const feltFilter = ctx.createBiquadFilter();
                feltFilter.type = 'bandpass'; 
                // Harder strikes are brighter
                feltFilter.frequency.value = 800 + velocity * 4000;
                feltFilter.Q.value = 1.2;
                
                const exciter = ctx.createBufferSource();
                exciter.buffer = shared.noiseBuffer;
                exciter.connect(feltFilter);
                feltFilter.connect(exciterGain);
                exciterGain.connect(delay);
                
                exciter.start(now);
                exciter.stop(now + 0.01);
                
                // Connect waveguide to mix bus (scaled by string count)
                const stringVolume = ctx.createGain();
                stringVolume.gain.value = 1 / stringCount;
                delay.connect(stringVolume);
                stringVolume.connect(oscOutput);
                this.nodes.push(delay, dispersion, damping, feedback, stringVolume, exciter, exciterGain, feltFilter);
            }
            
            // Stereo Panning (Virtual Bench)
            // Low notes left (-0.4), high notes right (+0.4)
            const panValue = Math.max(-0.4, Math.min(0.4, (frequency - 440) / 1000));
            this.panner = ctx.createStereoPanner();
            this.panner.pan.value = panValue;
            oscOutput.connect(this.panner);
            
            // Soundboard Resonance Filter (320Hz "Wood" Peak)
            const soundboard = ctx.createBiquadFilter();
            soundboard.type = 'peaking';
            soundboard.frequency.value = 320;
            soundboard.Q.value = 0.8;
            soundboard.gain.value = 4; // Add wooden warmth
            
            this.panner.connect(soundboard);
            
            // Clean Limiter for the whole voice output
            const voiceLimiter = ctx.createDynamicsCompressor();
            voiceLimiter.threshold.value = -3;
            voiceLimiter.knee.value = 10;
            voiceLimiter.ratio.value = 12;
            voiceLimiter.attack.value = 0.003;
            voiceLimiter.release.value = 0.1;
            
            soundboard.connect(voiceLimiter);
            this.voiceLimiterNode = voiceLimiter; // store for mixbus connection
            this.nodes.push(this.panner, soundboard, voiceLimiter);
        } else {
            const osc1Freq = frequency * Math.pow(2, p.osc1Oct || 0);
            for (let u = 0; u < unisonCount; u++) {
                const osc = ctx.createOscillator();
                osc.type = p.osc1 || 'sawtooth';
                const detuneOffset = unisonCount > 1
                    ? (u / (unisonCount - 1) - 0.5) * spread
                    : 0;
                const drift = (Math.random() - 0.5) * 4.5;
                osc.frequency.value = osc1Freq;
                osc.detune.value = detuneOffset + drift;

                const g = ctx.createGain();
                g.gain.value = (1 / unisonCount) * (p.osc1Gain !== undefined ? p.osc1Gain : 0.8);
                osc.connect(g);
                g.connect(oscOutput);
                osc.start(now);
                this.oscs.push(osc);
                this.oscGains.push(g);
                this.nodes.push(osc, g);
            }
        }

        // OSC 1 Mute — silence oscillator output
        if (p.osc1Mute) oscOutput.gain.value = 0;

        // ─── Secondary oscillator (for layering or FM carrier) ───
        let osc2Output = null;
        this.osc2 = null;
        if (p.osc2 && p.mix > 0 && !p.osc2Mute) {
            this.osc2 = ctx.createOscillator();
            this.osc2.type = p.osc2;
            this.osc2.frequency.value = frequency * (p.osc2Ratio || 1) * Math.pow(2, p.osc2Oct || 0);
            this.osc2.detune.value = (p.osc2Detune || 7) + (Math.random() - 0.5) * 3;

            const osc2GainVal = p.osc2Gain !== undefined ? p.osc2Gain : 0.25;
            const g2 = ctx.createGain();
            g2.gain.value = p.mix * osc2GainVal * 3.2; // scale osc2Gain with mix
            this.osc2.connect(g2);
            osc2Output = g2;
            this.osc2.start(now);
            this.nodes.push(this.osc2, g2);

            // Reduce main osc volume proportionally
            if (!p.osc1Mute) oscOutput.gain.value = 1.0 - p.mix * 0.5;
        }

        // ─── FM Synthesis ────────────────────────────────────────
        this.fmOsc = null;
        this.fmGain = null;
        if (p.fmDepth && p.fmDepth > 0) {
            this.fmOsc = ctx.createOscillator();
            this.fmOsc.type = p.fmShape || 'sine';
            const fmFreq = Math.min(22000, frequency * (p.fmRatio || 2));
            this.fmOsc.frequency.value = fmFreq;
            this.fmOsc.detune.value = (Math.random() - 0.5) * 5;

            const fmScale = Math.min(1, 2000 / frequency);
            const fmPeak = p.fmDepth * frequency * fmScale * (0.5 + velocity * 0.5);
            this.fmGain = ctx.createGain();
            this.fmGain.gain.setValueAtTime(0.0001, now);
            this.fmGain.gain.linearRampToValueAtTime(fmPeak, now + 0.005);
            
            // FM Envelope: transient strike that decays to sustain brightness
            const fmd = p.fmDecay || 0.1;
            const fms = p.fmSustain !== undefined ? p.fmSustain : 0.0;
            this.fmGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, fmPeak * fms), now + 0.005 + fmd);
            
            this.fmOsc.connect(this.fmGain);

            for (const osc of this.oscs) {
                this.fmGain.connect(osc.frequency);
            }
            this.fmOsc.start(now);
            this.nodes.push(this.fmOsc, this.fmGain);
        }

        // ─── Sub oscillator ─────────────────────────────────────
        this.subOsc = null;
        this.subGain = null;
        let subOutput = null;
        if (p.sub && p.sub > 0) {
            this.subOsc = ctx.createOscillator();
            this.subOsc.type = p.subShape || 'sine';
            this.subOsc.frequency.value = frequency * Math.pow(2, p.subOct || -1);
            this.subOsc.detune.value = (Math.random() - 0.5) * 2;

            this.subGain = ctx.createGain();
            this.subGain.gain.setValueAtTime(0, now);
            this.subGain.gain.linearRampToValueAtTime(p.sub, now + 0.005);
            this.subOsc.connect(this.subGain);
            subOutput = this.subGain;
            this.subOsc.start(now);
            this.nodes.push(this.subOsc, this.subGain);
        }

        // ─── Noise layer ─────────────────────────────────────────
        this.noiseNode = null;
        this.noiseGain = null;
        let noiseOutput = null;
        if (p.noise && p.noise > 0) {
            this.noiseNode = ctx.createBufferSource();
            this.noiseNode.buffer = shared.noiseBuffer;
            this.noiseNode.loop = true;

            this.noiseGain = ctx.createGain();
            this.noiseGain.gain.setValueAtTime(0, now);
            this.noiseGain.gain.linearRampToValueAtTime(p.noise, now + 0.005);

            // Noise type: select pink (ch0) or white (ch1) via channel splitter
            const noiseType = p.noiseType || 'pink';
            if (p.noiseFilter) {
                const nf = ctx.createBiquadFilter();
                nf.type = 'bandpass';
                nf.frequency.value = frequency * (p.noiseFilterRatio || 2);
                nf.Q.value = p.noiseQ || 1;
                if (noiseType === 'white') {
                    const splitter = ctx.createChannelSplitter(2);
                    this.noiseNode.connect(splitter);
                    splitter.connect(nf, 1);
                    this.nodes.push(splitter);
                } else {
                    const splitter = ctx.createChannelSplitter(2);
                    this.noiseNode.connect(splitter);
                    splitter.connect(nf, 0);
                    this.nodes.push(splitter);
                }
                nf.connect(this.noiseGain);
                this.nodes.push(nf);
            } else {
                if (noiseType === 'white') {
                    const splitter = ctx.createChannelSplitter(2);
                    this.noiseNode.connect(splitter);
                    splitter.connect(this.noiseGain, 1);
                    this.nodes.push(splitter);
                } else {
                    const splitter = ctx.createChannelSplitter(2);
                    this.noiseNode.connect(splitter);
                    splitter.connect(this.noiseGain, 0);
                    this.nodes.push(splitter);
                }
            }
            noiseOutput = this.noiseGain;
            this.noiseNode.start(now);
            this.nodes.push(this.noiseNode, this.noiseGain);
        }

        // ─── Hammer Strike (Transient Physics) ───────────────────
        let hammerOutput = null;
        if (p.hammer && p.hammer > 0) {
            const hNode = ctx.createBufferSource();
            hNode.buffer = shared.noiseBuffer;
            // No loop for hammer — it's a strike
            const hGain = ctx.createGain();
            const hPeak = p.hammer * (0.8 + velocity * 0.2);
            hGain.gain.setValueAtTime(0, now);
            hGain.gain.linearRampToValueAtTime(hPeak, now + 0.002);
            hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04); // Very fast decay
            
            const hFilter = ctx.createBiquadFilter();
            hFilter.type = 'lowpass';
            hFilter.frequency.value = 1500; // Woody thump frequency
            hFilter.Q.value = 0.5;
            
            hNode.connect(hFilter);
            hFilter.connect(hGain);
            hammerOutput = hGain;
            hNode.start(now);
            hNode.stop(now + 0.05);
            this.nodes.push(hNode, hGain, hFilter);
        }

        // ─── Per-oscillator envelope routing ─────────────────────
        // Env 1 and Env 2 are independent per-osc envelopes.
        // Master amp envelope (a/d/s/r) is always applied post-mix.
        const osc1EnvSel = parseInt(p.osc1Env) || 1; // 1 or 2
        const osc2EnvSel = parseInt(p.osc2Env) || 2; // 1 or 2

        // Env 1 params (default to pass-through: instant attack, full sustain)
        const e1A = Math.max(0.001, p.e1A || 0.001);
        const e1D = p.e1D || 0.01;
        const e1S = p.e1S !== undefined ? p.e1S : 1.0;
        // Env 2 params (default to pass-through)
        const e2A = Math.max(0.001, p.e2A || 0.001);
        const e2D = p.e2D || 0.01;
        const e2S = p.e2S !== undefined ? p.e2S : 1.0;

        this.osc1Envelope = null;
        this.osc2Envelope = null;
        this._hasPerOscEnv = true; // always apply per-osc envelopes

        // Helper: apply attack+decay to a gain node, with optional linear decay (for Env2)
        const applyEnvelope = (gainNode, envP, useLinDecay) => {
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.linearRampToValueAtTime(1.0, now + envP.a);
            if (useLinDecay) {
                gainNode.gain.linearRampToValueAtTime(Math.max(0.001, envP.s), now + envP.a + envP.d + 0.01);
            } else {
                gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, envP.s), now + envP.a + envP.d + 0.01);
            }
        };

        // OSC1 always gets its selected per-osc envelope
        const e1p = osc1EnvSel === 2 ? { a: e2A, d: e2D, s: e2S } : { a: e1A, d: e1D, s: e1S };
        const osc1UsesLinDecay = osc1EnvSel === 2 && p.e2LinDecay;
        this.osc1Envelope = ctx.createGain();
        applyEnvelope(this.osc1Envelope, e1p, osc1UsesLinDecay);
        oscOutput.connect(this.osc1Envelope);
        this.nodes.push(this.osc1Envelope);

        // OSC2 gets its selected per-osc envelope when active
        if (osc2Output) {
            const e2p = osc2EnvSel === 2 ? { a: e2A, d: e2D, s: e2S } : { a: e1A, d: e1D, s: e1S };
            const osc2UsesLinDecay = osc2EnvSel === 2 && p.e2LinDecay;
            this.osc2Envelope = ctx.createGain();
            applyEnvelope(this.osc2Envelope, e2p, osc2UsesLinDecay);
            osc2Output.connect(this.osc2Envelope);
            this.nodes.push(this.osc2Envelope);
        }

        // ─── Mix bus ─────────────────────────────────────────────
        const mixBus = ctx.createGain();
        mixBus.gain.setValueAtTime(1.0, now);
        
        if (this.voiceLimiterNode) {
            // Use the waveguide's high-fidelity chain (panner -> soundboard -> limiter)
            this.voiceLimiterNode.connect(mixBus);
        } else {
            // Standard oscillator safety chain
            const voiceLimiter = ctx.createDynamicsCompressor();
            voiceLimiter.threshold.value = -3;
            voiceLimiter.knee.value = 10;
            voiceLimiter.ratio.value = 12;
            voiceLimiter.attack.value = 0.003;
            voiceLimiter.release.value = 0.1;
            
            // OSC1 always goes through its per-osc envelope
            this.osc1Envelope.connect(voiceLimiter);
            // OSC2 through its envelope if active
            if (this.osc2Envelope) this.osc2Envelope.connect(voiceLimiter);

            if (subOutput) subOutput.connect(voiceLimiter);
            // Noise envelope routing
            if (noiseOutput) {
                const nEnv = parseInt(p.noiseEnv) || 0;
                if (nEnv > 0) {
                    // Route noise through a per-osc envelope
                    const envParams = nEnv === 2
                        ? { a: e2A, d: e2D, s: e2S }
                        : { a: e1A, d: e1D, s: e1S };
                    const noiseEnvGain = ctx.createGain();
                    noiseEnvGain.gain.setValueAtTime(0.0001, now);
                    noiseEnvGain.gain.linearRampToValueAtTime(1.0, now + envParams.a);
                    noiseEnvGain.gain.exponentialRampToValueAtTime(Math.max(0.001, envParams.s), now + envParams.a + envParams.d + 0.01);
                    noiseOutput.connect(noiseEnvGain);
                    noiseEnvGain.connect(voiceLimiter);
                    this.noiseEnvGain = noiseEnvGain;
                    this.nodes.push(noiseEnvGain);
                } else {
                    noiseOutput.connect(voiceLimiter);
                }
            }
            if (hammerOutput) hammerOutput.connect(voiceLimiter);
            
            voiceLimiter.connect(mixBus);
            this.nodes.push(voiceLimiter);
        }
        this.nodes.push(mixBus);

        // ─── Waveshaper / Distortion (with dry/wet mix) ────────────
        let currentNode = mixBus;
        this.distGain = null;
        if (p.dist && p.dist > 0 && !p.distBypass) {
            const dMix = p.distMix !== undefined ? p.distMix : 1.0;

            this.distGain = ctx.createGain();
            this.distGain.gain.setValueAtTime(1 + p.dist * 4, now);

            const shaper = ctx.createWaveShaper();
            const curveType = p.distType || 'soft';
            if (curveType === 'fold') shaper.curve = shared.foldback;
            else if (curveType === 'crush') shaper.curve = shared.bitcrush;
            else shaper.curve = shared.softClip;
            shaper.oversample = '2x';

            const postGain = ctx.createGain();
            postGain.gain.setValueAtTime(1 / (1 + p.dist * 2), now);

            const distMerge = ctx.createGain();
            distMerge.gain.value = 1.0;

            // Wet path
            const wetGain = ctx.createGain();
            wetGain.gain.value = dMix;
            currentNode.connect(this.distGain);
            this.distGain.connect(shaper);
            shaper.connect(postGain);
            postGain.connect(wetGain);
            wetGain.connect(distMerge);

            // Dry path (parallel)
            if (dMix < 1.0) {
                const dryGain = ctx.createGain();
                dryGain.gain.value = 1 - dMix;
                currentNode.connect(dryGain);
                dryGain.connect(distMerge);
                this.nodes.push(dryGain);
            }

            currentNode = distMerge;
            this.nodes.push(this.distGain, shaper, postGain, wetGain, distMerge);
        }

        // ─── Filter (full ADSR + key-follow) ─────────────────────
        this.filter = null;
        if (!p.fBypass) {
            this.filter = ctx.createBiquadFilter();
            this.filter.type = p.fType === 'hp' ? 'highpass' : p.fType === 'bp' ? 'bandpass' : 'lowpass';
            this.filter.Q.setValueAtTime(p.fRes || 1, now);

            const fKeyFollow = p.fKeyFollow || 0;
            const baseFreq = Math.max(20, Math.min(20000, (p.fFreq || 12000) + fKeyFollow * (frequency - 440)));
            this.filterBaseFreq = baseFreq;
            const envAmount = p.fEnv || 0;

            if (envAmount !== 0) {
                const fPeak = Math.max(20, Math.min(18000, baseFreq + envAmount));
                const fSustain = Math.max(20, Math.min(18000, baseFreq + envAmount * (p.fS || 0)));
                const fA = p.fA || 0.001;
                const fD = p.fD || p.fDecay || p.d || 0.3;

                this.filter.frequency.setValueAtTime(baseFreq, now);
                this.filter.frequency.linearRampToValueAtTime(fPeak, now + fA);
                this.filter.frequency.exponentialRampToValueAtTime(
                    Math.max(20, fSustain),
                    now + fA + fD + 0.01
                );
            } else {
                this.filter.frequency.setValueAtTime(baseFreq, now);
            }

            currentNode.connect(this.filter);
            currentNode = this.filter;
            this.nodes.push(this.filter);

            // Filter boost/attenuation gain
            const fGainVal = p.fGain || 0;
            if (fGainVal !== 0) {
                const fGainNode = ctx.createGain();
                fGainNode.gain.value = Math.pow(10, fGainVal / 20); // dB to linear
                currentNode.connect(fGainNode);
                currentNode = fGainNode;
                this.nodes.push(fGainNode);
            }
        }

        // ─── Per-Voice Delay / Feedback (Karplus-Strong) ────────
        this.voiceDelay = null;
        this.voiceDelayFb = null;
        if (p.delay && p.delay > 0) {
            this.voiceDelay = ctx.createDelay(1.0);
            this.voiceDelay.delayTime.setValueAtTime(p.delayTime || 0.1, now);
            
            this.voiceDelayFb = ctx.createGain();
            this.voiceDelayFb.gain.setValueAtTime(p.delayFb || 0.4, now);
            
            // Connect in feedback loop
            this.filter.connect(this.voiceDelay);
            this.voiceDelay.connect(this.voiceDelayFb);
            this.voiceDelayFb.connect(this.filter);
            
            const delayWet = ctx.createGain();
            delayWet.gain.value = p.delay;
            this.voiceDelay.connect(delayWet);
            delayWet.connect(destination); // Connect delay direct to destination
            this.nodes.push(this.voiceDelay, this.voiceDelayFb, delayWet);
        }

        // ─── Pitch Envelope ──────────────────────────────────────
        if (p.pEnv && p.pEnv !== 0) {
            const pCents = p.pEnv * 100; // semitones → cents
            const pA = Math.max(0.001, p.pA || 0.001);
            const pD = p.pD || 0.1;
            const pSustainCents = pCents * (p.pS || 0);

            for (const osc of this.oscs) {
                const baseDetune = osc.detune.value;
                osc.detune.setValueAtTime(baseDetune + pCents, now);
                osc.detune.linearRampToValueAtTime(baseDetune + pCents, now + pA);
                osc.detune.setTargetAtTime(baseDetune + pSustainCents, now + pA, pD * 0.3);
            }
            if (this.osc2) {
                const bd = this.osc2.detune.value;
                this.osc2.detune.setValueAtTime(bd + pCents, now);
                this.osc2.detune.linearRampToValueAtTime(bd + pCents, now + pA);
                this.osc2.detune.setTargetAtTime(bd + pSustainCents, now + pA, pD * 0.3);
            }
            if (this.subOsc) {
                const bd = this.subOsc.detune.value;
                this.subOsc.detune.setValueAtTime(bd + pCents, now);
                this.subOsc.detune.linearRampToValueAtTime(bd + pCents, now + pA);
                this.subOsc.detune.setTargetAtTime(bd + pSustainCents, now + pA, pD * 0.3);
            }
        }

        // ─── LFO (multi-target routing) ─────────────────────────
        this.lfo = null;
        this._lfoFilterGain = null;
        const hasLfoFilter = (p.lfoFilterDepth !== undefined ? p.lfoFilterDepth : (p.lfoDepth || 0)) > 0;
        const hasLfoPitch = p.lfoPitchDepth && p.lfoPitchDepth > 0;
        const hasLfoAmp = (p.lfoAmpDepth !== undefined ? p.lfoAmpDepth : (p.lfoAmp || 0)) > 0;
        if (p.lfoRate && p.lfoRate > 0 && (hasLfoFilter || hasLfoPitch || hasLfoAmp)) {
            this.lfo = ctx.createOscillator();
            this.lfo.type = p.lfoShape || 'sine';
            this.lfo.frequency.value = p.lfoRate;

            // LFO → Filter frequency (only if filter is active)
            const filterDepth = p.lfoFilterDepth !== undefined ? p.lfoFilterDepth : (p.lfoDepth || 0);
            if (filterDepth > 0 && this.filter) {
                this._lfoFilterGain = ctx.createGain();
                this._lfoFilterGain.gain.value = filterDepth;
                this.lfo.connect(this._lfoFilterGain);
                this._lfoFilterGain.connect(this.filter.frequency);
                this.nodes.push(this._lfoFilterGain);
            }

            // LFO → Pitch (cents)
            if (hasLfoPitch) {
                const lfoPitchGain = ctx.createGain();
                lfoPitchGain.gain.value = p.lfoPitchDepth;
                this.lfo.connect(lfoPitchGain);
                for (const osc of this.oscs) lfoPitchGain.connect(osc.detune);
                if (this.osc2) lfoPitchGain.connect(this.osc2.detune);
                if (this.subOsc) lfoPitchGain.connect(this.subOsc.detune);
                this.nodes.push(lfoPitchGain);
            }

            // LFO → Amplitude
            const ampDepth = p.lfoAmpDepth !== undefined ? p.lfoAmpDepth : (p.lfoAmp || 0);
            if (ampDepth > 0) {
                const lfoAmpGain = ctx.createGain();
                lfoAmpGain.gain.value = ampDepth;
                this.lfo.connect(lfoAmpGain);
                this._lfoAmpGain = lfoAmpGain;
            }

            // Retrigger: start at note time (phase 0) or free-run
            if (p.lfoRetrigger) {
                this.lfo.start(now);
            } else {
                // Random phase offset for free-running feel
                const phaseOffset = Math.random() * (1 / Math.max(0.01, p.lfoRate));
                this.lfo.start(now - phaseOffset);
            }
            this.nodes.push(this.lfo);
        }

        // ─── Anti-alias safety filter ─────────────────────────────
        const aaFilter = ctx.createBiquadFilter();
        aaFilter.type = 'lowpass';
        aaFilter.frequency.value = 16000;
        aaFilter.Q.value = 0.5;
        currentNode.connect(aaFilter);
        currentNode = aaFilter;
        this.nodes.push(aaFilter);

        // ─── Amplitude Envelope (master — always applied) ─────────
        // This master amp envelope always shapes the combined signal.
        // Per-osc envelopes (Env 1 / Env 2) add additional shaping per oscillator.
        this.envelope = ctx.createGain();
        const a = Math.max(0.003, p.a || 0.01); // 3ms minimum attack to prevent onset click
        const d = p.d || 0.3;
        const s = p.s !== undefined ? p.s : 0.5;
        
        // Respect the preset's mainGain (essential for 808 punch)
        const volumeScaling = p.mainGain !== undefined ? p.mainGain : 1.0;
        const peakVel = velocity * volumeScaling;
        const sustainLevel = Math.max(0.001, peakVel * s);

        this.envelope.gain.value = 0; // Start at true zero
        this.envelope.gain.setValueAtTime(0, now);
        this.envelope.gain.linearRampToValueAtTime(peakVel, now + a);
        this.envelope.gain.setTargetAtTime(sustainLevel, now + a, d * 0.3);

        currentNode.connect(this.envelope);
        this.nodes.push(this.envelope);

        if (this._lfoAmpGain) {
            this._lfoAmpGain.connect(this.envelope.gain);
            this.nodes.push(this._lfoAmpGain);
        }

        // ─── Output ──────────────────────────────────────────────
        this.envelope.connect(destination);
        this.output = this.envelope;
    }

    /**
     * Real-time "Signature" modulation based on the right-side slider
     * @param {number} value 0.0 to 1.0
     */
    setSignature(value) {
        const p = this.preset;
        if (!p.sig) return;
        const now = this.ctx.currentTime;

        switch(p.sig) {
            case 'fmDepth':
                if (this.fmGain) {
                    const depth = p.fmDepth * this.frequency * (0.1 + value * 1.9);
                    this.fmGain.gain.setTargetAtTime(depth, now, 0.05);
                }
                break;
            case 'dist':
                if (this.distGain) {
                    this.distGain.gain.setTargetAtTime(1 + value * 8, now, 0.05);
                }
                break;
            case 'fRes':
                if (this.filter) {
                    this.filter.Q.setTargetAtTime(0.5 + value * 25, now, 0.05);
                }
                break;
            case 'delayFb':
                if (this.voiceDelayFb) {
                    const fb = Math.min(0.98, 0.1 + value * 0.88);
                    this.voiceDelayFb.gain.setTargetAtTime(fb, now, 0.05);
                }
                break;
            case 'sub':
                if (this.subGain) {
                    this.subGain.gain.setTargetAtTime(value * 1.2, now, 0.05);
                }
                break;
            case 'lfoDepth':
                if (this.lfo && this.nodes.find(n => n instanceof window.GainNode && n.gain.value === p.lfoDepth)) {
                    // This is a bit tricky since we didn't store the LFO gain node specifically
                }
                break;
            case 'noise':
                if (this.noiseGain) {
                    this.noiseGain.gain.setTargetAtTime(value * 0.5, now, 0.05);
                }
                break;
        }
    }

    /**
     * Update filter from external modulation (math engine params)
     */
    setFilterFreq(freq) {
        if (this.filter && !this.released) {
            this.filter.frequency.setTargetAtTime(
                Math.max(20, Math.min(18000, freq)),
                this.ctx.currentTime, 0.05
            );
        }
    }

    setDetune(cents) {
        for (const osc of this.oscs) {
            const base = this.preset.unison > 1
                ? parseFloat(osc.detune.value) // keep spread
                : 0;
            osc.detune.setTargetAtTime(cents + base, this.ctx.currentTime, 0.05);
        }
        if (this.osc2) {
            this.osc2.detune.setTargetAtTime(
                -cents + (this.preset.osc2Detune || 7),
                this.ctx.currentTime, 0.05
            );
        }
    }

    /**
     * Release the voice
     */
    release(immediate = false) {
        if (this.released) return;
        this.released = true;

        const now = this.ctx.currentTime;
        const p = this.preset;

        if (immediate) {
            // Hard kill — 50ms fade to prevent clicks, then cleanup
            const fadeTime = 0.05;
            this.envelope.gain.cancelScheduledValues(now);
            this.envelope.gain.setTargetAtTime(0, now, 0.01); // ~50ms to silence

            if (this.osc1Envelope) {
                this.osc1Envelope.gain.cancelScheduledValues(now);
                this.osc1Envelope.gain.setTargetAtTime(0, now, 0.01);
            }
            if (this.osc2Envelope) {
                this.osc2Envelope.gain.cancelScheduledValues(now);
                this.osc2Envelope.gain.setTargetAtTime(0, now, 0.01);
            }
            if (this.noiseEnvGain) {
                this.noiseEnvGain.gain.cancelScheduledValues(now);
                this.noiseEnvGain.gain.setTargetAtTime(0, now, 0.01);
            }

            // Stop internal waveguide feedback
            if (this.wgFeedbacks) {
                for (const g of this.wgFeedbacks) {
                    g.gain.cancelScheduledValues(now);
                    g.gain.setTargetAtTime(0, now, 0.005);
                }
            }

            // Schedule oscillator stops AFTER the fade
            for (const node of this.nodes) {
                try { if (node.stop) node.stop(now + fadeTime + 0.02); } catch (e) {}
            }
            // Disconnect AFTER everything has gone silent
            setTimeout(() => this._cleanup(), 100);
        } else {
            // Graceful release
            const r = Math.min(p.r || 1.0, 4); // Master amp release cap at 4s

            // Use setTargetAtTime instead of cancelScheduledValues+setValueAtTime
            // to avoid gain discontinuity clicks
            this.envelope.gain.cancelScheduledValues(now);
            this.envelope.gain.setTargetAtTime(0.0001, now, r * 0.2);

            // Release per-oscillator envelopes if active
            if (this._hasPerOscEnv) {
                const osc1EnvSel = parseInt(p.osc1Env) || 1;
                const osc2EnvSel = parseInt(p.osc2Env) || 2;
                const e1R = Math.min(p.e1R || 1.0, 4);
                const e2R = Math.min(p.e2R || 1.0, 4);
                const r1Time = osc1EnvSel === 2 ? e2R : e1R;
                const r2Time = osc2EnvSel === 2 ? e2R : e1R;

                if (this.osc1Envelope) {
                    this.osc1Envelope.gain.cancelScheduledValues(now);
                    this.osc1Envelope.gain.setTargetAtTime(0.0001, now, r1Time * 0.2);
                }
                if (this.osc2Envelope) {
                    this.osc2Envelope.gain.cancelScheduledValues(now);
                    this.osc2Envelope.gain.setTargetAtTime(0.0001, now, r2Time * 0.2);
                }
            }

            // Noise envelope release
            if (this.noiseEnvGain) {
                this.noiseEnvGain.gain.cancelScheduledValues(now);
                this.noiseEnvGain.gain.setTargetAtTime(0.0001, now, r * 0.2);
            }

            // Filter release — sweep back to base frequency
            if (this.filter && p.fR) {
                this.filter.frequency.cancelScheduledValues(now);
                this.filter.frequency.setTargetAtTime(
                    Math.max(20, this.filterBaseFreq || p.fFreq || 2000),
                    now, p.fR * 0.3
                );
            }

            // Pitch release — sweep detune back to 0
            if (p.pEnv && p.pR) {
                for (const osc of this.oscs) {
                    osc.detune.cancelScheduledValues(now);
                    osc.detune.setTargetAtTime(0, now, p.pR * 0.3);
                }
                if (this.osc2) {
                    this.osc2.detune.cancelScheduledValues(now);
                    this.osc2.detune.setTargetAtTime(p.osc2Detune || 7, now, p.pR * 0.3);
                }
            }

            // Schedule cleanup — use longest release of all envelopes
            const e1R_t = Math.min(p.e1R || 1.0, 4);
            const e2R_t = Math.min(p.e2R || 1.0, 4);
            const maxR = Math.max(r, e1R_t, e2R_t);
            const stopTime = now + maxR + 0.1;

            // Hard Floor: Force envelope to absolute zero at the end of release
            this.envelope.gain.exponentialRampToValueAtTime(0.00001, stopTime - 0.05);
            this.envelope.gain.linearRampToValueAtTime(0, stopTime);

            for (const node of this.nodes) {
                try { if (node.stop) node.stop(stopTime); } catch (e) {}
            }
            // Physical Disconnect: Sever from graph to free CPU
            setTimeout(() => this._cleanup(), (maxR + 0.2) * 1000);
        }
    }

    /** Disconnect all nodes and free references */
    _cleanup() {
        for (const node of this.nodes) {
            try { node.disconnect(); } catch (e) {}
        }
        this.nodes = [];
        this.oscs = [];
        this.oscGains = [];
    }
}

// ─── Chorus Effect (shared, connected in SynthEngine) ────────────────
export class ChorusEffect {
    constructor(ctx) {
        this.ctx = ctx;
        this.input = ctx.createGain();
        this.output = ctx.createGain();

        // Dry path
        const dry = ctx.createGain();
        dry.gain.value = 0.7;
        this.input.connect(dry);
        dry.connect(this.output);

        // 3 modulated delay lines for rich chorus
        this.delays = [];
        const rates = [0.5, 0.7, 1.1];
        const depths = [0.003, 0.004, 0.0025];
        const offsets = [0.012, 0.018, 0.015];

        for (let i = 0; i < 3; i++) {
            const delay = ctx.createDelay(0.05);
            delay.delayTime.value = offsets[i];

            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = rates[i];

            const lfoGain = ctx.createGain();
            lfoGain.gain.value = depths[i];
            lfo.connect(lfoGain);
            lfoGain.connect(delay.delayTime);

            const wet = ctx.createGain();
            wet.gain.value = 0; // Start silent, setDepth() will activate

            this.input.connect(delay);
            delay.connect(wet);
            wet.connect(this.output);

            lfo.start();
            this.delays.push({ delay, lfo, lfoGain, wet });
        }
    }

    setDepth(depth) {
        const now = this.ctx.currentTime;
        for (const d of this.delays) {
            d.wet.gain.setTargetAtTime(depth * 0.35, now, 0.05);
        }
    }
}

// ─── Stereo Delay Effect ─────────────────────────────────────────────
export class StereoDelay {
    constructor(ctx) {
        this.ctx = ctx;
        this.input = ctx.createGain();
        this.output = ctx.createGain();

        // Dry
        this.input.connect(this.output);

        // Left delay
        this.delayL = ctx.createDelay(2);
        this.delayL.delayTime.value = 0.375;
        this.fbL = ctx.createGain();
        this.fbL.gain.value = 0.3;
        this.wetL = ctx.createGain();
        this.wetL.gain.value = 0;

        // Right delay
        this.delayR = ctx.createDelay(2);
        this.delayR.delayTime.value = 0.5;
        this.fbR = ctx.createGain();
        this.fbR.gain.value = 0.25;
        this.wetR = ctx.createGain();
        this.wetR.gain.value = 0;

        // Filter in feedback
        const lpL = ctx.createBiquadFilter();
        lpL.type = 'lowpass';
        lpL.frequency.value = 3000;
        const lpR = ctx.createBiquadFilter();
        lpR.type = 'lowpass';
        lpR.frequency.value = 2500;

        this.input.connect(this.delayL);
        this.delayL.connect(lpL);
        lpL.connect(this.fbL);
        this.fbL.connect(this.delayL);
        lpL.connect(this.wetL);
        this.wetL.connect(this.output);

        this.input.connect(this.delayR);
        this.delayR.connect(lpR);
        lpR.connect(this.fbR);
        this.fbR.connect(this.delayR);
        lpR.connect(this.wetR);
        this.wetR.connect(this.output);
    }

    set(mix, time, feedback) {
        const now = this.ctx.currentTime;
        this.wetL.gain.setTargetAtTime(mix * 0.5, now, 0.05);
        this.wetR.gain.setTargetAtTime(mix * 0.5, now, 0.05);
        this.delayL.delayTime.setTargetAtTime(time, now, 0.05);
        this.delayR.delayTime.setTargetAtTime(time * 1.33, now, 0.05);
        this.fbL.gain.setTargetAtTime(feedback, now, 0.05);
        this.fbR.gain.setTargetAtTime(feedback * 0.85, now, 0.05);
    }
}
