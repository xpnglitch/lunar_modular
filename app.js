import { SynthVoice, ChorusEffect, StereoDelay } from './js/audio/SynthVoice.js';
import { VisualAnalyser } from './js/visual/VisualAnalyser.js';
import { Conductor } from './js/audio/Conductor.js';
import { PRESETS } from './js/audio/SynthPresets.js';
import { PianoLibrary } from './PianoLibrary.js';
import { MidiPlayer } from './MidiPlayer.js';
import { TR808Engine } from './js/audio/TR808Engine.js';

// ─── Visual System (from Harmonia) ───────────────────────────────
import { MathEngine } from './js/math/MathEngine.js';
import { AttractorMode } from './js/visual/AttractorMode.js';
import { NebulaMode } from './js/visual/NebulaMode.js';
import { PlasmaMode } from './js/visual/PlasmaMode.js';
import { FlowFieldMode } from './js/visual/FlowFieldMode.js';
import { VortexMode } from './js/visual/VortexMode.js';
import { StardustMode } from './js/visual/StardustMode.js';
import { BlackHoleMode } from './js/visual/BlackHoleMode.js';
import { AuroraMode } from './js/visual/AuroraMode.js';
import { LavaFlowMode } from './js/visual/LavaFlowMode.js';
import { WaveMode } from './js/visual/WaveMode.js';
import { LissajousMode } from './js/visual/LissajousMode.js';
import { CymaticsMode } from './js/visual/CymaticsMode.js';
import { MetaballsMode } from './js/visual/MetaballsMode.js';
import { GlowWormMode } from './js/visual/GlowWormMode.js';
import { SupernovaMode } from './js/visual/SupernovaMode.js';
import { DigitalRainMode } from './js/visual/DigitalRainMode.js';
import { AsteroidFieldMode } from './js/visual/AsteroidFieldMode.js';
import { CliffordMode } from './js/visual/CliffordMode.js';
// import { IFSMode } from './js/visual/IFSMode.js';
import { QuantumMode } from './js/visual/QuantumMode.js';
import { InkWashMode } from './js/visual/InkWashMode.js';
import { VoxelsMode } from './js/visual/VoxelsMode.js';
import { MandalaMode } from './js/visual/MandalaMode.js';
import { FluidMode } from './js/visual/FluidMode.js';
import { IsogridMode } from './js/visual/IsogridMode.js';
import { WaveformMode } from './js/visual/WaveformMode.js';
import { BitCrushMode } from './js/visual/BitCrushMode.js';
import { PixelSortMode } from './js/visual/PixelSortMode.js';
import { ChronosMode } from './js/visual/ChronosMode.js';
import { MagneticMode } from './js/visual/MagneticMode.js';
import { KaleidoscopeMode } from './js/visual/KaleidoscopeMode.js';
import { ReactionDiffusionMode } from './js/visual/ReactionDiffusionMode.js';
import { OceanWaveMode } from './js/visual/OceanWaveMode.js';
import { AudioSurfaceMode } from './js/visual/AudioSurfaceMode.js';
import { InterferenceMode } from './js/visual/InterferenceMode.js';
import { SmokeMode } from './js/visual/SmokeMode.js';
import { PendulumMode } from './js/visual/PendulumMode.js';
import { PolyrhythmMode } from './js/visual/PolyrhythmMode.js';

// ─── Engine ──────────────────────────────────────────────────────
class LabEngine {
    constructor() {
        this.ctx = null; this.master = null; this.compressor = null;
        this.reverb = null; this.reverbGain = null; this.dryGain = null;
        this.chorus = null; this.delay = null; this.voices = new Map();
        this.maxVoices = 32; this.initialized = false;
        this._lastNoteTime = new Map();
        this.presets = PRESETS;
        this.modeKeys = Object.keys(PRESETS).filter(k => k !== 'default');
        this.modeIndex = 0; this.currentMode = this.modeKeys[0];
        this.signatureValue = 0.5; this.filterMod = 0;
        this.analyser = null;
        this._rvCache = new Map(); // Cache generated IRs by key "size-dec"
        
        // Start Voice Watchdog — runs every 5s to prune hanging/stale notes
        setInterval(() => this._watchdog(), 5000);
    }
    _watchdog() {
        const now = Date.now();
        this.voices.forEach((voice, note) => {
            // If voice has been alive for > 60s and hasn't been released, force release.
            // (Most musical phrases don't last 60s without a note-off).
            if (!voice.released && (now - voice.creationTimestamp > 60000)) {
                console.warn(`Watchdog: Releasing stale voice for note ${note}`);
                this.noteOff(note);
            }
        });
    }
    async init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
        this.chorus = new ChorusEffect(this.ctx);
        this.delay = new StereoDelay(this.ctx);
        this.dryGain = this.ctx.createGain(); this.dryGain.gain.value = 0.8;
        this.reverbGain = this.ctx.createGain(); this.reverbGain.gain.value = 0.3;
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._genReverb(2.5, 2.2);
        this.master = this.ctx.createGain(); this.master.gain.value = 0.7;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.85;
        this.master.connect(this.chorus.input);
        this.chorus.output.connect(this.delay.input);
        this.delay.output.connect(this.dryGain);
        this.delay.output.connect(this.reverbGain);
        this.reverbGain.connect(this.reverb);
        this.reverb.connect(this.compressor);
        this.dryGain.connect(this.compressor);
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.compressor.connect(this.masterGain);

        // ─── Stereo Imager ───
        this.imgBypass = false;
        this.imgSplitter = this.ctx.createChannelSplitter(2);
        this.imgMerger = this.ctx.createChannelMerger(2);
        this.imgMidGain = this.ctx.createGain(); // (L+R)/2
        this.imgSideGain = this.ctx.createGain(); // (L-R)/2 * width
        this.imgLeftOut = this.ctx.createGain();
        this.imgRightOut = this.ctx.createGain();
        this.imgPanner = this.ctx.createStereoPanner();
        this.imgPanner.pan.value = 0;
        // Bass mono: LP filter splits bass, sums to mono below cutoff
        this.imgBassLP = this.ctx.createBiquadFilter();
        this.imgBassLP.type = 'lowpass'; this.imgBassLP.frequency.value = 0; // 0 = disabled
        this.imgBassLP.Q.value = 0.7;
        this.imgBassHP = this.ctx.createBiquadFilter();
        this.imgBassHP.type = 'highpass'; this.imgBassHP.frequency.value = 0;
        this.imgBassHP.Q.value = 0.7;
        this.imgBassMono = this.ctx.createGain();
        this.imgBassMerger = this.ctx.createChannelMerger(2);
        // Bypass path
        this.imgBypassNode = this.ctx.createGain();
        this.imgBypassNode.gain.value = 0; // bypassed = 0 by default (imager active)
        this.imgWetNode = this.ctx.createGain();
        this.imgWetNode.gain.value = 1;
        // Wire: masterGain → splitter → L/R processing → merger → panner → analyser
        this.masterGain.connect(this.imgSplitter);
        // Left channel processing (index 0)
        this.imgSplitter.connect(this.imgLeftOut, 0);
        // Right channel processing (index 1)
        this.imgSplitter.connect(this.imgRightOut, 1);
        // Merge back
        this.imgLeftOut.connect(this.imgMerger, 0, 0);
        this.imgRightOut.connect(this.imgMerger, 0, 1);
        this.imgMerger.connect(this.imgPanner);
        this.imgPanner.connect(this.imgWetNode);
        // Bypass path
        this.masterGain.connect(this.imgBypassNode);
        this.imgBypassNode.connect(this.analyser);
        this.imgWetNode.connect(this.analyser);

        // DC Blocker — eliminates subsonic thumps from FM/waveshapers
        this.dcBlocker = this.ctx.createBiquadFilter();
        this.dcBlocker.type = 'highpass';
        this.dcBlocker.frequency.value = 20;
        this.dcBlocker.Q.value = 0.7;

        // Safety Limiter — brick-wall last resort before DAC
        this.safetyLimiter = this.ctx.createDynamicsCompressor();
        this.safetyLimiter.threshold.setValueAtTime(-1, this.ctx.currentTime);
        this.safetyLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
        this.safetyLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
        this.safetyLimiter.attack.setValueAtTime(0.0003, this.ctx.currentTime);
        this.safetyLimiter.release.setValueAtTime(0.01, this.ctx.currentTime);

        // ─── Mastering Chain ───
        this.masterSaturator = this.ctx.createWaveShaper();
        const curve = new Float32Array(8192);
        for(let i=0; i<8192; i++) {
            const x = (i/4096)-1;
            curve[i] = Math.tanh(x * 1.2); // Gentle saturation to "glue" high voice counts
        }
        this.masterSaturator.curve = curve;

        this.analyser.connect(this.dcBlocker);
        this.dcBlocker.connect(this.masterSaturator);
        this.masterSaturator.connect(this.safetyLimiter);
        this.safetyLimiter.connect(this.ctx.destination);
        this.initialized = true; this._applyFx();

