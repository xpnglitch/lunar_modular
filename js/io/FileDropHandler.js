/**
 * FileDropHandler — Universal drag-and-drop file import for Harmonia.
 * 
 * Supported file types:
 *   - MIDI (.mid, .midi)  → parse binary MIDI, feed note events to synth/visuals
 *   - Audio (.mp3, .wav, .ogg, .flac, .webm) → decode & play through Web Audio, drive visuals from analysis
 *   - Image (.png, .jpg, .jpeg, .gif, .webp) → extract palette, apply hue to dial
 *   - JSON (.json) → detect Harmonia piece format, load as MIDI sequence
 */
export class FileDropHandler {
    constructor() {
        this.onMidiLoaded = null;      // (notes, bpm, name) => void
        this.onAudioLoaded = null;     // (audioBuffer, name) => void
        this.onAudioFileLoaded = null; // (file, name) => void — raw File for AudioPlayer
        this.onImagePalette = null;    // (dominantHue, name) => void
        this.onJsonPiece = null;       // (pieceData, name) => void
        this.onVideoLoaded = null;     // (file, name) => void
        this.onStatusMessage = null;   // (message, type) => void
        this.onPlaylistLoaded = null;  // (files[]) => void — multiple media files dropped

        this.overlay = null;
        this.dropIcon = null;
        this.dropLabel = null;
        this.dropSub = null;
        this.dragCounter = 0;

        this._buildOverlay();
        this._bindEvents();
    }

