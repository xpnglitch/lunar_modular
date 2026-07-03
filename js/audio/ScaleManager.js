/**
 * ScaleManager — Musical intelligence
 * Maps keyboard indices to frequencies, quantized to the selected scale.
 * Ensures everything sounds musical regardless of which keys you press.
 */
export class ScaleManager {
    constructor() {
        // Scale definitions: intervals in semitones from root
        this.scales = {
            pentatonic: [0, 2, 4, 7, 9],           // C D E G A
            minor: [0, 2, 3, 5, 7, 8, 10],    // Natural minor
            major: [0, 2, 4, 5, 7, 9, 11],    // Major
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            wholeTone: [0, 2, 4, 6, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
        };

        this.currentScale = 'pentatonic';
        this.rootNote = 48; // C3 in MIDI (middle C = 60, so C3 = 48)

        // Keyboard layout: 3 rows, left to right, bottom to top
        // This gives a linear ascending pitch mapping
        this.keyLayout = [
            // Bottom row (lowest octave)
            'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/',
            // Middle row
            'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',
            // Top row (highest octave)
            'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
        ];
    }

    /**
     * Get the key-to-index mapping (which key = which note index)
     */
    getKeyIndex(key) {
        const k = key.toLowerCase();
        const idx = this.keyLayout.indexOf(k);
        return idx >= 0 ? idx : -1;
    }

    /**
     * Convert a note index (0-29) to a MIDI note number
     * using the current scale and root note
     */
    indexToMidi(index) {
        const scale = this.scales[this.currentScale];
        const octave = Math.floor(index / scale.length);
        const degree = index % scale.length;
        return this.rootNote + octave * 12 + scale[degree];
    }

    /**
     * Convert a MIDI note number to frequency in Hz
     * A4 = 440Hz = MIDI 69
     */
    midiToFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * Get frequency for a keyboard key
     * Returns null if key is not mapped
     */
    getFrequency(key) {
        const index = this.getKeyIndex(key);
        if (index < 0) return null;
        const midi = this.indexToMidi(index);
        return this.midiToFrequency(midi);
    }

    /**
     * Get note info for a keyboard key
     */
    getNoteInfo(key) {
        const index = this.getKeyIndex(key);
        if (index < 0) return null;
        const midi = this.indexToMidi(index);
        return {
            index,
            midi,
            frequency: this.midiToFrequency(midi),
            // Normalized position 0-1 (for visual mapping: low notes left, high notes right)
            normalizedPosition: index / (this.keyLayout.length - 1),
        };
    }

    /**
     * Set the current scale
     */
    setScale(scaleName) {
        if (this.scales[scaleName]) {
            this.currentScale = scaleName;
        }
    }

    /**
     * Set root note by name (e.g., 'C', 'D', 'F#')
     */
    setRoot(noteName) {
        const noteMap = {
            'C': 48, 'C#': 49, 'Db': 49,
            'D': 50, 'D#': 51, 'Eb': 51,
            'E': 52, 'F': 53, 'F#': 54, 'Gb': 54,
            'G': 55, 'G#': 56, 'Ab': 56,
            'A': 57, 'A#': 58, 'Bb': 58,
            'B': 59,
        };
        if (noteMap[noteName] !== undefined) {
            this.rootNote = noteMap[noteName];
        }
    }

    /**
     * Get available scale names
     */
    getScaleNames() {
        return Object.keys(this.scales);
    }

    /**
     * Get total number of playable keys
     */
    get keyCount() {
        return this.keyLayout.length;
    }
}