        // Wire Panic Key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.panic();
        });
    }
    panic() {
        console.warn('PANIC: Killing all audio!');
        this.voices.forEach(v => v.release(true));
        this.voices.clear();
        if (window.tr808) {
            window.tr808.stop();
            window.tr808.activeVoices.forEach(v => v.release(true));
            window.tr808.activeVoices.clear();
            const startBtn = document.getElementById('tr-start-stop');
            if (startBtn) startBtn.classList.remove('active');
            window.trRunning = false;
        }
        this.ctx.resume(); // Ensure context isn't suspended
        const midiStatus = document.getElementById('midi-status');
        if (midiStatus) {
            const original = midiStatus.textContent;
            midiStatus.textContent = '⚠️ PANIC';
            midiStatus.style.color = '#ff4444';
            setTimeout(() => {
                midiStatus.textContent = original;
                midiStatus.style.color = '';
            }, 2000);
        }
    }
    _genReverb(dur, dec) {
        const key = `${dur.toFixed(2)}-${dec.toFixed(2)}`;
        if (this._rvCache.has(key)) return this._rvCache.get(key);
        
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) { 
            const d = buf.getChannelData(ch); 
            for (let i = 0; i < len; i++) { 
                const t = i / len; 
                d[i] = (Math.pow(1 - t, dec) * (Math.random() * 2 - 1)) * (ch === 0 ? 1 : 0.92); 
            } 
        }
        this._rvCache.set(key, buf);
        // Prune cache if too large
        if (this._rvCache.size > 10) this._rvCache.delete(this._rvCache.keys().next().value);
        return buf;
    }
    _applyFx() {
        const p = this.presets[this.currentMode] || this.presets.default;
        if (this.chorus) this.chorus.setDepth(p.chorus || 0);
        if (this.delay) {
            const echoOff = p.echoBypass;
            this.delay.set(echoOff ? 0 : (p.delay || 0), p.delayTime || 0.375, p.delayFb || 0.3);
        }
        if (this.reverbGain) {
            if (p.reverbBypass) {
                this.reverbGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            } else {
                let rv = p.reverb !== undefined ? p.reverb : Math.min(0.25, 0.04 + (p.r || 1) * 0.02);
                this.reverbGain.gain.setTargetAtTime(rv, this.ctx.currentTime, 0.1);
            }
        }
        if (this.reverb && this.ctx) {
            const size = p.reverbSize !== undefined ? p.reverbSize : 2.5;
            const damp = p.reverbDamp !== undefined ? p.reverbDamp : 1200;
            const fb = p.reverbFb !== undefined ? p.reverbFb : 0.44;
            const dampNorm = Math.max(0.5, Math.min(4, damp / 1000));
            this.reverb.buffer = this._genReverb(size, dampNorm + fb * 2);
        }
        if (this.masterGain) this.masterGain.gain.value = p.mainGain !== undefined ? p.mainGain : 0.6;
        // Stereo Imager
        if (this.imgPanner) {
            const bypass = !!p.imgBypass;
            const width = p.stereoWidth !== undefined ? p.stereoWidth : 2;
            const pan = p.pan || 0;
            const bassMono = p.bassMono !== undefined ? p.bassMono : 500;
            // Width: 0=mono, 1=normal, 2=extra wide. Adjust L/R gains via mid/side concept.
            // Simple approach: L = mid + side*width, R = mid - side*width
            // For pure gain-based: scale the difference channel
            const midCoeff = 1.0;
            const sideCoeff = Math.max(0, width);
            // When width < 1, we mix more mono in. When > 1, we exaggerate differences.
            this.imgLeftOut.gain.setTargetAtTime(0.5 * (midCoeff + sideCoeff), this.ctx.currentTime, 0.02);
            this.imgRightOut.gain.setTargetAtTime(0.5 * (midCoeff + sideCoeff), this.ctx.currentTime, 0.02);
            this.imgPanner.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.02);
            // Bass mono crossover
            if (bassMono > 0) {
                this.imgBassLP.frequency.setTargetAtTime(bassMono, this.ctx.currentTime, 0.02);
                this.imgBassHP.frequency.setTargetAtTime(bassMono, this.ctx.currentTime, 0.02);
            }
            // Bypass
            this.imgWetNode.gain.setTargetAtTime(bypass ? 0 : 1, this.ctx.currentTime, 0.02);
            this.imgBypassNode.gain.setTargetAtTime(bypass ? 1 : 0, this.ctx.currentTime, 0.02);
        }
    }
    noteOn(midi, freq, vel = 0.7) {
        if (!this.initialized) return;
        // Debounce: ignore retriggers within 10ms on same note
        const now = performance.now();
        if (this._lastNoteTime.has(midi) && now - this._lastNoteTime.get(midi) < 10) return;
        this._lastNoteTime.set(midi, now);
        // Kill existing voice on same note (immediate to free resources)
        if (this.voices.has(midi)) this._rel(midi, true);
        // Voice stealing: kill oldest voices until we're under the limit
        while (this.voices.size >= this.maxVoices) {
            const oldest = this.voices.keys().next().value;
            this._rel(oldest, true);
        }
        const p = this.presets[this.currentMode] || this.presets.default;
        const v = new SynthVoice(this.ctx, p, freq, vel, this.master);
        v.setSignature(this.signatureValue);
        this.voices.set(midi, v);
    }
    noteOff(midi) { this._lastNoteTime.delete(midi); this._rel(midi, false); }
    _rel(midi, imm = false) { const v = this.voices.get(midi); if (!v) return; v.release(imm); this.voices.delete(midi); }
    setSignature(v) { this.signatureValue = v; for (const [, voice] of this.voices) voice.setSignature(v); }
    setFilterMod(v) { this.filterMod = v; const p = this.presets[this.currentMode] || this.presets.default; for (const [, voice] of this.voices) voice.setFilterFreq((p.fFreq || 12000) + v * (p.fEnv || 4000) * 0.6); }
    setMode(i) { this.modeIndex = ((i % this.modeKeys.length) + this.modeKeys.length) % this.modeKeys.length; this.currentMode = this.modeKeys[this.modeIndex]; this._applyFx(); }
    allNotesOff() { for (const [m] of this.voices) this._rel(m, true); this.voices.clear(); }
    resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
    playClick(midi, vel = 0.5, isStrong = false) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        const freq = isStrong ? 1200 : 800;
        osc.frequency.setValueAtTime(freq * 1.5, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.02);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vel, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    playClickSound(isUp = false) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // 1. Noise Source
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        // 2. High-Pass + Resonant Peak for "Plastic" crunch
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = isUp ? 4500 : 2500; // Higher freq for "up" release
        
        const res = this.ctx.createBiquadFilter();
        res.type = 'bandpass';
        res.frequency.value = isUp ? 8000 : 6000;
        res.Q.value = 1.5;

        // 3. Extremely fast transient envelope (8ms - 15ms)
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(isUp ? 0.2 : 0.4, now + 0.001);
        g.gain.exponentialRampToValueAtTime(0.001, now + (isUp ? 0.008 : 0.015));

        src.connect(hp); hp.connect(res); res.connect(g);
        g.connect(this.masterGain || this.ctx.destination);
        
        src.start(now); src.stop(now + 0.05);
    }
    playDegauss() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        const master = this.ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.25, now + 0.05);
        master.gain.exponentialRampToValueAtTime(0.001, now + 10.0); // 10s tail

        // Global High-Pass - Pushed even higher for razor sizzle
        const hpFilter = this.ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 8000; 
        master.connect(hpFilter);
        hpFilter.connect(this.masterGain || this.ctx.destination);
        
        if (this.reverbGain) {
            // Add Pre-delay to reverb to "keep the crack" (dry hits first)
            const preDelay = this.ctx.createDelay();
            preDelay.delayTime.value = 0.04; // 40ms space
            const revSend = this.ctx.createGain(); 
            revSend.gain.value = 0.08; // Very subtle, distant reverb
            hpFilter.connect(preDelay); preDelay.connect(revSend);
            revSend.connect(this.reverbGain);
        }

        // 2. GRANULAR STATIC ENGINE
        const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
        for(let i=0; i<noiseBuf.getChannelData(0).length; i++) noiseBuf.getChannelData(0)[i] = Math.random() * 2 - 1;

        const scheduleGrain = (startTime, volume, duration, filterFreq) => {
            const grain = this.ctx.createBufferSource();
            grain.buffer = noiseBuf;
            const gG = this.ctx.createGain();
            const gF = this.ctx.createBiquadFilter();
            gF.type = 'bandpass'; gF.frequency.value = filterFreq; gF.Q.value = 1.0;
            
            gG.gain.setValueAtTime(0, startTime);
            gG.gain.linearRampToValueAtTime(volume, startTime + 0.001);
            gG.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            grain.connect(gF); gF.connect(gG); gG.connect(master);
            grain.start(startTime); grain.stop(startTime + duration + 0.1);
        };

        // Phase A: Pre-static "Pop-corn" (Scattered) - Increased count (120)
        for(let i=0; i<120; i++) {
            const progress = i / 120;
            const t = now + 0.15 + (progress * 0.5);
            const v = (0.01 + Math.random() * 0.05) * progress;
            scheduleGrain(t, v, 0.005 + Math.random() * 0.03, 5000 + Math.random() * 5000);
        }

        // Phase B: Main Discharge Crackle (Massive Density - 1200 grains)
        const grainCount = 1200;
        const mainDuration = 8.5;
        for(let i=0; i<grainCount; i++) {
            const progress = i / grainCount;
            const t = now + 0.65 + (progress * mainDuration);
            const fadeIn = Math.min(1.0, progress * 4.0); 
            const density = Math.pow(1 - progress, 1.1) * fadeIn;
            
            if (Math.random() > (1 - density)) {
                const v = (0.04 + Math.random() * 0.22) * density;
                const dur = 0.003 + Math.random() * 0.05;
                const freq = 3000 + (Math.random() * 9000);
                scheduleGrain(t, v, dur, freq);
            }
        }

        // Phase C: Occasional "Snaps" (Impulses) - More snaps (32)
        for(let i=0; i<32; i++) {
            const t = now + 0.7 + (Math.random() * mainDuration);
            const snap = this.ctx.createBufferSource();
            snap.buffer = noiseBuf;
            const snapG = this.ctx.createGain();
            const snapF = this.ctx.createBiquadFilter();
            snapF.type = 'highpass'; snapF.frequency.value = 8500;
            snapG.gain.setValueAtTime(0.2, t);
            snapG.gain.exponentialRampToValueAtTime(0.001, t + 0.004);
            snap.connect(snapF); snapF.connect(snapG); snapG.connect(master);
            snap.start(t); snap.stop(t + 0.01);
        }
    }
}

const engine = new LabEngine();
const midiPlayer = new MidiPlayer(engine);
midiPlayer.loop = true;

window.tr808 = new TR808Engine(null, null);
const tr808 = window.tr808;

// ─── DOM ─────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const modeNameEl = $('mode-name'), modeIndexEl = $('mode-index');
const btnPrev = $('btn-prev'), btnNext = $('btn-next');
const sliderTrack = $('slider-track'), sliderFill = $('slider-fill');
const sliderThumb = $('slider-thumb'), sliderValEl = $('slider-value');
// ─── Visual System ───────────────────────────────────────────────
const mathEngine = new MathEngine();
const visCanvas = $('vis-canvas');
let visCtx = visCanvas ? visCanvas.getContext('2d', { alpha: true }) : null;
let visLastTime = performance.now();
const visAnalyser = new VisualAnalyser(visCanvas);
const conductor = new Conductor(visAnalyser, engine, mathEngine);
window.conductor = conductor; // console access: conductor.setCoupling(0..1)

const visModes = {
    'Attractor': new AttractorMode(mathEngine),
    'Nebula': new NebulaMode(mathEngine),
    'Plasma': new PlasmaMode(mathEngine),
    'Flow Field': new FlowFieldMode(mathEngine),
    'Vortex': new VortexMode(mathEngine),
    'Stardust': new StardustMode(mathEngine),
    'Black Hole': new BlackHoleMode(mathEngine),
    'Aurora': new AuroraMode(mathEngine),
    'Lava Flow': new LavaFlowMode(mathEngine),
    'Wave': new WaveMode(mathEngine),
    'Lissajous': new LissajousMode(mathEngine),
    'Cymatics': new CymaticsMode(mathEngine),
    'Metaballs': new MetaballsMode(mathEngine),
    'Glow Worm': new GlowWormMode(mathEngine),
    'Supernova': new SupernovaMode(mathEngine),
    'Digital Rain': new DigitalRainMode(mathEngine),
    'Asteroids': new AsteroidFieldMode(mathEngine),
    'Clifford': new CliffordMode(mathEngine),
    // 'IFS': new IFSMode(mathEngine),
    'Quantum': new QuantumMode(mathEngine),
    'Ink Wash': new InkWashMode(mathEngine),
    'Voxels': new VoxelsMode(mathEngine),
    'Mandala': new MandalaMode(mathEngine),
    'Fluid': new FluidMode(mathEngine),
    'Isogrid': new IsogridMode(mathEngine),
    'Waveform': new WaveformMode(mathEngine),
    'BitCrush': new BitCrushMode(mathEngine),
    'Pixel Sort': new PixelSortMode(mathEngine),
    'Chronos': new ChronosMode(mathEngine),
    'Magnetic': new MagneticMode(mathEngine),
    'Kaleidoscope': new KaleidoscopeMode(mathEngine),
    'Waves': new OceanWaveMode(mathEngine),
    'Audio Surface': new AudioSurfaceMode(mathEngine),
    'Interference': new InterferenceMode(mathEngine),
    'Reaction Diffusion': new ReactionDiffusionMode(mathEngine),
    'Smoke': new SmokeMode(mathEngine),
};
const visModeKeys = Object.keys(visModes);
let visModeIndex = 0;
let visMode = visModes[visModeKeys[0]];

const midiStateEl = $('midi-state');
const midiDrop = $('midi-drop'), midiFile = $('midi-file');
const btnPlay = $('btn-play'), btnStop = $('btn-stop');



const visNameEl = $('vis-name'), visIndexEl = $('vis-index');
const btnVisPrev = $('btn-vis-prev'), btnVisNext = $('btn-vis-next');

function updateModeUI() {
    modeNameEl.textContent = engine.currentMode;
    modeIndexEl.textContent = `${engine.modeIndex + 1} / ${engine.modeKeys.length}`;

    visNameEl.textContent = visModeKeys[visModeIndex].toUpperCase();
    visIndexEl.textContent = `VISUAL ${visModeIndex + 1} / ${visModeKeys.length}`;

    syncUIToPreset();
}

btnPrev.addEventListener('click', () => { engine.setMode(engine.modeIndex - 1); updateModeUI(); });
btnNext.addEventListener('click', () => { engine.setMode(engine.modeIndex + 1); updateModeUI(); });

// Visual navigation handled later via setVisMode

