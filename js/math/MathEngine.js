/**
 * MathEngine — The heart of Harmonia
 * Maintains a shared parameter vector that drives BOTH visuals and audio.
 * The Dial sweeps this vector. Both Renderer and SynthEngine read from it.
 */
export class MathEngine {
    constructor() {
        // The shared parameter vector — THE source of truth
        this.params = {
            complexity: 0.3,     // 0-1: The Dial's primary output
            intensity: 0.3,      // 0-1: Derived from complexity (non-linear)
            speed: 0.4,          // 0-1: Evolution rate of the math
            colorHue: 220,       // 0-360: Base hue (HSL degrees)
            filterCutoff: 0.4,   // 0-1: Maps to synth low-pass filter
            detune: 0.0,         // 0-1: Maps to oscillator detuning
            reverbMix: 0.4,      // 0-1: Wet/dry reverb ratio
            harmonics: 0.2,      // 0-1: Oscillator waveshape blend
            reactivity: 0.5,     // 0-1: Sound→visual coupling strength

            // ── SIGNAL BUS: Visual → Audio ────────────────────────────────
            // Written by visual modes each frame, read by SynthEngine
            vis_filterMod: 0.5,  // 0-1  filter cutoff modulation
            vis_lfoRate:   0.2,  // 0-1  LFO speed (maps to 0–12 Hz)
            vis_detune:    0.5,  // 0-1  detuning (0.5 = center / no detune)
            vis_chaos:     0.0,  // 0-1  entropy/complexity of the visual
            vis_speed:     0.0,  // 0-1  velocity of the visual system

            // ── SIGNAL BUS: Audio → Visual ────────────────────────────────
            // Written by SynthEngine each frame, read by visual modes
            aud_envelope:  0.0,  // 0-1  master amplitude envelope level
            aud_lfoPhase:  0.0,  // 0-1  LFO phase (cycles 0→1 at lfoRate Hz)
            aud_filterPos: 0.5,  // 0-1  current filter cutoff position
            aud_voiceCount:0.0,  // 0-1  active voices / maxVoices
        };

        // Smoothed params (lerped toward target for smooth transitions)
        this.smoothParams = { ...this.params };
        this.smoothFactor = 0.08;

        // Active notes (set by keyboard)
        this.activeNotes = new Map(); // noteIndex → { frequency, velocity, startTime }

        // Time tracking
        this.time = 0;

        // FFT / Analyser reference
        this.analyser = null;
        this.analyserData = null;
    }

    /**
     * Set the Dial value (0-1) and update all derived parameters
     */
    setDialValue(value) {
        // NaN Guard: default to 0.3 if value is invalid
        let v = parseFloat(value);
        if (isNaN(v)) v = 0.3;
        v = Math.max(0, Math.min(1, v));

        // Non-linear mappings along curated "beauty paths"
        this.params.complexity = v;
        this.params.intensity = Math.pow(v, 1.5);
        this.params.speed = 0.15 + v * 0.7;
        this.params.filterCutoff = 0.15 + v * 0.75;
        this.params.detune = v * 0.5;
        this.params.reverbMix = 0.6 - v * 0.35; // More reverb when calm, less when intense
        this.params.harmonics = Math.pow(v, 2);

        // Color journey: purple(270) → blue(220) → cyan(180) → gold(45) → red(0)
        if (v < 0.33) {
            this.params.colorHue = 270 - (v / 0.33) * 90; // 270 → 180
        } else if (v < 0.66) {
            const t = (v - 0.33) / 0.33;
            this.params.colorHue = 180 - t * 135; // 180 → 45
        } else {
            const t = (v - 0.66) / 0.34;
            this.params.colorHue = 45 - t * 45; // 45 → 0
        }

        // Final safety check for colorHue
        if (isNaN(this.params.colorHue)) this.params.colorHue = 220;
    }

