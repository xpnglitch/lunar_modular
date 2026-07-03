/**
 * AudioPlayer — Audio-only playback with audio-reactive overlay visualizations,
 * recording, and optional background image. Mirrors VideoPlayer's viz engine.
 */
export class AudioPlayer {
    constructor() {
        this.audioEl    = null;
        this.vizCanvas  = null;
        this.vizCtx     = null;
        this.bgCanvas   = null;
        this.bgCtx      = null;
        this.audioCtx   = null;
        this.analyser   = null;
        this.source     = null;
        this.splitter   = null;
        this.analyserL  = null;
        this.analyserR  = null;

        this.fftSize    = 2048;
        this.freqBins   = this.fftSize / 2;
        this.freqData   = new Uint8Array(this.freqBins);
        this.timeData   = new Uint8Array(this.fftSize);
        this.timeDataR  = new Uint8Array(this.fftSize);
        this.timeDataL  = new Uint8Array(this.fftSize);

        this.isActive    = false;
        this.currentViz  = 'neon-bars';
        this.vizY        = 0.5;
        this.vizX        = 0.5;
        this.vizSize     = 1.0;
        this.vizHueShift = 0;
        this._lissTime   = 0;

        // Particle state (same as VideoPlayer)
        this._dustParticles     = [];
        this._dustBarsParticles = [];
        this._auroraParticles   = [];
        this._starParticles     = [];
        this._rippleRings       = [];
        this._rippleLastEnergy  = 0;
        this._waveformDustParticles = [];
        this._matrixColumns     = [];
        this._pulseGridPhase    = 0;
        this._spiralParticles   = [];
        this._fountainParticles = [];
        this._radarAngle        = 0;
        this._radarBlips        = [];
        this._plasmaArcs        = [];
        this._meteorParticles   = [];
        this._smokeRingsList    = [];
        this._smokeRingLastE    = 0;
        this._cometParticles    = [];
        this._fireflies         = [];
        this._shockwaves        = [];
        this._shockLastE        = 0;
        this._embers            = [];
        this._morphPhase        = 0;
        this._spectrumHistory   = [];

        this.reactivity = 0.5;

        // Label overlay
        this.labelText     = '';
        this.labelFont     = 'Inter';
        this.labelSize     = 48;
        this.labelPosition = 'bottom';

        // Background image
        this._bgImage   = null;
        this._bgUrl     = null;

        // Recording state
        this.isRecording        = false;
        this._recorder          = null;
        this._recordChunks      = [];
        this._compositeCanvas   = null;
        this._compositeCtx      = null;
        this._audioDest         = null;

        // Callbacks
        this.onPlayStateChange   = null;
        this.onRecordStateChange = null;

        this._buildElements();
    }

    _h(hue) { return (hue + this.vizHueShift) % 360; }

    _buildElements() {
        // Hidden audio element for playback
        this.audioEl = document.createElement('audio');
        this.audioEl.style.display = 'none';
        this.audioEl.loop = false;
        document.body.appendChild(this.audioEl);

        // Background canvas (behind viz, for optional image)
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.style.cssText = [
            'position:fixed','inset:0','width:100%','height:100%',
            'z-index:1','display:none','background:#000',
        ].join(';');
        document.body.appendChild(this.bgCanvas);
        this.bgCtx = this.bgCanvas.getContext('2d');

        // Viz overlay canvas
        this.vizCanvas = document.createElement('canvas');
        this.vizCanvas.style.cssText = [
            'position:fixed','inset:0','width:100%','height:100%',
            'z-index:3','pointer-events:none','display:none',
        ].join(';');
        document.body.appendChild(this.vizCanvas);
        this.vizCtx = this.vizCanvas.getContext('2d');
    }

    // ─── Load & play ──────────────────────────────────────────────────────
    load(file) {
        this.stop();

        const url = URL.createObjectURL(file);
        this.audioEl.src = url;
        this.bgCanvas.style.display  = 'block';
        this.vizCanvas.style.display = 'block';

        this._resize();
        this._initDustBars(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this._onResize = () => this._resize());

        this.audioEl.addEventListener('play',  () => { if (this.onPlayStateChange) this.onPlayStateChange(true);  });
        this.audioEl.addEventListener('pause', () => { if (this.onPlayStateChange) this.onPlayStateChange(false); });
        this.audioEl.addEventListener('ended', () => {
            if (this.isRecording) this.stopRecording();
            if (this.onPlayStateChange) this.onPlayStateChange(false);
            if (this.onEnded) this.onEnded();
        });

        this.audioEl.play().then(() => {
            this._setupAudio();
        }).catch(() => {
            this.audioEl.addEventListener('play', () => this._setupAudio(), { once: true });
        });

        this.isActive  = true;
        this._lissTime = 0;
    }