// ─── Note Tracking ──────────────────────────────────────────────
let lastNoteOnTime = 0;
let lastNoteOffTime = 0;
let noteIsActive = false;
let _lfoPhaseAccum = 0;
const origNoteOn = engine.noteOn.bind(engine);
const origNoteOff = engine.noteOff.bind(engine);
engine.noteOn = function (midi, freq, vel) {
    lastNoteOnTime = performance.now() / 1000;
    noteIsActive = true;
    origNoteOn(midi, freq, vel);
    // Forward to MathEngine for visual coupling
    mathEngine.noteOn(midi, freq, vel);
    // Notify active visual mode
    if (visMode && visMode.onNoteOn) {
        visMode.onNoteOn({ midi, frequency: freq, velocity: vel, index: midi, normalizedPosition: Math.min(1, Math.max(0, Math.log2(freq / 20) / 10)) });
    }
};
engine.noteOff = function (midi) {
    if (engine.voices.size <= 1) { lastNoteOffTime = performance.now() / 1000; noteIsActive = false; }
    origNoteOff(midi);
    mathEngine.noteOff(midi);
    if (visMode && visMode.onNoteOff) visMode.onNoteOff(midi);
};

// ─── Connect Analyser to MathEngine on init ─────────────────────
const _origEngineInit = engine.init.bind(engine);
engine.init = async function () {
    await _origEngineInit();
    if (engine.analyser && !mathEngine.analyser) {
        mathEngine.setAnalyser(engine.analyser);
    }
    // Initialize TR-808 with a dedicated high-gain bus
    // Bypass spatial FX (Chorus/Delay/Reverb) to keep drums punchy and dry
    const trBus = engine.ctx.createDynamicsCompressor();
    trBus.threshold.value = -3;
    trBus.knee.value = 8;
    trBus.ratio.value = 4;
    trBus.attack.value = 0.005;
    trBus.release.value = 0.1;
    
    // Dedicated drum gain stage (Unity for balance)
    const trBusGain = engine.ctx.createGain();
    trBusGain.gain.value = 1.0; 
    
    trBus.connect(trBusGain);
    // Connect directly to master compressor, bypassing the wash of the reverb/delay chain
    trBusGain.connect(engine.compressor);

    tr808.ctx = engine.ctx;
    tr808.master = trBus;
};

// ─── Audio Analysis ─────────────────────────────────────────────
let rmsLevel = 0;
const timeBuf = new Uint8Array(1024);
const freqBuf = new Uint8Array(256);

function updateAudioData() {
    if (!engine.analyser) return;
    engine.analyser.getByteTimeDomainData(timeBuf);
    engine.analyser.getByteFrequencyData(freqBuf);
    let sum = 0;
    for (let i = 0; i < timeBuf.length; i++) { const v = (timeBuf[i] - 128) / 128; sum += v * v; }
    rmsLevel = Math.sqrt(sum / timeBuf.length);
}



let stereoParticles = [];
const STEREO_PARTICLE_COUNT = 80;
for (let i = 0; i < STEREO_PARTICLE_COUNT; i++) stereoParticles.push({ nx: 0, ny: 0, z: Math.random(), vx: 0, vy: 0, life: Math.random() });

function drawStereoViz() {
    const c = $('stereo-viz'); if (!c) return;
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width) || c.height !== Math.floor(rect.height)) {
        c.width = Math.floor(rect.width); c.height = Math.floor(rect.height);
    }
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    const p = engine.presets[engine.currentMode] || {};
    const width = p.stereoWidth !== undefined ? p.stereoWidth : 1;
    const pan = p.pan || 0;
    const bypass = !!p.imgBypass;
    const active = noteIsActive && rmsLevel > 0.01;
    const t = performance.now() / 1000;

    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const cx = W / 2, cy = H * 0.6;
    const wScale = bypass ? 0.2 : Math.max(0.1, width);
    const panAngle = -pan * 0.5; // Reversed direction

    // 1. Vector Floor (Radial Spokes)
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
        const angle = -Math.PI + (i / 20) * Math.PI;
        const beamAngle = angle * wScale + panAngle;
        const len = active ? 0.7 + rmsLevel * 0.5 : 0.6;
        
        const p1 = project3D(W/2, -1, W, H, 0.1);
        const p2 = project3D(W/2 + Math.sin(beamAngle) * W * 0.45 * len, -1, W, H, 0.8);
        
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        const alpha = active ? 0.35 : 0.12;
        grad.addColorStop(0, `rgba(0,180,255,0)`);
        grad.addColorStop(0.5, `rgba(0,180,255,${alpha})`);
        grad.addColorStop(1, `rgba(0,180,255,0)`);
        
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = grad; ctx.stroke();
    }

    // 2. High-Glow 'Stereo Fan' Arcs
    const layers = active ? 4 : 2;
    for (let l = 0; l < layers; l++) {
        const rMult = 1.0 - (l * 0.15);
        const arcSpan = Math.PI * 0.35 * wScale;
        const pulse = active ? 1 + Math.sin(t * 12 + l) * 0.05 * rmsLevel : 1;

        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
            // Rotated 180 Deg from East: Center is Math.PI (West)
            const ang = Math.PI - arcSpan + (i / 40) * (arcSpan * 2);
            const pt = project3D(W/2 + Math.sin(ang + panAngle) * (W/2.5) * rMult * pulse, -Math.cos(ang + panAngle) * 0.8, W, H, 0.1);
            i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
        }
        
        const alpha = (1.0 - l/layers) * (active ? 0.8 : 0.3);
        ctx.strokeStyle = bypass ? 'rgba(100,100,100,0.4)' : `rgba(0,240,255,${alpha})`;
        ctx.lineWidth = active ? 3 - l : 1.5;
        if (active && l === 0) {
            ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 15;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // 3. Magnetic Core (Pulsing Center)
    if (active) {
        const coreSize = 10 + rmsLevel * 25;
        const corePt = project3D(W/2 + pan * 20, 0, W, H, 0.1);
        const radGrad = ctx.createRadialGradient(corePt.x, corePt.y, 0, corePt.x, corePt.y, coreSize);
        radGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
        radGrad.addColorStop(0.4, 'rgba(0,240,255,0.4)');
        radGrad.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath(); ctx.arc(corePt.x, corePt.y, coreSize, 0, Math.PI * 2); ctx.fill();
    }

    // 4. 3D Particle Nebula (Restored)
    for (let i = 0; i < stereoParticles.length; i++) {
        const sp = stereoParticles[i];
        sp.life -= 0.008;

        if (sp.life <= 0) {
            sp.life = 0.6 + Math.random() * 0.5;
            sp.z = Math.random();
            if (active) {
                const angle = (Math.random() - 0.5) * Math.PI * wScale + panAngle;
                const dist = (0.3 + Math.random() * 0.9) * 1.5;
                sp.nx = Math.sin(angle) * dist;
                sp.ny = (Math.random() - 0.5) * 1.2;
                sp.vx = (Math.random() - 0.5) * 0.02;
                sp.vy = (Math.random() - 0.5) * 0.02;
            } else {
                const phase = t * 0.2 + i * 0.5;
                sp.nx = Math.sin(phase) * 0.6; sp.ny = Math.cos(phase * 0.7) * 0.3;
                sp.vx = 0; sp.vy = 0;
            }
        }

        sp.nx += sp.vx; sp.ny += sp.vy;
        sp.z = (sp.z + 0.003) % 1;

        const pt = project3D(W/2 + sp.nx * (W/3), sp.ny, W, H, sp.z);
        const alpha = sp.life * (1 - sp.z) * (active ? 0.9 : 0.3);
        const sz = (1 - sp.z) * (active ? 2.5 : 1.2);

        // Deep Red Particles
        ctx.fillStyle = active ? `rgba(255,40,40,${alpha})` : `rgba(160,20,20,${alpha})`;
        ctx.fillRect(pt.x - sz/2, pt.y - sz/2, sz, sz);
    }
}

// ─── Shared LCD 3D Depth Helpers ─────────────────────────────────
function drawLCDGrid(ctx, W, H) {
    const horizon = H * 0.45;
    ctx.save();

    // 1. Solid Floor
    ctx.fillStyle = 'rgba(10,12,15,0.85)';
    ctx.fillRect(0, horizon, W, H - horizon);

    // 2. Box Walls (Side Perspective)
    ctx.beginPath();
    // Top face edges
    ctx.moveTo(0, 0); ctx.lineTo(W*0.08, H*0.05); 
    ctx.lineTo(W*0.92, H*0.05); ctx.lineTo(W, 0);
    // Floor edges
    ctx.moveTo(0, H); ctx.lineTo(W*0.08, horizon);
    ctx.lineTo(W*0.92, horizon); ctx.lineTo(W, H);
    // Vertical back corners
    ctx.moveTo(W*0.08, H*0.05); ctx.lineTo(W*0.08, horizon);
    ctx.moveTo(W*0.92, H*0.05); ctx.lineTo(W*0.92, horizon);
    
    ctx.strokeStyle = 'rgba(232,138,32,0.18)'; ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Floor Grid (Receding)
    ctx.strokeStyle = 'rgba(232,138,32,0.12)';
    for (let z = 0; z <= 1; z += 0.25) {
        const pL = project3D(0, -1, W, H, z);
        const pR = project3D(W, -1, W, H, z);
        ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pR.x, pR.y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += W/6) {
        const pT = project3D(x, -1, W, H, 0);
        const pB = project3D(x, -1, W, H, 1);
        ctx.beginPath(); ctx.moveTo(pT.x, pT.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
    }

    ctx.restore();
}

/**
 * Project a 2D point into 2.5D space with extrusion/thickness.
 * z: depth coordinate (0 is front, 1 is back)
 */
function project3D(x, yVal, W, H, z = 0) {
    const horizon = H * 0.48;
    const wallLeft = W * 0.08;
    const wallRight = W * 0.92;
    
    // Balanced perspective
    const zScale = 1 / (1 + z * 1.4); 
    const zOffset = z * (H * 0.22);
    
    // X-projection
    const px = W/2 + (wallLeft + (x / W) * (wallRight - wallLeft) - W/2) * zScale;
    
    // Y-projection
    const py = (horizon - zOffset) - (yVal) * (H * 0.25 * zScale);
    
    return { x: px, y: py };
}

function drawWaveReflection(ctx, path, W, H, color, opacity = 0.12) {
    const horizon = H * 0.58;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
        const p = path[i];
        // Mirror Y across the horizon and compress
        const ry = horizon + (horizon - p.y) * 0.35;
        // X spreads out slightly as it comes "forward" on the floor
        const rx = W/2 + (p.x - W/2) * (1 + (ry - horizon) / (H - horizon) * 0.2);
        i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
}

function drawOscViz(id, type, isActive) {
    const c = $(id); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const t = performance.now() / 1000;
    const freq = 2;
    const frontPath = [], backPath = [];

    for (let i = 0; i <= W; i += 4) {
        const phase = (i / W) * freq + t;
        let v = 0;
        if (type === 'sine') v = Math.sin(phase * Math.PI * 2);
        else if (type === 'sawtooth') v = (phase % 1) * 2 - 1;
        else if (type === 'square') v = (phase % 1) < 0.5 ? 1 : -1;
        else if (type === 'triangle') v = 1 - Math.abs((phase % 1) - 0.5) * 4;
        
        frontPath.push(project3D(i, v, W, H, 0));
        backPath.push(project3D(i, v, W, H, 0.8)); // Thick ribbon
    }

    // 1. Solid Sides (Volume — each quad drawn separately)
    const oscSideFill = isActive ? 'rgba(232,138,32,0.22)' : 'rgba(232,138,32,0.08)';
    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = oscSideFill;
        ctx.fill();
    }

    // 2. Front edge (Bright)
    ctx.beginPath();
    for (const p of frontPath) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = isActive ? 'rgba(240,168,48,1)' : 'rgba(232,138,32,0.6)';
    ctx.lineWidth = 2.5;
    if (isActive) {
        ctx.shadowColor = 'rgba(240,168,48,0.6)';
        ctx.shadowBlur = 6;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawWaveReflection(ctx, frontPath, W, H, 'rgba(232,138,32,0.25)', 0.15);
}

function drawNoiseViz() {
    const c = $('noise-viz'); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const p = engine.presets[engine.currentMode] || {};
    const isPink = p.noiseType === 'pink';
    const isActive = (p.noise || 0) > 0 || (p.sub || 0) > 0;
    const bright = isActive && noteIsActive;
    
    const frontPath = [], backPath = [];
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i <= W; i += 4) {
        let val = 0;
        if (isPink) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + w * 0.099046;
            b1 = 0.96300 * b1 + w * 0.296516;
            b2 = 0.57000 * b2 + w * 1.052691;
            val = (b0 + b1 + b2) * 0.15 + w * 0.15;
        } else {
            val = Math.random() * 2 - 1;
        }

        frontPath.push(project3D(i, val * 0.7, W, H, 0));
        backPath.push(project3D(i, val * 0.7, W, H, 0.8));
    }

    // Colors based on noise type
    const sideColor = isPink
        ? (bright ? 'rgba(255,130,180,0.18)' : 'rgba(220,220,230,0.08)')
        : (bright ? 'rgba(255,255,255,0.18)' : 'rgba(220,220,230,0.08)');
    const frontColor = isPink
        ? (bright ? 'rgba(255,130,180,1)' : 'rgba(220,220,230,0.5)')
        : (bright ? 'rgba(255,255,255,1)' : 'rgba(220,220,230,0.5)');
    const reflColor = isPink ? 'rgba(255,130,180,0.2)' : 'rgba(255,255,255,0.15)';

    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = sideColor;
        ctx.fill();
    }

    ctx.beginPath();
    for (const pt of frontPath) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = frontColor;
    ctx.lineWidth = 1.5; ctx.stroke();

    drawWaveReflection(ctx, frontPath, W, H, reflColor, 0.12);
}

