/**
 * VideoPlayer — Video playback with audio-reactive overlay visualizations.
 */
export class VideoPlayer {
    constructor() {
        this.videoEl    = null;
        this.vizCanvas  = null;
        this.vizCtx     = null;
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
        this.timeDataL  = new Uint8Array(this.fftSize); // explicit L for XYZ

        this.isActive    = false;
        this.currentViz  = 'neon-bars';
        this.vizY        = 0.5;   // vertical centre 0-1
        this.vizX        = 0.5;   // horizontal centre 0-1
        this.vizSize     = 1.0;   // scale multiplier 0.3-2
        this.vizHueShift = 0;     // 0-360 additive hue shift
        this._lissTime   = 0;     // rotation time for XYZ

        // Particle state
        this._dustParticles     = [];
        this._dustBarsParticles = [];
        this._auroraParticles   = [];
        this._starParticles         = [];
        this._rippleRings           = [];
        this._rippleLastEnergy      = 0;
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

        // Reactivity (0-1, mirrors the main reactivity slider)
        this.reactivity = 0.5;

        // Label overlay
        this.labelText     = '';
        this.labelFont     = 'Inter';
        this.labelSize     = 48;
        this.labelPosition = 'bottom'; // 'top', 'center', 'bottom'

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

    // ─── Hue helper — applies global hue shift to any computed hue ────────
    _h(hue) { return (hue + this.vizHueShift) % 360; }

    // ─── DOM setup ────────────────────────────────────────────────────────
    _buildElements() {
        this.videoEl = document.createElement('video');
        this.videoEl.style.cssText = [
            'position:fixed','inset:0','width:100%','height:100%',
            'object-fit:cover','z-index:1','display:none',
        ].join(';');
        this.videoEl.playsInline = true;
        this.videoEl.loop        = false;
        document.body.appendChild(this.videoEl);

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
        this.videoEl.src = url;
        this.videoEl.style.display  = 'block';
        this.vizCanvas.style.display = 'block';

        this._resize();
        this._initDustBars(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this._onResize = () => this._resize());

        this.videoEl.addEventListener('play',  () => { if (this.onPlayStateChange) this.onPlayStateChange(true);  });
        this.videoEl.addEventListener('pause', () => { if (this.onPlayStateChange) this.onPlayStateChange(false); });
        this.videoEl.addEventListener('ended', () => {
            if (this.isRecording) this.stopRecording();
            if (this.onPlayStateChange) this.onPlayStateChange(false);
            if (this.onEnded) this.onEnded();
        });

        this.videoEl.play().then(() => {
            this._setupAudio();
        }).catch(() => {
            this.videoEl.addEventListener('play', () => this._setupAudio(), { once: true });
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

            this.source = this.audioCtx.createMediaElementSource(this.videoEl);
            this.source.connect(this.analyser);
            this.source.connect(this.splitter);
            this.splitter.connect(this.analyserL, 0);
            this.splitter.connect(this.analyserR, 1);
            this.analyser.connect(this.audioCtx.destination);
        } catch (e) {
            console.warn('VideoPlayer audio setup error:', e);
        }
    }

    stop() {
        if (this.isRecording) this.stopRecording();
        if (this.videoEl)   { this.videoEl.pause(); this.videoEl.src = ''; this.videoEl.style.display = 'none'; }
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
        if (!this.videoEl) return;
        if (this.videoEl.paused) {
            this.videoEl.play();
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        } else {
            this.videoEl.pause();
        }
        if (this.onPlayStateChange) this.onPlayStateChange(!this.videoEl.paused);
    }

    restart() {
        if (!this.videoEl) return;
        this.videoEl.currentTime = 0;
        this.videoEl.play();
        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        if (this.onPlayStateChange) this.onPlayStateChange(true);
    }

    // ─── Setters ──────────────────────────────────────────────────────────
    setViz(name)      { this.currentViz  = name; }
    setYPosition(y)   { this.vizY        = Math.max(0, Math.min(1, y)); }
    setXPosition(x)   { this.vizX        = Math.max(0, Math.min(1, x)); }
    setSize(s)        { this.vizSize     = Math.max(0.3, Math.min(2.5, s)); }
    setHueShift(h)    { this.vizHueShift = ((h % 360) + 360) % 360; }

    // ─── Recording ────────────────────────────────────────────────────────
    startRecording() {
        if (this.isRecording || !this.videoEl || !this.audioCtx) return;

        const vw = this.videoEl.videoWidth  || window.innerWidth;
        const vh = this.videoEl.videoHeight || window.innerHeight;
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
        a.href = url; a.download = `harmonia-video-${Date.now()}.webm`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    _compositeFrame() {
        if (!this._compositeCtx || !this.videoEl) return;
        const c = this._compositeCtx, cw = this._compositeCanvas.width, ch = this._compositeCanvas.height;
        c.drawImage(this.videoEl,   0, 0, cw, ch);
        c.drawImage(this.vizCanvas, 0, 0, cw, ch);
    }

    // ─── Resize ───────────────────────────────────────────────────────────
    _resize() {
        const W = window.innerWidth, H = window.innerHeight;
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

        const ctx = this.vizCtx;
        const W   = this.vizCanvas.width;
        const H   = this.vizCanvas.height;
        ctx.clearRect(0, 0, W, H);

        let energy = 0;
        for (let i = 0; i < this.freqBins; i++) energy += this.freqData[i];
        energy /= (this.freqBins * 255);
        // Scale by reactivity: 0.5 (slider midpoint) = no change; 0 = muted; 1 = doubled
        energy = Math.min(1, energy * this.reactivity * 2);

        const dt = 0.016; // approximate frame delta for particle systems
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

    // ─── Label overlay ────────────────────────────────────────────────────
    setLabel(text)     { this.labelText = text || ''; }
    setLabelFont(font) { this.labelFont = font || 'Inter'; }
    setLabelSize(px)   { this.labelSize = Math.max(12, Math.min(200, px || 48)); }
    setLabelPosition(pos) { this.labelPosition = pos || 'bottom'; }

    _drawLabel(ctx, W, H) {
        if (!this.labelText) return;

        const size = this.labelSize;
        const padding = size * 0.6;
        const stripH = size + padding * 2;

        // Y position
        let stripY;
        switch (this.labelPosition) {
            case 'top':    stripY = 0; break;
            case 'center': stripY = (H - stripH) / 2; break;
            case 'bottom': default: stripY = H - stripH; break;
        }

        // Black strip
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(0, stripY, W, stripH);

        // Subtle top/bottom border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, stripY, W, 1);
        ctx.fillRect(0, stripY + stripH - 1, W, 1);

        // Text
        ctx.font = `${size}px '${this.labelFont}', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.labelText, W / 2, stripY + stripH / 2);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────
    _cy(H) { return H * this.vizY; }
    _cx(W) { return W * this.vizX; }

    // ─── 1. Classic spectrum bars ─────────────────────────────────────────
    _drawSpectrum(ctx, W, H, energy) {
        const barCount = 96;
        const vizH     = H * 0.35 * this.vizSize;
        const top      = this._cy(H);
        const bw       = W / barCount - 1;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < barCount; i++) {
            const binIdx = Math.floor(i / barCount * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;
            const bh     = v * vizH;
            const hue    = this._h((i / barCount) * 280 + 160);
            ctx.fillStyle = `hsla(${hue},100%,${50+v*30}%,${0.7+energy*0.3})`;
            ctx.fillRect(i * (bw+1), top - bh, bw, bh);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 2. Neon glow bars ────────────────────────────────────────────────
    _drawNeonBars(ctx, W, H, energy) {
        const barCount = 80;
        const vizH     = H * 0.4 * this.vizSize;
        const cy       = this._cy(H);
        const bw       = W / barCount - 2;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < barCount; i++) {
            const binIdx = Math.floor(i / barCount * this.freqBins * 0.65);
            const v      = this.freqData[binIdx] / 255;
            if (v < 0.01) continue;
            const bh  = v * vizH;
            const hue = this._h((i / barCount) * 300 + 160);
            const x   = i * (bw + 2);
            for (let pass = 3; pass >= 0; pass--) {
                const alpha = (0.15 + (3-pass) * 0.2) * v;
                ctx.shadowBlur  = (pass+1) * 4 * (1 + energy);
                ctx.shadowColor = `hsl(${hue},100%,70%)`;
                ctx.fillStyle   = `hsla(${hue},100%,${55+pass*8}%,${alpha})`;
                ctx.fillRect(x - pass, cy - bh, bw + pass*2, bh * 2);
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 3. Oscilloscope ─────────────────────────────────────────────────
    _drawOscilloscope(ctx, W, H) {
        const cy    = this._cy(H);
        const amp   = H * 0.18 * this.vizSize;
        const slice = W / this.fftSize;
        const hue   = this._h(165);

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.15)`;
        ctx.lineWidth   = 10;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = `hsl(${hue},100%,70%)`;
        ctx.beginPath();
        for (let i = 0; i < this.fftSize; i++) {
            const y = cy + (this.timeData[i] / 128 - 1) * amp;
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * slice, y);
        }
        ctx.stroke();
        ctx.strokeStyle = `hsla(${hue},100%,85%,0.9)`;
        ctx.lineWidth   = 1.5;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        for (let i = 0; i < this.fftSize; i++) {
            const y = cy + (this.timeData[i] / 128 - 1) * amp;
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * slice, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 4. VU Meter ─────────────────────────────────────────────────────
    _drawVuMeter(ctx, W, H, energy) {
        const vizH = H * 0.45 * this.vizSize;
        const cx   = this._cx(W);
        const top  = this._cy(H) - vizH / 2;
        const segH = vizH / 20;
        const bw   = W * 0.06 * this.vizSize;
        const gap  = W * 0.015;

        let lSum = 0, rSum = 0;
        const half = Math.floor(this.freqBins * 0.3);
        for (let i = 0; i < half; i++)      lSum += this.freqData[i];
        for (let i = half; i < half*2; i++) rSum += this.freqData[i];
        const lLevel = lSum / (half * 255);
        const rLevel = rSum / (half * 255);

        const drawCh = (level, xCenter) => {
            const lit = Math.ceil(level * 20);
            for (let s = 0; s < 20; s++) {
                const y   = top + (19-s) * segH;
                const on  = s < lit;
                const hue = this._h(s < 14 ? 120 : s < 18 ? 60 : 0);
                ctx.fillStyle = on ? `hsla(${hue},100%,55%,0.95)` : `hsla(${hue},40%,20%,0.4)`;
                if (on) { ctx.shadowBlur = 8; ctx.shadowColor = `hsl(${hue},100%,60%)`; }
                ctx.fillRect(xCenter - bw/2, y + 1, bw, segH - 2);
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '10px monospace'; ctx.textAlign = 'center';
            ctx.fillText(Math.round(level * 100) + '%', xCenter, top + vizH + 14);
        };
        drawCh(lLevel, cx - bw/2 - gap);
        drawCh(rLevel, cx + bw/2 + gap);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('L                R', cx, top - 8);
    }

    // ─── 5. Circular spectrum ─────────────────────────────────────────────
    _drawCircular(ctx, W, H, energy) {
        const cx      = this._cx(W);
        const cy      = this._cy(H);
        const baseR   = Math.min(W, H) * 0.12 * this.vizSize;
        const maxSpike= Math.min(W, H) * 0.22 * this.vizSize;
        const bars    = 128;

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(cx, cy);

        for (let i = 0; i < bars; i++) {
            const angle  = (i / bars) * Math.PI * 2 - Math.PI / 2;
            const binIdx = Math.floor(i / bars * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;
            const len    = v * maxSpike;
            const hue    = this._h((i / bars) * 360);
            ctx.strokeStyle = `hsla(${hue},100%,${55+v*35}%,${0.5+v*0.5})`;
            ctx.lineWidth   = 1.5 + v * 2;
            ctx.shadowBlur  = 6 + v * 10;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * baseR,        Math.sin(angle) * baseR);
            ctx.lineTo(Math.cos(angle) * (baseR + len), Math.sin(angle) * (baseR + len));
            ctx.stroke();
        }
        const cg = ctx.createRadialGradient(0,0,0, 0,0, baseR);
        cg.addColorStop(0, `hsla(${this._h(180)},100%,80%,${0.3+energy*0.4})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0,0,baseR,0,Math.PI*2); ctx.fill();

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 6. Mirror bars ──────────────────────────────────────────────────
    _drawMirrorBars(ctx, W, H, energy) {
        const barCount = 100;
        const halfH    = H * 0.2 * this.vizSize;
        const cy       = this._cy(H);
        const bw       = W / barCount - 1;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < barCount; i++) {
            const binIdx = Math.floor(i / barCount * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;
            const bh     = v * halfH;
            const hue    = this._h((i / barCount) * 280 + 160);
            ctx.fillStyle = `hsla(${hue},100%,${50+v*30}%,${0.6+energy*0.4})`;
            ctx.fillRect(i * (bw+1), cy - bh, bw, bh);
            ctx.fillRect(i * (bw+1), cy,      bw, bh);
        }
        ctx.strokeStyle = `hsla(${this._h(180)},100%,90%,${0.3+energy*0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 7. Waveform fill ────────────────────────────────────────────────
    _drawWaveformFill(ctx, W, H, energy) {
        const cy   = this._cy(H);
        const amp  = H * 0.2 * this.vizSize;
        const step = W / this.fftSize;
        const hue  = this._h(180);

        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createLinearGradient(0, cy - amp, 0, cy);
        grad.addColorStop(0, `hsla(${hue},100%,70%,0)`);
        grad.addColorStop(1, `hsla(${hue},100%,70%,${0.2+energy*0.3})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        for (let i = 0; i < this.fftSize; i++) {
            ctx.lineTo(i * step, cy - (this.timeData[i] / 128 - 1) * amp);
        }
        ctx.lineTo(W, cy); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = `hsla(${hue},100%,80%,${0.6+energy*0.4})`;
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 12 + energy * 20;
        ctx.shadowColor = `hsl(${hue},100%,70%)`;
        ctx.beginPath();
        for (let i = 0; i < this.fftSize; i++) {
            const y = cy - (this.timeData[i] / 128 - 1) * amp;
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 8. Lissajous XYZ scope ──────────────────────────────────────────
    _drawLissajous(ctx, W, H, energy) {
        const cx   = this._cx(W);
        const cy   = this._cy(H);
        const size = Math.min(W, H) * 0.28 * this.vizSize;
        const n    = this.fftSize;

        // Slow XZ rotation for 3D feel
        const rotA = this._lissTime * 0.25;
        const cosA = Math.cos(rotA), sinA = Math.sin(rotA);

        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        for (let i = 1; i < n; i++) {
            const frac = i / n;
            // X = L channel, Y = R channel, Z = phase-shifted L (quarter period ahead)
            const X = (this.timeDataL[i]                         / 128 - 1);
            const Y = (this.timeDataR[i]                         / 128 - 1);
            const Z = (this.timeDataL[(i + n/4) % n]             / 128 - 1);

            const Xp = (this.timeDataL[i-1]                      / 128 - 1);
            const Yp = (this.timeDataR[i-1]                      / 128 - 1);
            const Zp = (this.timeDataL[(i-1 + n/4) % n]          / 128 - 1);

            // Isometric projection: rotate in XZ plane, Y stays Y, Z adds slight Y tilt
            const sx  = (X  * cosA - Z  * sinA) * size;
            const sy  = (Y  + Z  * sinA * 0.35) * size;
            const sxp = (Xp * cosA - Zp * sinA) * size;
            const syp = (Yp + Zp * sinA * 0.35) * size;

            // Depth cue: Z drives brightness
            const depth = 0.5 + Z * 0.5;
            const hue   = this._h((frac * 300 + 160) % 360);
            ctx.strokeStyle = `hsla(${hue},100%,${55+depth*35}%,${frac*0.65})`;
            ctx.lineWidth   = (0.8 + energy * 1.5) * (0.6 + depth * 0.6);
            ctx.beginPath();
            ctx.moveTo(cx + sxp, cy + syp);
            ctx.lineTo(cx + sx,  cy + sy);
            ctx.stroke();
        }

        // Bright head dot
        const lastX = (this.timeDataL[n-1]           / 128 - 1);
        const lastY = (this.timeDataR[n-1]           / 128 - 1);
        const lastZ = (this.timeDataL[(n-1+n/4) % n] / 128 - 1);
        const lsx   = (lastX * cosA - lastZ * sinA) * size + cx;
        const lsy   = (lastY + lastZ * sinA * 0.35) * size + cy;
        const hg    = ctx.createRadialGradient(lsx, lsy, 0, lsx, lsy, 14);
        hg.addColorStop(0, 'rgba(255,255,255,0.95)');
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(lsx, lsy, 14, 0, Math.PI*2); ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 9. 3D perspective bars ──────────────────────────────────────────
    _draw3DBars(ctx, W, H, energy) {
        const barCount = 48;
        const baseY    = this._cy(H) + H * 0.15 * this.vizSize;
        const maxH3D   = H * 0.35 * this.vizSize;
        const bw       = W / barCount * 0.7;
        const depth    = 18;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = barCount - 1; i >= 0; i--) {
            const binIdx = Math.floor(i / barCount * this.freqBins * 0.65);
            const v      = this.freqData[binIdx] / 255;
            const bh     = v * maxH3D;
            const hue    = this._h((i / barCount) * 260 + 200);
            const x      = (i / barCount) * W + (W / barCount - bw) / 2;

            ctx.fillStyle = `hsla(${hue},100%,${65+v*25}%,${0.7+energy*0.3})`;
            ctx.beginPath();
            ctx.moveTo(x,            baseY - bh);
            ctx.lineTo(x + bw,       baseY - bh);
            ctx.lineTo(x + bw + depth*0.5, baseY - bh - depth);
            ctx.lineTo(x + depth*0.5,      baseY - bh - depth);
            ctx.closePath(); ctx.fill();

            ctx.fillStyle = `hsla(${hue},100%,${45+v*25}%,${0.6+energy*0.3})`;
            ctx.fillRect(x, baseY - bh, bw, bh);

            ctx.fillStyle = `hsla(${hue},100%,${35+v*20}%,${0.5+energy*0.3})`;
            ctx.beginPath();
            ctx.moveTo(x+bw,          baseY - bh);
            ctx.lineTo(x+bw+depth*0.5, baseY - bh - depth);
            ctx.lineTo(x+bw+depth*0.5, baseY - depth);
            ctx.lineTo(x+bw,          baseY);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 10. Fire EQ ─────────────────────────────────────────────────────
    _drawFireEQ(ctx, W, H, energy) {
        const barCount = 64;
        const vizH     = H * 0.38 * this.vizSize;
        const baseY    = this._cy(H) + vizH * 0.5;
        const bw       = W / barCount;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < barCount; i++) {
            const binIdx = Math.floor(i / barCount * this.freqBins * 0.65);
            const v      = this.freqData[binIdx] / 255;
            const bh     = v * vizH;
            const x      = i * bw;
            const hue0   = this._h(60), hue1 = this._h(30), hue2 = this._h(0);
            const grad   = ctx.createLinearGradient(x, baseY - bh, x, baseY);
            grad.addColorStop(0,   `hsla(${hue0},100%,${50+v*40}%,${v*0.9})`);
            grad.addColorStop(0.3, `hsla(${hue1},100%,55%,${v*0.8})`);
            grad.addColorStop(0.7, `hsla(${hue2},100%,45%,${v*0.7})`);
            grad.addColorStop(1,   `hsla(${hue2},80%,15%,0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, baseY - bh, bw - 1, bh);
            if (v > 0.5 && Math.random() < v * 0.4) {
                const sx = x + Math.random() * bw, sy = baseY - bh - Math.random() * 20;
                ctx.fillStyle = `hsla(${hue0},100%,90%,${(v-0.5)*1.5})`;
                ctx.beginPath(); ctx.arc(sx, sy, 1 + Math.random()*2, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 11. Dust Motes ──────────────────────────────────────────────────
    _initDust(W, H) {
        const numBins = 120;
        // Size slider controls particle density
        const perBin  = Math.max(1, Math.round(4 * this.vizSize));
        const perSide = numBins * perBin;

        this._dustParticles = Array.from({ length: perSide * 2 }, (_, i) => {
            const side    = i < perSide ? 0 : 1;
            const idx     = side === 0 ? i : i - perSide;
            const binIdx  = Math.floor(idx / perBin);
            const bin     = Math.floor((binIdx / numBins) * this.freqBins * 0.65);
            return {
                x:       side === 0 ? Math.random() * W * 0.12 : W * 0.88 + Math.random() * W * 0.12,
                y:       Math.random() * H,
                vx:      0,
                vy:      (Math.random() - 0.5) * 0.6,
                bin,
                // Random depth fraction — no column grid, each particle lands organically
                frac:    0.05 + Math.random() * 0.95,
                baseHue: Math.random() * 80,
                phase:   Math.random() * Math.PI * 2,
                speed:   0.4 + Math.random() * 0.8,
                side,
            };
        });
    }

    _drawDust(ctx, W, H, energy, dt) {
        const expectedPerBin = Math.max(1, Math.round(4 * this.vizSize));
        if (this._dustParticles.length !== 120 * expectedPerBin * 2) this._initDust(W, H);

        const maxReach = W * 0.44;

        ctx.globalCompositeOperation = 'lighter';

        for (const p of this._dustParticles) {
            const v = this.freqData[p.bin] / 255;

            // X: frequency drives reach inward from edge — energy amplifies without adding base
            const reach   = Math.min(maxReach, v * maxReach * p.frac * (1 + energy * 1.5));
            const targetX = p.side === 0 ? reach : W - reach;
            p.vx += (targetX - p.x) * 0.12;

            // Y: drifts freely — base noise keeps particles spread across full height at all volumes
            p.vy += (Math.random() - 0.5) * (0.4 + energy * 2.0);
            p.phase += 0.006 * p.speed;
            p.vy    += Math.sin(p.phase) * 0.05;

            // Speed cap
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > 7) { p.vx = (p.vx / spd) * 7; p.vy = (p.vy / spd) * 7; }

            // X damps tightly (keeps frequency response crisp), Y barely damps (floats)
            const damp = 0.90 + (1 - energy) * 0.09;
            p.vx *= damp;
            p.vy *= 0.994;

            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

            const hue    = this._h(200 + p.baseHue);
            const radius = Math.max(1.0, 1.2 + v * 2.5 + energy * 0.8);
            const alpha  = Math.min(0.92, 0.18 + v * 0.60 + energy * 0.22);

            ctx.fillStyle = `hsla(${hue},90%,${70 + v*22 + energy*10}%,${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 12. Dust Float (original preset) ───────────────────────────────────
    // Simple floating particles in a central band — the very first dust implementation
    _initDustBars(W, H) {
        const count = Math.round(1200 * this.vizSize);
        this._dustBarsParticles = Array.from({ length: count }, () => ({
            x:       Math.random() * W,
            y:       Math.random() * H,
            vx:      (Math.random() - 0.5) * 1.5,
            vy:      (Math.random() - 0.5) * 1.5,
            bin:     Math.floor(Math.random() * this.freqBins * 0.75),
            baseHue: Math.random() * 80,
            phase:   Math.random() * Math.PI * 2,
            speed:   0.4 + Math.random() * 0.8,
            size:    0.6 + Math.random() * 0.8,
        }));
    }

    _drawDustBars(ctx, W, H, energy, dt) {
        const expected = Math.round(1200 * this.vizSize);
        if (this._dustBarsParticles.length !== expected) this._initDustBars(W, H);

        const cy    = this._cy(H);
        const bandH = H * 0.42;

        ctx.globalCompositeOperation = 'lighter';

        for (const p of this._dustBarsParticles) {
            const v = this.freqData[p.bin] / 255;

            // Brownian drift — always alive
            p.vx += (Math.random() - 0.5) * 0.3;
            p.vy += (Math.random() - 0.5) * 0.3;

            // Sine bob
            p.phase += 0.005 * p.speed;
            p.vy    += Math.sin(p.phase) * 0.06;

            // Audio kick — random scatter proportional to bin level
            p.vx += (Math.random() - 0.5) * v * 4.0;
            p.vy += (Math.random() - 0.5) * v * 3.0;

            // Beat pulse: radial burst from centre on loud hits
            if (energy > 0.25) {
                const dx = p.x - W * 0.5, dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                p.vx += (dx / dist) * energy * 2.2;
                p.vy += (dy / dist) * energy * 1.8;
            }

            // Soft vertical band — pull back if too far from cy
            const dy = p.y - cy;
            if (Math.abs(dy) > bandH) p.vy -= dy * 0.005;

            // Speed cap + damping
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > 7) { p.vx = (p.vx / spd) * 7; p.vy = (p.vy / spd) * 7; }
            p.vx *= 0.993; p.vy *= 0.993;

            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

            const hue    = this._h(200 + p.baseHue);
            const radius = Math.max(1.0, (1.2 + v * 2.8) * p.size);
            const alpha  = Math.min(0.92, (0.22 + v * 0.65) * (0.7 + energy * 0.5));

            ctx.fillStyle = `hsla(${hue},85%,${72 + v*22}%,${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 13. Aurora particles ─────────────────────────────────────────────
    // Fine glowing particles rising in frequency-driven columns
    _initAurora(W, H) {
        const cols  = 60;
        const perCol = 12;
        this._auroraParticles = [];
        for (let c = 0; c < cols; c++) {
            const x = (c / cols) * W;
            for (let j = 0; j < perCol; j++) {
                this._auroraParticles.push({
                    col: c,
                    x:   x + (Math.random() - 0.5) * (W / cols),
                    y:   Math.random() * H,
                    vy:  -(0.3 + Math.random() * 0.7),
                    age: Math.random(),      // 0-1, 1 = fade
                    bin: Math.floor((c / cols) * this.freqBins * 0.65),
                });
            }
        }
    }

    _drawAurora(ctx, W, H, energy, dt) {
        if (!this._auroraParticles.length) this._initAurora(W, H);
        const cy = this._cy(H);
        const sz = this.vizSize;
        const cols = 60;
        const colW = W / cols;

        ctx.globalCompositeOperation = 'lighter';

        for (const p of this._auroraParticles) {
            const v = this.freqData[p.bin] / 255;

            // Particles active only when their bin is lit; sleep when quiet
            const speed = (0.4 + v * 2.5) * sz;
            p.y   += p.vy * speed;
            p.x   += (Math.random() - 0.5) * 0.5;
            p.age += 0.008 + v * 0.012;

            // Reset when particle drifts out of active band or fades out
            const bandTop = cy - H * 0.45 * sz;
            const bandBot = cy + H * 0.05 * sz;
            if (p.age >= 1 || p.y < bandTop) {
                p.y   = bandBot + Math.random() * H * 0.1;
                p.x   = (p.col / cols) * W + (Math.random() - 0.5) * colW;
                p.vy  = -(0.3 + Math.random() * 0.7);
                p.age = 0;
            }

            if (v < 0.03) continue; // only draw when bin is active

            const lifeAlpha = Math.sin(p.age * Math.PI); // fade in, fade out
            const alpha     = lifeAlpha * v * 0.8;
            if (alpha < 0.01) continue;

            const hue    = this._h(160 + (p.col / cols) * 120); // green→teal→blue range
            const radius = (1 + v * 3) * sz;

            // Soft glow particle
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
            g.addColorStop(0, `hsla(${hue},100%,85%,${alpha})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, radius * 3, 0, Math.PI*2); ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 14. Starfield warp ──────────────────────────────────────────────
    _initStarfield(W, H) {
        const count = Math.round(250 * this.vizSize);
        this._starParticles = Array.from({ length: count }, () => ({
            x:  (Math.random() - 0.5) * 2,
            y:  (Math.random() - 0.5) * 2,
            z:  Math.random(),
            pz: Math.random(),
        }));
    }

    _drawStarfield(ctx, W, H, energy) {
        const expected = Math.round(250 * this.vizSize);
        if (this._starParticles.length !== expected) this._initStarfield(W, H);

        const cx    = this._cx(W);
        const cy    = this._cy(H);
        const speed = 0.005 + energy * 0.045;

        ctx.globalCompositeOperation = 'lighter';

        for (const s of this._starParticles) {
            s.pz = s.z;
            s.z -= speed;
            if (s.z <= 0) { s.x = (Math.random()-0.5)*2; s.y = (Math.random()-0.5)*2; s.z = 1; s.pz = 1; }

            const sx  = cx + (s.x  / s.z)  * W * 0.5;
            const sy  = cy + (s.y  / s.z)  * H * 0.5;
            const spx = cx + (s.x  / s.pz) * W * 0.5;
            const spy = cy + (s.y  / s.pz) * H * 0.5;

            // skip stars that have wandered off screen
            if (sx < -50 || sx > W+50 || sy < -50 || sy > H+50) { s.z = 1; s.pz = 1; continue; }

            const bright = 1 - s.z;
            const hue    = this._h(((s.x + 1) * 100 + (s.y + 1) * 80 + 200) % 360);
            ctx.strokeStyle = `hsla(${hue},90%,${70 + bright*30}%,${bright})`;
            ctx.lineWidth   = Math.max(0.5, bright * 2.5 * this.vizSize);
            ctx.beginPath(); ctx.moveTo(spx, spy); ctx.lineTo(sx, sy); ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 15. DNA double helix ────────────────────────────────────────────
    _drawDNA(ctx, W, H, energy) {
        const cy      = this._cy(H);
        const amp     = H * 0.13 * this.vizSize;
        const cycles  = 3.0;
        const scroll  = this._lissTime * 1.2;
        const steps   = 160;

        ctx.globalCompositeOperation = 'lighter';

        // Two strands
        for (let strand = 0; strand < 2; strand++) {
            const phase = strand * Math.PI;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const t      = i / steps;
                const binIdx = Math.floor(t * this.freqBins * 0.7);
                const v      = this.freqData[binIdx] / 255;
                const x      = t * W;
                const y      = cy + Math.sin(t * cycles * Math.PI * 2 + scroll + phase) * amp * (0.5 + v * 0.7);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            const hue = this._h(strand === 0 ? 170 : 230);
            ctx.strokeStyle = `hsla(${hue},100%,70%,0.85)`;
            ctx.lineWidth   = 2.5 * this.vizSize;
            ctx.shadowBlur  = 10 + energy * 18;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.stroke();
        }

        // Rungs every ~12 steps
        const rungStep = 10;
        for (let i = 0; i <= steps; i += rungStep) {
            const t      = i / steps;
            const binIdx = Math.floor(t * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;
            const x      = t * W;
            const y1     = cy + Math.sin(t * cycles * Math.PI * 2 + scroll)          * amp * (0.5 + v * 0.7);
            const y2     = cy + Math.sin(t * cycles * Math.PI * 2 + scroll + Math.PI) * amp * (0.5 + v * 0.7);
            const hue    = this._h(200 + t * 80);
            ctx.strokeStyle = `hsla(${hue},90%,${60 + v*30}%,${0.35 + v * 0.55})`;
            ctx.lineWidth   = 1.5;
            ctx.shadowBlur  = 5 + v * 8;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 16. Hex pulse grid ──────────────────────────────────────────────
    _drawHexPulse(ctx, W, H, energy) {
        const hexR = Math.max(16, Math.min(52, W / 22)) * this.vizSize;
        const colW = hexR * 1.5;
        const rowH = hexR * Math.sqrt(3);
        const cols = Math.ceil(W / colW) + 2;
        const rows = Math.ceil(H / rowH) + 2;
        const offX = -hexR;
        const offY = -rowH * 0.5;

        ctx.globalCompositeOperation = 'lighter';

        let binCounter = 0;
        const totalCells = cols * rows;
        const binsUsed   = Math.floor(this.freqBins * 0.72);

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const cx = offX + col * colW;
                const cy = offY + row * rowH + (col % 2 ? rowH * 0.5 : 0);
                const binIdx = Math.min(binsUsed - 1, Math.floor((binCounter / totalCells) * binsUsed));
                binCounter++;
                const v = this.freqData[binIdx] / 255;
                if (v < 0.025) continue;

                const hue = this._h(160 + (binIdx / binsUsed) * 220);
                ctx.strokeStyle = `hsla(${hue},100%,${52 + v*40}%,${0.15 + v * 0.75})`;
                ctx.fillStyle   = `hsla(${hue},100%,${30 + v*25}%,${v * 0.22})`;
                ctx.lineWidth   = 1 + v * 2;
                ctx.shadowBlur  = v * 18;
                ctx.shadowColor = `hsl(${hue},100%,70%)`;

                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                    const ang = (a * 60) * Math.PI / 180;
                    const px  = cx + hexR * Math.cos(ang);
                    const py  = cy + hexR * Math.sin(ang);
                    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 17. Ripple rings ────────────────────────────────────────────────
    _drawRippleRings(ctx, W, H, energy) {
        const cx   = this._cx(W);
        const cy   = this._cy(H);
        const maxR = Math.max(W, H) * 0.72 * this.vizSize;
        const dt   = 0.016;

        // Spawn ring on energy spike
        if (energy > this._rippleLastEnergy + 0.07 && energy > 0.12 && this._rippleRings.length < 24) {
            this._rippleRings.push({
                r:     8 + Math.random() * 20,
                alpha: 0.85 + energy * 0.15,
                hue:   this._h((this._lissTime * 120) % 360),
                speed: 90 + energy * 220,
                width: 1.5 + energy * 3,
            });
        }
        this._rippleLastEnergy = this._rippleLastEnergy * 0.88 + energy * 0.12;

        ctx.globalCompositeOperation = 'lighter';

        // Frequency-mapped standing rings
        const numBands = 10;
        for (let b = 0; b < numBands; b++) {
            const binIdx = Math.floor((b / numBands) * this.freqBins * 0.6);
            const v      = this.freqData[binIdx] / 255;
            if (v < 0.02) continue;
            const r   = (b / numBands) * maxR * 0.55 + v * maxR * 0.12;
            const hue = this._h(155 + b * 22);
            ctx.strokeStyle = `hsla(${hue},100%,${55 + v*35}%,${v * 0.55})`;
            ctx.lineWidth   = 1 + v * 3.5;
            ctx.shadowBlur  = 6 + v * 14;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }

        // Expanding transient rings
        for (let i = this._rippleRings.length - 1; i >= 0; i--) {
            const ring  = this._rippleRings[i];
            ring.r     += ring.speed * dt;
            ring.alpha -= dt * 1.1;
            if (ring.alpha <= 0 || ring.r > maxR) { this._rippleRings.splice(i, 1); continue; }

            ctx.strokeStyle = `hsla(${ring.hue},100%,78%,${ring.alpha})`;
            ctx.lineWidth   = ring.width * ring.alpha;
            ctx.shadowBlur  = 14 * ring.alpha;
            ctx.shadowColor = `hsl(${ring.hue},100%,70%)`;
            ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 19. Waveform Dust ───────────────────────────────────────────────
    // 4× dense, 3× tall dust cloud contained in the Waveform Fill region.
    // Reaction: energy kicks particles OUTWARD from the fill midpoint (past
    // the boundaries); the spring walls pull them back proportionally — the
    // harder they fly out, the harder they snap back.
    //
    // Efficiency: particles are sorted by hue at init so rendering batches
    // into ~5 fill() calls; a 512-entry waveform cache avoids per-particle
    // index arithmetic; sqrt is skipped when the speed cap isn't reached.
    _initWaveformDust(W, H) {
        const count = Math.round(720 * this.vizSize);
        const pts = Array.from({ length: count }, () => ({
            x:       Math.random() * W,
            y:       Math.random() * H,
            vx:      (Math.random() - 0.5) * 1.5,
            vy:      (Math.random() - 0.5) * 1.5,
            baseHue: Math.random() * 80,
            phase:   Math.random() * Math.PI * 2,
            speed:   0.4 + Math.random() * 0.8,
            size:    0.6 + Math.random() * 0.8,
        }));
        // Sort by baseHue so render loop batches consecutive same-bucket particles
        pts.sort((a, b) => a.baseHue - b.baseHue);
        this._waveformDustParticles = pts;
        this._wfCache = new Float32Array(512);
    }

    _drawWaveformDust(ctx, W, H, energy) {
        const expected = Math.round(720 * this.vizSize);
        if (this._waveformDustParticles.length !== expected) this._initWaveformDust(W, H);

        const cy  = this._cy(H);
        const amp = H * 0.60 * this.vizSize;
        const WC  = 512;
        const wfc = this._wfCache;

        // Build waveform cache once per frame (512 lookups, not 4800)
        const wStep = (this.fftSize / WC) | 0;
        for (let i = 0; i < WC; i++) {
            wfc[i] = (this.timeData[i * wStep] / 128 - 1) * amp;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Energy-driven brightness & size (recomputed once per frame)
        const eLum = 76  + energy * 22 | 0;          // lightness 76-98%
        const eAlp = (0.65 + energy * 0.30).toFixed(2); // alpha 0.65-0.95

        // Batch-render by baseHue bucket — each bucket → one fill() call
        const BUCKET = 16; // 5 buckets across baseHue range [0, 80]
        let prevBucket = -999;
        ctx.beginPath();

        for (const p of this._waveformDustParticles) {
            // O(1) waveform lookup via cache
            const col   = Math.min(WC - 1, (p.x / W * WC) | 0);
            const def   = wfc[col];
            const v     = Math.abs(def) / (amp + 1);   // 0-1 local intensity
            const fillTop = def >= 0 ? cy - def : cy;
            const fillBot = def >= 0 ? cy      : cy - def;

            // ── Physics ──────────────────────────────────────────────
            const rnd = Math.random() - 0.5;  // one random, reused twice
            p.vx += rnd * 0.3;
            p.vy += (Math.random() - 0.5) * 0.3;

            p.phase += 0.005 * p.speed;
            p.vy    += Math.sin(p.phase) * 0.06;

            // Outward kick from fill midpoint — reversed from old inward pull
            const fillMid = (fillTop + fillBot) * 0.5;
            const outDir  = p.y <= fillMid ? -1 : 1;   // up if above mid, down if below
            p.vy += outDir * v * 9.0;
            p.vx += rnd * v * 1.5;                      // reuse rnd for horizontal

            if (energy > 0.25) p.vy += outDir * energy * 4.5;

            // Spring walls — restoring force ∝ displacement past boundary
            if      (p.y < fillTop) p.vy += (fillTop - p.y) * 0.07;
            else if (p.y > fillBot) p.vy -= (p.y - fillBot) * 0.07;
            if (fillBot - fillTop < H * 0.045) p.vy -= (p.y - cy) * 0.025;

            // Speed cap — skip sqrt when within limit
            const spd2 = p.vx * p.vx + p.vy * p.vy;
            if (spd2 > 81) {
                const inv = 9 / Math.sqrt(spd2);
                p.vx *= inv; p.vy *= inv;
            }
            p.vx *= 0.993; p.vy *= 0.991;

            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;

            // ── Batched render ────────────────────────────────────────
            const bucket = (p.baseHue / BUCKET | 0) * BUCKET;
            if (bucket !== prevBucket) {
                if (prevBucket !== -999) {
                    // Flush previous bucket with its representative hue
                    ctx.fillStyle = `hsla(${this._h(200 + prevBucket + BUCKET * 0.5)},85%,${eLum}%,${eAlp})`;
                    ctx.fill();
                    ctx.beginPath();
                }
                prevBucket = bucket;
            }

            const r = Math.max(1.3, (1.6 + v * 2.8 + energy * 2.5) * p.size);
            ctx.moveTo(p.x + r, p.y);   // new subpath per circle (no stray fill lines)
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        }

        // Flush final bucket
        if (prevBucket !== -999) {
            ctx.fillStyle = `hsla(${this._h(200 + prevBucket + BUCKET * 0.5)},85%,${eLum}%,${eAlp})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 18. Laser web ───────────────────────────────────────────────────
    _drawLaserWeb(ctx, W, H, energy) {
        const cx       = this._cx(W);
        const cy       = this._cy(H);
        const numPts   = 12;
        const baseR    = Math.min(W, H) * 0.28 * this.vizSize;
        const rot      = this._lissTime * 0.18;

        // Vertex positions, radius modulated by freq
        const pts = [];
        for (let i = 0; i < numPts; i++) {
            const angle  = (i / numPts) * Math.PI * 2 + rot;
            const binIdx = Math.floor((i / numPts) * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;
            const r      = baseR * (0.65 + v * 0.55);
            pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, v, i });
        }

        ctx.globalCompositeOperation = 'lighter';

        // Lines between every pair of vertices
        for (let a = 0; a < numPts; a++) {
            for (let b = a + 1; b < numPts; b++) {
                const pa  = pts[a], pb = pts[b];
                const avg = (pa.v + pb.v) * 0.5;
                if (avg < 0.03) continue;
                const hue = this._h(160 + (a / numPts) * 200);
                ctx.strokeStyle = `hsla(${hue},100%,${60 + avg*30}%,${avg * 0.65})`;
                ctx.lineWidth   = 0.5 + avg * 2;
                ctx.shadowBlur  = avg * 14;
                ctx.shadowColor = `hsl(${hue},100%,70%)`;
                ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
            }
        }

        // Glowing vertex dots
        for (const p of pts) {
            if (p.v < 0.04) continue;
            const hue = this._h(160 + (p.i / numPts) * 200);
            const g   = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
            g.addColorStop(0, `hsla(${hue},100%,92%,${p.v})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 20. Matrix Rain ──────────────────────────────────────────────────
    _drawMatrixRain(ctx, W, H, energy) {
        const colW   = 18 * this.vizSize;
        const cols   = Math.ceil(W / colW);
        const chars  = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

        // Init columns lazily
        if (this._matrixColumns.length !== cols) {
            this._matrixColumns = Array.from({ length: cols }, () => ({
                y: Math.random() * H,
                speed: 2 + Math.random() * 4,
                chars: Array.from({ length: 30 }, () => chars[Math.floor(Math.random() * chars.length)]),
            }));
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.font = `${Math.round(14 * this.vizSize)}px monospace`;
        ctx.textAlign = 'center';

        for (let c = 0; c < cols; c++) {
            const col    = this._matrixColumns[c];
            const binIdx = Math.floor((c / cols) * this.freqBins * 0.7);
            const v      = this.freqData[binIdx] / 255;

            col.y += col.speed * (0.5 + v * 3 + energy * 2);
            if (col.y > H + 400) { col.y = -200; col.speed = 2 + Math.random() * 4; }

            // Occasionally swap a character
            if (Math.random() < 0.04) {
                const idx = Math.floor(Math.random() * col.chars.length);
                col.chars[idx] = chars[Math.floor(Math.random() * chars.length)];
            }

            const x = c * colW + colW * 0.5;
            for (let i = 0; i < col.chars.length; i++) {
                const y     = col.y - i * colW;
                if (y < -20 || y > H + 20) continue;
                const fade  = Math.max(0, 1 - i / col.chars.length);
                const hue   = this._h(140 + v * 40);
                const alpha = fade * (0.3 + v * 0.7);
                ctx.fillStyle = i === 0
                    ? `hsla(${hue},100%,95%,${alpha})`
                    : `hsla(${hue},100%,${55 + fade * 30}%,${alpha * 0.7})`;
                if (i === 0) { ctx.shadowBlur = 12; ctx.shadowColor = `hsl(${hue},100%,70%)`; }
                else ctx.shadowBlur = 0;
                ctx.fillText(col.chars[i], x, y);
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 21. Pulse Grid ──────────────────────────────────────────────────
    _drawPulseGrid(ctx, W, H, energy) {
        this._pulseGridPhase += 0.02 + energy * 0.06;
        const spacing = Math.max(20, 40 * this.vizSize);
        const cols = Math.ceil(W / spacing) + 1;
        const rows = Math.ceil(H / spacing) + 1;
        const cx   = this._cx(W);
        const cy   = this._cy(H);

        ctx.globalCompositeOperation = 'lighter';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * spacing;
                const y = r * spacing;
                const dx = x - cx, dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.sqrt(cx * cx + cy * cy);

                const binIdx = Math.floor((dist / maxDist) * this.freqBins * 0.65);
                const v      = this.freqData[Math.min(binIdx, this.freqBins - 1)] / 255;

                const wave   = Math.sin(dist * 0.015 - this._pulseGridPhase) * 0.5 + 0.5;
                const pulse  = v * wave;
                if (pulse < 0.02) continue;

                const radius = (2 + pulse * 8) * this.vizSize;
                const hue    = this._h(200 + (dist / maxDist) * 160);
                const alpha  = 0.2 + pulse * 0.8;

                ctx.fillStyle = `hsla(${hue},90%,${55 + pulse * 40}%,${alpha})`;
                ctx.shadowBlur  = pulse * 16;
                ctx.shadowColor = `hsl(${hue},100%,70%)`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 22. Spiral Galaxy ───────────────────────────────────────────────
    _initSpiralGalaxy(W, H) {
        const count = Math.round(600 * this.vizSize);
        this._spiralParticles = Array.from({ length: count }, (_, i) => {
            const arm    = i % 3;
            const t      = (i / count) * 6;
            const angle  = t * Math.PI * 2 + arm * (Math.PI * 2 / 3);
            const radius = t * 0.12;
            return {
                angle, radius, arm,
                x: 0, y: 0,
                baseHue: arm * 40,
                size: 0.5 + Math.random() * 1.5,
                drift: (Math.random() - 0.5) * 0.02,
                bin: Math.floor((i / count) * this.freqBins * 0.65),
            };
        });
    }

    _drawSpiralGalaxy(ctx, W, H, energy) {
        if (!this._spiralParticles.length) this._initSpiralGalaxy(W, H);
        const cx   = this._cx(W);
        const cy   = this._cy(H);
        const maxR = Math.min(W, H) * 0.42 * this.vizSize;
        const rot  = this._lissTime * 0.15;

        ctx.globalCompositeOperation = 'lighter';

        for (const p of this._spiralParticles) {
            const v = this.freqData[p.bin] / 255;
            p.angle += 0.003 + v * 0.015 + p.drift;
            const r  = p.radius * maxR * (0.8 + v * 0.4);
            p.x = cx + Math.cos(p.angle + rot) * r;
            p.y = cy + Math.sin(p.angle + rot) * r;

            const hue    = this._h(220 + p.baseHue + v * 60);
            const radius = Math.max(1, (1.5 + v * 3) * p.size);
            const alpha  = 0.25 + v * 0.7;

            ctx.fillStyle = `hsla(${hue},85%,${65 + v * 30}%,${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Core glow
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15);
        cg.addColorStop(0, `hsla(${this._h(240)},100%,90%,${0.4 + energy * 0.5})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.15, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 23. Terrain ─────────────────────────────────────────────────────
    _drawTerrain(ctx, W, H, energy) {
        const rows    = 24;
        const cols    = 96;
        const rowH    = H * 0.6 / rows;
        const baseY   = this._cy(H) + H * 0.15;
        const amp     = H * 0.25 * this.vizSize;

        ctx.globalCompositeOperation = 'lighter';

        for (let r = rows - 1; r >= 0; r--) {
            const depth = r / rows; // 0 = front, 1 = back
            const y0    = baseY - r * rowH * 0.6;
            const hue   = this._h(200 + depth * 80);
            const alpha = 0.3 + (1 - depth) * 0.7;

            ctx.beginPath();
            ctx.moveTo(0, y0);
            for (let c = 0; c <= cols; c++) {
                const x = (c / cols) * W;
                const binIdx = Math.floor((c / cols) * this.freqBins * 0.7);
                const freqRow = Math.min(this.freqBins - 1, binIdx + Math.floor(depth * this.freqBins * 0.2));
                const v = this.freqData[freqRow] / 255;
                const h = v * amp * (1 - depth * 0.6);
                ctx.lineTo(x, y0 - h);
            }
            ctx.lineTo(W, y0);

            ctx.strokeStyle = `hsla(${hue},90%,${55 + (1-depth)*35}%,${alpha})`;
            ctx.lineWidth   = 1 + (1 - depth) * 2;
            ctx.stroke();

            // Fill below line with dim gradient
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fillStyle = `hsla(${hue},60%,15%,${alpha * 0.15})`;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 24. Plasma Globe ────────────────────────────────────────────────
    _drawPlasmaGlobe(ctx, W, H, energy) {
        const cx     = this._cx(W);
        const cy     = this._cy(H);
        const globeR = Math.min(W, H) * 0.25 * this.vizSize;
        const numArcs = 8;
        const t       = this._lissTime;

        ctx.globalCompositeOperation = 'lighter';

        // Globe outline
        ctx.strokeStyle = `hsla(${this._h(260)},80%,40%,0.25)`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, globeR, 0, Math.PI * 2); ctx.stroke();

        // Inner glow
        const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, globeR * 0.3);
        ig.addColorStop(0, `hsla(${this._h(280)},100%,85%,${0.15 + energy * 0.3})`);
        ig.addColorStop(1, 'transparent');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(cx, cy, globeR * 0.3, 0, Math.PI * 2); ctx.fill();

        // Lightning arcs
        for (let a = 0; a < numArcs; a++) {
            const binIdx  = Math.floor((a / numArcs) * this.freqBins * 0.6);
            const v       = this.freqData[binIdx] / 255;
            if (v < 0.08) continue;

            const baseAng = (a / numArcs) * Math.PI * 2 + t * (0.3 + a * 0.05);
            const endX    = cx + Math.cos(baseAng) * globeR * (0.7 + v * 0.3);
            const endY    = cy + Math.sin(baseAng) * globeR * (0.7 + v * 0.3);
            const segs    = 8 + Math.floor(v * 8);
            const hue     = this._h(240 + a * 20 + v * 40);

            ctx.strokeStyle = `hsla(${hue},100%,${60 + v * 35}%,${0.4 + v * 0.6})`;
            ctx.lineWidth   = 1 + v * 3;
            ctx.shadowBlur  = 10 + v * 20;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            for (let s = 1; s <= segs; s++) {
                const frac = s / segs;
                const lx = cx + (endX - cx) * frac + (Math.random() - 0.5) * 30 * v * (1 - frac);
                const ly = cy + (endY - cy) * frac + (Math.random() - 0.5) * 30 * v * (1 - frac);
                ctx.lineTo(lx, ly);
            }
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 25. Particle Fountain ───────────────────────────────────────────
    _drawFountain(ctx, W, H, energy, dt) {
        const cx = this._cx(W);
        const baseY = this._cy(H) + H * 0.2;
        const maxParts = Math.round(400 * this.vizSize);

        // Spawn particles
        const spawnRate = Math.floor(3 + energy * 15);
        for (let i = 0; i < spawnRate && this._fountainParticles.length < maxParts; i++) {
            const binIdx = Math.floor(Math.random() * this.freqBins * 0.7);
            const v = this.freqData[binIdx] / 255;
            this._fountainParticles.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: baseY,
                vx: (Math.random() - 0.5) * 4 * (1 + energy),
                vy: -(4 + v * 12 + energy * 6),
                life: 1.0,
                decay: 0.008 + Math.random() * 0.012,
                hue: Math.random() * 60,
                size: 1 + Math.random() * 2,
            });
        }

        ctx.globalCompositeOperation = 'lighter';

        for (let i = this._fountainParticles.length - 1; i >= 0; i--) {
            const p = this._fountainParticles[i];
            p.vy += 0.18; // gravity
            p.x  += p.vx;
            p.y  += p.vy;
            p.life -= p.decay;

            if (p.life <= 0 || p.y > H + 20) {
                this._fountainParticles.splice(i, 1);
                continue;
            }

            const hue    = this._h(200 + p.hue);
            const radius = Math.max(0.8, p.size * p.life * this.vizSize);
            const alpha  = p.life * (0.5 + energy * 0.5);

            ctx.fillStyle = `hsla(${hue},90%,${65 + p.life * 25}%,${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Base glow
        const bg = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 30 * this.vizSize);
        bg.addColorStop(0, `hsla(${this._h(220)},100%,80%,${0.2 + energy * 0.4})`);
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(cx, baseY, 30 * this.vizSize, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 26. Radar Sweep ─────────────────────────────────────────────────
    _drawRadarSweep(ctx, W, H, energy) {
        const cx     = this._cx(W);
        const cy     = this._cy(H);
        const maxR   = Math.min(W, H) * 0.4 * this.vizSize;
        this._radarAngle += 0.015 + energy * 0.03;
        const angle  = this._radarAngle;

        ctx.globalCompositeOperation = 'lighter';

        // Concentric rings
        for (let r = 1; r <= 4; r++) {
            const radius = (r / 4) * maxR;
            ctx.strokeStyle = `hsla(${this._h(140)},80%,40%,0.15)`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
        }

        // Cross hairs
        ctx.strokeStyle = `hsla(${this._h(140)},80%,40%,0.1)`;
        ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();

        // Sweep beam (gradient arc)
        const sweepLen = Math.PI * 0.4;
        const grad = ctx.createConicGradient(angle - sweepLen, cx, cy);
        const hue  = this._h(140);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(sweepLen / (Math.PI * 2), `hsla(${hue},100%,55%,${0.25 + energy * 0.3})`);
        grad.addColorStop(sweepLen / (Math.PI * 2) + 0.001, 'transparent');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.fill();

        // Sweep line
        ctx.strokeStyle = `hsla(${hue},100%,70%,${0.6 + energy * 0.4})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8; ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Spawn blips from frequency data along sweep
        for (let b = 0; b < 8; b++) {
            const binIdx = Math.floor((b / 8) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            if (v > 0.3 && Math.random() < v * 0.15) {
                this._radarBlips.push({
                    x: cx + Math.cos(angle) * maxR * (0.2 + Math.random() * 0.75),
                    y: cy + Math.sin(angle) * maxR * (0.2 + Math.random() * 0.75),
                    life: 1.0, v,
                });
            }
        }

        // Draw + decay blips
        for (let i = this._radarBlips.length - 1; i >= 0; i--) {
            const bl = this._radarBlips[i];
            bl.life -= 0.012;
            if (bl.life <= 0) { this._radarBlips.splice(i, 1); continue; }
            const r = (3 + bl.v * 6) * this.vizSize * bl.life;
            ctx.fillStyle = `hsla(${hue},100%,70%,${bl.life * 0.8})`;
            ctx.shadowBlur = bl.life * 10; ctx.shadowColor = `hsl(${hue},100%,60%)`;
            ctx.beginPath(); ctx.arc(bl.x, bl.y, r, 0, Math.PI * 2); ctx.fill();
        }
        // Cap blip count
        if (this._radarBlips.length > 80) this._radarBlips.splice(0, this._radarBlips.length - 80);

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 27. Prism Shards ────────────────────────────────────────────────
    _drawPrismShards(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.38 * this.vizSize;
        const t = this._lissTime;
        const numShards = 18;

        ctx.globalCompositeOperation = 'lighter';

        // Central prism core
        const coreR = maxR * 0.12 * (1 + energy * 0.5);
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
        cg.addColorStop(0, `hsla(${this._h(0)},0%,100%,${0.5 + energy * 0.4})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2); ctx.fill();

        for (let i = 0; i < numShards; i++) {
            const binIdx = Math.floor((i / numShards) * this.freqBins * 0.7);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.02) continue;

            const angle = (i / numShards) * Math.PI * 2 + t * 0.12;
            const len = maxR * (0.3 + v * 0.7);
            const spread = 0.06 + v * 0.08;
            const hue = this._h((i / numShards) * 360);

            // Triangular shard
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle - spread) * len, cy + Math.sin(angle - spread) * len);
            ctx.lineTo(cx + Math.cos(angle + spread) * len, cy + Math.sin(angle + spread) * len);
            ctx.closePath();

            const grad = ctx.createLinearGradient(cx, cy,
                cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            grad.addColorStop(0, `hsla(${hue},100%,95%,${v * 0.6})`);
            grad.addColorStop(0.4, `hsla(${hue},100%,65%,${v * 0.4})`);
            grad.addColorStop(1, `hsla(${hue},100%,50%,0)`);
            ctx.fillStyle = grad;
            ctx.fill();

            // Edge glow
            ctx.strokeStyle = `hsla(${hue},100%,80%,${v * 0.7})`;
            ctx.lineWidth = 1 + v * 1.5;
            ctx.shadowBlur = 8 + v * 16;
            ctx.shadowColor = `hsl(${hue},100%,70%)`;
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 28. Smoke Rings ─────────────────────────────────────────────────
    _drawSmokeRings(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.max(W, H) * 0.6 * this.vizSize;
        const dt = 0.016;

        // Spawn on energy spikes
        if (energy > this._smokeRingLastE + 0.06 && energy > 0.1 && this._smokeRingsList.length < 20) {
            this._smokeRingsList.push({
                r: 10 + Math.random() * 30,
                alpha: 0.7 + energy * 0.3,
                hue: this._h((this._lissTime * 80) % 360),
                speed: 60 + energy * 180,
                width: 8 + energy * 20,
                wobble: Math.random() * Math.PI * 2,
                wobbleAmp: 3 + Math.random() * 8,
            });
        }
        this._smokeRingLastE = this._smokeRingLastE * 0.9 + energy * 0.1;

        ctx.globalCompositeOperation = 'lighter';

        // Frequency-mapped standing concentric rings
        const bands = 6;
        for (let b = 0; b < bands; b++) {
            const binIdx = Math.floor((b / bands) * this.freqBins * 0.5);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.03) continue;
            const r = (b / bands) * maxR * 0.4 + v * maxR * 0.08;
            const hue = this._h(200 + b * 30);
            ctx.strokeStyle = `hsla(${hue},60%,${50 + v * 30}%,${v * 0.25})`;
            ctx.lineWidth = 6 + v * 10;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }

        // Expanding smoke rings
        for (let i = this._smokeRingsList.length - 1; i >= 0; i--) {
            const ring = this._smokeRingsList[i];
            ring.r += ring.speed * dt;
            ring.alpha -= dt * 0.6;
            ring.wobble += 0.04;
            if (ring.alpha <= 0 || ring.r > maxR) { this._smokeRingsList.splice(i, 1); continue; }

            ctx.lineWidth = ring.width * ring.alpha;
            ctx.strokeStyle = `hsla(${ring.hue},50%,65%,${ring.alpha * 0.5})`;

            // Wobbly ring via bezier approximation
            const segs = 32;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const wobR = ring.r + Math.sin(a * 3 + ring.wobble) * ring.wobbleAmp * ring.alpha;
                const px = cx + Math.cos(a) * wobR;
                const py = cy + Math.sin(a) * wobR;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 29. EKG Monitor ─────────────────────────────────────────────────
    _drawEKGMonitor(ctx, W, H, energy) {
        const numLeads = 4;
        const leadH = (H * 0.7 * this.vizSize) / numLeads;
        const baseY = this._cy(H) - (numLeads * leadH) / 2;
        const hues = [140, 60, 340, 200];

        ctx.globalCompositeOperation = 'lighter';

        for (let lead = 0; lead < numLeads; lead++) {
            const cy = baseY + lead * leadH + leadH * 0.5;
            const binStart = Math.floor((lead / numLeads) * this.freqBins * 0.6);
            const binEnd = Math.floor(((lead + 1) / numLeads) * this.freqBins * 0.6);
            const hue = this._h(hues[lead]);

            // Grid lines
            ctx.strokeStyle = `hsla(${hue},40%,25%,0.15)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
            for (let g = 0; g < 5; g++) {
                const gy = cy + (g - 2) * (leadH * 0.2);
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
            }

            // EKG trace
            const step = W / 512;
            ctx.strokeStyle = `hsla(${hue},100%,65%,0.9)`;
            ctx.lineWidth = 2 * this.vizSize;
            ctx.shadowBlur = 6 + energy * 12;
            ctx.shadowColor = `hsl(${hue},100%,60%)`;
            ctx.beginPath();

            for (let i = 0; i < 512; i++) {
                const tIdx = Math.floor(i * (this.fftSize / 512));
                const waveVal = this.timeData[tIdx] / 128 - 1;
                const fIdx = Math.min(this.freqBins - 1, binStart + Math.floor((i / 512) * (binEnd - binStart)));
                const freqMod = this.freqData[fIdx] / 255;
                const amp = leadH * 0.35 * (0.3 + freqMod * 0.7);
                const y = cy + waveVal * amp;
                i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
            }
            ctx.stroke();

            // Lead label
            ctx.shadowBlur = 0;
            ctx.fillStyle = `hsla(${hue},80%,60%,0.5)`;
            ctx.font = `${10 * this.vizSize}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(`LEAD ${lead + 1}`, 8, cy - leadH * 0.35);
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 30. Butterfly Wings ─────────────────────────────────────────────
    _drawButterfly(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.4 * this.vizSize;
        const t = this._lissTime;
        const numPts = 180;

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(cx, cy);

        // Draw two mirrored wings
        for (let mirror = -1; mirror <= 1; mirror += 2) {
            ctx.beginPath();
            for (let i = 0; i <= numPts; i++) {
                const frac = i / numPts;
                const angle = frac * Math.PI;
                const binIdx = Math.floor(frac * this.freqBins * 0.65);
                const v = this.freqData[binIdx] / 255;

                // Butterfly curve (r = e^sin(θ) - 2cos(4θ) + sin^5((2θ-π)/24))
                const theta = angle + t * 0.3;
                const bfly = Math.exp(Math.sin(theta)) - 2 * Math.cos(4 * theta) +
                    Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5);
                const r = maxR * 0.22 * bfly * (0.6 + v * 0.6);

                const px = mirror * Math.cos(angle) * r;
                const py = -Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }

            const hue = this._h(mirror > 0 ? 280 : 200);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.5);
            grad.addColorStop(0, `hsla(${hue},100%,80%,${0.3 + energy * 0.4})`);
            grad.addColorStop(0.6, `hsla(${(hue + 40) % 360},100%,60%,${0.15 + energy * 0.2})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = `hsla(${hue},100%,75%,${0.5 + energy * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10 + energy * 15;
            ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }

        // Body
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${this._h(260)},100%,70%)`;
        ctx.strokeStyle = `hsla(${this._h(260)},100%,80%,0.9)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, -maxR * 0.35); ctx.lineTo(0, maxR * 0.2); ctx.stroke();

        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 31. Northern Lights ─────────────────────────────────────────────
    _drawNorthernLights(ctx, W, H, energy) {
        const t = this._lissTime;
        const numCurtains = 5;
        const vizH = H * 0.7 * this.vizSize;
        const baseY = this._cy(H) - vizH * 0.3;

        ctx.globalCompositeOperation = 'lighter';

        for (let c = 0; c < numCurtains; c++) {
            const curtainHue = this._h(140 + c * 35);
            const phase = c * 1.2 + t * (0.15 + c * 0.04);
            const pts = 80;

            // Top edge
            const topPts = [];
            const botPts = [];
            for (let i = 0; i <= pts; i++) {
                const frac = i / pts;
                const x = frac * W;
                const binIdx = Math.floor(frac * this.freqBins * 0.6);
                const v = this.freqData[binIdx] / 255;

                const wave1 = Math.sin(frac * 4 + phase) * 0.3;
                const wave2 = Math.sin(frac * 7 - phase * 1.3) * 0.15;
                const wave3 = Math.sin(frac * 2.5 + phase * 0.7) * 0.2;

                const topOff = (wave1 + wave2) * vizH * 0.3 * (0.4 + v * 0.6);
                const height = vizH * (0.15 + v * 0.5 + wave3 * 0.2) * (0.6 + energy * 0.6);

                topPts.push({ x, y: baseY + topOff - c * 20 });
                botPts.push({ x, y: baseY + topOff + height - c * 20 });
            }

            // Draw curtain as filled path
            ctx.beginPath();
            ctx.moveTo(topPts[0].x, topPts[0].y);
            for (let i = 1; i <= pts; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
            for (let i = pts; i >= 0; i--) ctx.lineTo(botPts[i].x, botPts[i].y);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, baseY - vizH * 0.3, 0, baseY + vizH * 0.5);
            grad.addColorStop(0, `hsla(${curtainHue},90%,70%,${0.08 + energy * 0.1})`);
            grad.addColorStop(0.4, `hsla(${curtainHue},100%,55%,${0.04 + energy * 0.06})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 32. Frequency Flowers ───────────────────────────────────────────
    _drawFreqFlowers(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const t = this._lissTime;
        const numFlowers = 7;

        ctx.globalCompositeOperation = 'lighter';

        for (let f = 0; f < numFlowers; f++) {
            const angle = (f / numFlowers) * Math.PI * 2 + t * 0.05;
            const dist = Math.min(W, H) * 0.18 * this.vizSize * (0.5 + f * 0.12);
            const fx = cx + Math.cos(angle) * dist;
            const fy = cy + Math.sin(angle) * dist;
            const binIdx = Math.floor((f / numFlowers) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.02) continue;

            const petals = 5 + Math.floor(f * 1.3);
            const petalR = (20 + v * 50) * this.vizSize;
            const hue = this._h(f * 50 + 30);

            for (let p = 0; p < petals; p++) {
                const pa = (p / petals) * Math.PI * 2 + t * 0.3 + f;
                const px = fx + Math.cos(pa) * petalR * 0.4;
                const py = fy + Math.sin(pa) * petalR * 0.4;

                const pg = ctx.createRadialGradient(px, py, 0, px, py, petalR);
                pg.addColorStop(0, `hsla(${hue},100%,80%,${v * 0.5})`);
                pg.addColorStop(0.5, `hsla(${(hue + 30) % 360},100%,60%,${v * 0.25})`);
                pg.addColorStop(1, 'transparent');
                ctx.fillStyle = pg;
                ctx.beginPath(); ctx.arc(px, py, petalR, 0, Math.PI * 2); ctx.fill();
            }

            // Center
            const cg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8 * this.vizSize);
            cg.addColorStop(0, `hsla(${(hue + 60) % 360},100%,90%,${0.6 + v * 0.4})`);
            cg.addColorStop(1, 'transparent');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.arc(fx, fy, 8 * this.vizSize, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 33. Sine Tower ──────────────────────────────────────────────────
    _drawSineTower(ctx, W, H, energy) {
        const numLayers = 20;
        const layerH = (H * 0.7 * this.vizSize) / numLayers;
        const baseY = this._cy(H) + (numLayers * layerH) / 2;
        const t = this._lissTime;

        ctx.globalCompositeOperation = 'lighter';

        for (let l = 0; l < numLayers; l++) {
            const y = baseY - l * layerH;
            const binIdx = Math.floor((l / numLayers) * this.freqBins * 0.65);
            const v = this.freqData[binIdx] / 255;
            const hue = this._h(200 + l * 8);
            const amp = v * H * 0.08 * this.vizSize;
            const freq = 2 + l * 0.4;
            const phase = t * (0.8 + l * 0.15);

            ctx.beginPath();
            for (let x = 0; x <= W; x += 3) {
                const frac = x / W;
                const sy = y + Math.sin(frac * freq * Math.PI + phase) * amp;
                x === 0 ? ctx.moveTo(x, sy) : ctx.lineTo(x, sy);
            }

            ctx.strokeStyle = `hsla(${hue},100%,${55 + v * 35}%,${0.3 + v * 0.6})`;
            ctx.lineWidth = 1.5 + v * 2.5;
            ctx.shadowBlur = v * 12;
            ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 34. Meteor Shower ───────────────────────────────────────────────
    _drawMeteorShower(ctx, W, H, energy, dt) {
        const maxParts = Math.round(150 * this.vizSize);

        // Spawn meteors
        const spawnRate = Math.floor(1 + energy * 8);
        for (let i = 0; i < spawnRate && this._meteorParticles.length < maxParts; i++) {
            const binIdx = Math.floor(Math.random() * this.freqBins * 0.7);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.1) continue;
            const angle = -Math.PI * 0.2 - Math.random() * Math.PI * 0.15;
            const speed = 4 + v * 14 + energy * 6;
            this._meteorParticles.push({
                x: Math.random() * W * 1.2 - W * 0.1,
                y: -20 - Math.random() * 60,
                vx: Math.cos(angle) * speed,
                vy: -Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.006 + Math.random() * 0.012,
                hue: Math.random() * 50,
                size: 1.5 + Math.random() * 2.5,
                trail: [],
            });
        }

        ctx.globalCompositeOperation = 'lighter';

        for (let i = this._meteorParticles.length - 1; i >= 0; i--) {
            const m = this._meteorParticles[i];
            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 20) m.trail.shift();

            m.vy += 0.08; // slight gravity
            m.x += m.vx;
            m.y += m.vy;
            m.life -= m.decay;

            if (m.life <= 0 || m.y > H + 30 || m.x > W + 50 || m.x < -50) {
                this._meteorParticles.splice(i, 1);
                continue;
            }

            const hue = this._h(30 + m.hue);

            // Trail
            if (m.trail.length > 1) {
                for (let t = 1; t < m.trail.length; t++) {
                    const frac = t / m.trail.length;
                    ctx.strokeStyle = `hsla(${hue},100%,${60 + frac * 30}%,${frac * m.life * 0.5})`;
                    ctx.lineWidth = m.size * frac * m.life;
                    ctx.beginPath();
                    ctx.moveTo(m.trail[t - 1].x, m.trail[t - 1].y);
                    ctx.lineTo(m.trail[t].x, m.trail[t].y);
                    ctx.stroke();
                }
            }

            // Head
            const headR = m.size * m.life * 1.5;
            const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, headR * 3);
            hg.addColorStop(0, `hsla(${hue},100%,95%,${m.life})`);
            hg.addColorStop(0.3, `hsla(${hue},100%,70%,${m.life * 0.5})`);
            hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(m.x, m.y, headR * 3, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 35. Sound Rings ─────────────────────────────────────────────────
    _drawSoundRings(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.45 * this.vizSize;
        const numRings = 12;
        const t = this._lissTime;

        ctx.globalCompositeOperation = 'lighter';

        for (let r = 0; r < numRings; r++) {
            const binIdx = Math.floor((r / numRings) * this.freqBins * 0.65);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.015) continue;

            const baseR = (r / numRings) * maxR + maxR * 0.08;
            const ringR = baseR + v * maxR * 0.06;
            const rot = t * (0.1 + r * 0.03) * (r % 2 ? 1 : -1);
            const hue = this._h(180 + r * 25);
            const segs = 64;

            // Modulated ring (radius varies with angle)
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2 + rot;
                const modFreq = 3 + r;
                const mod = 1 + Math.sin(a * modFreq + t * 2) * v * 0.3;
                const pr = ringR * mod;
                const px = cx + Math.cos(a) * pr;
                const py = cy + Math.sin(a) * pr;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.strokeStyle = `hsla(${hue},100%,${55 + v * 35}%,${0.25 + v * 0.65})`;
            ctx.lineWidth = 1.5 + v * 3;
            ctx.shadowBlur = 6 + v * 14;
            ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }

        // Center glow
        const coreV = this.freqData[0] / 255;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.1);
        cg.addColorStop(0, `hsla(${this._h(200)},100%,90%,${0.3 + coreV * 0.5 + energy * 0.3})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.1, 0, Math.PI * 2); ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 36. Neon Helix ──────────────────────────────────────────────────
    _drawNeonHelix(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const radius = Math.min(W, H) * 0.2 * this.vizSize;
        const height = H * 0.6 * this.vizSize;
        const t = this._lissTime;
        const steps = 200;
        const turns = 4;

        ctx.globalCompositeOperation = 'lighter';

        for (let strand = 0; strand < 2; strand++) {
            const phaseOff = strand * Math.PI;
            const hue = this._h(strand === 0 ? 280 : 160);

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const frac = i / steps;
                const angle = frac * turns * Math.PI * 2 + t * 0.6 + phaseOff;
                const binIdx = Math.floor(frac * this.freqBins * 0.65);
                const v = this.freqData[binIdx] / 255;

                const r = radius * (0.6 + v * 0.6);
                const px = cx + Math.cos(angle) * r;
                const py = cy - height / 2 + frac * height;
                // Depth: use sin of angle for z-sorting effect
                const depth = (Math.sin(angle) + 1) / 2;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.strokeStyle = `hsla(${hue},100%,70%,0.8)`;
            ctx.lineWidth = 2.5 * this.vizSize;
            ctx.shadowBlur = 12 + energy * 18;
            ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }

        // Rungs connecting the strands
        const rungStep = 8;
        for (let i = 0; i <= steps; i += rungStep) {
            const frac = i / steps;
            const angle = frac * turns * Math.PI * 2 + t * 0.6;
            const binIdx = Math.floor(frac * this.freqBins * 0.65);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.05) continue;

            const r = radius * (0.6 + v * 0.6);
            const py = cy - height / 2 + frac * height;
            const x1 = cx + Math.cos(angle) * r;
            const x2 = cx + Math.cos(angle + Math.PI) * r;
            const hue = this._h(220 + frac * 80);

            ctx.strokeStyle = `hsla(${hue},90%,${60 + v * 30}%,${0.2 + v * 0.5})`;
            ctx.lineWidth = 1 + v * 2;
            ctx.shadowBlur = v * 10;
            ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.beginPath(); ctx.moveTo(x1, py); ctx.lineTo(x2, py); ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 37. Gyroscope ───────────────────────────────────────────────────
    _drawGyroscope(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.35 * this.vizSize;
        const t = this._lissTime;
        const numRings = 5;
        ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < numRings; r++) {
            const binIdx = Math.floor((r / numRings) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            const ringR = maxR * (0.4 + r * 0.15) * (0.8 + v * 0.3);
            const rot = t * (0.3 + r * 0.15) * (r % 2 ? 1 : -1);
            const tilt = Math.PI * 0.1 * r + v * 0.3;
            const hue = this._h(200 + r * 45);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
            ctx.scale(1, 0.3 + Math.abs(Math.sin(tilt + t * 0.2)) * 0.7);
            ctx.strokeStyle = `hsla(${hue},100%,${60+v*30}%,${0.4+v*0.5})`;
            ctx.lineWidth = 2 + v * 3;
            ctx.shadowBlur = 8 + v * 16; ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
        cg.addColorStop(0, `hsla(${this._h(0)},0%,100%,${0.6+energy*0.4})`);
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 38. Waterfall Spectrum ──────────────────────────────────────────
    _drawWaterfall(ctx, W, H, energy) {
        const cols = 128;
        const rowH = 3 * this.vizSize;
        const maxRows = Math.ceil(H / rowH);
        if (!this._spectrumHistory.length) this._spectrumHistory = [];
        const row = new Uint8Array(cols);
        for (let i = 0; i < cols; i++) {
            row[i] = this.freqData[Math.floor((i / cols) * this.freqBins * 0.7)];
        }
        this._spectrumHistory.unshift(row);
        if (this._spectrumHistory.length > maxRows) this._spectrumHistory.length = maxRows;
        ctx.globalCompositeOperation = 'lighter';
        const colW = W / cols;
        for (let r = 0; r < this._spectrumHistory.length; r++) {
            const data = this._spectrumHistory[r];
            const y = r * rowH;
            const age = 1 - r / this._spectrumHistory.length;
            for (let c = 0; c < cols; c++) {
                const v = data[c] / 255;
                if (v < 0.02) continue;
                const hue = this._h(240 - v * 200);
                ctx.fillStyle = `hsla(${hue},100%,${40+v*50}%,${v*age*0.8})`;
                ctx.fillRect(c * colW, y, colW + 0.5, rowH);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 39. Circuit Tree ────────────────────────────────────────────────
    _drawCircuitTree(ctx, W, H, energy) {
        const cx = this._cx(W), baseY = this._cy(H) + H * 0.25 * this.vizSize;
        const t = this._lissTime;
        ctx.globalCompositeOperation = 'lighter';
        const drawBranch = (x, y, angle, depth, maxD) => {
            if (depth >= maxD) return;
            const binIdx = Math.floor((depth / maxD) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            const len = (40 + v * 60) * this.vizSize * (1 - depth * 0.12);
            const ex = x + Math.cos(angle) * len;
            const ey = y + Math.sin(angle) * len;
            const hue = this._h(180 + depth * 30);
            ctx.strokeStyle = `hsla(${hue},100%,${55+v*35}%,${0.4+v*0.5})`;
            ctx.lineWidth = (3 - depth * 0.3) * this.vizSize;
            ctx.shadowBlur = v * 12; ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
            // Node dot
            if (v > 0.15) {
                ctx.fillStyle = `hsla(${hue},100%,80%,${v})`;
                ctx.beginPath(); ctx.arc(ex, ey, 2 + v * 4, 0, Math.PI * 2); ctx.fill();
            }
            const spread = 0.4 + v * 0.4 + Math.sin(t * 0.5 + depth) * 0.15;
            drawBranch(ex, ey, angle - spread, depth + 1, maxD);
            drawBranch(ex, ey, angle + spread, depth + 1, maxD);
        };
        drawBranch(cx, baseY, -Math.PI / 2, 0, 7);
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 40. Comet Trails ────────────────────────────────────────────────
    _drawCometTrails(ctx, W, H, energy, dt) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.4 * this.vizSize;
        const maxParts = Math.round(80 * this.vizSize);
        const t = this._lissTime;
        // Spawn
        if (this._cometParticles.length < maxParts && Math.random() < 0.3 + energy * 0.5) {
            const a = Math.random() * Math.PI * 2;
            const r = maxR * (0.3 + Math.random() * 0.7);
            this._cometParticles.push({
                angle: a, radius: r, speed: 0.3 + Math.random() * 0.8 + energy * 0.5,
                life: 1.0, decay: 0.004 + Math.random() * 0.008,
                hue: Math.random() * 60, size: 1 + Math.random() * 2, trail: [],
            });
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this._cometParticles.length - 1; i >= 0; i--) {
            const c = this._cometParticles[i];
            c.angle += c.speed * 0.02;
            c.life -= c.decay;
            const px = cx + Math.cos(c.angle) * c.radius;
            const py = cy + Math.sin(c.angle) * c.radius;
            c.trail.push({ x: px, y: py }); if (c.trail.length > 30) c.trail.shift();
            if (c.life <= 0) { this._cometParticles.splice(i, 1); continue; }
            const hue = this._h(200 + c.hue);
            for (let j = 1; j < c.trail.length; j++) {
                const f = j / c.trail.length;
                ctx.strokeStyle = `hsla(${hue},100%,${60+f*30}%,${f*c.life*0.4})`;
                ctx.lineWidth = c.size * f * c.life;
                ctx.beginPath(); ctx.moveTo(c.trail[j-1].x, c.trail[j-1].y);
                ctx.lineTo(c.trail[j].x, c.trail[j].y); ctx.stroke();
            }
            const hg = ctx.createRadialGradient(px, py, 0, px, py, c.size * 4);
            hg.addColorStop(0, `hsla(${hue},100%,90%,${c.life})`);
            hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(px, py, c.size * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 41. Diamond Grid ────────────────────────────────────────────────
    _drawDiamondGrid(ctx, W, H, energy) {
        const size = Math.max(24, 48 * this.vizSize);
        const cols = Math.ceil(W / size) + 1;
        const rows = Math.ceil(H / (size * 0.7)) + 1;
        const t = this._lissTime;
        ctx.globalCompositeOperation = 'lighter';
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = c * size + (r % 2 ? size * 0.5 : 0);
                const cy = r * size * 0.7;
                const binIdx = Math.min(this.freqBins - 1, Math.floor((idx / (rows * cols)) * this.freqBins * 0.7));
                idx++;
                const v = this.freqData[binIdx] / 255;
                if (v < 0.03) continue;
                const s = size * 0.35 * (0.3 + v * 0.7);
                const hue = this._h(160 + (binIdx / this.freqBins) * 200);
                const rot = t * 0.5 + v * 2;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4 + rot * 0.05);
                ctx.strokeStyle = `hsla(${hue},100%,${55+v*35}%,${0.2+v*0.7})`;
                ctx.fillStyle = `hsla(${hue},100%,${40+v*25}%,${v*0.15})`;
                ctx.lineWidth = 1 + v * 2;
                ctx.shadowBlur = v * 12; ctx.shadowColor = `hsl(${hue},100%,65%)`;
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.restore();
            }
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 42. Firefly Field ───────────────────────────────────────────────
    _drawFireflyField(ctx, W, H, energy, dt) {
        const maxCount = Math.round(200 * this.vizSize);
        if (this._fireflies.length < maxCount) {
            for (let i = this._fireflies.length; i < maxCount; i++) {
                this._fireflies.push({
                    x: Math.random() * W, y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
                    phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.7,
                    hue: Math.random() * 40, size: 1 + Math.random() * 2,
                    bin: Math.floor(Math.random() * this.freqBins * 0.6),
                });
            }
        }
        ctx.globalCompositeOperation = 'lighter';
        for (const f of this._fireflies) {
            const v = this.freqData[f.bin] / 255;
            f.phase += 0.02 * f.speed;
            const blink = Math.pow(Math.max(0, Math.sin(f.phase)), 3);
            f.vx += (Math.random() - 0.5) * 0.2; f.vy += (Math.random() - 0.5) * 0.2;
            f.vx += (Math.random() - 0.5) * v * 2; f.vy += (Math.random() - 0.5) * v * 2;
            const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
            if (spd > 3) { f.vx = (f.vx / spd) * 3; f.vy = (f.vy / spd) * 3; }
            f.vx *= 0.98; f.vy *= 0.98;
            f.x += f.vx; f.y += f.vy;
            if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
            if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;
            const alpha = blink * (0.3 + v * 0.7);
            if (alpha < 0.02) continue;
            const hue = this._h(80 + f.hue);
            const r = f.size * (1 + v * 2) * blink;
            const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 4);
            g.addColorStop(0, `hsla(${hue},100%,85%,${alpha})`);
            g.addColorStop(0.4, `hsla(${hue},100%,60%,${alpha * 0.4})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 43. Shockwave ───────────────────────────────────────────────────
    _drawShockwave(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.max(W, H) * 0.7 * this.vizSize;
        const dt = 0.016;
        if (energy > this._shockLastE + 0.08 && energy > 0.15 && this._shockwaves.length < 12) {
            this._shockwaves.push({
                r: 5, alpha: 1.0, hue: this._h((this._lissTime * 100) % 360),
                speed: 120 + energy * 350, width: 3 + energy * 12,
            });
        }
        this._shockLastE = this._shockLastE * 0.85 + energy * 0.15;
        ctx.globalCompositeOperation = 'lighter';
        // Energy orb at center
        const orbR = 15 + energy * 30;
        const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * this.vizSize);
        og.addColorStop(0, `hsla(${this._h(40)},100%,90%,${0.5+energy*0.5})`);
        og.addColorStop(0.5, `hsla(${this._h(20)},100%,60%,${0.2+energy*0.3})`);
        og.addColorStop(1, 'transparent');
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, orbR * this.vizSize, 0, Math.PI * 2); ctx.fill();
        for (let i = this._shockwaves.length - 1; i >= 0; i--) {
            const s = this._shockwaves[i];
            s.r += s.speed * dt; s.alpha -= dt * 0.8;
            if (s.alpha <= 0 || s.r > maxR) { this._shockwaves.splice(i, 1); continue; }
            ctx.strokeStyle = `hsla(${s.hue},100%,70%,${s.alpha})`;
            ctx.lineWidth = s.width * s.alpha;
            ctx.shadowBlur = 15 * s.alpha; ctx.shadowColor = `hsl(${s.hue},100%,65%)`;
            ctx.beginPath(); ctx.arc(cx, cy, s.r, 0, Math.PI * 2); ctx.stroke();
            // Inner distortion ring
            ctx.strokeStyle = `hsla(${(s.hue+60)%360},100%,85%,${s.alpha*0.3})`;
            ctx.lineWidth = s.width * 0.4 * s.alpha;
            ctx.beginPath(); ctx.arc(cx, cy, s.r * 0.85, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 44. Vinyl Grooves ───────────────────────────────────────────────
    _drawVinylGrooves(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.42 * this.vizSize;
        const t = this._lissTime;
        const grooves = 30;
        ctx.globalCompositeOperation = 'lighter';
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.08);
        for (let g = 0; g < grooves; g++) {
            const r = (g / grooves) * maxR + maxR * 0.1;
            const binIdx = Math.floor((g / grooves) * this.freqBins * 0.65);
            const v = this.freqData[binIdx] / 255;
            const hue = this._h(30 + g * 3);
            const segs = 90;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const wobble = Math.sin(a * (4 + g * 0.5) + t) * v * 6;
                const pr = r + wobble;
                const px = Math.cos(a) * pr, py = Math.sin(a) * pr;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${hue},40%,${35+v*40}%,${0.15+v*0.5})`;
            ctx.lineWidth = 1 + v * 1.5;
            ctx.stroke();
        }
        // Label
        const lg = ctx.createRadialGradient(0, 0, maxR * 0.06, 0, 0, maxR * 0.15);
        lg.addColorStop(0, `hsla(${this._h(0)},100%,95%,${0.4+energy*0.4})`);
        lg.addColorStop(1, 'transparent');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, maxR * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 45. Ember Fall ──────────────────────────────────────────────────
    _drawEmberFall(ctx, W, H, energy, dt) {
        const maxParts = Math.round(250 * this.vizSize);
        const spawnRate = Math.floor(2 + energy * 10);
        for (let i = 0; i < spawnRate && this._embers.length < maxParts; i++) {
            this._embers.push({
                x: Math.random() * W, y: H + 10 + Math.random() * 20,
                vx: (Math.random() - 0.5) * 2, vy: -(1.5 + Math.random() * 3 + energy * 3),
                life: 1.0, decay: 0.005 + Math.random() * 0.01,
                hue: Math.random() * 40, size: 1 + Math.random() * 2,
            });
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this._embers.length - 1; i >= 0; i--) {
            const e = this._embers[i];
            e.vx += (Math.random() - 0.5) * 0.3;
            e.vy += -0.02;
            e.x += e.vx; e.y += e.vy; e.life -= e.decay;
            if (e.life <= 0 || e.y < -20) { this._embers.splice(i, 1); continue; }
            const hue = this._h(15 + e.hue);
            const r = e.size * e.life;
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 5);
            g.addColorStop(0, `hsla(${hue},100%,85%,${e.life})`);
            g.addColorStop(0.3, `hsla(${hue},100%,55%,${e.life * 0.5})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, r * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 46. Audio Morph ─────────────────────────────────────────────────
    _drawAudioMorph(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.35 * this.vizSize;
        const t = this._lissTime;
        this._morphPhase += 0.008 + energy * 0.02;
        const morphState = this._morphPhase % 3;
        const segs = 128;
        ctx.globalCompositeOperation = 'lighter';
        for (let layer = 0; layer < 3; layer++) {
            const hue = this._h(200 + layer * 60);
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const binIdx = Math.floor((s / segs) * this.freqBins * 0.6);
                const v = this.freqData[binIdx] / 255;
                let r;
                if (morphState < 1) {
                    const blend = morphState;
                    const circle = maxR * (0.5 + v * 0.4);
                    const star = maxR * (0.3 + v * 0.5) * (0.6 + Math.abs(Math.sin(a * 5 + t)) * 0.5);
                    r = circle * (1 - blend) + star * blend;
                } else if (morphState < 2) {
                    const blend = morphState - 1;
                    const star = maxR * (0.3 + v * 0.5) * (0.6 + Math.abs(Math.sin(a * 5 + t)) * 0.5);
                    const flower = maxR * (0.3 + v * 0.4) * (0.5 + Math.abs(Math.cos(a * 3 + t * 0.5)) * 0.5);
                    r = star * (1 - blend) + flower * blend;
                } else {
                    const blend = morphState - 2;
                    const flower = maxR * (0.3 + v * 0.4) * (0.5 + Math.abs(Math.cos(a * 3 + t * 0.5)) * 0.5);
                    const circle = maxR * (0.5 + v * 0.4);
                    r = flower * (1 - blend) + circle * blend;
                }
                r += layer * 8;
                const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${hue},100%,${60+energy*30}%,${0.3+energy*0.4})`;
            ctx.lineWidth = 2 - layer * 0.3;
            ctx.shadowBlur = 8 + energy * 12; ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 47. Ribbon Dance ────────────────────────────────────────────────
    _drawRibbonDance(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.4 * this.vizSize;
        const t = this._lissTime;
        const numRibbons = 6;
        ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < numRibbons; r++) {
            const hue = this._h(260 + r * 40);
            const binIdx = Math.floor((r / numRibbons) * this.freqBins * 0.5);
            const v = this.freqData[binIdx] / 255;
            const pts = 100;
            ctx.beginPath();
            for (let i = 0; i <= pts; i++) {
                const frac = i / pts;
                const a = frac * Math.PI * 4 + t * (0.3 + r * 0.1) + r * 1.2;
                const rad = maxR * (0.2 + frac * 0.6) * (0.5 + v * 0.6);
                const px = cx + Math.cos(a) * rad;
                const yWave = Math.sin(frac * Math.PI * 3 + t + r) * maxR * 0.3 * v;
                const py = cy + Math.sin(a) * rad * 0.3 + yWave;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `hsla(${hue},100%,${60+v*30}%,${0.25+v*0.5})`;
            ctx.lineWidth = 2 + v * 4;
            ctx.shadowBlur = 6 + v * 12; ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 48. Spectro Fall ────────────────────────────────────────────────
    _drawSpectroFall(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.min(W, H) * 0.4 * this.vizSize;
        const t = this._lissTime;
        const bands = 48;
        ctx.globalCompositeOperation = 'lighter';
        for (let b = 0; b < bands; b++) {
            const binIdx = Math.floor((b / bands) * this.freqBins * 0.7);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.02) continue;
            const x = (b / bands) * W;
            const barW = W / bands;
            const barH = v * H * 0.6 * this.vizSize;
            const hue = this._h(180 + (b / bands) * 160);
            const grad = ctx.createLinearGradient(x, H, x, H - barH);
            grad.addColorStop(0, `hsla(${hue},100%,60%,${v * 0.8})`);
            grad.addColorStop(0.5, `hsla(${(hue+30)%360},100%,70%,${v * 0.5})`);
            grad.addColorStop(1, `hsla(${(hue+60)%360},100%,80%,0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, H - barH, barW - 1, barH);
            // Top cap glow
            if (v > 0.2) {
                ctx.fillStyle = `hsla(${hue},100%,90%,${v * 0.7})`;
                ctx.fillRect(x, H - barH - 3, barW - 1, 3);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 49. Pendulum Wave ───────────────────────────────────────────────
    _drawPendulumWave(ctx, W, H, energy) {
        const cx = this._cx(W);
        const anchorY = this._cy(H) - H * 0.3 * this.vizSize;
        const t = this._lissTime;
        const numPendulums = 24;
        const maxLen = H * 0.45 * this.vizSize;
        ctx.globalCompositeOperation = 'lighter';
        for (let p = 0; p < numPendulums; p++) {
            const binIdx = Math.floor((p / numPendulums) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            const freq = 0.8 + p * 0.07;
            const len = maxLen * (0.4 + (p / numPendulums) * 0.6);
            const swing = (0.3 + v * 0.7 + energy * 0.3) * Math.sin(t * freq);
            const bobX = cx + (p - numPendulums / 2) * (W / (numPendulums + 2));
            const bobY = anchorY + len;
            const pendX = bobX + Math.sin(swing) * len * 0.4;
            const pendY = anchorY + Math.cos(swing) * len;
            const hue = this._h(200 + p * 7);
            // String
            ctx.strokeStyle = `hsla(${hue},60%,50%,0.25)`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(bobX, anchorY); ctx.lineTo(pendX, pendY); ctx.stroke();
            // Bob
            const r = (4 + v * 8) * this.vizSize;
            const bg = ctx.createRadialGradient(pendX, pendY, 0, pendX, pendY, r * 2);
            bg.addColorStop(0, `hsla(${hue},100%,80%,${0.5+v*0.5})`);
            bg.addColorStop(0.5, `hsla(${hue},100%,60%,${0.2+v*0.3})`);
            bg.addColorStop(1, 'transparent');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(pendX, pendY, r * 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 50. Sun Rays ────────────────────────────────────────────────────
    _drawSunRays(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const maxR = Math.max(W, H) * 0.55 * this.vizSize;
        const t = this._lissTime;
        const numRays = 36;
        ctx.globalCompositeOperation = 'lighter';
        // Core sun
        const coreR = 30 * this.vizSize * (1 + energy * 0.3);
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
        sg.addColorStop(0, `hsla(${this._h(45)},100%,95%,${0.7+energy*0.3})`);
        sg.addColorStop(0.3, `hsla(${this._h(35)},100%,70%,${0.3+energy*0.2})`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2); ctx.fill();
        for (let r = 0; r < numRays; r++) {
            const binIdx = Math.floor((r / numRays) * this.freqBins * 0.7);
            const v = this.freqData[binIdx] / 255;
            if (v < 0.03) continue;
            const angle = (r / numRays) * Math.PI * 2 + t * 0.03;
            const len = maxR * (0.2 + v * 0.8);
            const spread = 0.025 + v * 0.04;
            const hue = this._h(30 + r * 2);
            const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            grad.addColorStop(0, `hsla(${hue},100%,80%,${v * 0.6})`);
            grad.addColorStop(0.3, `hsla(${hue},100%,60%,${v * 0.3})`);
            grad.addColorStop(1, 'transparent');
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle - spread) * len, cy + Math.sin(angle - spread) * len);
            ctx.lineTo(cx + Math.cos(angle + spread) * len, cy + Math.sin(angle + spread) * len);
            ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── 51. Wave Tunnel ─────────────────────────────────────────────────
    _drawWaveTunnel(ctx, W, H, energy) {
        const cx = this._cx(W), cy = this._cy(H);
        const t = this._lissTime;
        const numRings = 20;
        const maxR = Math.min(W, H) * 0.45 * this.vizSize;
        ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < numRings; r++) {
            const depth = (r + (t * 2) % 1) / numRings;
            const binIdx = Math.floor((r / numRings) * this.freqBins * 0.6);
            const v = this.freqData[binIdx] / 255;
            const ringR = maxR * depth * (0.8 + v * 0.3);
            const alpha = (1 - depth) * (0.3 + v * 0.6);
            if (alpha < 0.01) continue;
            const hue = this._h(240 + depth * 120);
            const segs = 48;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2 + t * 0.15 * (r % 2 ? 1 : -1);
                const mod = 1 + Math.sin(a * 6 + t * 2 + r) * v * 0.25;
                const pr = ringR * mod;
                const px = cx + Math.cos(a) * pr, py = cy + Math.sin(a) * pr;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = `hsla(${hue},100%,${55+v*35}%,${alpha})`;
            ctx.lineWidth = 1 + (1 - depth) * 3;
            ctx.shadowBlur = v * 10; ctx.shadowColor = `hsl(${hue},100%,65%)`;
            ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
    }
}
