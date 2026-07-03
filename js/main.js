/**
 * Harmonia â€” Main Application
 * Wires everything together: math engine, synth, visuals, controls.
 * The animation loop ensures honest coupling every frame.
 */

import { MathEngine } from './math/MathEngine.js';
import { ScaleManager } from './audio/ScaleManager.js';
import { SynthEngine } from './audio/SynthEngine.js';
import { Renderer } from './visual/Renderer.js';
import { FlowFieldMode } from './visual/FlowFieldMode.js';
import { AttractorMode } from './visual/AttractorMode.js';
import { WaveMode } from './visual/WaveMode.js';
import { LissajousMode } from './visual/LissajousMode.js';
import { PendulumMode } from './visual/PendulumMode.js';
import { StringMode } from './visual/StringMode.js';
import { CymaticsMode } from './visual/CymaticsMode.js';
import { InterferenceMode } from './visual/InterferenceMode.js';
import { LightningMode } from './visual/LightningMode.js';
import { MoireMode } from './visual/MoireMode.js';
import { ReactionDiffusionMode } from './visual/ReactionDiffusionMode.js';
import { PianoMode } from './visual/PianoMode.js';

import { Cycloid3DMode } from './visual/SpirographMode.js';
import { NeuralFungalMode } from './visual/MyceliumMode.js';
import { SpectralTunnelMode } from './visual/SpectrogramMode.js';

import { MetaballsMode } from './visual/MetaballsMode.js';
import { StardustMode } from './visual/StardustMode.js';
import { PlasmaMode } from './visual/PlasmaMode.js';
import { VortexMode } from './visual/VortexMode.js';
import { HypercubeMode } from './visual/HypercubeMode.js';
import { GlowWormMode } from './visual/GlowWormMode.js';
import { NebulaMode } from './visual/NebulaMode.js';

import { BoidsMode } from './visual/BoidsMode.js';
import { VoronoiMode } from './visual/VoronoiMode.js';
import { KaleidoscopeMode } from './visual/KaleidoscopeMode.js';
import { SuperformulaMode } from './visual/SuperformulaMode.js';
import { MagneticMode } from './visual/MagneticMode.js';
import { ConstellationMode } from './visual/ConstellationMode.js';
import { WebMode } from './visual/WebMode.js';
import { LSystemMode } from './visual/LSystemMode.js';
import { CliffordMode } from './visual/CliffordMode.js';
import { IFSMode } from './visual/IFSMode.js';

// Infinite Horizon: Abstract Phenomena
import { QuantumMode } from './visual/QuantumMode.js';
import { GravityMode } from './visual/GravityMode.js';
import { SolarFlareMode } from './visual/SolarFlareMode.js';
import { FissionMode } from './visual/FissionMode.js';
import { BiolumeMode } from './visual/BiolumeMode.js';
import { InkWashMode } from './visual/InkWashMode.js';
import { SupernovaMode } from './visual/SupernovaMode.js';
import { AuraMode } from './visual/AuraMode.js';

// Infinite Horizon: Digital Dreams
import { VoxelsMode } from './visual/VoxelsMode.js';
import { CyberSpireMode } from './visual/CyberSpireMode.js';
import { GlitchMode } from './visual/GlitchMode.js';
import { PhaseMode } from './visual/PhaseMode.js';
import { CircuitMode } from './visual/CircuitMode.js';
import { MandalaMode } from './visual/MandalaMode.js';
import { FluidMode } from './visual/FluidMode.js';
import { GravityAttractorMode } from './visual/GravityAttractorMode.js';
import { SmokeMode } from './visual/SmokeMode.js';
import { WaveformMode } from './visual/WaveformMode.js';
import { TilingMode } from './visual/TilingMode.js';
import { PolytopeMode } from './visual/PolytopeMode.js';
import { Spirograph3DMode } from './visual/Spirograph3DMode.js';
import { IsogridMode } from './visual/IsogridMode.js';
import { HexagonMode } from './visual/HexagonMode.js';
import { ParametricMode } from './visual/ParametricMode.js';
import { MoireSpiralMode } from './visual/MoireSpiralMode.js';
import { DigitalRainMode } from './visual/DigitalRainMode.js';
import { OceanWaveMode } from './visual/OceanWaveMode.js';
import { GranularSandMode } from './visual/GranularSandMode.js';
import { CloudFieldMode } from './visual/CloudFieldMode.js';
import { LavaFlowMode } from './visual/LavaFlowMode.js';
import { VectorFieldMode } from './visual/VectorFieldMode.js';
import { GlitchGridMode } from './visual/GlitchGridMode.js';
import { RadarScanMode } from './visual/RadarScanMode.js';
import { NoteDropMode } from './visual/NoteDropMode.js';
import { BitCrushMode } from './visual/BitCrushMode.js';
import { CircuitBoardMode } from './visual/CircuitBoardMode.js';
import { SignalTraceMode } from './visual/SignalTraceMode.js';
import { PixelSortMode } from './visual/PixelSortMode.js';
import { OilSmearMode } from './visual/OilSmearMode.js';

import { MinimalistDotMode } from './visual/MinimalistDotMode.js';
import { PopArtMode } from './visual/PopArtMode.js';
import { DripTraceMode } from './visual/DripTraceMode.js';
import { BlackHoleMode } from './visual/BlackHoleMode.js';
import { WormholeMode } from './visual/WormholeMode.js';
import { QuantumStringMode } from './visual/QuantumStringMode.js';
import { HyperdriveMode } from './visual/HyperdriveMode.js';
import { NebulaGlowMode } from './visual/NebulaGlowMode.js';
import { ChronosMode } from './visual/ChronosMode.js';
import { AudioSurfaceMode } from './visual/AudioSurfaceMode.js';
import { ShadowShapeMode } from './visual/ShadowShapeMode.js';
import { ReliefMode } from './visual/ReliefMode.js';

// Ported from VideoPlayer overlays
import { DNAHelixMode } from './visual/DNAHelixMode.js';
import { FireEQMode } from './visual/FireEQMode.js';
import { GyroscopeMode } from './visual/GyroscopeMode.js';
import { VinylGroovesMode } from './visual/VinylGroovesMode.js';
import { ButterflyMode } from './visual/ButterflyMode.js';
import { WaveTunnelMode } from './visual/WaveTunnelMode.js';
import { MeteorShowerMode } from './visual/MeteorShowerMode.js';
import { PrismShardsMode } from './visual/PrismShardsMode.js';
import { SmokeRingsMode } from './visual/SmokeRingsMode.js';
import { EKGMonitorMode } from './visual/EKGMonitorMode.js';

import { PhysicsCore } from './math/PhysicsCore.js';
import { PerspectiveCore } from './math/PerspectiveCore.js';
import { CompassUI } from './ui/CompassUI.js';

import { Keyboard } from './controls/Keyboard.js';
import { Dial } from './controls/Dial.js';
import { AIPlayer } from './ai/AIPlayer.js';
import { MidiPlayer } from './audio/MidiPlayer.js';
import { FileDropHandler } from './io/FileDropHandler.js';
import { VideoPlayer } from './video/VideoPlayer.js';
import { AudioPlayer } from './audio/AudioPlayer.js';

