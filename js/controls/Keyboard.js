/**
 * Keyboard — Computer keyboard input handler
 * Maps key presses to musical notes via ScaleManager
 * Sends noteOn/noteOff events to both SynthEngine and visual mode
 */
export class Keyboard {
    constructor(scaleManager, synthEngine, mathEngine) {
        this.scale = scaleManager;
        this.synth = synthEngine;
        this.math = mathEngine;
        this.visualMode = null;
        this.aiPlayer = null;
        this.activeKeys = new Set();

        // On-screen keyboard state
        this.keyStates = new Map(); // key → { active, noteInfo }

        // Bind events
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);

        // Pre-populate key states for the on-screen keyboard
        for (const key of this.scale.keyLayout) {
            this.keyStates.set(key, { active: false, noteInfo: null });
        }
    }

    setVisualMode(mode) {
        this.visualMode = mode;
    }

    async _onKeyDown(e) {
        // Ignore if typing in an input/select
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        // Ignore modifier keys and repeats
        if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;

        const key = e.key.toLowerCase();

        // Check if this key is mapped to a note
        const noteInfo = this.scale.getNoteInfo(key);
        if (!noteInfo) return;

        e.preventDefault();

        // Don't re-trigger already active keys
        if (this.activeKeys.has(key)) return;
        this.activeKeys.add(key);

        // Initialize audio on first keypress
        await this.synth.init();
        await this.synth.resume();

        // Play the note
        this.synth.noteOn(noteInfo.index, noteInfo.frequency, 0.8);
        this.math.noteOn(noteInfo.index, noteInfo.frequency, 0.8);

        // Feed to AI player for accompaniment
        if (this.aiPlayer && this.aiPlayer.isPlaying) {
            this.aiPlayer.onUserNote(noteInfo.midi, 0.8);
        }

        // Trigger visual burst
        if (this.visualMode && this.visualMode.onNoteOn) {
            this.visualMode.onNoteOn({ ...noteInfo, velocity: 0.8 });
        }

        // Update key state for on-screen keyboard
        this.keyStates.set(key, { active: true, noteInfo });

        // Hide the startup hint
        const hint = document.getElementById('start-hint');
        if (hint) hint.classList.add('hidden');
    }

    _onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (!this.activeKeys.has(key)) return;
        this.activeKeys.delete(key);

        const noteInfo = this.scale.getNoteInfo(key);
        if (!noteInfo) return;

        e.preventDefault();

        // Release the note
        this.synth.noteOff(noteInfo.index);
        this.math.noteOff(noteInfo.index);

        // Notify visual mode of note release
        if (this.visualMode && this.visualMode.onNoteOff) {
            this.visualMode.onNoteOff(noteInfo.index);
        }

        // Update key state
        this.keyStates.set(key, { active: false, noteInfo: null });
    }

    /**
     * Get the current state of all keys (for on-screen keyboard rendering)
     */
    getKeyStates() {
        return this.keyStates;
    }

    /**
     * Check if any notes are active
     */
    get isPlaying() {
        return this.activeKeys.size > 0;
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}