    // ─── UI ─────────────────────────────────────────────────────────
    _buildOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'file-drop-overlay';
        this.overlay.innerHTML = `
            <div class="drop-zone">
                <div class="drop-icon" id="drop-icon">📁</div>
                <div class="drop-label" id="drop-label">Drop file here</div>
                <div class="drop-sub" id="drop-sub">MIDI • Audio • Images • JSON</div>
                <div class="drop-types">
                    <span class="drop-type-pill">🎹 .mid</span>
                    <span class="drop-type-pill">🎵 .mp3 .wav .ogg .flac</span>
                    <span class="drop-type-pill">🖼️ .png .jpg .gif .webp</span>
                    <span class="drop-type-pill">📋 .json</span>
                    <span class="drop-type-pill">🎬 .mp4 .webm .mov</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.dropIcon = this.overlay.querySelector('#drop-icon');
        this.dropLabel = this.overlay.querySelector('#drop-label');
        this.dropSub = this.overlay.querySelector('#drop-sub');
    }

    _showOverlay(fileType) {
        this.overlay.classList.add('visible');
        // Contextual label based on hover
        if (fileType) {
            const icons = { midi: '🎹', audio: '🎵', image: '🖼️', json: '📋', video: '🎬' };
            const labels = {
                midi: 'Drop to play MIDI',
                audio: 'Drop to play audio',
                image: 'Drop to extract palette',
                json: 'Drop to load piece',
                video: 'Drop to play video'
            };
            this.dropIcon.textContent = icons[fileType] || '📁';
            this.dropLabel.textContent = labels[fileType] || 'Drop file here';
        } else {
            this.dropIcon.textContent = '📁';
            this.dropLabel.textContent = 'Drop file here';
        }
    }

    _hideOverlay() {
        this.overlay.classList.remove('visible');
    }

    _flashStatus(message, type = 'success') {
        if (this.onStatusMessage) {
            this.onStatusMessage(message, type);
        }
        // Also show a brief toast on the overlay
        this._showToast(message, type);
    }

    _showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `drop-toast drop-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, 2500);
    }

    // ─── EVENTS ─────────────────────────────────────────────────────
    _bindEvents() {
        // Drag enter/leave on window — show/hide overlay
        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.dragCounter++;
            if (this.dragCounter === 1) {
                const fileType = this._detectDragType(e);
                this._showOverlay(fileType);
            }
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dragCounter--;
            if (this.dragCounter <= 0) {
                this.dragCounter = 0;
                this._hideOverlay();
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dragCounter = 0;
            this._hideOverlay();

            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            // Multiple media files → build playlist
            if (files.length > 1) {
                const mediaFiles = [];
                for (const f of files) {
                    const ext = f.name.split('.').pop().toLowerCase();
                    if (['mp3','wav','ogg','flac','aac','m4a','mp4','webm','mov','mkv','m4v','avi','ogv'].includes(ext)) {
                        mediaFiles.push(f);
                    }
                }
                if (mediaFiles.length > 1 && this.onPlaylistLoaded) {
                    this.onPlaylistLoaded(mediaFiles);
                    return;
                }
            }

            // Single file — original behaviour
            this._processFile(files[0]);
        });
    }

    _detectDragType(e) {
        if (!e.dataTransfer || !e.dataTransfer.items) return null;
        for (const item of e.dataTransfer.items) {
            const type = item.type;
            if (type === 'audio/midi' || type === 'audio/x-midi') return 'midi';
            if (type.startsWith('video/')) return 'video';
            if (type.startsWith('audio/')) return 'audio';
            if (type.startsWith('image/')) return 'image';
            if (type === 'application/json') return 'json';
        }
        return null;
    }

    // ─── FILE ROUTING ───────────────────────────────────────────────
    _processFile(file) {
        const name = file.name;
        const ext = name.split('.').pop().toLowerCase();

        if (['mid', 'midi'].includes(ext)) {
            this._handleMidi(file);
        } else if (['mp4', 'webm', 'mov', 'mkv', 'm4v', 'avi', 'ogv'].includes(ext)) {
            this._handleVideo(file);
        } else if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
            this._handleAudio(file);
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            this._handleImage(file);
        } else if (ext === 'json') {
            this._handleJson(file);
        } else {
            this._flashStatus(`Unsupported file type: .${ext}`, 'error');
        }
    }

    // ─── VIDEO ──────────────────────────────────────────────────────
    _handleVideo(file) {
        this._flashStatus(`Loading video: ${file.name}`, 'success');
        if (this.onVideoLoaded) {
            this.onVideoLoaded(file, file.name);
        }
    }

    // ─── MIDI PARSING ───────────────────────────────────────────────
    async _handleMidi(file) {
        try {
            this._flashStatus(`Loading MIDI: ${file.name}...`, 'info');
            const buffer = await file.arrayBuffer();
            const midi = this._parseMidiBuffer(buffer);
            
            if (midi.notes.length === 0) {
                this._flashStatus('No notes found in MIDI file', 'error');
                return;
            }

            this._flashStatus(`Loaded ${midi.notes.length} notes from ${file.name}`, 'success');
            if (this.onMidiLoaded) {
                this.onMidiLoaded(midi.notes, midi.bpm, file.name);
            }
        } catch (err) {
            console.error('MIDI parse error:', err);
            this._flashStatus(`Failed to parse MIDI: ${err.message}`, 'error');
        }
    }

    /**
     * Minimal MIDI binary parser — extracts note on/off events from standard MIDI files.
     * Handles format 0 and format 1 (merging all tracks).
     */
    _parseMidiBuffer(buffer) {
        const data = new DataView(buffer);
        let pos = 0;

        const readUint32 = () => { const v = data.getUint32(pos); pos += 4; return v; };
        const readUint16 = () => { const v = data.getUint16(pos); pos += 2; return v; };
        const readUint8 = () => data.getUint8(pos++);
        const readVarLen = () => {
            let value = 0;
            let byte;
            do {
                byte = readUint8();
                value = (value << 7) | (byte & 0x7F);
            } while (byte & 0x80);
            return value;
        };

        // Header chunk
        const headerId = readUint32();
        if (headerId !== 0x4D546864) throw new Error('Not a valid MIDI file');
        const headerLen = readUint32();
        const format = readUint16();
        const numTracks = readUint16();
        const ticksPerBeat = readUint16();

        // First pass: collect tempo changes from all tracks
        const tempoChanges = [{ tick: 0, usPerBeat: 500000 }]; // default 120bpm
        const savedPos = pos;

        for (let t = 0; t < numTracks; t++) {
            const trackId = readUint32();
            if (trackId !== 0x4D54726B) {
                const chunkLen = readUint32();
                pos += chunkLen;
                continue;
            }
            const trackLen = readUint32();
            const trackEnd = pos + trackLen;
            let tick = 0;
            let runningStatus = 0;

            while (pos < trackEnd) {
                tick += readVarLen();
                let statusByte = readUint8();

                if (statusByte === 0xFF) {
                    const metaType = readUint8();
                    const metaLen = readVarLen();
                    if (metaType === 0x51 && metaLen === 3) {
                        const usPerBeat = (readUint8() << 16) | (readUint8() << 8) | readUint8();
                        tempoChanges.push({ tick, usPerBeat });
                    } else {
                        pos += metaLen;
                    }
                    continue;
                }
                if (statusByte === 0xF0 || statusByte === 0xF7) {
                    pos += readVarLen();
                    continue;
                }

                let cmd;
                if (statusByte & 0x80) {
                    cmd = statusByte & 0xF0;
                    runningStatus = statusByte;
                } else {
                    cmd = runningStatus & 0xF0;
                    pos--;
                }

                switch (cmd) {
                    case 0x90: case 0x80: case 0xA0: case 0xB0: case 0xE0: pos += 2; break;
                    case 0xC0: case 0xD0: pos += 1; break;
                }
            }
            pos = trackEnd;
        }

        // Sort tempo changes by tick
        tempoChanges.sort((a, b) => a.tick - b.tick);

        // Build tick→seconds converter using tempo map
        const tickToSeconds = (targetTick) => {
            let seconds = 0;
            let lastTick = 0;
            let usPerBeat = 500000; // 120 bpm default

            for (const tc of tempoChanges) {
                if (tc.tick >= targetTick) break;
                const deltaTicks = tc.tick - lastTick;
                seconds += (deltaTicks / ticksPerBeat) * (usPerBeat / 1000000);
                lastTick = tc.tick;
                usPerBeat = tc.usPerBeat;
            }
            // Remaining ticks after last tempo change
            const remaining = targetTick - lastTick;
            seconds += (remaining / ticksPerBeat) * (usPerBeat / 1000000);
            return seconds;
        };

        // Second pass: collect note events
        pos = savedPos;
        const allNotes = [];

        for (let t = 0; t < numTracks; t++) {
            const trackId = readUint32();
            if (trackId !== 0x4D54726B) {
                const chunkLen = readUint32();
                pos += chunkLen;
                continue;
            }
            const trackLen = readUint32();
            const trackEnd = pos + trackLen;

            let tick = 0;
            let runningStatus = 0;
            const activeNotes = new Map();

            while (pos < trackEnd) {
                const delta = readVarLen();
                tick += delta;

                let statusByte = readUint8();

                if (statusByte === 0xFF) {
                    const metaType = readUint8();
                    const metaLen = readVarLen();
                    pos += metaLen; // skip (already collected tempos)
                    continue;
                }
                if (statusByte === 0xF0 || statusByte === 0xF7) {
                    pos += readVarLen();
                    continue;
                }

                let cmd, channel;
                if (statusByte & 0x80) {
                    cmd = statusByte & 0xF0;
                    channel = statusByte & 0x0F;
                    runningStatus = statusByte;
                } else {
                    cmd = runningStatus & 0xF0;
                    channel = runningStatus & 0x0F;
                    pos--;
                }

                switch (cmd) {
                    case 0x90: {
                        const note = readUint8();
                        const vel = readUint8();
                        if (channel === 9) break; // Skip drum channel
                        if (vel > 0) {
                            activeNotes.set(note + channel * 1000, { tick, velocity: vel / 127 });
                        } else {
                            const active = activeNotes.get(note + channel * 1000);
                            if (active) {
                                const onsetSec = tickToSeconds(active.tick);
                                const offSec = tickToSeconds(tick);
                                allNotes.push([note, onsetSec, offSec - onsetSec, active.velocity]);
                                activeNotes.delete(note + channel * 1000);
                            }
                        }
                        break;
                    }
                    case 0x80: {
                        const note = readUint8();
                        readUint8();
                        if (channel === 9) break; // Skip drum channel
                        const active = activeNotes.get(note + channel * 1000);
                        if (active) {
                            const onsetSec = tickToSeconds(active.tick);
                            const offSec = tickToSeconds(tick);
                            allNotes.push([note, onsetSec, offSec - onsetSec, active.velocity]);
                            activeNotes.delete(note + channel * 1000);
                        }
                        break;
                    }
                    case 0xA0: pos += 2; break;
                    case 0xB0: pos += 2; break;
                    case 0xC0: pos += 1; break;
                    case 0xD0: pos += 1; break;
                    case 0xE0: pos += 2; break;
                    default: break;
                }
            }
            pos = trackEnd;
        }

        allNotes.sort((a, b) => a[1] - b[1]);
        const bpm = Math.round(60000000 / tempoChanges[tempoChanges.length - 1].usPerBeat);
        return { notes: allNotes, bpm };
    }

    // ─── AUDIO DECODE ───────────────────────────────────────────────
    async _handleAudio(file) {
        // If a file-based handler is set (AudioPlayer), pass the raw File directly
        if (this.onAudioFileLoaded) {
            this._flashStatus(`Loading audio: ${file.name}`, 'success');
            this.onAudioFileLoaded(file, file.name);
            return;
        }

        try {
            this._flashStatus(`Decoding audio: ${file.name}...`, 'info');
            const buffer = await file.arrayBuffer();

            // Create a temporary AudioContext for decoding
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await ctx.decodeAudioData(buffer);
            ctx.close();

            this._flashStatus(`Loaded audio: ${file.name} (${audioBuffer.duration.toFixed(1)}s)`, 'success');
            if (this.onAudioLoaded) {
                this.onAudioLoaded(audioBuffer, file.name);
            }
        } catch (err) {
            console.error('Audio decode error:', err);
            this._flashStatus(`Failed to decode audio: ${err.message}`, 'error');
        }
    }

    // ─── IMAGE PALETTE ──────────────────────────────────────────────
    async _handleImage(file) {
        try {
            this._flashStatus(`Analyzing image: ${file.name}...`, 'info');
            const url = URL.createObjectURL(file);
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            // Sample colors at low res
            const sampleCanvas = document.createElement('canvas');
            const sampleSize = 64;
            sampleCanvas.width = sampleSize;
            sampleCanvas.height = sampleSize;
            const sCtx = sampleCanvas.getContext('2d');
            sCtx.drawImage(img, 0, 0, sampleSize, sampleSize);
            const imgData = sCtx.getImageData(0, 0, sampleSize, sampleSize);

            URL.revokeObjectURL(url);

            // Extract dominant hue via histogram
            const hueHistogram = new Float32Array(360);
            for (let i = 0; i < imgData.data.length; i += 4) {
                const r = imgData.data[i] / 255;
                const g = imgData.data[i + 1] / 255;
                const b = imgData.data[i + 2] / 255;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;
                const saturation = max === 0 ? 0 : delta / max;
                const lightness = (max + min) / 2;

                // Only count sufficiently chromatic pixels
                if (saturation < 0.15 || lightness < 0.08 || lightness > 0.92) continue;

                let hue = 0;
                if (delta > 0) {
                    if (max === r) hue = ((g - b) / delta) % 6;
                    else if (max === g) hue = (b - r) / delta + 2;
                    else hue = (r - g) / delta + 4;
                    hue = Math.round(hue * 60);
                    if (hue < 0) hue += 360;
                }

                // Weight by saturation
                hueHistogram[hue] += saturation;
            }

            // Find peak hue (with 10° smoothing)
            let bestHue = 0, bestScore = 0;
            for (let h = 0; h < 360; h++) {
                let score = 0;
                for (let d = -5; d <= 5; d++) {
                    score += hueHistogram[(h + d + 360) % 360];
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestHue = h;
                }
            }

            this._flashStatus(`Palette extracted from ${file.name} — Hue: ${bestHue}°`, 'success');
            if (this.onImagePalette) {
                this.onImagePalette(bestHue, file.name);
            }
        } catch (err) {
            console.error('Image analysis error:', err);
            this._flashStatus(`Failed to analyze image: ${err.message}`, 'error');
        }
    }

    // ─── JSON PIECE ─────────────────────────────────────────────────
    async _handleJson(file) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            // Detect Harmonia MIDI JSON format — we expect an array of note arrays
            // Format: [[midi, onset, duration, velocity], ...]
            // OR an object with a .notes array
            let notes = null;
            let bpm = 120;

            if (Array.isArray(json)) {
                // Raw array of note events
                if (json.length > 0 && Array.isArray(json[0]) && json[0].length >= 3) {
                    notes = json;
                }
            } else if (json.notes && Array.isArray(json.notes)) {
                notes = json.notes;
                bpm = json.bpm || json.tempo || 120;
            } else if (json.tracks) {
                // Multi-track format — merge all tracks
                notes = [];
                for (const track of json.tracks) {
                    if (track.notes && Array.isArray(track.notes)) {
                        for (const n of track.notes) {
                            // Handle object-style notes: {midi, time, duration, velocity}
                            if (typeof n === 'object' && !Array.isArray(n)) {
                                notes.push([
                                    n.midi || n.pitch || 60,
                                    n.time || n.onset || 0,
                                    n.duration || n.dur || 0.5,
                                    n.velocity || n.vel || 0.7
                                ]);
                            } else if (Array.isArray(n)) {
                                notes.push(n);
                            }
                        }
                    }
                }
                bpm = json.header?.bpm || json.bpm || json.tempo || 120;
            }

            if (!notes || notes.length === 0) {
                this._flashStatus(`JSON doesn't contain recognized note data`, 'error');
                return;
            }

            // Normalize: ensure 4 elements per note
            notes = notes.map(n => [
                n[0] || 60,
                n[1] || 0,
                n[2] || 0.5,
                n[3] !== undefined ? n[3] : 0.7
            ]).sort((a, b) => a[1] - b[1]);

            this._flashStatus(`Loaded ${notes.length} notes from ${file.name}`, 'success');
            if (this.onMidiLoaded) {
                this.onMidiLoaded(notes, bpm, file.name);
            }
        } catch (err) {
            console.error('JSON parse error:', err);
            this._flashStatus(`Failed to parse JSON: ${err.message}`, 'error');
        }
    }
}