function drawFilterViz() {
    const c = $('filter-viz'); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const p = engine.presets[engine.currentMode] || {};
    const freq = p.fFreq || 2000, res = p.fRes || 1, type = p.fType || 'lp';
    const bypassed = p.fBypass;

    // Build paths
    const frontPath = [], backPath = [];
    const normCutoff = Math.log10(Math.max(20, freq));
    for (let i = 0; i <= W; i += 5) {
        const logF = 1.3 + (i / W) * (Math.log10(20000) - 1.3);
        const fRatio = Math.pow(10, logF - normCutoff);
        let gain;
        const Q = 0.5 + res * 0.5;
        if (type === 'lp') gain = 1 / Math.sqrt(Math.pow(1 - fRatio * fRatio, 2) + Math.pow(fRatio / Q, 2));
        else if (type === 'hp') { const r2 = fRatio * fRatio; gain = r2 / Math.sqrt(Math.pow(1 - r2, 2) + Math.pow(fRatio / Q, 2)); }
        else gain = (fRatio / Q) / Math.sqrt(Math.pow(1 - fRatio * fRatio, 2) + Math.pow(fRatio / Q, 2));
        
        const dB = 20 * Math.log10(Math.max(0.001, Math.min(10, gain)));
        const yVal = (dB / 25) - 0.2; 
        frontPath.push(project3D(i, yVal, W, H, 0));
        backPath.push(project3D(i, yVal, W, H, 0.8));
    }

    // 1. Sides (each quad drawn separately)
    const filterSideFill = bypassed ? 'rgba(232,138,32,0.06)' : 'rgba(232,138,32,0.18)';
    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = filterSideFill;
        ctx.fill();
    }

    // 2. Front face
    ctx.beginPath();
    for (const pt of frontPath) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = bypassed ? 'rgba(232,138,32,0.4)' : 'rgba(232,138,32,1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawWaveReflection(ctx, frontPath, W, H, 'rgba(232,138,32,0.2)', 0.1);
}