    /**
     * Set the Reactivity slider value (0-1)
     * Controls how strongly sound/notes couple to the visual.
     */
    setReactivity(value) {
        let v = parseFloat(value);
        if (isNaN(v)) v = 0.5;
        this.params.reactivity = Math.max(0, Math.min(1, v));
    }

    /**
     * Update smoothed parameters (call each frame)
     */
    update(dt) {
        this.time += dt;

        for (const key of Object.keys(this.params)) {
            if (!(key in this.smoothParams)) this.smoothParams[key] = this.params[key];
            this.smoothParams[key] += (this.params[key] - this.smoothParams[key]) * this.smoothFactor;
        }
    }

    /**
     * Write a normalized value (0-1) to the signal bus.
     * Used by visual modes (vis_*) and the synth engine (aud_*).
     * Values outside [0,1] are clamped unless key is 'colorHue' or starts with 'vis_detune'.
     */
    write(key, value) {
        // detune is centered at 0.5, allow full 0-1 range
        // colorHue is 0-360
        if (key === 'colorHue') {
            this.params[key] = value;
        } else {
            this.params[key] = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Get the smoothed parameter value
     */
    get(key) {
        return this.smoothParams[key];
    }

    /**
     * Get raw (un-smoothed) parameter value
     */
    getRaw(key) {
        return this.params[key];
    }

    /**
     * Register a note on
     */
    noteOn(noteIndex, frequency, velocity = 1.0) {
        this.activeNotes.set(noteIndex, {
            frequency,
            velocity,
            startTime: this.time,
        });
    }

    /**
     * Register a note off
     */
    noteOff(noteIndex) {
        this.activeNotes.delete(noteIndex);
    }

    /**
     * Get number of active notes (useful for visual intensity)
     */
    get noteCount() {
        return this.activeNotes.size;
    }

    /**
     * Get active notes as an array with spatial data.
     * Returns [{x, y, velocity, frequency}, ...]
     */
    getActiveNotes() {
        const result = [];
        for (const note of this.activeNotes.values()) {
            const nx = Math.min(1, Math.max(0, Math.log2(note.frequency / 20) / 10));
            result.push({
                x: nx * 800,
                y: 300 + Math.sin(note.startTime * 0.5) * 150,
                velocity: note.velocity,
                frequency: note.frequency,
            });
        }
        return result;
    }

    /**
     * Get the 'Light-Pressure' force vector
     * Returns a weighted average position of active notes, scaled by velocity.
     * This acts as a physical force for modes like Metaballs and Boids.
     */
    getLightPressure() {
        if (this.activeNotes.size === 0) return { x: 0.5, y: 0.5, force: 0 };
        
        let tx = 0, ty = 0, totalForce = 0;
        for (const note of this.activeNotes.values()) {
            // frequency determines X (left to right), velocity determines force
            const nx = Math.min(1, Math.max(0, (Math.log2(note.frequency / 20) / 10)));
            const ny = 0.5 + Math.sin(note.startTime * 0.5) * 0.2; // some vertical drift
            tx += nx * note.velocity;
            ty += ny * note.velocity;
            totalForce += note.velocity;
        }
        
        return {
            x: tx / totalForce,
            y: ty / totalForce,
            force: totalForce / this.activeNotes.size
        };
    }

    /**
     * Set the Web Audio Analyser node for FFT access
     */
    setAnalyser(analyser) {
        this.analyser = analyser;
        this.analyserData = new Uint8Array(analyser.frequencyBinCount);
    }

    /**
     * Get the current FFT byte frequency data
     */
    getAnalyserData() {
        if (!this.analyser) return null;
        this.analyser.getByteFrequencyData(this.analyserData);
        return this.analyserData;
    }

    /**
     * Get the current time domain (waveform) data
     */
    getByteTimeDomainData() {
        if (!this.analyser) return new Uint8Array(1024).fill(128);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(data);
        return data;
    }
}
