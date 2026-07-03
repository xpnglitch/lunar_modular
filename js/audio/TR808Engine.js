import { SynthVoice } from './SynthVoice.js';

export const TR808_PRESETS = {
    bd: { osc1:'sine', osc1Oct:-2, frequency:190, pEnv:3.0, pA:0.001, pD:0.04, noise:0.15, noiseType:'white', noiseFilter:true, fType:'hp', fFreq:2000, a:0.001, d:0.6, s:0, r:0.01, dist:0.05, mainGain:1.3 },
    sd: { osc1:'sine', osc1Oct:-1, frequency:360, noise:0.9, noiseType:'white', noiseFilter:true, fType:'bp', fFreq:1200, fRes:1.5, a:0.001, d:0.18, s:0, r:0.01, dist:0.1, mainGain:1.1 },
    lt: { osc1:'sine', frequency:95, pEnv:0.8, pD:0.08, a:0.001, d:0.35, s:0, r:0.01, mainGain:1.0 },
    mt: { osc1:'sine', frequency:135, pEnv:0.6, pD:0.08, a:0.001, d:0.3, s:0, r:0.01, mainGain:1.0 },
    ht: { osc1:'sine', frequency:195, pEnv:0.4, pD:0.08, a:0.001, d:0.25, s:0, r:0.01, mainGain:1.0 },
    rs: { osc1:'sine', frequency:800, fmDepth:5.0, fmRatio:2.5, a:0.001, d:0.04, s:0, r:0.01, mainGain:1.1 },
    cp: { noise:1.0, noiseType:'white', noiseFilter:true, fType:'bp', fFreq:1100, fRes:2.2, a:0.001, d:0.12, s:0, r:0.01, mainGain:1.2 },
    cb: { osc1:'sine', frequency:560, fmDepth:1.5, fmRatio:1.48, a:0.001, d:0.15, s:0, r:0.01, mainGain:1.1 },
    cy: { noise:1.0, noiseType:'white', noiseFilter:true, fType:'hp', fFreq:5000, a:0.001, d:0.9, s:0, r:0.01, mainGain:0.9 },
    oh: { noise:1.0, noiseType:'white', noiseFilter:true, fType:'hp', fFreq:7000, a:0.001, d:0.5, s:0, r:0.01, mainGain:0.8 },
    ch: { noise:1.0, noiseType:'white', noiseFilter:true, fType:'hp', fFreq:7000, a:0.001, d:0.06, s:0, r:0.01, mainGain:0.8 }
};

export class TR808Engine {
    constructor(ctx, masterDestination) {
        this.ctx = ctx;
        this.master = masterDestination;
        this.playing = false;
        this.bpm = 120;
        this.currentStep = 0;
        this.steps = 16;
        this.activeInst = 'bd';
        
        // Sequencer grid: instrument -> Array(16)
        this.grid = {
            bd: Array(16).fill(false),
            sd: Array(16).fill(false),
            lt: Array(16).fill(false),
            mt: Array(16).fill(false),
            ht: Array(16).fill(false),
            rs: Array(16).fill(false),
            cp: Array(16).fill(false),
            cb: Array(16).fill(false),
            cy: Array(16).fill(false),
            oh: Array(16).fill(false),
            ch: Array(16).fill(false),
            accent: Array(16).fill(false)
        };

        // Per-instrument parameters (Tone, Decay, etc. from UI)
        this.params = {
            bd: { tone: 0.5, decay: 0.5, level: 0.8 },
            sd: { tone: 0.5, snappy: 0.5, level: 0.7 },
            lt: { tune: 0.5, level: 0.6 },
            mt: { tune: 0.5, level: 0.6 },
            ht: { tune: 0.5, level: 0.6 },
            rs: { level: 0.6 },
            cp: { level: 0.6 },
            cb: { level: 0.6 },
            cy: { tone: 0.5, decay: 0.5, level: 0.7 },
            oh: { decay: 0.5, level: 0.7 },
            ch: { level: 0.7 },
            accent: { level: 0.5 }
        };

        this.lookAhead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.nextNoteTime = 0.0;
        this.timerID = null;

        // Callback for UI updates
        this.onStep = null;

        // Voice tracking to prevent stacking overload
        this.activeVoices = new Map();
    }

    setBPM(val) {
        this.bpm = val;
    }

    toggleStep(inst, step) {
        this.grid[inst][step] = !this.grid[inst][step];
        return this.grid[inst][step];
    }

    start() {
        if (this.playing) return;
        this.playing = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stop() {
        this.playing = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.advanceNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookAhead);
    }

    advanceNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    scheduleNote(step, time) {
        if (this.onStep) {
            // Use setTimeout to sync UI with audio if needed, 
            // but we'll pass the exact time for better logic
            const delay = (time - this.ctx.currentTime) * 1000;
            setTimeout(() => {
                if (this.playing) this.onStep(step);
            }, Math.max(0, delay));
        }

        // Trigger each instrument if step is active
        for (const inst in this.grid) {
            if (this.grid[inst][step] && inst !== 'accent') {
                this.trigger(inst, time, step);
            }
        }
    }

    trigger(inst, time, step = 0) {
        const userParams = this.params[inst];
        const now = time || this.ctx.currentTime;

        // Velocity (Accent)
        let vel = userParams.level || 0.8;
        if (this.grid.accent[step % 16]) {
            vel *= (1.0 + this.params.accent.level);
        }
        vel = Math.min(1.0, vel);

        // Kill previous voice for same instrument to prevent stacking
        if (this.activeVoices.has(inst)) {
            const old = this.activeVoices.get(inst);
            if (old.nodes) old.nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch(e){} });
        }

        const nodes = [];
        const ctx = this.ctx;
        const dest = this.master;

        // ─── KICK DRUM ──────────────────────────────────────────
        if (inst === 'bd') {
            const baseFreq = 45;
            const startFreq = baseFreq * (3 + userParams.tone * 4);
            const decay = 0.15 + userParams.decay * 0.6;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(vel, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            const click = ctx.createOscillator();
            click.type = 'sine';
            click.frequency.setValueAtTime(3500, now);
            click.frequency.exponentialRampToValueAtTime(200, now + 0.02);
            const clickGain = ctx.createGain();
            clickGain.gain.setValueAtTime(vel * 0.4, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain); gain.connect(dest);
            click.connect(clickGain); clickGain.connect(dest);
            osc.start(now); osc.stop(now + decay + 0.1);
            click.start(now); click.stop(now + 0.05);
            nodes.push(osc, gain, click, clickGain);
        }

        // ─── SNARE DRUM ─────────────────────────────────────────
        else if (inst === 'sd') {
            const bodyFreq = 180 + userParams.tone * 60;
            const snappy = userParams.snappy !== undefined ? userParams.snappy : 0.5;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(bodyFreq * 2, now);
            osc.frequency.exponentialRampToValueAtTime(bodyFreq, now + 0.01);
            const bodyGain = ctx.createGain();
            bodyGain.gain.setValueAtTime(vel * 0.6, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
            const noiseData = noiseBuf.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const noiseFilt = ctx.createBiquadFilter();
            noiseFilt.type = 'highpass';
            noiseFilt.frequency.value = 2000;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(vel * (0.3 + snappy * 0.7), now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(bodyGain); bodyGain.connect(dest);
            noise.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(dest);
            osc.start(now); osc.stop(now + 0.15);
            noise.start(now); noise.stop(now + 0.2);
            nodes.push(osc, bodyGain, noise, noiseFilt, noiseGain);
        }

        // ─── TOMS ───────────────────────────────────────────────
        else if (['lt', 'mt', 'ht'].includes(inst)) {
            const baseFreqs = { lt: 80, mt: 120, ht: 165 };
            const tuneShift = userParams.tune !== undefined ? userParams.tune : 0.5;
            const baseFreq = baseFreqs[inst] * Math.pow(2, (tuneShift - 0.5) * 0.5);
            const startFreq = baseFreq * 1.8;
            const decay = inst === 'lt' ? 0.3 : inst === 'mt' ? 0.22 : 0.18;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(vel * 0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            osc.connect(gain); gain.connect(dest);
            osc.start(now); osc.stop(now + decay + 0.05);
            nodes.push(osc, gain);
        }

        // ─── RIMSHOT ────────────────────────────────────────────
        else if (inst === 'rs') {
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine'; osc1.frequency.value = 500;
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine'; osc2.frequency.value = 800;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(vel * 0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc1.connect(gain); osc2.connect(gain); gain.connect(dest);
            osc1.start(now); osc1.stop(now + 0.04);
            osc2.start(now); osc2.stop(now + 0.04);
            nodes.push(osc1, osc2, gain);
        }

        // ─── HAND CLAP ──────────────────────────────────────────
        else if (inst === 'cp') {
            const len = 0.012;
            for (let i = 0; i < 3; i++) {
                const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
                const src = ctx.createBufferSource(); src.buffer = buf;
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass'; filt.frequency.value = 1100; filt.Q.value = 1.5;
                const g = ctx.createGain();
                const t = now + i * 0.015;
                g.gain.setValueAtTime(vel * 0.5, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + len);
                src.connect(filt); filt.connect(g); g.connect(dest);
                src.start(t); src.stop(t + len + 0.01);
                nodes.push(src, filt, g);
            }
            const tailBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
            const td = tailBuf.getChannelData(0);
            for (let j = 0; j < td.length; j++) td[j] = Math.random() * 2 - 1;
            const tailSrc = ctx.createBufferSource(); tailSrc.buffer = tailBuf;
            const tailFilt = ctx.createBiquadFilter();
            tailFilt.type = 'bandpass'; tailFilt.frequency.value = 1100; tailFilt.Q.value = 1.5;
            const tailGain = ctx.createGain();
            const tTail = now + 0.045;
            tailGain.gain.setValueAtTime(vel * 0.7, tTail);
            tailGain.gain.exponentialRampToValueAtTime(0.001, tTail + 0.12);
            tailSrc.connect(tailFilt); tailFilt.connect(tailGain); tailGain.connect(dest);
            tailSrc.start(tTail); tailSrc.stop(tTail + 0.15);
            nodes.push(tailSrc, tailFilt, tailGain);
        }

        // ─── COWBELL ────────────────────────────────────────────
        else if (inst === 'cb') {
            const osc1 = ctx.createOscillator();
            osc1.type = 'square'; osc1.frequency.value = 540;
            const osc2 = ctx.createOscillator();
            osc2.type = 'square'; osc2.frequency.value = 800;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = 680; bp.Q.value = 3;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(vel * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(vel * 0.2, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc1.connect(bp); osc2.connect(bp); bp.connect(gain); gain.connect(dest);
            osc1.start(now); osc1.stop(now + 0.15);
            osc2.start(now); osc2.stop(now + 0.15);
            nodes.push(osc1, osc2, bp, gain);
        }

        // ─── CYMBAL ─────────────────────────────────────────────
        else if (inst === 'cy') {
            const decay = 0.3 + (userParams.decay || 0.5) * 1.5;
            const freqs = [205, 297, 375, 468, 522, 636];
            const mix = ctx.createGain(); mix.gain.value = 1 / freqs.length;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 4000 + (userParams.tone || 0.5) * 4000;
            const envGain = ctx.createGain();
            envGain.gain.setValueAtTime(vel * 0.6, now);
            envGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            freqs.forEach(f => {
                const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
                o.connect(mix); o.start(now); o.stop(now + decay + 0.1);
                nodes.push(o);
            });
            mix.connect(hp); hp.connect(envGain); envGain.connect(dest);
            nodes.push(mix, hp, envGain);
        }

        // ─── OPEN HIHAT ─────────────────────────────────────────
        else if (inst === 'oh') {
            const decay = 0.15 + (userParams.decay || 0.5) * 0.5;
            const freqs = [263, 400, 528, 630, 786, 878];
            const mix = ctx.createGain(); mix.gain.value = 1 / freqs.length;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass'; hp.frequency.value = 7000;
            const envGain = ctx.createGain();
            envGain.gain.setValueAtTime(vel * 0.5, now);
            envGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

            freqs.forEach(f => {
                const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
                o.connect(mix); o.start(now); o.stop(now + decay + 0.1);
                nodes.push(o);
            });
            mix.connect(hp); hp.connect(envGain); envGain.connect(dest);
            nodes.push(mix, hp, envGain);
        }

        // ─── CLOSED HIHAT ───────────────────────────────────────
        else if (inst === 'ch') {
            const freqs = [263, 400, 528, 630, 786, 878];
            const mix = ctx.createGain(); mix.gain.value = 1 / freqs.length;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass'; hp.frequency.value = 7000;
            const envGain = ctx.createGain();
            envGain.gain.setValueAtTime(vel * 0.5, now);
            envGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            freqs.forEach(f => {
                const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
                o.connect(mix); o.start(now); o.stop(now + 0.06);
                nodes.push(o);
            });
            mix.connect(hp); hp.connect(envGain); envGain.connect(dest);
            nodes.push(mix, hp, envGain);
        }

        this.activeVoices.set(inst, { nodes });

        // Cleanup after longest possible decay
        setTimeout(() => {
            const voice = this.activeVoices.get(inst);
            if (voice && voice.nodes === nodes) {
                nodes.forEach(n => { try { n.disconnect(); } catch(e){} });
                this.activeVoices.delete(inst);
            }
        }, 2500);
    }

    manualTrigger(inst) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.trigger(inst, this.ctx.currentTime);
    }
}