function drawEnv(canvasId, a, d, s, r, isActive, envElapsed, released, relElapsed) {
    const c = $(canvasId); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    
    // Isometric Perspective: 30-Deg Yaw + 8-Deg CW Roll
    const yAngle = 30 * Math.PI / 180;
    const cosY = Math.cos(yAngle), sinY = Math.sin(yAngle);
    const zAngle = 8 * Math.PI / 180; // Subtle CW lean
    const cosZ = Math.cos(zAngle), sinZ = Math.sin(zAngle);
    const depthScale = 130; 

    const iso = (xVal, vVal, zVal) => {
        const cx = xVal - W/2;
        const cy = vVal * H * 0.25; 
        const cz = zVal * depthScale;
        
        // 1. Y-Rotation (Yaw - turn right)
        const rx = cx * cosY + cz * sinY;
        const rz = -cx * sinY + cz * cosY;
        
        // 2. Subtle Z-Rotation (CW lean)
        const fx = rx * cosZ + cy * sinZ;
        const fy = -rx * sinZ + cy * cosZ;
        
        return {
            x: W/2 + fx,
            // Back goes UP to expose top plane
            y: (H * 0.5) - fy - rz * 0.12
        };
    };

    // Tilted Floor Grid
    ctx.strokeStyle = 'rgba(232,138,32,0.05)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
        const z = i / 3;
        const pL = iso(W*0.05, -1, z), pR = iso(W*0.95, -1, z);
        ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pR.x, pR.y); ctx.stroke();
    }

    const sustainHold = 0.3, totalT = a + d + sustainHold + r;
    function envVal(t) {
        if (t <= a) return t / Math.max(0.001, a); t -= a;
        if (t <= d) return 1 - (1 - s) * (t / Math.max(0.001, d)); t -= d;
        if (t <= sustainHold) return s; t -= sustainHold;
        return s * Math.max(0, 1 - t / Math.max(0.001, r));
    }

    const px = t => (t / totalT) * W;
    const stages = [
        { t: 0, v: -1 },
        { t: a, v: 1 },
        { t: a + d, v: (s * 2) - 1 },
        { t: a + d + sustainHold, v: (s * 2) - 1 },
        { t: totalT, v: -1 }
    ];

    const frontPath = stages.map(st => iso(px(st.t), st.v, 0));
    const backPath = stages.map(st => iso(px(st.t), st.v, 1.0));

    // 1. Side/Top Panels (each drawn separately to avoid even-odd fill overlap)
    const sideFill = isActive ? 'rgba(0,180,255,0.22)' : 'rgba(60,130,220,0.08)';
    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = sideFill;
        ctx.fill();
    }

    // 3. Front Face (drawn last — closest to viewer)
    ctx.beginPath();
    for (const p of frontPath) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = isActive ? '#00f0ff' : 'rgba(60,130,220,0.7)';
    ctx.lineWidth = 2.5;
    if (isActive) {
        ctx.shadowColor = 'rgba(0,240,255,0.5)';
        ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Playhead Beam
    if (isActive && envElapsed >= 0) {
        let playT = !released ? Math.min(envElapsed, a + d + sustainHold) : a + d + sustainHold + Math.min(relElapsed, r);
        const val = envVal(playT);
        const pFront = iso(px(playT), (val * 2) - 1, 0);
        const pBack = iso(px(playT), (val * 2) - 1, 1.0);

        ctx.beginPath(); ctx.moveTo(pFront.x, pFront.y); ctx.lineTo(pBack.x, pBack.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        
        ctx.beginPath(); ctx.arc(pFront.x, pFront.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
    }
}

function drawLFO() {
    const c = $('lfo-viz'); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const p = engine.presets[engine.currentMode] || {};
    const rate = p.lfoRate || 0, shape = p.lfoShape || 'sine';
    if (rate <= 0) {
        const p1 = project3D(0, -1, W, H, 0), p2 = project3D(W, -1, W, H, 0.8);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(232,138,32,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        return;
    }

    const t = performance.now() / 1000, cycles = 2;
    const frontPath = [], backPath = [];
    for (let i = 0; i <= W; i += 4) {
        const phase = ((i / W) * cycles + t * rate) % 1;
        let v = 0;
        if (shape === 'sine') v = Math.sin(phase * Math.PI * 2);
        else if (shape === 'sawtooth') v = phase * 2 - 1;
        else if (shape === 'square') v = phase < 0.5 ? 1 : -1;
        else v = 1 - 4 * Math.abs(phase - 0.5);
        
        frontPath.push(project3D(i, v, W, H, 0));
        backPath.push(project3D(i, v, W, H, 0.8));
    }

    // Sides (each quad drawn separately)
    const lfoSideFill = noteIsActive ? 'rgba(232,138,32,0.18)' : 'rgba(232,138,32,0.06)';
    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = lfoSideFill;
        ctx.fill();
    }

    // Front
    ctx.beginPath();
    for (const p of frontPath) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = noteIsActive ? 'rgba(240,168,48,1)' : 'rgba(232,138,32,0.6)';
    ctx.lineWidth = 2; ctx.stroke();

    drawWaveReflection(ctx, frontPath, W, H, 'rgba(232,138,32,0.2)', 0.1);
}

function drawFMViz() {
    const c = $('env-fm'); if (!c) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    drawLCDGrid(ctx, W, H);

    const p = engine.presets[engine.currentMode] || {};
    const depth = p.fmDepth || 0, ratio = p.fmRatio || 1;
    const t = performance.now() / 1000;
    const active = depth > 0;

    if (!active) {
        const path = [];
        for (let i = 0; i <= W; i += 4) {
            const v = Math.sin((i / W) * Math.PI * 6 + t * 0.5);
            path.push(project3D(i, v * 0.5, W, H, 0));
        }
        ctx.beginPath(); for (const pt of path) ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = 'rgba(232,138,32,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        return;
    }

    const frontPath = [], backPath = [];
    const dClamped = Math.min(depth, 8);
    for (let i = 0; i <= W; i += 4) {
        const x = i / W;
        const mod = Math.sin(x * Math.PI * 6 * ratio + t * 2) * dClamped * 0.3;
        const v = Math.sin(x * Math.PI * 6 + mod + t);
        frontPath.push(project3D(i, v, W, H, 0));
        backPath.push(project3D(i, v, W, H, 0.4));
    }

    // 1. Sides (each quad drawn separately)
    for (let i = 0; i < frontPath.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(frontPath[i].x, frontPath[i].y);
        ctx.lineTo(backPath[i].x, backPath[i].y);
        ctx.lineTo(backPath[i+1].x, backPath[i+1].y);
        ctx.lineTo(frontPath[i+1].x, frontPath[i+1].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(180,120,255,0.12)';
        ctx.fill();
    }

    // 2. Front
    ctx.beginPath();
    for (const pt of frontPath) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = 'rgba(200,160,255,1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawWaveReflection(ctx, frontPath, W, H, 'rgba(180,120,255,0.2)', 0.1);

    // Readout
    ctx.font = '8px Share Tech Mono'; ctx.fillStyle = 'rgba(232,138,32,0.8)';
    ctx.textAlign = 'left'; ctx.fillText('D:' + depth.toFixed(1), 8, 12);
    ctx.textAlign = 'right'; ctx.fillText('R:' + ratio.toFixed(2), W - 8, 12);
}

function updateEnvelopes() {
    const p = engine.presets[engine.currentMode] || {};
    const now = performance.now() / 1000, envElapsed = now - lastNoteOnTime, relElapsed = now - lastNoteOffTime;
    const isPlaying = noteIsActive || (relElapsed < (p.r || 1)), released = !noteIsActive && lastNoteOffTime > lastNoteOnTime;
    drawEnv('env-amp', p.a || 0.01, p.d || 0.3, p.s ?? 0.5, p.r || 1, isPlaying, envElapsed, released, relElapsed);
    drawEnv('env-1', p.e1A || 0.01, p.e1D || 0.3, p.e1S ?? 0.5, p.e1R || 1, isPlaying, envElapsed, released, relElapsed);
    drawEnv('env-2', p.e2A || 0.01, p.e2D || 0.3, p.e2S ?? 0.5, p.e2R || 1, isPlaying, envElapsed, released, relElapsed);
    drawEnv('env-flt', p.fA || 0.001, p.fD || 0.3, p.fS ?? 0, p.fR || 0.3, isPlaying, envElapsed, released, relElapsed);
}

// ─── Rotary Knob System ──────────────────────────────────────────
function initHWKnobs() {
    function drawKnob(el, normalized) {
        if (el.tagName === 'CANVAS') {
            const ctx = el.getContext('2d'),
      W = parseFloat(el.style.width) || el.width,
      H = parseFloat(el.style.height) || el.height, cx = W / 2, cy = H / 2, r = Math.min(cx, cy) - 4;
            ctx.clearRect(0, 0, W, H);
            const startA = 0.75 * Math.PI, arcRange = 1.5 * Math.PI;
            // Outer arc ring (thick, like hardware reference)
            const arcR = r + 3;
            ctx.beginPath(); ctx.arc(cx, cy, arcR, startA, startA + arcRange);
            ctx.strokeStyle = 'rgba(60,60,60,0.5)'; ctx.lineWidth = 2.5; ctx.lineCap = 'butt'; ctx.stroke();
            // Active arc (amber)
            if (normalized > 0.01) {
                ctx.beginPath(); ctx.arc(cx, cy, arcR, startA, startA + normalized * arcRange);
                ctx.strokeStyle = 'rgba(240,168,48,0.7)'; ctx.lineWidth = 2.5; ctx.stroke();
            }
            // Tick marks
            const tickR = arcR + 1.5, tickCount = 11;
            for (let i = 0; i < tickCount; i++) {
                const a = startA + (i / (tickCount - 1)) * arcRange;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * (tickR - 2), cy + Math.sin(a) * (tickR - 2));
                ctx.lineTo(cx + Math.cos(a) * tickR, cy + Math.sin(a) * tickR);
                ctx.strokeStyle = i <= normalized * (tickCount - 1) ? 'rgba(240,168,48,0.5)' : 'rgba(60,60,70,0.3)';
                ctx.lineWidth = 0.8; ctx.stroke();
            }
            // Knob shadow
            ctx.beginPath(); ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
            // Knob body (3D raised)
            const bg = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
            bg.addColorStop(0, '#505058'); bg.addColorStop(0.25, '#3a3a40'); bg.addColorStop(0.6, '#2a2a2e'); bg.addColorStop(1, '#18181c');
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
            // Outer ring bevel
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = '#555560'; ctx.lineWidth = 1.5; ctx.stroke();
            // Inner highlight
            ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, Math.PI * 1.1, Math.PI * 1.8);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.7; ctx.stroke();
            // Indicator notch
            const pa = startA + normalized * arcRange;
            const innerR = r * 0.3, outerR = r - 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(pa) * innerR, cy + Math.sin(pa) * innerR);
            ctx.lineTo(cx + Math.cos(pa) * outerR, cy + Math.sin(pa) * outerR);
            ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
            // Indicator glow dot
            const dotX = cx + Math.cos(pa) * (outerR + 0.5), dotY = cy + Math.sin(pa) * (outerR + 0.5);
            ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(240,168,48,0.6)'; ctx.fill();
        } else {
            // Support for DIV-based dials (like Tempo/Measures)
            const indicator = el.querySelector('.tr-dial-indicator');
            if (indicator) {
                const deg = -135 + normalized * 270;
                indicator.style.transform = `rotate(${deg}deg)`;
            }
            const bpmDisplay = el.querySelector('.tr-bpm-display');
            if (bpmDisplay) {
                const inp = $(el.dataset.for);
                if (inp) bpmDisplay.textContent = Math.round(inp.value);
            }
        }
    }
   window.renderAllKnobs = () => document.querySelectorAll('.hw-knob').forEach(c => {
    const inp = $(c.dataset.for);
    if (!inp) return;
    // Pin layout size ONCE from the first good measurement —
    // afterwards layout no longer depends on the canvas attributes.
    if (!c.dataset.pinned) {
        const rect = c.getBoundingClientRect();
        if (rect.width <= 0) return;          // hidden (flipped panel) — try next call
        c.style.width  = rect.width + 'px';
        c.style.height = rect.height + 'px';
        c.dataset.pinned = '1';
    }
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(parseFloat(c.style.width) * dpr);
    const h = Math.round(parseFloat(c.style.height) * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw in CSS px, render at device px
    drawKnob(c, (parseFloat(inp.value) - parseFloat(inp.min)) / (parseFloat(inp.max) - parseFloat(inp.min)));
});
    renderAllKnobs();

    document.querySelectorAll('.hw-knob').forEach(c => { const inp = $(c.dataset.for); if (inp) inp.addEventListener('input', () => drawKnob(c, (parseFloat(inp.value) - parseFloat(inp.min)) / (parseFloat(inp.max) - parseFloat(inp.min)))); });
    let ak = null, sy = 0, sn = 0;
    document.addEventListener('mousedown', e => { const k = e.target.closest('.hw-knob'); if (!k) return; e.preventDefault(); const inp = $(k.dataset.for); if (!inp) return; ak = { canvas: k, input: inp }; sy = e.clientY; sn = (parseFloat(inp.value) - parseFloat(inp.min)) / (parseFloat(inp.max) - parseFloat(inp.min)); });
    document.addEventListener('mousemove', e => { if (!ak) return; const inp = ak.input, min = parseFloat(inp.min), max = parseFloat(inp.max), nn = Math.max(0, Math.min(1, sn + (sy - e.clientY) / 150)), step = parseFloat(inp.step) || 0.01; inp.value = Math.round((min + nn * (max - min)) / step) * step; inp.dispatchEvent(new Event('input', { bubbles: true })); drawKnob(ak.canvas, nn); });
    document.addEventListener('mouseup', () => ak = null);
    renderAllKnobs();
    const oldUpdate = updateModeUI; updateModeUI = function () { oldUpdate(); setTimeout(renderAllKnobs, 50); };
}

// ─── Pendulum Mode (standalone instrument) ──────────────────────
const SCALES = {
    chromatic:      [0,1,2,3,4,5,6,7,8,9,10,11],
    major:          [0,2,4,5,7,9,11],
    minor:          [0,2,3,5,7,8,10],
    pentatonic:     [0,2,4,7,9],
    blues:          [0,3,5,6,7,10],
    dorian:         [0,2,3,5,7,9,10],
    mixolydian:     [0,2,4,5,7,9,10],
    harmonic_minor: [0,2,3,5,7,8,11],
    whole_tone:     [0,2,4,6,8,10],
};

function scaleNotes(scaleName, rootMidi, count) {
    const intervals = SCALES[scaleName] || SCALES.major;
    const notes = [];
    let octave = 0, idx = 0;
    while (notes.length < count) {
        const midi = rootMidi + octave * 12 + intervals[idx % intervals.length];
        if (midi <= 108) notes.push(midi);
        idx++;
        if (idx % intervals.length === 0) octave++;
        if (midi > 108) break;
    }
    return notes;
}

const pendulumMode = new PendulumMode(mathEngine);
let pendulumActive = false;
let pendulumNotes = scaleNotes('major', 48, 15);

// ─── Polyrhythm Mode ─────────────────────────────────────────────
const polyMode = new PolyrhythmMode();
let polyActive = false;

const btnPoly = $('btn-polyrhythm');
const polySetup = $('poly-setup');
const btnPolyStart = $('btn-poly-start');

if (btnPoly) {
    btnPoly.addEventListener('click', () => {
        if (!polyActive) {
            polySetup.classList.remove('hidden');
        } else {
            polyActive = false;
            btnPoly.classList.remove('active');
        }
    });
}

if (btnPolyStart) {
    btnPolyStart.addEventListener('click', () => {
        const bpm = parseInt($('poly-bpm').value);
        polyMode.setParams(bpm);
        polyActive = true;
        polySetup.classList.add('hidden');
        btnPoly.classList.add('active');
        
        // Deactivate Pendulum
        pendulumActive = false;
        if (btnPendulum) btnPendulum.classList.remove('active');
    });
}

polyMode.setClickCallback((isStrong) => {
    if (!polyActive || !engine.initialized) return;
    engine.playClick(0, isStrong ? 0.8 : 0.4, isStrong);
});

const btnPendulum = $('btn-pendulum');
const btnPendReset = $('btn-pend-reset');
const pendScaleEl = $('pend-scale');
const pendAngleEl = $('pend-angle');
const pendCountEl = $('pend-count');

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

function rebuildPendulumNotes() {
    const scale = pendScaleEl ? pendScaleEl.value : 'major';
    const count = pendCountEl ? parseInt(pendCountEl.value) : 15;
    pendulumNotes = scaleNotes(scale, 48, count);
}

// Wire wall-hit callback — each pendulum triggers its assigned note
pendulumMode.setWallHitCallback((index, force) => {
    if (!pendulumActive || !engine.initialized) return;
    const midi = pendulumNotes[index % pendulumNotes.length];
    const freq = midiToFreq(midi);
    const vel = 0.4 + force * 0.4;
    engine.noteOn(midi, freq, vel);
    setTimeout(() => engine.noteOff(midi), 150);
});

if (btnPendulum) btnPendulum.addEventListener('click', () => {
    pendulumActive = !pendulumActive;
    btnPendulum.classList.toggle('active', pendulumActive);
    if (pendulumActive) {
        rebuildPendulumNotes();
        pendulumMode.reset();
        const rect = visCanvas ? visCanvas.getBoundingClientRect() : { width: 800, height: 400 };
        pendulumMode.resize(rect.width, rect.height);
    }
});

if (btnPendReset) btnPendReset.addEventListener('click', () => pendulumMode.reset());
if (pendScaleEl) pendScaleEl.addEventListener('change', rebuildPendulumNotes);
if (pendAngleEl) pendAngleEl.addEventListener('input', () => {
    const val = parseFloat(pendAngleEl.value);
    pendulumMode.setAngle(val / 100);
});
if (pendCountEl) pendCountEl.addEventListener('input', () => {
    const count = parseInt(pendCountEl.value);
    pendulumMode.pendulumMath.setNumPendulums(count);
    rebuildPendulumNotes();
    pendulumMode.reset();
});


function resizeVisCanvas() {
    if (!visCanvas) return;
    const rect = visCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    visCanvas.width = Math.floor(rect.width * dpr);
    visCanvas.height = Math.floor(rect.height * dpr);
    visCtx = visCanvas.getContext('2d');
    visCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (visMode && visMode.resize) visMode.resize(rect.width, rect.height);
    if (pendulumMode && pendulumMode.resize) pendulumMode.resize(rect.width, rect.height);
}
if (visCanvas) {
    resizeVisCanvas();
    new ResizeObserver(resizeVisCanvas).observe(visCanvas.parentElement);
}

function setVisMode(index) {
    visModeIndex = ((index % visModeKeys.length) + visModeKeys.length) % visModeKeys.length;
    visMode = visModes[visModeKeys[visModeIndex]];
    const rect = visCanvas ? visCanvas.getBoundingClientRect() : { width: 800, height: 400 };
    if (visMode.resize) visMode.resize(rect.width, rect.height);

    const nameEl = $('vis-name');
    const idxEl = $('vis-index');
    if (nameEl) nameEl.textContent = visModeKeys[visModeIndex].toUpperCase();
    if (idxEl) idxEl.textContent = `${visModeIndex + 1} / ${visModeKeys.length}`;

    // Handle Subsets
    updateSubsetUI();
}

function updateSubsetUI() {
    const subSel = $('sub-selector');
    const subName = $('sub-name');
    const subIdx = $('sub-index');

    if (visMode && visMode.subsets) {
        if (subSel) subSel.style.visibility = 'visible';
        if (subName) subName.textContent = visMode.subsets[visMode.subIndex].toUpperCase();
        if (subIdx) subIdx.textContent = `${visMode.subIndex + 1} / ${visMode.subsets.length}`;
    } else {
        if (subSel) subSel.style.visibility = 'hidden';
    }
}

function setSubMode(delta) {
    if (visMode && visMode.setSubset) {
        visMode.setSubset(visMode.subIndex + delta);
        updateSubsetUI();
    }
}

// Set default visual to Reaction Diffusion
const defaultVisIndex = visModeKeys.indexOf('Reaction Diffusion');
setVisMode(defaultVisIndex >= 0 ? defaultVisIndex : 0);

// Set default sound preset to popart
const defaultSoundIndex = engine.modeKeys.indexOf('popart');
if (defaultSoundIndex >= 0) engine.setMode(defaultSoundIndex);

// Wire subset selector buttons
const btnSubPrev = $('btn-sub-prev');
const btnSubNext = $('btn-sub-next');
if (btnSubPrev) btnSubPrev.addEventListener('click', () => setSubMode(-1));
if (btnSubNext) btnSubNext.addEventListener('click', () => setSubMode(1));

// Wire visual selector buttons
if (btnVisPrev) btnVisPrev.addEventListener('click', () => setVisMode(visModeIndex - 1));
if (btnVisNext) btnVisNext.addEventListener('click', () => setVisMode(visModeIndex + 1));

// ─── Randomize & Showcase ────────────────────────────────────────
let showcaseInterval = null;

const btnRandomize = $('btn-randomize');
const btnShowcase = $('btn-showcase');
const btnRandomSynth = $('btn-random-synth');

if (btnRandomize) btnRandomize.addEventListener('click', () => {
    // Random visual
    setVisMode(Math.floor(Math.random() * visModeKeys.length));
    // Random audio preset
    engine.setMode(Math.floor(Math.random() * engine.modeKeys.length));
    updateModeUI();
});

function stopShowcase() {
    if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
    if (btnShowcase) btnShowcase.classList.remove('active');
}

function showcaseStep() {
    setVisMode(Math.floor(Math.random() * visModeKeys.length));
    engine.setMode(Math.floor(Math.random() * engine.modeKeys.length));
    updateModeUI();
}

if (btnShowcase) btnShowcase.addEventListener('click', () => {
    if (showcaseInterval) {
        stopShowcase();
    } else {
        showcaseStep(); // Immediate first change
        showcaseInterval = setInterval(showcaseStep, 7000);
        btnShowcase.classList.add('active');
    }
});

// ─── Flip Panel Logic ──────────────────────────────────────────
const btnFlip = $('btn-flip');
const modulesGrid = document.querySelector('.modules-grid');

if (btnFlip && modulesGrid) {
    btnFlip.addEventListener('click', () => {
        const isActivating = !modulesGrid.classList.contains('seq-active');
        modulesGrid.classList.toggle('seq-active');
        btnFlip.classList.toggle('active');
        
        // Ensure knobs are rendered correctly after they become visible
        if (isActivating && window.renderAllKnobs) {
            setTimeout(window.renderAllKnobs, 50);
        }
    });
}

// ─── TR-808 Mixer Instrument Selection ──────────────────────────
let currentTRInst = 'bd';
const sharedLevelInp = $('tr-shared-level');

document.querySelectorAll('.tr-mix-col').forEach(col => {
    col.addEventListener('click', () => {
        document.querySelectorAll('.tr-mix-col').forEach(c => c.classList.remove('active'));
        col.classList.add('active');
        currentTRInst = col.getAttribute('data-inst');
        tr808.activeInst = currentTRInst;
        
        // Update sequencer LEDs to match this instrument's pattern
        document.querySelectorAll('.tr-step').forEach(step => {
            const stepIdx = parseInt(step.getAttribute('data-step')) - 1;
            const led = step.querySelector('.tr-led');
            if (led) led.classList.toggle('active', tr808.grid[currentTRInst][stepIdx]);
        });

        // Sync shared level knob to this instrument's level
        if (currentTRInst !== 'accent') {
            const instLevelInp = $(`tr-${currentTRInst}-level`);
            if (instLevelInp && sharedLevelInp) {
                sharedLevelInp.value = instLevelInp.value;
                if (window.renderAllKnobs) window.renderAllKnobs();
            }
        }
        
        // Preview sound on click
        tr808.manualTrigger(currentTRInst);
        console.log(`TR-808: Selected ${currentTRInst}`);
    });
});

// ─── TR-808 Variant Toggles ─────────────────────────────────────
document.querySelectorAll('.tr-inst-toggle .toggle-slider').forEach(slider => {
    slider.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger column selection if just clicking toggle
        const checkbox = slider.parentElement.querySelector('.tr-variant-toggle');
        checkbox.checked = !checkbox.checked;
        
        // Update label styles
        const labels = slider.parentElement.querySelectorAll('.t-l');
        labels[0].classList.toggle('active', !checkbox.checked);
        labels[1].classList.toggle('active', checkbox.checked);
        
        const inst = checkbox.getAttribute('data-inst');
        console.log(`TR-808: ${inst} variant changed to ${checkbox.checked ? 'Alternative' : 'Standard'}`);
    });
});