    _setupAudio() {
        if (this.source) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = 0.82;

            this.splitter  = this.audioCtx.createChannelSplitter(2);
            this.analyserL = this.audioCtx.createAnalyser();
            this.analyserR = this.audioCtx.createAnalyser();
            this.analyserL.fftSize = this.fftSize;
            this.analyserR.fftSize = this.fftSize;

            this.source = this.audioCtx.createMediaElementSource(this.audioEl);
            this.source.connect(this.analyser);
            this.source.connect(this.splitter);
            this.splitter.connect(this.analyserL, 0);
            this.splitter.connect(this.analyserR, 1);
            this.analyser.connect(this.audioCtx.destination);
        } catch (e) {
            console.warn('AudioPlayer audio setup error:', e);
        }
    }

    stop() {
        if (this.isRecording) this.stopRecording();
        if (this.audioEl)   { this.audioEl.pause(); this.audioEl.src = ''; }
        if (this.bgCanvas)    this.bgCanvas.style.display = 'none';
        if (this.vizCanvas)   this.vizCanvas.style.display = 'none';
        if (this.source)    { try { this.source.disconnect(); } catch(_){} this.source = null; }
        if (this.audioCtx)  { try { this.audioCtx.close();    } catch(_){} this.audioCtx = null; }
        if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
        this.isActive   = false;
        this._audioDest = null;
    }

    setReactivity(v) { this.reactivity = Math.max(0, Math.min(1, v)); }

    // ─── Playback controls ────────────────────────────────────────────────
    playPause() {
        if (!this.audioEl) return;
        if (this.audioEl.paused) {
            this.audioEl.play();
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        } else {
            this.audioEl.pause();
        }
        if (this.onPlayStateChange) this.onPlayStateChange(!this.audioEl.paused);
    }

    restart() {
        if (!this.audioEl) return;
        this.audioEl.currentTime = 0;
        this.audioEl.play();
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        if (this.onPlayStateChange) this.onPlayStateChange(true);
    }

    // ─── Setters ──────────────────────────────────────────────────────────
    setViz(name)      { this.currentViz  = name; }
    setYPosition(y)   { this.vizY        = Math.max(0, Math.min(1, y)); }
    setXPosition(x)   { this.vizX        = Math.max(0, Math.min(1, x)); }
    setSize(s)        { this.vizSize     = Math.max(0.3, Math.min(2.5, s)); }
    setHueShift(h)    { this.vizHueShift = ((h % 360) + 360) % 360; }

    // ─── Background image ─────────────────────────────────────────────────
    setBackgroundImage(file) {
        if (this._bgUrl) URL.revokeObjectURL(this._bgUrl);
        if (!file) { this._bgImage = null; this._bgUrl = null; return; }
        this._bgUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { this._bgImage = img; };
        img.src = this._bgUrl;
    }

    clearBackgroundImage() {
        if (this._bgUrl) URL.revokeObjectURL(this._bgUrl);
        this._bgImage = null;
        this._bgUrl   = null;
    }

    // ─── Recording ────────────────────────────────────────────────────────
    startRecording() {
        if (this.isRecording || !this.audioEl || !this.audioCtx) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        this._compositeCanvas = document.createElement('canvas');
        this._compositeCanvas.width  = vw;
        this._compositeCanvas.height = vh;
        this._compositeCtx = this._compositeCanvas.getContext('2d');

        this._audioDest = this.audioCtx.createMediaStreamDestination();
        this.analyser.connect(this._audioDest);

        const fps        = 30;
        const videoBits  = Math.round(vw * vh * fps * 0.15);
        const videoStream = this._compositeCanvas.captureStream(fps);
        const audioTrack  = this._audioDest.stream.getAudioTracks()[0];
        const combined    = new MediaStream([
            videoStream.getVideoTracks()[0],
            ...(audioTrack ? [audioTrack] : []),
        ]);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus' : 'video/webm';

        this._recordChunks = [];
        this._recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: videoBits });
        this._recorder.ondataavailable = e => { if (e.data.size > 0) this._recordChunks.push(e.data); };
        this._recorder.onstop = () => this._saveRecording();
        this._recorder.start(100);
        this.isRecording = true;
        if (this.onRecordStateChange) this.onRecordStateChange(true);
    }

    stopRecording() {
        if (!this.isRecording || !this._recorder) return;
        this._recorder.stop();
        if (this._audioDest) { try { this.analyser.disconnect(this._audioDest); } catch(_){} this._audioDest = null; }
        this.isRecording = false;
        if (this.onRecordStateChange) this.onRecordStateChange(false);
    }

    _saveRecording() {
        const blob = new Blob(this._recordChunks, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `harmonia-audio-${Date.now()}.webm`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    _compositeFrame() {
        if (!this._compositeCtx) return;
        const c = this._compositeCtx, cw = this._compositeCanvas.width, ch = this._compositeCanvas.height;
        c.drawImage(this.bgCanvas,  0, 0, cw, ch);
        c.drawImage(this.vizCanvas, 0, 0, cw, ch);
    }

    // ─── Resize ───────────────────────────────────────────────────────────
    _resize() {
        const W = window.innerWidth, H = window.innerHeight;
        this.bgCanvas.width   = W;
        this.bgCanvas.height  = H;
        this.vizCanvas.width  = W;
        this.vizCanvas.height = H;
        this._initDust(W, H);
        this._initDustBars(W, H);
        this._initAurora(W, H);
        this._initStarfield(W, H);
        this._initWaveformDust(W, H);
    }

    // ─── Main render ──────────────────────────────────────────────────────
    render() {
        if (!this.isActive || !this.analyser) return;
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

        this.analyser.getByteFrequencyData(this.freqData);
        this.analyser.getByteTimeDomainData(this.timeData);
        if (this.analyserL) this.analyserL.getByteTimeDomainData(this.timeDataL);
        if (this.analyserR) this.analyserR.getByteTimeDomainData(this.timeDataR);

        const W = this.vizCanvas.width;
        const H = this.vizCanvas.height;

        // Draw background
        const bgCtx = this.bgCtx;
        bgCtx.fillStyle = '#000';
        bgCtx.fillRect(0, 0, W, H);
        if (this._bgImage) {
            // Cover-fit the image
            const img = this._bgImage;
            const sr = img.width / img.height;
            const dr = W / H;
            let sw, sh, sx, sy;
            if (sr > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
            else         { sw = img.width;  sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
            bgCtx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
            // Dim overlay so viz pops
            bgCtx.fillStyle = 'rgba(0,0,0,0.35)';
            bgCtx.fillRect(0, 0, W, H);
        }

        // Clear viz overlay
        const ctx = this.vizCtx;
        ctx.clearRect(0, 0, W, H);

        let energy = 0;
        for (let i = 0; i < this.freqBins; i++) energy += this.freqData[i];
        energy /= (this.freqBins * 255);
        energy = Math.min(1, energy * this.reactivity * 2);

        const dt = 0.016;
        this._lissTime += dt;

        switch (this.currentViz) {
            case 'spectrum':      this._drawSpectrum(ctx, W, H, energy);     break;
            case 'neon-bars':     this._drawNeonBars(ctx, W, H, energy);     break;
            case 'oscilloscope':  this._drawOscilloscope(ctx, W, H);         break;
            case 'vu-meter':      this._drawVuMeter(ctx, W, H, energy);      break;
            case 'circular':      this._drawCircular(ctx, W, H, energy);     break;
            case 'mirror-bars':   this._drawMirrorBars(ctx, W, H, energy);   break;
            case 'waveform-fill': this._drawWaveformFill(ctx, W, H, energy); break;
            case 'lissajous':     this._drawLissajous(ctx, W, H, energy);    break;
            case '3d-bars':       this._draw3DBars(ctx, W, H, energy);       break;
            case 'fire-eq':       this._drawFireEQ(ctx, W, H, energy);       break;
            case 'dust':          this._drawDust(ctx, W, H, energy, dt);     break;
            case 'dust-bars':     this._drawDustBars(ctx, W, H, energy, dt); break;
            case 'aurora':        this._drawAurora(ctx, W, H, energy, dt);   break;
            case 'starfield':     this._drawStarfield(ctx, W, H, energy);    break;
            case 'dna':           this._drawDNA(ctx, W, H, energy);          break;
            case 'hex-pulse':     this._drawHexPulse(ctx, W, H, energy);     break;
            case 'ripple-rings':  this._drawRippleRings(ctx, W, H, energy);  break;
            case 'laser-web':     this._drawLaserWeb(ctx, W, H, energy);     break;
            case 'waveform-dust': this._drawWaveformDust(ctx, W, H, energy); break;
            case 'matrix-rain':   this._drawMatrixRain(ctx, W, H, energy);   break;
            case 'pulse-grid':    this._drawPulseGrid(ctx, W, H, energy);    break;
            case 'spiral-galaxy': this._drawSpiralGalaxy(ctx, W, H, energy); break;
            case 'terrain':       this._drawTerrain(ctx, W, H, energy);      break;
            case 'plasma-globe':  this._drawPlasmaGlobe(ctx, W, H, energy);  break;
            case 'fountain':      this._drawFountain(ctx, W, H, energy, dt); break;
            case 'radar-sweep':   this._drawRadarSweep(ctx, W, H, energy);   break;
            case 'prism-shards':  this._drawPrismShards(ctx, W, H, energy);  break;
            case 'smoke-rings':   this._drawSmokeRings(ctx, W, H, energy);   break;
            case 'ekg-monitor':   this._drawEKGMonitor(ctx, W, H, energy);   break;
            case 'butterfly':     this._drawButterfly(ctx, W, H, energy);    break;
            case 'northern-lights': this._drawNorthernLights(ctx, W, H, energy); break;
            case 'freq-flowers':  this._drawFreqFlowers(ctx, W, H, energy);  break;
            case 'sine-tower':    this._drawSineTower(ctx, W, H, energy);    break;
            case 'meteor-shower': this._drawMeteorShower(ctx, W, H, energy, dt); break;
            case 'sound-rings':   this._drawSoundRings(ctx, W, H, energy);   break;
            case 'neon-helix':    this._drawNeonHelix(ctx, W, H, energy);    break;
            case 'gyroscope':     this._drawGyroscope(ctx, W, H, energy);    break;
            case 'waterfall':     this._drawWaterfall(ctx, W, H, energy);    break;
            case 'circuit-tree':  this._drawCircuitTree(ctx, W, H, energy);  break;
            case 'comet-trails':  this._drawCometTrails(ctx, W, H, energy, dt); break;
            case 'diamond-grid':  this._drawDiamondGrid(ctx, W, H, energy);  break;
            case 'firefly-field': this._drawFireflyField(ctx, W, H, energy, dt); break;
            case 'shockwave':     this._drawShockwave(ctx, W, H, energy);    break;
            case 'vinyl-grooves': this._drawVinylGrooves(ctx, W, H, energy); break;
            case 'ember-fall':    this._drawEmberFall(ctx, W, H, energy, dt); break;
            case 'audio-morph':   this._drawAudioMorph(ctx, W, H, energy);   break;
            case 'ribbon-dance':  this._drawRibbonDance(ctx, W, H, energy);  break;
            case 'spectro-fall':  this._drawSpectroFall(ctx, W, H, energy);  break;
            case 'pendulum-wave': this._drawPendulumWave(ctx, W, H, energy); break;
            case 'sun-rays':      this._drawSunRays(ctx, W, H, energy);      break;
            case 'wave-tunnel':   this._drawWaveTunnel(ctx, W, H, energy);   break;
        }

        // Label overlay (always last, on top of everything)
        this._drawLabel(ctx, W, H);

        if (this.isRecording) this._compositeFrame();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────
    _cy(H) { return H * this.vizY; }
    _cx(W) { return W * this.vizX; }

    // ─── Label overlay setters ────────────────────────────────────────────
    setLabel(text)        { this.labelText = text || ''; }
    setLabelFont(font)    { this.labelFont = font || 'Inter'; }
    setLabelSize(px)      { this.labelSize = Math.max(12, Math.min(200, px || 48)); }
    setLabelPosition(pos) { this.labelPosition = pos || 'bottom'; }
}

// ─── Copy all viz methods from VideoPlayer prototype ──────────────────────
// Instead of duplicating 1000+ lines, we import VideoPlayer and copy its draw methods.
import { VideoPlayer } from '../video/VideoPlayer.js';

const vizMethods = Object.getOwnPropertyNames(VideoPlayer.prototype).filter(n =>
    n.startsWith('_draw') || n.startsWith('_init')
);
for (const name of vizMethods) {
    AudioPlayer.prototype[name] = VideoPlayer.prototype[name];
}