class Harmonia {
    constructor() {
        // Core systems
        this.mathEngine = new MathEngine();
        this.scaleManager = new ScaleManager();
        this.synthEngine = new SynthEngine(this.mathEngine);

        // Visual
        this.renderer = new Renderer(document.getElementById('main-canvas'));
        this.uiCanvas = document.getElementById('ui-canvas');
        this.uiCtx = this.uiCanvas.getContext('2d');

        // Modes
        // Modes (Overhauls)
        this.cycloid3dMode = new Cycloid3DMode(this.mathEngine);
        this.fungalMode = new NeuralFungalMode(this.mathEngine);
        this.spectralMode = new SpectralTunnelMode(this.mathEngine);

        // Modes (Classics)
        this.flowFieldMode = new FlowFieldMode(this.mathEngine);
        this.attractorMode = new AttractorMode(this.mathEngine);
        this.waveMode = new WaveMode(this.mathEngine);
        this.lissajousMode = new LissajousMode(this.mathEngine);
        this.pendulumMode = new PendulumMode(this.mathEngine);
        
        // Restore pendulum audio hits
        this._pendulumCooldowns = new Float64Array(50);
        this.pendulumMode.setWallHitCallback((pendulumIndex, force) => {
            if (!this.synthEngine.initialized) return;
            const now = performance.now();
            if (now - this._pendulumCooldowns[pendulumIndex] < 100) return;
            this._pendulumCooldowns[pendulumIndex] = now;
            const midi = this.scaleManager.indexToMidi(pendulumIndex);
            const freq = this.scaleManager.midiToFrequency(midi);
            const velocity = Math.min(0.5, force * 0.45);
            const noteIdx = 1000 + pendulumIndex;
            this.synthEngine.noteOff(noteIdx);
            this.synthEngine.noteOn(noteIdx, freq, velocity);
            setTimeout(() => this.synthEngine.noteOff(noteIdx), 200);
        });

        this.stringMode = new StringMode(this.mathEngine);
        this.cymaticsMode = new CymaticsMode(this.mathEngine);
        this.interferenceMode = new InterferenceMode(this.mathEngine);
        this.lightningMode = new LightningMode(this.mathEngine);
        this.moireMode = new MoireMode(this.mathEngine);
        this.reactionDiffusionMode = new ReactionDiffusionMode(this.mathEngine);

        // Modes (New)
        this.metaballsMode = new MetaballsMode(this.mathEngine);
        this.stardustMode = new StardustMode(this.mathEngine);
        this.plasmaMode = new PlasmaMode(this.mathEngine);
        this.vortexMode = new VortexMode(this.mathEngine);
        this.hypercubeMode = new HypercubeMode(this.mathEngine);
        this.glowwormMode = new GlowWormMode(this.mathEngine);
        this.nebulaMode = new NebulaMode(this.mathEngine);

        // Modes (Updated Skeletons)
        this.boidsMode = new BoidsMode(this.mathEngine);
        this.voronoiMode = new VoronoiMode(this.mathEngine);
        this.kaleidoscopeMode = new KaleidoscopeMode(this.mathEngine);
        this.superformulaMode = new SuperformulaMode(this.mathEngine);
        this.magneticMode = new MagneticMode(this.mathEngine);
        this.constellationMode = new ConstellationMode(this.mathEngine);
        this.webMode = new WebMode(this.mathEngine);
        this.lsystemMode = new LSystemMode(this.mathEngine);
        this.cliffordMode = new CliffordMode(this.mathEngine);
        this.ifsMode = new IFSMode(this.mathEngine);

        // Infinite Horizon: Abstract Phenomena
        this.quantumMode = new QuantumMode(this.mathEngine);
        this.gravityMode = new GravityMode(this.mathEngine);
        this.solarFlareMode = new SolarFlareMode(this.mathEngine);
        this.fissionMode = new FissionMode(this.mathEngine);
        this.biolumeMode = new BiolumeMode(this.mathEngine);
        this.inkWashMode = new InkWashMode(this.mathEngine);
        this.supernovaMode = new SupernovaMode(this.mathEngine);
        this.auraMode = new AuraMode(this.mathEngine);
        this.pianoMode = new PianoMode(this.mathEngine);

        // Infinite Horizon: Digital Dreams
        this.voxelsMode = new VoxelsMode(this.mathEngine);
        this.cyberSpireMode = new CyberSpireMode(this.mathEngine);
        this.glitchMode = new GlitchMode(this.mathEngine);
        this.phaseMode = new PhaseMode(this.mathEngine);
        this.circuitMode = new CircuitMode(this.mathEngine);
        this.mandalaMode = new MandalaMode(this.mathEngine);

        // Ported Ultimate Modes
        this.fluidMode = new FluidMode(this.mathEngine);
        this.gravityAttractorMode = new GravityAttractorMode(this.mathEngine);
        this.smokeMode = new SmokeMode(this.mathEngine);
        this.waveformMode = new WaveformMode(this.mathEngine);
        this.tilingMode = new TilingMode(this.mathEngine);
        this.polytopeMode = new PolytopeMode(this.mathEngine);
        this.spirograph3DMode = new Spirograph3DMode(this.mathEngine);
        this.isogridMode = new IsogridMode(this.mathEngine);
        this.hexagonMode = new HexagonMode(this.mathEngine);
        this.parametricMode = new ParametricMode(this.mathEngine);
        this.moireSpiralMode = new MoireSpiralMode(this.mathEngine);
        this.digitalRainMode = new DigitalRainMode(this.mathEngine);
        this.oceanWaveMode = new OceanWaveMode(this.mathEngine);
        this.granularSandMode = new GranularSandMode(this.mathEngine);
        this.cloudFieldMode = new CloudFieldMode(this.mathEngine);
        this.lavaFlowMode = new LavaFlowMode(this.mathEngine);
        this.vectorFieldMode = new VectorFieldMode(this.mathEngine);
        this.glitchGridMode = new GlitchGridMode(this.mathEngine);
        this.radarScanMode = new RadarScanMode(this.mathEngine);
        this.noteDropMode  = new NoteDropMode(this.mathEngine);
        this.noteDropMode.setMidiPlayer(this.midiPlayer);
        this.bitCrushMode = new BitCrushMode(this.mathEngine);
        this.circuitBoardMode = new CircuitBoardMode(this.mathEngine);
        this.signalTraceMode = new SignalTraceMode(this.mathEngine);
        this.pixelSortMode = new PixelSortMode(this.mathEngine);
        this.oilSmearMode = new OilSmearMode(this.mathEngine);

        this.minimalistDotMode = new MinimalistDotMode(this.mathEngine);
        this.popArtMode = new PopArtMode(this.mathEngine);
        this.dripTraceMode = new DripTraceMode(this.mathEngine);
        this.blackHoleMode = new BlackHoleMode(this.mathEngine);
        this.wormholeMode = new WormholeMode(this.mathEngine);
        this.quantumStringMode = new QuantumStringMode(this.mathEngine);
        this.hyperdriveMode = new HyperdriveMode(this.mathEngine);
        this.nebulaGlowMode = new NebulaGlowMode(this.mathEngine);
        this.chronosMode = new ChronosMode(this.mathEngine);
        this.audioSurfaceMode = new AudioSurfaceMode(this.mathEngine);
        this.shadowShapeMode = new ShadowShapeMode(this.mathEngine);
        this.reliefMode = new ReliefMode(this.mathEngine);

        // Ported from VideoPlayer overlays
        this.dnaHelixMode = new DNAHelixMode(this.mathEngine);
        this.fireEQMode = new FireEQMode(this.mathEngine);
        this.gyroscopeMode = new GyroscopeMode(this.mathEngine);
        this.vinylGroovesMode = new VinylGroovesMode(this.mathEngine);
        this.butterflyMode = new ButterflyMode(this.mathEngine);
        this.waveTunnelMode = new WaveTunnelMode(this.mathEngine);
        this.meteorShowerMode = new MeteorShowerMode(this.mathEngine);
        this.prismShardsMode = new PrismShardsMode(this.mathEngine);
        this.smokeRingsMode = new SmokeRingsMode(this.mathEngine);
        this.ekgMonitorMode = new EKGMonitorMode(this.mathEngine);

        // Compass UI
        this.compassUI = new CompassUI(this.mathEngine);
        this.diveAlpha = 0; // Transition state

        this.currentModeName = 'attractor';

        // Controls
        this.keyboard = new Keyboard(this.scaleManager, this.synthEngine, this.mathEngine);
        this.dial = new Dial(this.mathEngine);

        // AI Player
        this.aiPlayer = new AIPlayer(this.scaleManager, this.synthEngine, this.mathEngine);

        // MIDI Player
        this.midiPlayer = new MidiPlayer(this.synthEngine);
        this.midiPlayer.onNoteOn = (noteInfo) => {
            // Register note with math engine (for visual coupling)
            this.mathEngine.noteOn(noteInfo.midi, noteInfo.frequency, noteInfo.velocity);
            
            // Notify the current visual mode
            if (this.currentMode && this.currentMode.onNoteOn) {
                this.currentMode.onNoteOn({ ...noteInfo, index: noteInfo.midi });
            }

            // Feed to AI player for accompaniment
            if (this.aiPlayer && this.aiPlayer.isPlaying) {
                this.aiPlayer.onUserNote(noteInfo.midi, noteInfo.velocity);
            }
        };
        this.midiPlayer.onNoteOff = (midi) => {
            this.mathEngine.noteOff(midi);
            if (this.currentMode && this.currentMode.onNoteOff) {
                this.currentMode.onNoteOff(midi);
            }
        };

        // Wire keyboard to AI player for accompaniment
        this.keyboard.aiPlayer = this.aiPlayer;

        // â”€â”€â”€ Video Player â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        this.videoPlayer = new VideoPlayer();

        // â”€â”€â”€ Audio Player (for dropped audio files) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        this.audioPlayer = new AudioPlayer();

        // â”€â”€â”€ File Drop Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        this.fileDropHandler = new FileDropHandler();
        this._overrideHue = null;
        this._overrideHueTimer = 0;

        // MIDI / JSON dropped â†’ create a transient piece and play it
        this.fileDropHandler.onMidiLoaded = (notes, bpm, name) => {
            this.synthEngine.init().then(() => {
                this.synthEngine.resume();
                this.midiPlayer.stop();
                // bpm: 60 because parser already converted to absolute seconds
                // MidiPlayer applies bpmScale = 60/bpm, so 60/60 = 1.0 (no scaling)
                this.midiPlayer.currentPiece = { bpm: 60, generate: () => notes };
                this.midiPlayer.notes = notes.sort((a, b) => a[1] - b[1]);
                this.midiPlayer.pitchBends = [];
                this.midiPlayer.play();

                const midiStatus = document.getElementById('midi-status');
                const midiPlayBtn = document.getElementById('midi-play-btn');
                const midiPanel = document.getElementById('midi-panel');
                const midiToggle = document.getElementById('midi-toggle');
                if (midiStatus) midiStatus.textContent = name;
                if (midiPlayBtn) midiPlayBtn.textContent = 'Stop';
                if (midiPanel) midiPanel.classList.remove('hidden');
                if (midiToggle) midiToggle.classList.add('active');
            });
        };

        // Audio dropped â†’ play via AudioPlayer with full viz + recording + bg image
        this.fileDropHandler.onAudioLoaded = (audioBuffer, name) => {
            // AudioPlayer uses an <audio> element, so we need the original File.
            // FileDropHandler gives us an AudioBuffer, but we stored the file ref.
        };
        // Override: use file-based loading so AudioPlayer can use MediaElementSource
        this.fileDropHandler.onAudioFileLoaded = (file, name) => {
            this.audioPlayer.load(file);
            this._showAudioControls(true);
        };

        // Image dropped â†’ extract dominant hue and override colorHue
        this.fileDropHandler.onImagePalette = (hue, name) => {
            this.mathEngine.params.colorHue = hue;
            this._overrideHue = hue;
            this._overrideHueTimer = 10;
        };

        // Video dropped â†’ play it fullscreen with audio-reactive overlay
        this.fileDropHandler.onVideoLoaded = (file, name) => {
            this.videoPlayer.load(file);
            this._showVideoControls(true);
        };

        // â”€â”€â”€ Playlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        this._playlist = [];       // array of File objects
        this._playlistIdx = -1;
        this._playlistPanel = null;

        // Multiple media files dropped â†’ build playlist
        this.fileDropHandler.onPlaylistLoaded = (files) => {
            this._playlist = [...files];
            this._playlistIdx = -1;
            this._buildPlaylistUI();
            this._playlistNext();
        };

        // Auto-advance when a track ends
        this.audioPlayer.onEnded = () => {
            if (this._playlist.length > 0) this._playlistNext();
        };
        this.videoPlayer.onEnded = () => {
            if (this._playlist.length > 0) this._playlistNext();
        };

        // Recording state
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordStartTime = 0;

        // Showcase mode
        this.showcaseActive = false;
        this.showcaseIndex = 0;
        this.showcaseTimer = 0;
        this.showcaseDuration = 8; // seconds per mode
        this.showcaseTransitionAlpha = 0;
        this.showcaseModeName = '';
        this.showcaseActiveNotes = [];
        this.showcaseNoteTimer = 0;
        this.showcaseDialTimer = 0;
        this.showcaseDialInterval = 3;
        this.showcaseModeList = [];

        // Timing
        this.lastTime = 0;
        this.isRunning = false;

        // Initialize
        this._setupUI();
        this._setupDialInput();
        this._resizeUICanvas();
        window.addEventListener('resize', () => this._resizeUICanvas());

        // Build on-screen keyboard
        this._buildOnScreenKeyboard();

        // Set default mode so currentMode is never undefined in the loop
        this._switchMode(this.currentModeName);

        // Start the loop
        this.start();
    }