// Update selected instrument level when shared knob moves
if (sharedLevelInp) {
    sharedLevelInp.addEventListener('input', () => {
        if (currentTRInst && currentTRInst !== 'accent') {
            const instLevelInp = $(`tr-${currentTRInst}-level`);
            if (instLevelInp) {
                const val = parseFloat(sharedLevelInp.value);
                instLevelInp.value = val;
                if (tr808.params[currentTRInst]) {
                    tr808.params[currentTRInst].level = val;
                }
            }
        }
    });
}

// ─── TR-808 Sequencer Interaction ────────────────────────────────
let trRunning = false;
const btnTRStartStop = $('tr-start-stop');
const btnTRTap = $('tr-tap');

if (btnTRStartStop) {
    btnTRStartStop.addEventListener('click', async () => {
        await engine.init();
        engine.resume();
        trRunning = !trRunning;
        btnTRStartStop.classList.toggle('active', trRunning);
        if (trRunning) tr808.start();
        else tr808.stop();
        console.log(`TR-808: ${trRunning ? 'Started' : 'Stopped'}`);
    });
}

// Wire step advance highlight
tr808.onStep = (step) => {
    document.querySelectorAll('.tr-step').forEach((el, i) => {
        el.classList.toggle('playing', i === step);
    });
};

// Wire Tempo Dial
const trTempoInp = $('tr-tempo-val');
if (trTempoInp) {
    trTempoInp.addEventListener('input', () => {
        tr808.setBPM(parseFloat(trTempoInp.value));
        const display = document.querySelector('.tr-bpm-display');
        if (display) display.textContent = Math.round(trTempoInp.value);
    });
}

if (btnTRTap) {
    btnTRTap.addEventListener('click', () => {
        console.log(`TR-808: TAP triggered`);
        btnTRTap.classList.add('active');
        setTimeout(() => btnTRTap.classList.remove('active'), 100);
    });
}

document.querySelectorAll('.tr-step').forEach((step, i) => {
    const btn = step.querySelector('.tr-btn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        const active = tr808.toggleStep(currentTRInst, i);
        const led = btn.querySelector('.tr-led');
        if (led) led.classList.toggle('active', active);
        
        // Visual/Audio Feedback
        if (active) tr808.manualTrigger(currentTRInst);
        console.log(`TR-808: Step ${i+1} for ${currentTRInst} toggled ${active}`);
    });
});

// Wire Instrument Knobs to tr808.params
document.querySelectorAll('.mod-tr808 input[type="range"]').forEach(inp => {
    inp.addEventListener('input', () => {
        const id = inp.id; // e.g. "tr-bd-tone"
        const parts = id.split('-');
        if (parts.length < 3) return;
        const inst = parts[1]; // "bd"
        const param = parts[2]; // "tone"
        if (tr808.params[inst]) {
            tr808.params[inst][param] = parseFloat(inp.value);
        }
    });
});

// ─── Random Synth Params ─────────────────────────────────────────
function generateRandomSynthParams() {
    const waveforms = ['sine', 'triangle', 'sawtooth', 'square'];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rng = (min, max) => min + Math.random() * (max - min);
    const rngInt = (min, max) => Math.floor(rng(min, max + 1));

    const randomPreset = {
        osc1: pick(waveforms),
        osc1Gain: rng(0.6, 1),
        osc1Oct: rngInt(-1, 1),
        unison: rngInt(1, 3),
        spread: rng(0, 25),
        osc2: pick(waveforms),
        osc2Gain: rng(0.2, 0.8),
        osc2Oct: rngInt(-1, 1),
        osc2Detune: rng(-15, 15),
        mix: rng(0, 0.5),
        osc1Mute: false,
        osc2Mute: false,
        fmDepth: Math.random() < 0.4 ? rng(0.5, 6) : 0,
        fmRatio: rng(0.5, 4),
        noise: Math.random() < 0.25 ? rng(0.05, 0.2) : 0,
        sub: Math.random() < 0.4 ? rng(0.1, 0.5) : 0,
        subOct: -1,
        // Amp envelope (Enforced: Min Attack/Decay/Release, Max Sustain)
        a: 0.002,
        d: 0.0,
        s: 1.0,
        r: 0.01,
        // Dual envelopes (Enforced: Min Attack/Decay/Release, Max Sustain)
        e1A: 0.002,
        e1D: 0.0,
        e1S: 1.0,
        e1R: 0.01,
        e2A: 0.002,
        e2D: 0.0,
        e2S: 1.0,
        e2R: 0.01,
        // LFO
        lfoRate: Math.random() < 0.45 ? rng(0.5, 8) : 0,
        lfoShape: pick(waveforms),
        lfoDepth: rng(0, 500),
        lfoPitchDepth: Math.random() < 0.15 ? rng(5, 30) : 0,
        lfoAmp: Math.random() < 0.15 ? rng(0.05, 0.2) : 0,
        // Master / Imaging (Enforced: Max Width, Max Bass Mono)
        mainGain: rng(0.5, 0.65),
        stereoWidth: 2.0,
        pan: rng(-0.2, 0.2),
        bassMono: 500,
        imgBypass: false,
    };

    // Apply to current preset
    const currentPreset = engine.presets[engine.currentMode];
    Object.assign(currentPreset, randomPreset);
    engine._applyFx();
    updateModeUI();
}

if (btnRandomSynth) btnRandomSynth.addEventListener('click', generateRandomSynthParams);

let isBooting = true;
function renderVisual() {
    if (isBooting || !visCanvas || !visCtx || !visMode) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - visLastTime) / 1000);
    visLastTime = now;

    // ── 1. Drive MathEngine params from synth state ──────────
    // Complexity & color from ctrl dial
    mathEngine.setDialValue(dialValue);

    // Intensity couples to audio RMS
    mathEngine.params.intensity = noteIsActive
        ? Math.min(1, 0.3 + rmsLevel * 1.4)
        : 0.15 + rmsLevel * 0.3;

    // ── 2. Write aud_* bus (mirrors Harmonia's SynthEngine.updateFromMath) ──
    // aud_envelope: from RMS or voice envelope average
    let envLevel;
    if (engine.voices && engine.voices.size > 0) {
        let envSum = 0;
        for (const [, voice] of engine.voices) {
            if (voice.envelope) envSum += voice.envelope.gain.value;
        }
        envLevel = Math.min(1, envSum / engine.voices.size);
    } else {
        envLevel = Math.max(0, (mathEngine.params.aud_envelope || 0) - dt * 3);
    }
    mathEngine.write('aud_envelope', envLevel);

    // aud_lfoPhase: accumulate at preset LFO rate
    const p = engine.presets[engine.currentMode] || {};
    const lfoHz = p.lfoRate || 1;
    _lfoPhaseAccum = (_lfoPhaseAccum + lfoHz * dt) % 1;
    mathEngine.write('aud_lfoPhase', _lfoPhaseAccum);

    // aud_filterPos: normalized filter cutoff
    const fFreq = p.fFreq || 2000;
    const normFilter = Math.log2(Math.max(20, fFreq) / 20) / Math.log2(20000 / 20);
    mathEngine.write('aud_filterPos', Math.max(0, Math.min(1, normFilter)));

    // aud_voiceCount: polyphony density
    mathEngine.write('aud_voiceCount', Math.min(1, (engine.voices ? engine.voices.size : 0) / engine.maxVoices));

    // ── 3. Read vis_* modulation from visual mode ────────────
    if (visMode && visMode.getAudioModulation) {
        const mod = visMode.getAudioModulation();
        if (mod) {
            if (mod.filterMod !== undefined) mathEngine.write('vis_filterMod', mod.filterMod);
            if (mod.lfoRate !== undefined) mathEngine.write('vis_lfoRate', mod.lfoRate);
            if (mod.detuneMod !== undefined) mathEngine.write('vis_detune', 0.5 + mod.detuneMod * 0.5);
            if (mod.harmonics !== undefined) mathEngine.write('vis_chaos', mod.harmonics);
        }
    }

    // ── 4. Smooth update ─────────────────────────────────────
    mathEngine.update(dt);

    // ── 5. Render ────────────────────────────────────────────
    const rect = visCanvas.getBoundingClientRect();
    if (visCanvas.width !== rect.width || visCanvas.height !== rect.height) {
        visCanvas.width = rect.width;
        visCanvas.height = rect.height;
    }
    const w = visCanvas.width, h = visCanvas.height;
	
	// ── 6. Visual → Audio conduction ─────────────────────────
    visAnalyser.update(dt);
    conductor.update(dt);

    // Clear with semi-transparency to allow trails and show background image
    const bg = $('screen-bg');
    if (bg) bg.classList.add('visuals-active');
    visCtx.fillStyle = 'rgba(0, 0, 0, 0.20)';
    visCtx.fillRect(0, 0, w, h);

    if (pendulumActive) {
        pendulumMode.render(visCtx, w, h, mathEngine, dt);
    } else if (polyActive) {
        polyMode.render(visCtx, w, h, mathEngine, dt);
    } else {
        visMode.render(visCtx, w, h, mathEngine, dt);
    }
}

