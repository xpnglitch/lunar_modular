import { PianoLibrary } from './PianoLibrary.js';

/**
 * MidiPlayer — Lightweight MIDI Sequencer
 * Plays back pre-encoded MIDI JSON pieces using the Harmonia SynthEngine.
 * Handles timing, note scheduling, and state management.
 */
export class MidiPlayer {
    constructor(synthEngine) {
        this.synth = synthEngine;
        this.onNoteOn = null;
        this.onNoteOff = null;
        this.currentPiece = null;
        this.playing = false;
        this.startTime = 0;
        this.nextNoteIndex = 0;
        this.notes = [];
        this.loop = true;
        this.velocityScale = 0.8;

        // Each noteOn gets a unique sequence number stored in _activeTokens.
        // The scheduled noteOff only fires when its captured seq still matches,
        // preventing stale callbacks from killing a newer voice on the same pitch.
        // Cleared on stop() and loop-reset to invalidate the entire outgoing batch.
        this._noteSeq      = 0;
        this._activeTokens = new Map(); // midi → seq
    }

    loadPiece(pieceId) {
        const piece = PianoLibrary[pieceId];
        if (!piece) return;
        this.currentPiece = piece;
        const raw = piece.generate ? piece.generate() : (piece.notes || []);
        this.notes = raw.sort((a, b) => a[1] - b[1]);
        this.pitchBends = piece.pitchBends ? piece.pitchBends().sort((a, b) => a[1] - b[1]) : [];
        this.stop();
    }

    play() {
        if (this.playing || !this.currentPiece) return;
        this.playing = true;
        this.startTime = performance.now() / 1000;
        this.nextNoteIndex = 0;
        this.nextPitchBendIndex = 0;
        this.schedule();
    }

    stop() {
        this.playing = false;
        this.nextNoteIndex = 0;
        this.nextPitchBendIndex = 0;
        // Release all currently sounding voices
        for (const midi of this._activeTokens.keys()) {
            this.synth.noteOff(midi);
            if (this.onNoteOff) this.onNoteOff(midi);
        }
        this._activeTokens.clear();
    }

    pause() {
        this.playing = !this.playing;
        if (this.playing) {
            this.startTime = (performance.now() / 1000) - (this.notes[this.nextNoteIndex]?.[1] || 0);
            this.schedule();
        }
    }

    /**
     * Internal update loop for scheduling notes and control changes
     */
    update() {
        if (!this.playing || !this.currentPiece) return;

        const currentTime = (performance.now() / 1000) - this.startTime;
        const bpmScale = 60 / this.currentPiece.bpm;
        
        // --- Process Notes ---
        while (this.nextNoteIndex < this.notes.length) {
            const [midi, onset, duration, velocity] = this.notes[this.nextNoteIndex];
            if (onset * bpmScale > currentTime) break;

            const frequency = Math.pow(2, (midi - 69) / 12) * 440;
            const vel       = velocity * this.velocityScale;

            // Assign a token for this specific note instance.  Any previous
            // token for this midi pitch is implicitly superseded.
            const seq = ++this._noteSeq;
            this._activeTokens.set(midi, seq);

            this.synth.noteOn(midi, frequency, vel);
            if (this.onNoteOn) {
                this.onNoteOn({ midi, frequency, velocity: vel, normalizedPosition: (midi - 21) / 88 });
            }

            const durationMs = Math.max(50, duration * bpmScale * 1000);
            setTimeout(() => {
                // Only release if this is still the active voice for this pitch.
                // Mismatches mean the song looped, stopped, or the note re-fired.
                if (this._activeTokens.get(midi) !== seq) return;
                this._activeTokens.delete(midi);
                this.synth.noteOff(midi);
                if (this.onNoteOff) this.onNoteOff(midi);
            }, durationMs);

            this.nextNoteIndex++;
        }

        // --- Process Pitch Bends ---
        while (this.nextPitchBendIndex < this.pitchBends.length) {
            const [onset, value] = this.pitchBends[this.nextPitchBendIndex];
            const scaledOnset = onset * bpmScale;

            if (scaledOnset <= currentTime) {
                if (this.synth.setPitchBend) {
                    this.synth.setPitchBend(value);
                }
                this.nextPitchBendIndex++;
            } else {
                break;
            }
        }

        // End of track
        if (this.nextNoteIndex >= this.notes.length) {
            if (this.loop) {
                // Release any still-sounding voices before restarting
                for (const midi of this._activeTokens.keys()) {
                    this.synth.noteOff(midi);
                    if (this.onNoteOff) this.onNoteOff(midi);
                }
                this._activeTokens.clear();
                this.nextNoteIndex = 0;
                this.nextPitchBendIndex = 0;
                this.startTime = performance.now() / 1000;
            } else {
                // Not looping — stop and release everything
                this.stop();
                return;
            }
        }

        requestAnimationFrame(() => this.update());
    }

    schedule() {
        requestAnimationFrame(() => this.update());
    }
}