    /**
     * Setup UI event handlers
     */
    _setupUI() {
        // â”€â”€ Visual mode pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.querySelectorAll('.vis-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this._setVisualMode(mode);
                document.querySelectorAll('.vis-pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const label = document.getElementById('current-visual-label');
                if (label) label.textContent = e.currentTarget.textContent;
                // Close popup
                document.getElementById('visual-selector')?.classList.add('hidden');
                document.getElementById('visual-toggle-btn')?.classList.remove('active');
            });
        });

        // â”€â”€ Audio preset pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        document.querySelectorAll('.aud-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                this._setAudioPreset(preset);
                document.querySelectorAll('.aud-pill').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const label = document.getElementById('current-audio-label');
                if (label) label.textContent = e.currentTarget.textContent;
                // Close popup
                document.getElementById('audio-selector')?.classList.add('hidden');
                document.getElementById('audio-toggle-btn')?.classList.remove('active');
            });
        });

        // â”€â”€ Visual selector popup toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const visualToggleBtn = document.getElementById('visual-toggle-btn');
        const visualSelector  = document.getElementById('visual-selector');
        const audioToggleBtn  = document.getElementById('audio-toggle-btn');
        const audioSelector   = document.getElementById('audio-selector');

        if (visualToggleBtn && visualSelector) {
            visualToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = visualSelector.classList.toggle('hidden');
                visualToggleBtn.classList.toggle('active', !visualSelector.classList.contains('hidden'));
                // Close audio selector if open
                audioSelector?.classList.add('hidden');
                audioToggleBtn?.classList.remove('active');
            });
        }

        // â”€â”€ Audio selector popup toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (audioToggleBtn && audioSelector) {
            audioToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                audioSelector.classList.toggle('hidden');
                audioToggleBtn.classList.toggle('active', !audioSelector.classList.contains('hidden'));
                // Close visual selector if open
                visualSelector?.classList.add('hidden');
                visualToggleBtn?.classList.remove('active');
            });
        }

        // Click outside closes both
        document.addEventListener('click', (e) => {
            if (visualSelector && !visualSelector.contains(e.target) && !visualToggleBtn?.contains(e.target)) {
                visualSelector.classList.add('hidden');
                visualToggleBtn?.classList.remove('active');
            }
            if (audioSelector && !audioSelector.contains(e.target) && !audioToggleBtn?.contains(e.target)) {
                audioSelector.classList.add('hidden');
                audioToggleBtn?.classList.remove('active');
            }
        });

        // â”€â”€ Random button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const randomBtn = document.getElementById('random-btn');
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                const visPills = [...document.querySelectorAll('.vis-pill')];
                const audPills = [...document.querySelectorAll('.aud-pill')];
                if (visPills.length) {
                    const vp = visPills[Math.floor(Math.random() * visPills.length)];
                    const mode = vp.dataset.mode;
                    this._setVisualMode(mode);
                    document.querySelectorAll('.vis-pill').forEach(b => b.classList.remove('active'));
                    vp.classList.add('active');
                    const vLabel = document.getElementById('current-visual-label');
                    if (vLabel) vLabel.textContent = vp.textContent;
                }
                if (audPills.length) {
                    const ap = audPills[Math.floor(Math.random() * audPills.length)];
                    const preset = ap.dataset.preset;
                    this._setAudioPreset(preset);
                    document.querySelectorAll('.aud-pill').forEach(b => b.classList.remove('active'));
                    ap.classList.add('active');
                    const aLabel = document.getElementById('current-audio-label');
                    if (aLabel) aLabel.textContent = ap.textContent;
                }
                // Brief spin animation on the button
                randomBtn.classList.add('spinning');
                setTimeout(() => randomBtn.classList.remove('spinning'), 400);
            });
        }



        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value) / 100;
                if (this.synth && this.synth.master) {
                    this.synth.master.gain.value = vol * 0.65; // 0-0.65 range
                }
            });
        }

        // Scale selector
        document.getElementById('scale-select').addEventListener('change', (e) => {
            this.scaleManager.setScale(e.target.value);
        });

        // Root note selector
        document.getElementById('root-select').addEventListener('change', (e) => {
            this.scaleManager.setRoot(e.target.value);
        });

        // Reactivity slider
        const reactSlider = document.getElementById('reactivity-slider');
        const reactValue = document.getElementById('reactivity-value');
        const reactGlow = document.getElementById('reactivity-glow');
        if (reactSlider) {
            reactSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                reactValue.textContent = `${val}%`;
                this.mathEngine.setReactivity(val / 100);
                if (this.synthEngine) this.synthEngine.setSignature(val / 100);
                if (this.videoPlayer) this.videoPlayer.setReactivity(val / 100);
                if (this.audioPlayer) this.audioPlayer.setReactivity(val / 100);
                // Update glow bar height
                if (reactGlow) {
                    reactGlow.style.height = `${val}%`;
                }
            });
            // Initialise video/audio player reactivity from current slider value
            if (this.videoPlayer) this.videoPlayer.setReactivity(parseInt(reactSlider.value) / 100);
            if (this.audioPlayer) this.audioPlayer.setReactivity(parseInt(reactSlider.value) / 100);
        }

        // Mode-specific reactivity labels
        this._reactivityLabels = {
            'solarsystem': 'Orbit Pull',
            'cycloid3d': 'Spiral Depth',
            'spectral': 'Tunnel Warp',
            'fungal': 'Growth Rate',
            'flowField': 'Flow Force',
            'attractor': 'Hot Fudge',
            'wave': 'Amplitude',
            'lissajous': 'Coupling',
            'pendulum': 'Swing Force',
            'string': 'Tension',
            'cymatics': 'Vibration',
            'interference': 'Phase Shift',
            'lightning': 'Discharge',
            'moire': 'Drift',
            'reactionDiffusion': 'Feed Rate',
            'metaballs': 'Viscosity',
            'stardust': 'Scatter',
            'plasma': 'Turbulence',
            'vortex': 'Spin Force',
            'hypercube': 'Rotation',
            'glowworm': 'Luminance',
            'nebula': 'Density',
            'crystal': 'Refraction',
            'quantum': 'Uncertainty',
            'gravity': 'Mass',
            'solarflare': 'Eruption',
            'fission': 'Chain React',
            'biolume': 'Glow',
            'inkwash': 'Bleed',
            'supernova': 'Blast',
            'aura': 'Shimmer',
            'voxels': 'Density',
            'cyberspire': 'Data Flow',
            'chrome': 'Reflection',
            'glitch': 'Corruption',
            'temporal': 'Time Warp',
            'phase': 'Phase Lock',
            'circuit': 'Voltage',
            'mandala': 'Symmetry',
            'blackhole': 'Weight',
            'wormhole': 'Distortion',
            'tornado': 'Wind Force',
            'oceanwave': 'Swell',
            'lavaflow': 'Heat',
            'firefield': 'Ignition',
            'smokerings': 'Density',
            'prismshards': 'Refraction',
            'meteorshower': 'Impact',
            'wavetunnel': 'Warp',
            'vinylgrooves': 'Scuff',
            'gyroscope': 'Balance',
            'relief': 'Depth',
            'shadowshape': 'Void',
            'piano': 'Hammer Force',
            'grand_phys': 'Hammer Force',
            'grand_synth': 'Hammer Resonance',
            'harpsichord': 'Pluck Intensity',
        };

        // Record button
        document.getElementById('record-btn').addEventListener('click', () => {
            if (this.isRecording) {
                this._stopRecording();
            } else {
                this._startRecording();
            }
        });

        // Showcase button
        document.getElementById('showcase-btn').addEventListener('click', () => {
            this._toggleShowcase();
        });

        // Keyboard shortcut: Escape stops showcase
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.showcaseActive) {
                this._stopShowcase();
            }
        });

        // Pendulum sound presets â€” short, crisp, no echo (new SynthVoice format)
        this.pendulumSounds = {
            bells: {
                osc1: 'sine', fmDepth: 2, fmRatio: 3.5,
                a: 0.005, d: 0.25, s: 0, r: 0.1,
                fFreq: 2500, fEnv: 6000, fDecay: 0.15,
            },
            marimba: {
                osc1: 'sine', fmDepth: 3, fmRatio: 4,
                a: 0.003, d: 0.2, s: 0, r: 0.08,
                fFreq: 3000, fEnv: 5000, fDecay: 0.1,
            },
            glass: {
                osc1: 'sine', fmDepth: 1.5, fmRatio: 7,
                a: 0.001, d: 0.35, s: 0, r: 0.12,
                fFreq: 4000, fEnv: 8000, fDecay: 0.2, chorus: 0.3,
            },
            pluck: {
                osc1: 'sawtooth', osc2: 'triangle', mix: 0.25,
                a: 0.001, d: 0.12, s: 0, r: 0.05,
                fFreq: 1000, fEnv: 8000, fDecay: 0.08,
            },
            pad: {
                osc1: 'sine', osc2: 'triangle', mix: 0.4, unison: 2, spread: 12,
                a: 0.05, d: 0.3, s: 0.1, r: 0.15,
                fFreq: 800, fEnv: 2000, fDecay: 0.2,
            },
            metallic: {
                osc1: 'square', fmDepth: 4, fmRatio: 5.5,
                a: 0.001, d: 0.2, s: 0, r: 0.08,
                fFreq: 3500, fEnv: 7000, fDecay: 0.12, dist: 0.1,
            },
            organ: {
                osc1: 'sine', osc2: 'square', mix: 0.35, sub: 0.2, subOct: -1,
                a: 0.02, d: 0.1, s: 0.1, r: 0.08,
                fFreq: 2000, fEnv: 3000, fDecay: 0.1,
            },
            sub: {
                osc1: 'sine', sub: 0.5, subOct: -1,
                a: 0.01, d: 0.25, s: 0, r: 0.1,
                fFreq: 400, fEnv: 1000, fDecay: 0.15,
            },
        };

        // Sound preset selector
        document.getElementById('sound-select').addEventListener('change', (e) => {
            const preset = this.pendulumSounds[e.target.value];
            if (preset) {
                this.synthEngine.presets.pendulum = preset;
            }
        });

        // Pendulum toggle (menubar button)
        const pendulumToggle = document.getElementById('pendulum-toggle');
        const pendulumPanel = document.getElementById('pendulum-panel');
        this._pendulumActive = false;
        this._previousMode = null;
        this._previousModeName = null;

        if (pendulumToggle) {
            pendulumToggle.addEventListener('click', () => {
                if (this._pendulumActive) {
                    // Deactivate pendulum, restore previous mode
                    this._pendulumActive = false;
                    pendulumToggle.classList.remove('active');
                    pendulumPanel.classList.add('hidden');
                    if (this._previousModeName) {
                        this._switchMode(this._previousModeName);
                    }
                } else {
                    // Save current mode and switch to pendulum
                    this._previousModeName = this.currentModeName;
                    this._pendulumActive = true;
                    pendulumToggle.classList.add('active');
                    pendulumPanel.classList.remove('hidden');
                    this.currentMode = this.pendulumMode;
                    this.currentModeName = 'pendulum';
                    this.renderer.setMode(this.pendulumMode);
                    this.keyboard.setVisualMode(this.pendulumMode);
                    this.aiPlayer.setVisualMode(this.pendulumMode);
                    this.synthEngine.init().then(() => this.synthEngine.resume());
                }
            });
        }

        // Pendulum count slider
        const countSlider = document.getElementById('pendulum-count');
        const countLabel = document.getElementById('pendulum-count-value');
        if (countSlider) {
            countSlider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                countLabel.textContent = count;
                this.pendulumMode.pendulumMath.setNumPendulums(count);
                this.pendulumMode.resize(this.pendulumMode.width, this.pendulumMode.height);
            });
        }

        // Pendulum angle slider
        const angleSlider = document.getElementById('pendulum-angle');
        const angleLabel = document.getElementById('pendulum-angle-value');
        if (angleSlider) {
            angleSlider.addEventListener('input', (e) => {
                const angle = parseInt(e.target.value);
                angleLabel.textContent = angle;
                this.pendulumMode.setAngle(angle / 100);
            });
        }

        // Pendulum reset button
        const resetBtn = document.getElementById('pendulum-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.pendulumMode.reset();
            });
        }

        // Note Drop toggle (Guitar Hero visualiser)
        const noteDropToggle = document.getElementById('notedrop-toggle');
        this._noteDropActive = false;
        if (noteDropToggle) {
            noteDropToggle.addEventListener('click', () => {
                if (this._noteDropActive) {
                    this._noteDropActive = false;
                    noteDropToggle.classList.remove('active');
                    if (this._noteDropPrevMode) {
                        this.currentMode = this._noteDropPrevMode;
                        this.renderer.setMode(this._noteDropPrevMode);
                        this.keyboard.setVisualMode(this._noteDropPrevMode);
                        this.aiPlayer.setVisualMode(this._noteDropPrevMode);
                    }
                } else {
                    this._noteDropActive = true;
                    this._noteDropPrevMode = this.currentMode;
                    noteDropToggle.classList.add('active');
                    this.currentMode = this.noteDropMode;
                    this.renderer.setMode(this.noteDropMode);
                    this.keyboard.setVisualMode(this.noteDropMode);
                    this.aiPlayer.setVisualMode(this.noteDropMode);
                    this.synthEngine.init().then(() => this.synthEngine.resume());
                }
            });
        }

        // Lightning intensity slider
        const lightningSlider = document.getElementById('lightning-intensity');
        const lightningLabel = document.getElementById('lightning-intensity-value');
        if (lightningSlider) {
            lightningSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                lightningLabel.textContent = val;
                this.lightningMode.setIntensity(val);
            });
        }

        // Mycelium clear button
        const myceliumClearBtn = document.getElementById('mycelium-clear-btn');
        if (myceliumClearBtn) {
            myceliumClearBtn.addEventListener('click', () => {
                this.myceliumMode.clear();
            });
        }

        // RD preset selector
        const rdPreset = document.getElementById('rd-preset');
        if (rdPreset) {
            rdPreset.addEventListener('change', (e) => {
                this.reactionDiffusionMode.setPreset(e.target.value);
            });
        }

        // Attractor system selector
        const attractorPreset = document.getElementById('attractor-preset');
        if (attractorPreset) {
            attractorPreset.addEventListener('change', (e) => {
                this.attractorMode.attractorMath.setPreset(e.target.value);
            });
        }

        // L-System style selector
        const lsystemStyle = document.getElementById('lsystem-style');
        if (lsystemStyle) {
            lsystemStyle.addEventListener('change', (e) => {
                const v = e.target.value;
                if (v === 'circuit') {
                    this.lsystemMode._useGrammar = false;
                    this.lsystemMode.initialized = false;
                } else {
                    this.lsystemMode.setStyle(v);
                }
            });
        }

        // Clifford preset selector
        const cliffordPreset = document.getElementById('clifford-preset');
        if (cliffordPreset) {
            cliffordPreset.addEventListener('change', (e) => {
                this.cliffordMode.setPreset(e.target.value);
            });
        }

        // IFS preset selector
        const ifsPreset = document.getElementById('ifs-preset');
        if (ifsPreset) {
            ifsPreset.addEventListener('change', (e) => {
                this.ifsMode.setPreset(e.target.value);
            });
        }

        // Fractal zoom speed slider
        const fractalZoomSlider = document.getElementById('fractal-zoom-speed');
        const fractalZoomLabel = document.getElementById('fractal-zoom-value');
        if (fractalZoomSlider) {
            fractalZoomSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                fractalZoomLabel.textContent = val.toFixed(1);
                this.fractalMode.setZoomSpeed(val);
            });
        }

        // AI Player controls
        const aiToggle = document.getElementById('ai-toggle');
        const aiSliders = document.getElementById('ai-sliders');
        if (aiToggle) {
            aiToggle.addEventListener('click', async () => {
                if (this.aiPlayer.isPlaying) {
                    this.aiPlayer.stop();
                    aiToggle.classList.remove('active');
                    aiSliders.classList.add('hidden');
                } else {
                    aiToggle.classList.add('loading');
                    await this.aiPlayer.play();
                    aiToggle.classList.remove('loading');
                    aiToggle.classList.add('active');
                    aiSliders.classList.remove('hidden');
                }
            });
        }

        const aiTempSlider = document.getElementById('ai-temperature');
        const aiTempLabel = document.getElementById('ai-temp-value');
        if (aiTempSlider) {
            aiTempSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                aiTempLabel.textContent = val.toFixed(1);
                this.aiPlayer.setTemperature(val);
            });
        }

        const aiSpeedSlider = document.getElementById('ai-speed');
        const aiSpeedLabel = document.getElementById('ai-speed-value');
        if (aiSpeedSlider) {
            aiSpeedSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                aiSpeedLabel.textContent = val;
                this.aiPlayer.setSpeed(val);
            });
        }

        // MIDI Player UI
        const midiToggle = document.getElementById('midi-toggle');
        const midiPanel = document.getElementById('midi-panel');
        const midiPlayBtn = document.getElementById('midi-play-btn');
        const midiSelect = document.getElementById('midi-select');
        const midiStatus = document.getElementById('midi-status');

        if (midiToggle) {
            midiToggle.addEventListener('click', () => {
                midiPanel.classList.toggle('hidden');
                midiToggle.classList.toggle('active');
            });
        }

        if (midiPlayBtn) {
            midiPlayBtn.addEventListener('click', () => {
                if (this.midiPlayer.playing) {
                    this.midiPlayer.stop();
                    midiPlayBtn.textContent = 'Play';
                    midiStatus.textContent = 'Stopped';
                } else {
                    this.synthEngine.init().then(() => {
                        this.synthEngine.resume();
                        this.midiPlayer.loadPiece(midiSelect.value);
                        this.midiPlayer.play();
                        midiPlayBtn.textContent = 'Stop';
                        midiStatus.textContent = 'Playing...';
                    });
                }
            });
        }

        if (midiSelect) {
            midiSelect.addEventListener('change', () => {
                if (this.midiPlayer.playing) {
                    this.midiPlayer.stop();
                    this.midiPlayer.loadPiece(midiSelect.value);
                    this.midiPlayer.play();
                }
            });
        }
    }

    /**
     * Show or hide the video controls section and wire events (once)
     */
    _showVideoControls(show) {
        const section = document.getElementById('video-controls');
        if (!section) return;
        section.style.display = show ? 'flex' : 'none';

        if (!show) {
            // Restore dial/UI when video controls are hidden
            this._setDialVisible(true);
            return;
        }

        if (!this._videoControlsWired) {
            this._videoControlsWired = true;

            const vizSelect      = document.getElementById('video-viz');
            const ySlider        = document.getElementById('video-viz-y');
            const stopBtn        = document.getElementById('video-stop-btn');
            const playPauseBtn   = document.getElementById('video-playpause-btn');
            const restartBtn     = document.getElementById('video-restart-btn');
            const hideDialChk    = document.getElementById('video-hide-dial');
            const recordBtn      = document.getElementById('video-record-btn');
            const recordLabel    = document.getElementById('video-record-label');
            const recordDot      = document.getElementById('video-record-dot');

            const xSlider    = document.getElementById('video-viz-x');
            const sizeSlider = document.getElementById('video-viz-size');
            const hueSlider  = document.getElementById('video-viz-hue');

            if (vizSelect)  vizSelect.addEventListener('change', () => this.videoPlayer.setViz(vizSelect.value));
            if (ySlider)    ySlider.addEventListener('input',    () => this.videoPlayer.setYPosition(parseFloat(ySlider.value)));
            if (xSlider)    xSlider.addEventListener('input',    () => this.videoPlayer.setXPosition(parseFloat(xSlider.value)));
            if (sizeSlider) sizeSlider.addEventListener('input', () => this.videoPlayer.setSize(parseFloat(sizeSlider.value)));
            if (hueSlider)  hueSlider.addEventListener('input',  () => this.videoPlayer.setHueShift(parseInt(hueSlider.value)));

            if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.videoPlayer.playPause());

            if (restartBtn) restartBtn.addEventListener('click', () => this.videoPlayer.restart());

            if (hideDialChk) {
                hideDialChk.addEventListener('change', () => this._setDialVisible(!hideDialChk.checked));
            }

            // Label overlay controls
            const vLabelText = document.getElementById('video-label-text');
            const vLabelFont = document.getElementById('video-label-font');
            const vLabelSize = document.getElementById('video-label-size');
            const vLabelPos  = document.getElementById('video-label-pos');
            if (vLabelText) vLabelText.addEventListener('input',  () => this.videoPlayer.setLabel(vLabelText.value));
            if (vLabelFont) vLabelFont.addEventListener('change', () => this.videoPlayer.setLabelFont(vLabelFont.value));
            if (vLabelSize) vLabelSize.addEventListener('input',  () => this.videoPlayer.setLabelSize(parseInt(vLabelSize.value)));
            if (vLabelPos)  vLabelPos.addEventListener('change',  () => this.videoPlayer.setLabelPosition(vLabelPos.value));

            if (recordBtn) {
                recordBtn.addEventListener('click', () => {
                    if (this.videoPlayer.isRecording) {
                        this.videoPlayer.stopRecording();
                    } else {
                        this.videoPlayer.restart();
                        this.videoPlayer.startRecording();
                    }
                });
            }

            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    this.videoPlayer.stop();
                    this._showVideoControls(false);
                });
            }

            // Sync play/pause button icon
            this.videoPlayer.onPlayStateChange = (isPlaying) => {
                if (playPauseBtn) playPauseBtn.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
            };

            // Sync record button state
            this.videoPlayer.onRecordStateChange = (isRec) => {
                if (!recordLabel || !recordDot) return;
                recordLabel.textContent = isRec ? 'Stop Rec' : 'Record';
                recordDot.style.background = isRec ? '#ff2222' : '#f55';
                recordDot.style.boxShadow  = isRec ? '0 0 6px #ff2222' : 'none';
                if (recordBtn) recordBtn.style.background = isRec ? 'rgba(220,30,30,0.35)' : 'rgba(220,50,50,0.18)';
            };

            // Auto-change viz
            const autoBtn = document.getElementById('video-auto-viz-btn');
            const autoSec = document.getElementById('video-auto-viz-sec');
            if (autoBtn && vizSelect) {
                let autoTimer = null;
                const startAuto = () => {
                    const sec = Math.max(3, parseInt(autoSec?.value) || 10);
                    autoTimer = setInterval(() => {
                        const opts = [...vizSelect.options].map(o => o.value);
                        let next;
                        do { next = opts[Math.floor(Math.random() * opts.length)]; } while (next === vizSelect.value && opts.length > 1);
                        vizSelect.value = next;
                        this.videoPlayer.setViz(next);
                    }, sec * 1000);
                };
                const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
                autoBtn.addEventListener('click', () => {
                    if (autoTimer) {
                        stopAuto();
                        autoBtn.textContent = 'Auto';
                        autoBtn.style.background = 'rgba(80,180,120,0.15)';
                        autoBtn.style.borderColor = 'rgba(80,180,120,0.3)';
                    } else {
                        startAuto();
                        autoBtn.textContent = 'Auto \u25cf';
                        autoBtn.style.background = 'rgba(80,180,120,0.4)';
                        autoBtn.style.borderColor = 'rgba(80,180,120,0.7)';
                    }
                });
                if (autoSec) autoSec.addEventListener('change', () => { if (autoTimer) { stopAuto(); startAuto(); } });
            }
        }
    }

    _setDialVisible(visible) {
        const uiCanvas      = document.getElementById('ui-canvas');
        const reactRail     = document.getElementById('reactivity-rail');
        const onscreenKbd   = document.getElementById('onscreen-keyboard');
        if (uiCanvas)    uiCanvas.style.visibility    = visible ? '' : 'hidden';
        if (reactRail)   reactRail.style.visibility   = visible ? '' : 'hidden';
        if (onscreenKbd) onscreenKbd.style.visibility = visible ? '' : 'hidden';
    }

    /**
     * Setup Dial mouse/touch input on UI canvas
     */
    _setupDialInput() {
        const canvas = this.uiCanvas;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            if (this.dial.onPointerDown(pos.x, pos.y)) {
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = getPos(e);
            this.dial.onPointerMove(pos.x, pos.y);
        });

        canvas.addEventListener('mouseup', () => this.dial.onPointerUp());
        canvas.addEventListener('mouseleave', () => this.dial.onPointerUp());

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            const pos = getPos(e);
            if (this.dial.onPointerDown(pos.x, pos.y)) {
                e.preventDefault();
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            const pos = getPos(e);
            this.dial.onPointerMove(pos.x, pos.y);
        }, { passive: false });

        canvas.addEventListener('touchend', () => this.dial.onPointerUp());

        // Scroll wheel
        canvas.addEventListener('wheel', (e) => {
            const pos = getPos(e);
            if (this.dial.onWheel(pos.x, pos.y, e.deltaY)) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Resize UI canvas
     */
    _resizeUICanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.uiCanvas.width = window.innerWidth * dpr;
        this.uiCanvas.height = window.innerHeight * dpr;
        this.uiCanvas.style.width = window.innerWidth + 'px';
        this.uiCanvas.style.height = window.innerHeight + 'px';
        this.uiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Build the on-screen keyboard HTML
     */
    _buildOnScreenKeyboard() {
        const container = document.getElementById('onscreen-keyboard');
        const rows = [
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ];

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column-reverse'; // Bottom row first visually

        for (const row of rows) {
            const rowEl = document.createElement('div');
            rowEl.className = 'key-row';
            for (const key of row) {
                const keyEl = document.createElement('div');
                keyEl.className = 'key';
                keyEl.dataset.key = key;
                keyEl.id = `key-${key === ';' ? 'semicolon' : key === ',' ? 'comma' : key === '.' ? 'period' : key === '/' ? 'slash' : key}`;
                keyEl.textContent = key.toUpperCase();
                rowEl.appendChild(keyEl);
            }
            wrapper.appendChild(rowEl);
        }

        container.appendChild(wrapper);
    }

    /**
     * Switch visualization/audio mode
     */
    /** Set only the visual mode â€” does not touch the audio preset */
    _setVisualMode(modeName) {
        this.currentModeName = modeName;

        switch (modeName) {
            case 'cycloid3d':           this.currentMode = this.cycloid3dMode; break;
            case 'spectral':            this.currentMode = this.spectralMode;
                this.synthEngine.init().then(() => this.synthEngine.resume()); break;
            case 'fungal':              this.currentMode = this.fungalMode; break;
            case 'metaballs':           this.currentMode = this.metaballsMode; break;
            case 'stardust':            this.currentMode = this.stardustMode; break;
            case 'plasma':              this.currentMode = this.plasmaMode; break;
            case 'vortex':              this.currentMode = this.vortexMode; break;
            case 'hypercube':           this.currentMode = this.hypercubeMode; break;
            case 'glowworm':            this.currentMode = this.glowwormMode; break;
            case 'nebula':              this.currentMode = this.nebulaMode; break;
            case 'flowField':           this.currentMode = this.flowFieldMode; break;
            case 'attractor':           this.currentMode = this.attractorMode; break;
            case 'wave':                this.currentMode = this.waveMode; break;
            case 'lissajous':           this.currentMode = this.lissajousMode; break;
            case 'pendulum':            this.currentMode = this.pendulumMode;
                this.synthEngine.init().then(() => this.synthEngine.resume()); break;
            case 'string':              this.currentMode = this.stringMode; break;
            case 'cymatics':            this.currentMode = this.cymaticsMode; break;
            case 'interference':        this.currentMode = this.interferenceMode; break;
            case 'lightning':           this.currentMode = this.lightningMode; break;
            case 'moire':               this.currentMode = this.moireMode; break;
            case 'reactionDiffusion':   this.currentMode = this.reactionDiffusionMode; break;
            case 'boids':               this.currentMode = this.boidsMode; break;
            case 'constellation':       this.currentMode = this.constellationMode; break;
            case 'kaleidoscope':        this.currentMode = this.kaleidoscopeMode; break;
            case 'lsystem':             this.currentMode = this.lsystemMode; break;
            case 'clifford':            this.currentMode = this.cliffordMode; break;
            case 'ifs':                 this.currentMode = this.ifsMode; break;
            case 'magnetic':            this.currentMode = this.magneticMode; break;
            case 'superformula':        this.currentMode = this.superformulaMode; break;
            case 'voronoi':             this.currentMode = this.voronoiMode; break;
            case 'web':                 this.currentMode = this.webMode; break;
            case 'quantum':             this.currentMode = this.quantumMode; break;
            case 'gravity':             this.currentMode = this.gravityMode; break;
            case 'solarflare':          this.currentMode = this.solarFlareMode; break;
            case 'fission':             this.currentMode = this.fissionMode; break;
            case 'biolume':             this.currentMode = this.biolumeMode; break;
            case 'inkwash':             this.currentMode = this.inkWashMode; break;
            case 'supernova':           this.currentMode = this.supernovaMode; break;
            case 'aura':                this.currentMode = this.auraMode; break;
            case 'voxels':              this.currentMode = this.voxelsMode; break;
            case 'cyberspire':          this.currentMode = this.cyberSpireMode; break;
            case 'glitch':              this.currentMode = this.glitchMode; break;
            case 'phase':               this.currentMode = this.phaseMode; break;
            case 'circuit':             this.currentMode = this.circuitMode; break;
            case 'mandala':             this.currentMode = this.mandalaMode; break;
            case 'fluid':               this.currentMode = this.fluidMode; break;
            case 'gravity-attractor':   this.currentMode = this.gravityAttractorMode; break;
            case 'smoke':               this.currentMode = this.smokeMode; break;
            case 'waveform':            this.currentMode = this.waveformMode; break;
            case 'tiling':              this.currentMode = this.tilingMode; break;
            case 'polytope':            this.currentMode = this.polytopeMode; break;
            case 'spirograph3d':        this.currentMode = this.spirograph3DMode; break;
            case 'isogrid':             this.currentMode = this.isogridMode; break;
            case 'hexagon':             this.currentMode = this.hexagonMode; break;
            case 'parametric':          this.currentMode = this.parametricMode; break;
            case 'moirespiral':         this.currentMode = this.moireSpiralMode; break;
            case 'digitalrain':         this.currentMode = this.digitalRainMode; break;
            case 'oceanwave':           this.currentMode = this.oceanWaveMode; break;
            case 'granularsand':        this.currentMode = this.granularSandMode; break;
            case 'cloudfield':          this.currentMode = this.cloudFieldMode; break;
            case 'lavaflow':            this.currentMode = this.lavaFlowMode; break;
            case 'vectorfield':         this.currentMode = this.vectorFieldMode; break;
            case 'glitchgrid':          this.currentMode = this.glitchGridMode; break;
            case 'radarscan':           this.currentMode = this.radarScanMode; break;
            case 'bitcrush':            this.currentMode = this.bitCrushMode; break;
            case 'circuitboard':        this.currentMode = this.circuitBoardMode; break;
            case 'signaltrace':         this.currentMode = this.signalTraceMode; break;
            case 'pixelsort':           this.currentMode = this.pixelSortMode; break;
            case 'oilsmear':            this.currentMode = this.oilSmearMode; break;
            case 'minimalistdot':       this.currentMode = this.minimalistDotMode; break;
            case 'popart':              this.currentMode = this.popArtMode; break;
            case 'driptrace':           this.currentMode = this.dripTraceMode; break;
            case 'blackhole':           this.currentMode = this.blackHoleMode; break;
            case 'wormhole':            this.currentMode = this.wormholeMode; break;
            case 'quantumstring':       this.currentMode = this.quantumStringMode; break;
            case 'hyperdrive':          this.currentMode = this.hyperdriveMode; break;
            case 'nebulaglow':          this.currentMode = this.nebulaGlowMode; break;
            case 'chronos':             this.currentMode = this.chronosMode; break;
            case 'audiosurface':        this.currentMode = this.audioSurfaceMode; break;
            case 'shadowshape':         this.currentMode = this.shadowShapeMode; break;
            case 'relief':              this.currentMode = this.reliefMode; break;
            case 'dnahelix':            this.currentMode = this.dnaHelixMode; break;
            case 'fireeq':              this.currentMode = this.fireEQMode; break;
            case 'gyroscope':           this.currentMode = this.gyroscopeMode; break;
            case 'vinylgrooves':        this.currentMode = this.vinylGroovesMode; break;
            case 'butterfly':           this.currentMode = this.butterflyMode; break;
            case 'wavetunnel':          this.currentMode = this.waveTunnelMode; break;
            case 'meteorshower':        this.currentMode = this.meteorShowerMode; break;
            case 'prismshards':         this.currentMode = this.prismShardsMode; break;
            case 'smokerings':          this.currentMode = this.smokeRingsMode; break;
            case 'ekgmonitor':          this.currentMode = this.ekgMonitorMode; break;
            case 'piano':
            case 'grand_phys':
            case 'grand_synth':
            case 'harpsichord':         this.currentMode = this.pianoMode; break;
            default:
                // Unknown visual mode â€” keep current
                break;
        }

        this.renderer.setMode(this.currentMode);
        this.keyboard.setVisualMode(this.currentMode);
        this.aiPlayer.setVisualMode(this.currentMode);

        // Mode-specific control visibility
        const fungalCtrls = ['mycelium-clear-control'];
        for (const id of fungalCtrls) {
            const el = document.getElementById(id);
            if (el) el.style.display = modeName === 'fungal' ? '' : 'none';
        }
        const lightningCtrls = ['lightning-intensity-control'];
        for (const id of lightningCtrls) {
            const el = document.getElementById(id);
            if (el) el.style.display = modeName === 'lightning' ? '' : 'none';
        }
        const rdCtrls = ['rd-preset-control'];
        for (const id of rdCtrls) {
            const el = document.getElementById(id);
            if (el) el.style.display = modeName === 'reactionDiffusion' ? '' : 'none';
        }

        const subSelectors = {
            'attractor-preset-control': modeName === 'attractor',
            'lsystem-style-control':    modeName === 'lsystem',
            'clifford-preset-control':  modeName === 'clifford',
            'ifs-preset-control':       modeName === 'ifs',
        };
        for (const [id, show] of Object.entries(subSelectors)) {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? '' : 'none';
        }

        // Update reactivity label
        const paramLabel = document.getElementById('reactivity-param');
        if (paramLabel && this._reactivityLabels) {
            paramLabel.textContent = this._reactivityLabels[modeName] || 'Chaos';
        }

        // Deactivate pendulum if user manually picks a visual mode
        if (this._pendulumActive) {
            this._pendulumActive = false;
            document.getElementById('pendulum-toggle')?.classList.remove('active');
            document.getElementById('pendulum-panel')?.classList.add('hidden');
        }

        // Deactivate Note Drop if user manually picks a visual mode
        if (this._noteDropActive) {
            this._noteDropActive = false;
            document.getElementById('notedrop-toggle')?.classList.remove('active');
        }

        // Stop showcase on manual switch
        if (this.showcaseActive && !this._showcaseSwitching) {
            this._stopShowcase();
        }
    }

    /** Set only the audio preset â€” does not touch the visual */
    _setAudioPreset(presetName) {
        this.synthEngine.init().then(() => {
            this.synthEngine.resume();
            this.synthEngine.setMode(presetName);
        });
    }

    /** Legacy compat: set both visual and audio together */
    _switchMode(modeName) {
        this._setVisualMode(modeName);
        this._setAudioPreset(modeName);
    }

    /**
     * Toggle showcase mode on/off
     */
    _toggleShowcase() {
        if (this.showcaseActive) {
            this._stopShowcase();
        } else {
            this._startShowcase();
        }
    }

    _startShowcase() {
        this.showcaseActive = true;
        this._showcaseSwitching = false;
        
        // Build showcase list from ALL available modes
        // We can get them from the reactivity labels or the synth presets keys
        const allKeys = Object.keys(this._reactivityLabels || {});
        this.showcaseModeList = allKeys.map(key => ({
            key: key,
            label: this._reactivityLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)
        }));
        
        // Shuffle the list for a fresh experience every time
        for (let i = this.showcaseModeList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.showcaseModeList[i], this.showcaseModeList[j]] = [this.showcaseModeList[j], this.showcaseModeList[i]];
        }

        this.showcaseIndex = 0;
        this.showcaseTimer = 0;
        this.showcaseTransitionAlpha = 1;
        this.showcaseNoteTimer = 0;
        this.showcaseDialTimer = 0;
        this.showcaseDialInterval = 2 + Math.random() * 2;
        this.showcaseSigTimer = 0;
        this.showcaseSigInterval = 3 + Math.random() * 2;
        this.showcaseActiveNotes = [];

        // Init audio (needs user gesture â€” usually provided by the button click)
        this.synthEngine.init().then(() => {
            this.synthEngine.resume();
        });

        // Switch to first mode
        this._showcaseSwitchToIndex(0);

        // Update button
        const btn = document.getElementById('showcase-btn');
        if (btn) btn.classList.add('active');

        // Hide start hint
        const hint = document.getElementById('start-hint');
        if (hint) hint.classList.add('hidden');
    }

    _stopShowcase() {
        // Release any lingering notes
        for (const n of (this.showcaseActiveNotes || [])) {
            this.synthEngine.noteOff(n.index);
            this.mathEngine.noteOff(n.index);
        }
        this.showcaseActiveNotes = [];

        this.showcaseActive = false;
        this.showcaseTransitionAlpha = 0;

        const btn = document.getElementById('showcase-btn');
        if (btn) btn.classList.remove('active');
    }

    _showcaseSwitchToIndex(idx) {
        this.showcaseIndex = idx;
        const mode = this.showcaseModeList[idx];
        this.showcaseModeName = mode.label;
        this.showcaseTransitionAlpha = 1;

        // Guard: tell _switchMode not to kill showcase
        this._showcaseSwitching = true;
        this._switchMode(mode.key);
        this._showcaseSwitching = false;
    }

    _advanceShowcase() {
        // Release current notes before switching
        for (const n of this.showcaseActiveNotes) {
            this.synthEngine.noteOff(n.index);
            this.mathEngine.noteOff(n.index);
            if (this.currentMode && this.currentMode.onNoteOff) {
                this.currentMode.onNoteOff(n.index);
            }
        }
        this.showcaseActiveNotes = [];

        const nextIdx = (this.showcaseIndex + 1) % this.showcaseModeList.length;
        this._showcaseSwitchToIndex(nextIdx);

        // Also randomize dial and signature on mode change
        this.dial.targetValue = 0.2 + Math.random() * 0.6;
        this._showcaseSetSignature(0.2 + Math.random() * 0.7);
    }

    /**
     * Helper to update signature UI and engines during showcase
     */
    _showcaseSetSignature(val) {
        const reactSlider = document.getElementById('reactivity-slider');
        const reactValue = document.getElementById('reactivity-value');
        const reactGlow = document.getElementById('reactivity-glow');
        
        if (reactSlider) {
            reactSlider.value = Math.round(val * 100);
            if (reactValue) reactValue.textContent = `${Math.round(val * 100)}%`;
            if (reactGlow) reactGlow.style.height = `${Math.round(val * 100)}%`;
        }

        this.mathEngine.setReactivity(val);
        if (this.synthEngine) this.synthEngine.setSignature(val);
        if (this.videoPlayer) this.videoPlayer.setReactivity(val);
        if (this.audioPlayer) this.audioPlayer.setReactivity(val);
    }

    /**
     * Generate demo notes during showcase â€” fires from the render loop
     */
    _showcasePlayNotes(dt) {
        // Skip note generation if MIDI playback (piano) is already active
        if (this.midiPlayer && this.midiPlayer.playing) return;

        this.showcaseNoteTimer += dt;

        // --- Dial drift: randomize dial value every few seconds ---
        this.showcaseDialTimer += dt;
        if (this.showcaseDialTimer >= this.showcaseDialInterval) {
            this.showcaseDialTimer = 0;
            this.showcaseDialInterval = 2 + Math.random() * 3;
            // Smoothly drift to a new random value
            this.dial.targetValue = 0.15 + Math.random() * 0.7;
        }

        // --- Signature drift: randomize signature every few seconds ---
        this.showcaseSigTimer += dt;
        if (this.showcaseSigTimer >= this.showcaseSigInterval) {
            this.showcaseSigTimer = 0;
            this.showcaseSigInterval = 3 + Math.random() * 4;
            this._showcaseSetSignature(0.15 + Math.random() * 0.75);
        }

        // Fire a note every ~600ms
        if (this.showcaseNoteTimer < 0.6) return;
        this.showcaseNoteTimer = 0;

        // Release old notes (keep max 5 active)
        while (this.showcaseActiveNotes.length > 5) {
            const old = this.showcaseActiveNotes.shift();
            this.synthEngine.noteOff(old.index);
            this.mathEngine.noteOff(old.index);
            if (this.currentMode && this.currentMode.onNoteOff) {
                this.currentMode.onNoteOff(old.index);
            }
        }

        // Pick a random note from the current scale
        const noteIndex = 2000 + Math.floor(Math.random() * 30);
        const scaleKeys = this.scaleManager.keyLayout;
        const randomKey = scaleKeys[Math.floor(Math.random() * scaleKeys.length)];
        const noteInfo = this.scaleManager.getNoteInfo(randomKey);

        if (noteInfo) {
            const velocity = 0.4 + Math.random() * 0.4;

            this.synthEngine.noteOn(noteIndex, noteInfo.frequency, velocity);
            this.mathEngine.noteOn(noteIndex, noteInfo.frequency, velocity);

            if (this.currentMode && this.currentMode.onNoteOn) {
                this.currentMode.onNoteOn({ ...noteInfo, index: noteIndex, velocity });
            }

            this.showcaseActiveNotes.push({ index: noteIndex });

            // Mix of staccato (300ms) and sustained (800-2000ms) holds
            const isSustained = Math.random() < 0.4;
            const holdTime = isSustained ? 800 + Math.random() * 1200 : 300;

            setTimeout(() => {
                this.synthEngine.noteOff(noteIndex);
                this.mathEngine.noteOff(noteIndex);
                if (this.currentMode && this.currentMode.onNoteOff) {
                    this.currentMode.onNoteOff(noteIndex);
                }
                this.showcaseActiveNotes = this.showcaseActiveNotes.filter(n => n.index !== noteIndex);
            }, holdTime);
        }
    }

    /**
     * Start recording
     */
    async _startRecording() {
        try {
            await this.synthEngine.init();
            const canvas = this.renderer.getCanvas();
            const audioCtx = this.synthEngine.getAudioContext();

            // Capture canvas stream
            const canvasStream = canvas.captureStream(30);

            // Capture audio
            const audioDest = audioCtx.createMediaStreamDestination();
            this.synthEngine.analyser.connect(audioDest);

            // Combine streams
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDest.stream.getAudioTracks(),
            ]);

            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 5000000,
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `harmonia-${Date.now()}.webm`;
                a.click();
                URL.revokeObjectURL(url);
            };

            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.recordStartTime = Date.now();
            document.getElementById('record-btn').classList.add('recording');
            document.getElementById('record-time').classList.remove('hidden');

            // Update timer
            this._updateRecordTimer();
        } catch (err) {
            console.warn('Recording not supported:', err);
        }
    }

    /**
     * Stop recording
     */
    _stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            document.getElementById('record-btn').classList.remove('recording');
            document.getElementById('record-time').classList.add('hidden');
        }
    }

    /**
     * Update recording timer display
     */
    _updateRecordTimer() {
        if (!this.isRecording) return;
        const elapsed = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('record-time').textContent =
            `${mins}:${secs.toString().padStart(2, '0')}`;
        requestAnimationFrame(() => this._updateRecordTimer());
    }

    /**
     * Main animation loop
     */
    _loop(timestamp) {
        if (!this.isRunning) return;

        const dt = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, 0.05) : 0.016;
        this.lastTime = timestamp;

        // 1. Update math engine (smooth params)
        this.mathEngine.update(dt);

        // Apply image hue override if active
        if (this._overrideHueTimer > 0) {
            this.mathEngine.params.colorHue = this._overrideHue;
            this._overrideHueTimer -= dt;
        }

        // 2. Update dial
        this.dial.update(dt);

        // 3. HONEST COUPLING â€” visual writes to bus, synth reads from bus
        //    Backward-compat shim: getAudioModulation() return values are mapped
        //    to the canonical vis_* bus channels so all 113 existing modes work unchanged.
        if (this.currentMode && this.currentMode.getAudioModulation) {
            const mod = this.currentMode.getAudioModulation();
            if (mod) {
                // Map legacy keys â†’ bus channels
                if (mod.filterMod  !== undefined) this.mathEngine.write('vis_filterMod', mod.filterMod);
                if (mod.lfoRate    !== undefined) this.mathEngine.write('vis_lfoRate',   mod.lfoRate);
                if (mod.detuneMod  !== undefined) this.mathEngine.write('vis_detune',    0.5 + mod.detuneMod * 0.5);
                if (mod.harmonics  !== undefined) this.mathEngine.write('vis_chaos',     mod.harmonics);
                // Any mode that wrote directly via write() already has vis_* set
            }
        }

        // 4. Synth reads vis_*, applies to voices, writes aud_* back to bus
        this.synthEngine.updateFromMath(dt);

        // 5. Render visualization
        this.renderer.render(this.mathEngine, dt);

        // 5.5 Render video overlay (if active)
        if (this.videoPlayer && this.videoPlayer.isActive) {
            this.videoPlayer.render();
        }

        // 5.6 Render audio player overlay (if active)
        if (this.audioPlayer && this.audioPlayer.isActive) {
            this.audioPlayer.render();
        }

        // 6. Render UI overlay (dial, on-screen keyboard, Compass)
        this.uiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.dial.render(this.uiCtx, window.innerWidth, window.innerHeight, this.mathEngine);
        
        // Update Compass
        if (this.compassUI) {
            this.compassUI.update(this.uiCtx, dt, this.mathEngine);
        }

        // Update reactivity glow color to match current hue
        if (this._reactGlow || (this._reactGlow = document.getElementById('reactivity-glow'))) {
            const hue = this.mathEngine.get('colorHue');
            const reactivity = this.mathEngine.get('reactivity');
            this._reactGlow.style.background = `linear-gradient(to top, hsla(${hue}, 60%, 40%, ${0.05 + reactivity * 0.15}), hsla(${hue}, 70%, 60%, ${0.1 + reactivity * 0.25}))`;
        }

        // 7. Update on-screen keyboard highlights
        this._updateOnScreenKeyboard();



        // 8. The Dive (Infinite Horizon Transition)
        if (this.diveAlpha > 0) {
            this.uiCtx.fillStyle = `rgba(255, 255, 255, ${this.diveAlpha})`;
            this.uiCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.diveAlpha *= 0.85;
        }

        // 9. Showcase mode
        if (this.showcaseActive) {
            this.showcaseTimer += dt;

            // Advance to next mode when timer expires
            if (this.showcaseTimer >= this.showcaseDuration) {
                this.showcaseTimer = 0;
                this._advanceShowcase();
            }

            // Generate demo notes
            this._showcasePlayNotes(dt);

            // Draw mode name overlay
            const uiCtx = this.uiCtx;
            const sw = window.innerWidth;
            const sh = window.innerHeight;

            // Fade the transition alpha
            if (this.showcaseTransitionAlpha > 0) {
                this.showcaseTransitionAlpha *= 0.97;
                if (this.showcaseTransitionAlpha < 0.01) this.showcaseTransitionAlpha = 0;
            }

            // Mode name label (bottom center)
            const nameAlpha = Math.max(0.15, this.showcaseTransitionAlpha);
            const modeIndex = this.showcaseIndex + 1;
            const modeTotal = this.showcaseModeList.length;

            uiCtx.save();
            uiCtx.textAlign = 'center';
            uiCtx.textBaseline = 'bottom';

            // Mode name
            uiCtx.font = '600 32px Inter, system-ui, sans-serif';
            uiCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + nameAlpha * 0.7})`;
            uiCtx.shadowColor = 'rgba(0,0,0,0.6)';
            uiCtx.shadowBlur = 8;
            uiCtx.fillText(this.showcaseModeName, sw / 2, sh - 80);

            // Counter
            uiCtx.font = '400 14px Inter, system-ui, sans-serif';
            uiCtx.fillStyle = `rgba(200, 200, 200, ${0.2 + nameAlpha * 0.4})`;
            uiCtx.fillText(`${modeIndex} / ${modeTotal}`, sw / 2, sh - 56);

            // Progress bar
            const barW = 200;
            const barH = 2;
            const barX = (sw - barW) / 2;
            const barY = sh - 48;
            const progress = this.showcaseTimer / this.showcaseDuration;
            uiCtx.fillStyle = `rgba(255, 255, 255, 0.08)`;
            uiCtx.fillRect(barX, barY, barW, barH);
            const hue = this.mathEngine.get('colorHue');
            uiCtx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.3 + nameAlpha * 0.4})`;
            uiCtx.fillRect(barX, barY, barW * progress, barH);

            uiCtx.shadowBlur = 0;
            uiCtx.restore();
        }

        requestAnimationFrame((t) => this._loop(t));
    }

    /**
     * Update on-screen keyboard key highlights
     */
    _updateOnScreenKeyboard() {
        const states = this.keyboard.getKeyStates();
        for (const [key, state] of states) {
            const id = `key-${key === ';' ? 'semicolon' : key === ',' ? 'comma' : key === '.' ? 'period' : key === '/' ? 'slash' : key}`;
            const el = document.getElementById(id);
            if (el) {
                if (state.active) {
                    el.classList.add('active');
                    // Tint active key with current color
                    const hue = this.mathEngine.get('colorHue');
                    el.style.background = `hsla(${hue}, 70%, 50%, 0.25)`;
                    el.style.borderColor = `hsla(${hue}, 70%, 50%, 0.4)`;
                    el.style.boxShadow = `0 0 12px hsla(${hue}, 70%, 50%, 0.2)`;
                } else {
                    el.classList.remove('active');
                    el.style.background = '';
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                }
            }
        }
    }

    // â”€â”€â”€ Audio Controls (dropped audio with viz) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _showAudioControls(show) {
        const section = document.getElementById('audio-controls');
        if (!section) return;
        section.style.display = show ? 'flex' : 'none';

        if (!show) {
            this._setDialVisible(true);
            return;
        }

        if (!this._audioControlsWired) {
            this._audioControlsWired = true;

            const vizSelect    = document.getElementById('audio-viz');
            const ySlider      = document.getElementById('audio-viz-y');
            const xSlider      = document.getElementById('audio-viz-x');
            const sizeSlider   = document.getElementById('audio-viz-size');
            const hueSlider    = document.getElementById('audio-viz-hue');
            const playPauseBtn = document.getElementById('audio-playpause-btn');
            const restartBtn   = document.getElementById('audio-restart-btn');
            const hideDialChk  = document.getElementById('audio-hide-dial');
            const recordBtn    = document.getElementById('audio-record-btn');
            const recordLabel  = document.getElementById('audio-record-label');
            const recordDot    = document.getElementById('audio-record-dot');
            const stopBtn      = document.getElementById('audio-stop-btn');
            const bgBtn        = document.getElementById('audio-bg-btn');
            const bgInput      = document.getElementById('audio-bg-input');
            const bgLabel      = document.getElementById('audio-bg-label');

            if (vizSelect)  vizSelect.addEventListener('change', () => this.audioPlayer.setViz(vizSelect.value));
            if (ySlider)    ySlider.addEventListener('input',    () => this.audioPlayer.setYPosition(parseFloat(ySlider.value)));
            if (xSlider)    xSlider.addEventListener('input',    () => this.audioPlayer.setXPosition(parseFloat(xSlider.value)));
            if (sizeSlider) sizeSlider.addEventListener('input', () => this.audioPlayer.setSize(parseFloat(sizeSlider.value)));
            if (hueSlider)  hueSlider.addEventListener('input',  () => this.audioPlayer.setHueShift(parseInt(hueSlider.value)));

            if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.audioPlayer.playPause());
            if (restartBtn) restartBtn.addEventListener('click', () => this.audioPlayer.restart());

            if (hideDialChk) {
                hideDialChk.addEventListener('change', () => this._setDialVisible(!hideDialChk.checked));
            }

            // Background image picker
            if (bgBtn && bgInput) {
                bgBtn.addEventListener('click', () => bgInput.click());
                bgInput.addEventListener('change', () => {
                    if (bgInput.files && bgInput.files[0]) {
                        this.audioPlayer.setBackgroundImage(bgInput.files[0]);
                        if (bgLabel) bgLabel.textContent = bgInput.files[0].name.substring(0, 16);
                        bgBtn.style.background = 'rgba(120,80,220,0.35)';
                        bgBtn.style.borderColor = 'rgba(120,80,220,0.6)';
                    }
                });
            }

            // Label overlay controls
            const aLabelText = document.getElementById('audio-label-text');
            const aLabelFont = document.getElementById('audio-label-font');
            const aLabelSize = document.getElementById('audio-label-size');
            const aLabelPos  = document.getElementById('audio-label-pos');
            if (aLabelText) aLabelText.addEventListener('input',  () => this.audioPlayer.setLabel(aLabelText.value));
            if (aLabelFont) aLabelFont.addEventListener('change', () => this.audioPlayer.setLabelFont(aLabelFont.value));
            if (aLabelSize) aLabelSize.addEventListener('input',  () => this.audioPlayer.setLabelSize(parseInt(aLabelSize.value)));
            if (aLabelPos)  aLabelPos.addEventListener('change',  () => this.audioPlayer.setLabelPosition(aLabelPos.value));

            if (recordBtn) {
                recordBtn.addEventListener('click', () => {
                    if (this.audioPlayer.isRecording) {
                        this.audioPlayer.stopRecording();
                    } else {
                        this.audioPlayer.restart();
                        this.audioPlayer.startRecording();
                    }
                });
            }

            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    this.audioPlayer.stop();
                    this._showAudioControls(false);
                });
            }

            // Sync play/pause button icon
            this.audioPlayer.onPlayStateChange = (isPlaying) => {
                if (playPauseBtn) playPauseBtn.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
            };

            // Sync record button state
            this.audioPlayer.onRecordStateChange = (isRec) => {
                if (!recordLabel || !recordDot) return;
                recordLabel.textContent = isRec ? 'Stop Rec' : 'Record';
                recordDot.style.background = isRec ? '#ff2222' : '#f55';
                recordDot.style.boxShadow  = isRec ? '0 0 6px #ff2222' : 'none';
                if (recordBtn) recordBtn.style.background = isRec ? 'rgba(220,30,30,0.35)' : 'rgba(220,50,50,0.18)';
            };

            // Auto-change viz
            const autoBtn = document.getElementById('audio-auto-viz-btn');
            const autoSec = document.getElementById('audio-auto-viz-sec');
            const aVizSelect = document.getElementById('audio-viz');
            if (autoBtn && aVizSelect) {
                let autoTimer = null;
                const startAuto = () => {
                    const sec = Math.max(3, parseInt(autoSec?.value) || 10);
                    autoTimer = setInterval(() => {
                        const opts = [...aVizSelect.options].map(o => o.value);
                        let next;
                        do { next = opts[Math.floor(Math.random() * opts.length)]; } while (next === aVizSelect.value && opts.length > 1);
                        aVizSelect.value = next;
                        this.audioPlayer.setViz(next);
                    }, sec * 1000);
                };
                const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };
                autoBtn.addEventListener('click', () => {
                    if (autoTimer) {
                        stopAuto();
                        autoBtn.textContent = 'Auto';
                        autoBtn.style.background = 'rgba(80,180,120,0.15)';
                        autoBtn.style.borderColor = 'rgba(80,180,120,0.3)';
                    } else {
                        startAuto();
                        autoBtn.textContent = 'Auto \u25cf';
                        autoBtn.style.background = 'rgba(80,180,120,0.4)';
                        autoBtn.style.borderColor = 'rgba(80,180,120,0.7)';
                    }
                });
                if (autoSec) autoSec.addEventListener('change', () => { if (autoTimer) { stopAuto(); startAuto(); } });
            }
        }
    }

    // â”€â”€â”€ Playlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _buildPlaylistUI() {
        if (this._playlistPanel) this._playlistPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'playlist-panel';
        panel.innerHTML = `
            <div class="pl-header">
                <span class="pl-title">PLAYLIST</span>
                <span class="pl-count">${this._playlist.length} tracks</span>
                <button class="pl-close" title="Clear playlist">&times;</button>
            </div>
            <div class="pl-tracks"></div>
            <div class="pl-controls">
                <button class="pl-btn" id="pl-prev" title="Previous">&#9664;&#9664;</button>
                <button class="pl-btn" id="pl-next" title="Next">&#9654;&#9654;</button>
            </div>
        `;
        Object.assign(panel.style, {
            position: 'fixed', top: '60px', right: '12px', width: '240px',
            background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
            zIndex: '20', fontFamily: 'Inter,system-ui,sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden'
        });

        // Header
        const header = panel.querySelector('.pl-header');
        Object.assign(header.style, {
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)'
        });
        const title = panel.querySelector('.pl-title');
        Object.assign(title.style, {
            fontSize: '10px', color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em', fontWeight: '600'
        });
        const count = panel.querySelector('.pl-count');
        Object.assign(count.style, {
            fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto'
        });
        const closeBtn = panel.querySelector('.pl-close');
        Object.assign(closeBtn.style, {
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: '16px', cursor: 'pointer', padding: '0 2px', lineHeight: '1'
        });
        closeBtn.addEventListener('click', () => {
            this._playlist = [];
            this._playlistIdx = -1;
            panel.remove();
            this._playlistPanel = null;
        });

        // Track list
        const trackList = panel.querySelector('.pl-tracks');
        Object.assign(trackList.style, {
            maxHeight: '280px', overflowY: 'auto', padding: '4px 0'
        });

        this._playlist.forEach((file, idx) => {
            const item = document.createElement('div');
            item.className = 'pl-track';
            item.dataset.idx = idx;
            const baseName = file.name.replace(/\.[^.]+$/, '');
            item.textContent = baseName;
            Object.assign(item.style, {
                padding: '5px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', transition: 'background 0.15s, color 0.15s',
                borderLeft: '2px solid transparent'
            });
            item.addEventListener('mouseenter', () => {
                if (idx !== this._playlistIdx)
                    item.style.background = 'rgba(255,255,255,0.04)';
            });
            item.addEventListener('mouseleave', () => {
                if (idx !== this._playlistIdx)
                    item.style.background = 'none';
            });
            item.addEventListener('click', () => this._playlistPlay(idx));
            trackList.appendChild(item);
        });

        // Controls
        const controls = panel.querySelector('.pl-controls');
        Object.assign(controls.style, {
            display: 'flex', justifyContent: 'center', gap: '8px',
            padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.06)'
        });
        panel.querySelectorAll('.pl-btn').forEach(btn => {
            Object.assign(btn.style, {
                background: 'rgba(255,255,255,0.06)', color: '#ccc',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                padding: '4px 14px', fontSize: '12px', cursor: 'pointer'
            });
        });
        panel.querySelector('#pl-prev').addEventListener('click', () => this._playlistPrev());
        panel.querySelector('#pl-next').addEventListener('click', () => this._playlistNext());

        document.body.appendChild(panel);
        this._playlistPanel = panel;
    }

    _playlistPlay(idx) {
        if (idx < 0 || idx >= this._playlist.length) return;
        this._playlistIdx = idx;
        const file = this._playlist[idx];
        const ext = file.name.split('.').pop().toLowerCase();
        const isVideo = ['mp4','webm','mov','mkv','m4v','avi','ogv'].includes(ext);

        if (isVideo) {
            this.audioPlayer.stop();
            this._showAudioControls(false);
            this.videoPlayer.load(file);
            this._showVideoControls(true);
        } else {
            this.videoPlayer.stop();
            this._showVideoControls(false);
            this.audioPlayer.load(file);
            this._showAudioControls(true);
        }
        this._playlistHighlight();
    }

    _playlistNext() {
        const next = this._playlistIdx + 1;
        if (next < this._playlist.length) {
            this._playlistPlay(next);
        }
    }

    _playlistPrev() {
        const prev = this._playlistIdx - 1;
        if (prev >= 0) {
            this._playlistPlay(prev);
        }
    }

    _playlistHighlight() {
        if (!this._playlistPanel) return;
        const items = this._playlistPanel.querySelectorAll('.pl-track');
        items.forEach((item, i) => {
            const active = i === this._playlistIdx;
            item.style.background = active ? 'rgba(100,140,255,0.12)' : 'none';
            item.style.color = active ? 'rgba(140,180,255,0.95)' : 'rgba(255,255,255,0.55)';
            item.style.borderLeftColor = active ? 'rgba(100,140,255,0.6)' : 'transparent';
        });
    }

    start() {
        this.isRunning = true;
        requestAnimationFrame((t) => this._loop(t));
    }
}

// Launch
window.addEventListener('DOMContentLoaded', () => {
    window.harmonia = new Harmonia();
});