// ─── Main Loop ───────────────────────────────────────────────────
function animationLoop() {
    updateAudioData();
    renderVisual();
    
    // Only render module-specific viz if they are visible (not hidden by flip)
    const p = engine.presets[engine.currentMode] || {};
    
    const osc1 = $('osc1-viz'); if (osc1 && osc1.offsetParent) drawOscViz('osc1-viz', p.osc1 || 'sawtooth', noteIsActive && !p.osc1Mute);
    const osc2 = $('osc2-viz'); if (osc2 && osc2.offsetParent) drawOscViz('osc2-viz', p.osc2 || 'sine', noteIsActive && !p.osc2Mute);
    const noise = $('noise-viz'); if (noise && noise.offsetParent) drawNoiseViz();
    const filter = $('filter-viz'); if (filter && filter.offsetParent) drawFilterViz();
    const envelopes = $('env-amp'); if (envelopes && envelopes.offsetParent) updateEnvelopes();
    const lfo = $('lfo-viz'); if (lfo && lfo.offsetParent) drawLFO();
    const fm = $('env-fm'); if (fm && fm.offsetParent) drawFMViz();
    const stereo = $('stereo-viz'); if (stereo && stereo.offsetParent) drawStereoViz();
    // Update dial smoothing regardless of visibility
    dialValue += (dialTarget - dialValue) * 0.12;

    const ctrl = $('ctrl-dial'); if (ctrl && ctrl.offsetParent) drawCtrlDial(); 
    
    requestAnimationFrame(animationLoop);
}

// ─── Ctrl Dial (Radial) ──────────────────────────────────────────
const ctrlDialCanvas = $('ctrl-dial');
let dialValue = 0.5, dialTarget = 0.5, dialDragging = false, dialDragStartY = 0, dialDragStartVal = 0;

function drawCtrlDial() {
    if (!ctrlDialCanvas) return;
    const c = ctrlDialCanvas;
    // Resize canvas to match display size
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.floor(rect.width) || c.height !== Math.floor(rect.height)) {
        c.width = Math.floor(rect.width);
        c.height = Math.floor(rect.height);
    }
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    // Smooth
    // Smoothing logic moved to animationLoop
    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) * 0.35;
    const startAngle = -Math.PI * 0.75;
    const fullEnd = startAngle + Math.PI * 1.5;
    // Background arc
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, fullEnd);
    ctx.strokeStyle = 'rgba(232,138,32,0.15)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    // Progress arc
    const endAngle = startAngle + dialValue * Math.PI * 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(240,168,48,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    // Indicator dot
    const dotX = cx + Math.cos(endAngle) * r;
    const dotY = cy + Math.sin(endAngle) * r;
    ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,168,48,0.95)'; ctx.fill();
    // Glow
    ctx.beginPath(); ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,168,48,0.12)'; ctx.fill();
    // Center text
    ctx.fillStyle = 'rgba(232,138,32,0.7)';
    ctx.font = "bold 11px 'Orbitron',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(dialValue * 100) + '%', cx, cy);
}

if (ctrlDialCanvas) {
    ctrlDialCanvas.addEventListener('mousedown', e => {
        dialDragging = true; dialDragStartY = e.clientY; dialDragStartVal = dialTarget;
        e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!dialDragging) return;
        const delta = (dialDragStartY - e.clientY) * 0.004;
        dialTarget = Math.max(0, Math.min(1, dialDragStartVal + delta));
        setSlider(dialTarget);
    });
    window.addEventListener('mouseup', () => dialDragging = false);
    ctrlDialCanvas.addEventListener('wheel', e => {
        dialTarget = Math.max(0, Math.min(1, dialTarget - e.deltaY * 0.001));
        setSlider(dialTarget);
        e.preventDefault();
    }, { passive: false });
}

// ─── Slider & Logic ──────────────────────────────────────────────
let sliderDrag = false;
const ctrlTrack = $('ctrl-slider-track'), ctrlFill = $('ctrl-slider-fill');
const ctrlThumb = $('ctrl-slider-thumb'), ctrlValEl = $('ctrl-slider-val');
function setSlider(v) {
    let sv = Math.max(0, Math.min(1, v));
    // Update footer slider
    sliderFill.style.width = (sv * 100) + '%'; sliderThumb.style.left = (sv * 100) + '%';
    sliderValEl.textContent = Math.round(sv * 100) + '%';
    // Update module slider (vertical)
    if (ctrlFill) ctrlFill.style.height = (sv * 100) + '%';
    // Constrain travel range so thumb stays within the track slot
    if (ctrlThumb) ctrlThumb.style.top = (5 + (1 - sv) * 90) + '%';
    if (ctrlValEl) ctrlValEl.textContent = Math.round(sv * 100) + '%';
    
    // Update vertical ticks illumination
    const ticks = document.querySelectorAll('.mod-perf .tick');
    if (ticks.length > 0) {
        const threshold = sv * (ticks.length - 1);
        ticks.forEach((tick, i) => {
            if (i <= threshold) tick.classList.add('active');
            else tick.classList.remove('active');
        });
    }

    // Sync radial dial
    dialTarget = sv;
    engine.setSignature(sv);
}
sliderTrack.addEventListener('mousedown', e => { sliderDrag = true; setSlider((e.clientX - sliderTrack.getBoundingClientRect().left) / sliderTrack.offsetWidth); });
if (ctrlTrack) {
    ctrlTrack.addEventListener('mousedown', e => { 
        sliderDrag = true; 
        const r = ctrlTrack.getBoundingClientRect();
        setSlider(1 - (e.clientY - r.top) / r.height); 
    });
}
window.addEventListener('mousemove', e => {
    if (!sliderDrag) return;
    const ftRect = sliderTrack.getBoundingClientRect();
    const ctRect = ctrlTrack ? ctrlTrack.getBoundingClientRect() : ftRect;
    const ftDist = Math.abs(e.clientY - (ftRect.top + ftRect.height / 2));
    const ctDist = ctrlTrack ? Math.abs(e.clientX - (ctRect.left + ctRect.width / 2)) : Infinity;
    
    if (ctrlTrack && ctDist < 100) { // If close to vertical slider
        const r = ctRect;
        setSlider(1 - (e.clientY - r.top) / r.height);
    } else {
        const r = ftRect;
        setSlider((e.clientX - r.left) / r.width);
    }
});
window.addEventListener('mouseup', () => sliderDrag = false);



midiDrop.addEventListener('click', () => midiFile.click());
midiFile.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    f.arrayBuffer().then(buf => {
        // Handle uploaded MIDI files through the PianoLibrary format
        midiDrop.classList.add('loaded');
        midiDrop.querySelector('span').textContent = f.name.toUpperCase().substring(0, 10);
        midiStateEl.textContent = 'LOADED';
    });
});

const trackSelect = $('track-select');
if (trackSelect) {
    trackSelect.addEventListener('change', async () => {
        const pieceId = trackSelect.value;
        if (!pieceId) return;
        await engine.init();
        engine.resume();
        midiPlayer.loadPiece(pieceId);
        midiStateEl.textContent = 'READY';
        midiDrop.classList.add('loaded');
        midiDrop.querySelector('span').textContent = 'LIBRARY';
    });
}

btnPlay.addEventListener('click', async () => {
    await engine.init();
    engine.resume();
    if (midiPlayer.playing) { midiPlayer.stop(); }
    else { midiPlayer.play(); }
    btnPlay.classList.toggle('active', midiPlayer.playing);
    btnPlay.textContent = midiPlayer.playing ? '⏸' : '▶';
    if (midiPlayer.playing) midiStateEl.textContent = 'PLAYING';
    else if (midiPlayer.currentPiece) midiStateEl.textContent = 'READY';
});
btnStop.addEventListener('click', () => {
    midiPlayer.stop();
    btnPlay.classList.remove('active');
    btnPlay.textContent = '▶';
    if (midiPlayer.currentPiece) midiStateEl.textContent = 'READY';
});
// btnSmoke toggle removed

document.addEventListener('keydown', async e => {
    if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft') { engine.setMode(engine.modeIndex - 1); updateModeUI(); return; }
    if (k === 'arrowright') { engine.setMode(engine.modeIndex + 1); updateModeUI(); return; }
    const keyLayout = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
    const scale = [0, 2, 4, 7, 9], rootNote = 48, i = keyLayout.indexOf(k); if (i < 0) return;
    const midi = rootNote + Math.floor(i / 5) * 12 + scale[i % 5], freq = 440 * Math.pow(2, (midi - 69) / 12);
    await engine.init(); engine.resume(); engine.noteOn(midi, freq, 0.7);
});
document.addEventListener('keyup', e => {
    const keyLayout = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
    const scale = [0, 2, 4, 7, 9], rootNote = 48, i = keyLayout.indexOf(e.key.toLowerCase()); if (i >= 0) engine.noteOff(rootNote + Math.floor(i / 5) * 12 + scale[i % 5]);
});

async function initMIDI() {
    if (!navigator.requestMIDIAccess) return;
    try {
        const midi = await navigator.requestMIDIAccess();
        const bind = () => {
            const inputs = [...midi.inputs.values()];
            midiStateEl.textContent = inputs.length ? inputs[0].name : 'None';
            for (const inp of inputs) inp.onmidimessage = async msg => {
                const [st, note, vel] = msg.data, cmd = st & 0xf0; await engine.init(); engine.resume();
                if (cmd === 0x90 && vel > 0) engine.noteOn(note, 440 * Math.pow(2, (note - 69) / 12), vel / 127);
                else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) engine.noteOff(note);
            };
        };
        bind(); midi.onstatechange = bind;
    } catch { }
}

const INT_PARAMS = new Set(['unison', 'osc1Oct', 'osc2Oct', 'subOct', 'spread', 'osc2Detune', 'lfoPitchDepth', 'lfoDepth', 'fFreq', 'fEnv', 'reverbDamp']);
function fmtVal(el) { const n = parseFloat(el.value); return isNaN(n) ? el.value : (Number.isInteger(n) ? n.toString() : n.toFixed(2)); }
function syncUIToPreset() {
    const p = engine.presets[engine.currentMode] || engine.presets.default;
    document.querySelectorAll('[data-param]').forEach(el => {
        const k = el.dataset.param; let v = p[k];
        if (el.type === 'checkbox') el.checked = !!v;
        else { 
            if (v === undefined) v = el.tagName === 'SELECT' ? (el.options[0]?.value || '') : el.defaultValue; 
            el.value = v; 
            
            // Update cycle labels
            if (el.tagName === 'SELECT') {
                const cycleBtnLabel = document.getElementById(el.id + '-label');
                if (cycleBtnLabel) {
                    const opt = Array.from(el.options).find(o => o.value === v) || el.options[0];
                    cycleBtnLabel.textContent = opt ? opt.textContent : v;
                }
            }
        }
    });
}
document.querySelectorAll('[data-param]').forEach(el => {
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
        const k = el.dataset.param;
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.tagName === 'SELECT') {
            v = el.value;
            // Update cycle label if it exists
            const cycleBtnLabel = document.getElementById(el.id + '-label');
            if (cycleBtnLabel) {
                const opt = el.options[el.selectedIndex];
                cycleBtnLabel.textContent = opt ? opt.textContent : v;
            }
        }
        else v = INT_PARAMS.has(k) ? parseInt(el.value) : parseFloat(el.value);
        const p = engine.presets[engine.currentMode]; if (p) p[k] = v;
        if (['reverb', 'chorus', 'delay', 'distMix', 'distType', 'dist', 'distBypass', 'delayTime', 'delayFb', 'echoBypass', 'reverbSize', 'reverbDamp', 'reverbFb', 'reverbBypass', 'mainGain', 'stereoWidth', 'pan', 'bassMono', 'imgBypass'].includes(k)) engine._applyFx();
        if (k === 'mainGain' && engine.masterGain) engine.masterGain.gain.value = v;
    });
});

// ─── Waveform Cycle Buttons ───
document.querySelectorAll('[data-cycle]').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.cycle;
        const select = document.getElementById(targetId);
        if (!select) return;
        
        let nextIdx = (select.selectedIndex + 1) % select.options.length;
        select.selectedIndex = nextIdx;
        select.dispatchEvent(new Event('change'));
        select.dispatchEvent(new Event('input')); // Trigger data-param binding
    });
});

// ─── Boot Sequence ──────────────────────────────────────────────
const bootScreen = $('boot-screen');
const bootLog = $('boot-log');
const bootLogo = $('boot-logo');

async function triggerBootSequence() {
    if (!bootScreen || bootScreen.classList.contains('hidden')) return;
    
    // 1. Audio Context Init
    await engine.init();
    engine.resume();
    
    // 2. Degauss flash + CRT turn-on + start black fade-in (all together)
    bootScreen.classList.add('degauss');
    bootScreen.classList.add('active');
    engine.playDegauss();
    
    // 4. Play Chime (3.5s into boot)
    setTimeout(() => {
        playLunarChime(engine.ctx, 15);
    }, 3500);

    // 5. Typewriter Logs (start at 4s)
    const logs = [
        "LUNAR BIOS v1.0.4",
        "CPU: LUNAR-CORE R1 @ 1.2GHz",
        "MEMORY TEST: 640KB... OK",
        "PRIMARY BUS: 133MHz",
        "SECONDARY BUS: 66MHz",
        "GPU: HARMONIA-VIZ R2",
        "VRAM: 4MB... OK",
        "DMA CONTROLLER: OK",
        "INTERRUPT CONTROLLER: OK",
        "RTC CLOCK SYNC: OK",
        "POWER STABILIZING... OK",
        "DEGAUSSING CRT... OK",
        "MATH ENGINE: READY",
        "WARMING VACUUM TUBES... OK",
        "SYNCING VISUAL BUFFER... OK",
        "BOOTING HARMONIA OS...",
        "WELCOME."
    ];
    
    let logIdx = 0;
    const typeNext = () => {
        if (logIdx >= logs.length) return;
        const line = document.createElement('div');
        line.textContent = "> " + logs[logIdx++];
        bootLog.appendChild(line);

        // Faster Mechanical Rhythms
        let delay = 100 + Math.random() * 200; 
        if (logIdx <= 6) delay = 30 + Math.random() * 50; // Rapid Header
        else if (logIdx === 11 || logIdx === 14) delay = 400 + Math.random() * 200; // Brief Checks
        else if (logIdx >= 15) delay = 200 + Math.random() * 400; // Final

        setTimeout(typeNext, delay);
    };
    
    setTimeout(typeNext, 7000); // Start typing after logo is clearly visible

    // 6. Pre-dim background
    setTimeout(() => {
        const bg = $('screen-bg');
        if (bg) bg.classList.add('visuals-active');
    }, 7000);

    // 8. Reveal control panel (just before boot screen fades)
    setTimeout(() => {
        document.body.classList.add('booted');
    }, 9500);

    // 8. Fade out boot screen (starts at 8.5s, fades over 1.5s)
    setTimeout(() => {
        bootScreen.classList.add('fading');
    }, 10500);

    // 9. Finalize — remove from DOM flow after fade completes
    setTimeout(() => {
        bootScreen.classList.add('hidden');
        isBooting = false;
        visLastTime = performance.now();

        // Load default MIDI track (unforgiven) without playing
        if (trackSelect) {
            trackSelect.value = 'unforgiven';
            midiPlayer.loadPiece('unforgiven');
            midiStateEl.textContent = 'READY';
            midiDrop.classList.add('loaded');
            midiDrop.querySelector('span').textContent = 'LIBRARY';
        }
        if (window.renderAllKnobs) window.renderAllKnobs();
    }, 12000);
}

function playLunarChime(ctx, duration = 15) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.8, now + 1.5); // Slower master fade-in
    master.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // 1. Massive Sub-Bass Impact (Slowed rise)
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(32, now); // Lower start freq
    sub.frequency.exponentialRampToValueAtTime(55, now + 8); // Longer slide
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(0.6, now + 2.5); // Much slower sub buildup
    subG.gain.exponentialRampToValueAtTime(0.001, now + duration - 2);
    sub.connect(subG); subG.connect(master);
    sub.start(now); sub.stop(now + duration);

    // 2. Layered Glassy Chord (Slower strum)
    const chord = [110, 164.81, 220, 329.63, 440, 659.25, 880];
    chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modG = ctx.createGain();
        const g = ctx.createGain();
        const pan = ctx.createStereoPanner();
        const delay = i * 0.15; // Much slower strum
        const pNow = now + 1.0 + delay; // Delayed start
        osc.type = 'sine';
        mod.type = 'sine';
        mod.frequency.value = freq * 3.01;
        modG.gain.value = freq * 1.5;
        pan.pan.value = (i / (chord.length - 1)) * 1.6 - 0.8;
        g.gain.setValueAtTime(0, pNow);
        g.gain.linearRampToValueAtTime(0.12, pNow + 0.5); // Slower note attack
        g.gain.exponentialRampToValueAtTime(0.001, pNow + 8);
        mod.connect(modG); modG.connect(osc.frequency);
        osc.connect(pan); pan.connect(g); g.connect(master);
        mod.start(pNow); osc.start(pNow);
        mod.stop(pNow + duration); osc.stop(pNow + duration);
    });

    // 3. Thick Resonant Swell (Majestic pace)
    const swellFreqs = [55, 110, 220, 330];
    swellFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.015);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(40, now);
        f.frequency.exponentialRampToValueAtTime(1600, now + 4.5); // Much slower filter sweep
        f.Q.value = 8;
        g.gain.setValueAtTime(0, now + 1.5);
        g.gain.linearRampToValueAtTime(0.12, now + 4.0); // Slower swell gain
        g.gain.exponentialRampToValueAtTime(0.001, now + duration - 2);
        osc.connect(f); f.connect(g); g.connect(master);
        osc.start(now + 1.5); osc.stop(now + duration);
    });

    // 4. PS1 Afterglow Shimmer (Delayed entry)
    const auraFreqs = [880, 1760, 3520, 5280];
    auraFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now + 6.0); // Pushed back even further
        g.gain.linearRampToValueAtTime(0.03, now + 10);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(g); g.connect(master);
        osc.start(now + 6.0); osc.stop(now + duration);
    });
}

initHWKnobs(); initMIDI(); updateModeUI();
const bootMouseDown = async () => {
    if (bootScreen && !bootScreen.classList.contains('hidden')) {
        await engine.init();
        engine.resume();
        engine.playClickSound(false); // Down click
    }
};
const bootMouseUp = () => {
    if (bootScreen && !bootScreen.classList.contains('hidden')) {
        engine.playClickSound(true); // Up click
        triggerBootSequence();
        document.removeEventListener('mousedown', bootMouseDown);
        document.removeEventListener('mouseup', bootMouseUp);
    }
};
document.addEventListener('mousedown', bootMouseDown);
document.addEventListener('mouseup', bootMouseUp);

// ─── Module Drag & Snap-to-Grid ─────────────────────────────────
(function initModuleDrag() {
    const grid = document.querySelector('.modules-grid');
    if (!grid) return;
    const modules = Array.from(grid.querySelectorAll('.module'));
    let dragging = null, ghost = null, startX, startY, origRect;
    // Parse current grid placement from CSS
    function getPlacement(el) {
        const cs = getComputedStyle(el);
        return { col: cs.gridColumnStart, span: cs.gridColumnEnd, row: cs.gridRowStart };
    }
    function setPlacement(el, col, span, row) {
        el.style.gridColumn = col + ' / ' + span;
        el.style.gridRow = row;
    }
    // Headers are drag handles
    modules.forEach(mod => {
        const header = mod.querySelector('.module-header');
        if (!header) return;
        header.style.cursor = 'grab';
        header.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            dragging = mod;
            origRect = mod.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            // Create ghost overlay
            ghost = document.createElement('div');
            ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
                border:2px solid rgba(240,160,32,0.6);border-radius:4px;
                background:rgba(240,160,32,0.08);transition:none;`;
            ghost.style.width = origRect.width + 'px';
            ghost.style.height = origRect.height + 'px';
            ghost.style.left = origRect.left + 'px';
            ghost.style.top = origRect.top + 'px';
            document.body.appendChild(ghost);
            mod.style.opacity = '0.4';
            header.style.cursor = 'grabbing';
            // Highlight potential drop zones
            modules.forEach(m => {
                if (m === mod) return;
                m.style.transition = 'outline 0.15s';
                m.addEventListener('mouseenter', highlightTarget);
                m.addEventListener('mouseleave', unhighlightTarget);
            });
        });
    });
    function highlightTarget(e) {
        e.currentTarget.style.outline = '2px solid rgba(240,160,32,0.4)';
    }
    function unhighlightTarget(e) {
        e.currentTarget.style.outline = 'none';
    }
    document.addEventListener('mousemove', e => {
        if (!dragging || !ghost) return;
        ghost.style.left = (origRect.left + e.clientX - startX) + 'px';
        ghost.style.top = (origRect.top + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', e => {
        if (!dragging) return;
        // Find which module we're over
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const targetMod = target ? target.closest('.module') : null;
        if (targetMod && targetMod !== dragging) {
            // Swap grid placements
            const dp = { col: dragging.style.gridColumn, row: dragging.style.gridRow };
            const tp = { col: targetMod.style.gridColumn, row: targetMod.style.gridRow };
            // If inline styles exist, swap them; otherwise read computed
            const dCS = getComputedStyle(dragging), tCS = getComputedStyle(targetMod);
            const dCol = dp.col || (dCS.gridColumnStart + ' / ' + dCS.gridColumnEnd);
            const dRow = dp.row || dCS.gridRowStart;
            const tCol = tp.col || (tCS.gridColumnStart + ' / ' + tCS.gridColumnEnd);
            const tRow = tp.row || tCS.gridRowStart;
            dragging.style.gridColumn = tCol; dragging.style.gridRow = tRow;
            targetMod.style.gridColumn = dCol; targetMod.style.gridRow = dRow;
        }
        // Cleanup
        dragging.style.opacity = '';
        const header = dragging.querySelector('.module-header');
        if (header) header.style.cursor = 'grab';
        if (ghost) { ghost.remove(); ghost = null; }
        modules.forEach(m => {
            m.style.outline = 'none'; m.style.transition = '';
            m.removeEventListener('mouseenter', highlightTarget);
            m.removeEventListener('mouseleave', unhighlightTarget);
        });
        dragging = null;
    });
    animationLoop();
})();
