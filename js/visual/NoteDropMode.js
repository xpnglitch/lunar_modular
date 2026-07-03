/**
 * NoteDropMode — Guitar Hero-style note visualiser.
 *
 * 3 rows × 10 columns = 30 lanes, matching the QWERTY keyboard:
 *   Row 0  Q W E R T Y U I O P   Treble  MIDI 77-108   amber / orange
 *   Row 1  A S D F G H J K L ;   Mid     MIDI 49-76    emerald / cyan
 *   Row 2  Z X C V B N M , . /   Bass    MIDI 21-48    indigo / violet
 *
 * All notes fall from the very top of the window.  Each row has its own
 * hit bar just above its keyboard strip, stacked at the bottom of the screen:
 *
 *   y=0                    ╔═══ full-width runway ═══╗
 *                          ║  notes fall through here ║
 *   hitBarFrac[0]  ════════╬══ Q hit bar ════════════╣
 *                          ║  Q W E R T Y U I O P    ║
 *   hitBarFrac[1]  ════════╬══ A hit bar ════════════╣
 *                          ║  A S D F G H J K L ;    ║
 *   hitBarFrac[2]  ════════╬══ Z hit bar ════════════╣
 *                          ║  Z X C V B N M , . /    ║
 *   y=h            ════════╩═════════════════════════╝
 *
 * A note is rendered from y=0 at (lookahead) seconds before it plays,
 * arriving exactly at its row's hit bar when the note fires.
 */
export class NoteDropMode {
    constructor(mathEngine) {
        this.math        = mathEngine;
        this.midiPlayer  = null;
        this.initialized = false;
        this.width  = 0;
        this.height = 0;
        this.time   = 0;

        this.lookahead = 2.8; // seconds visible before the note plays

        // Rows top → bottom on screen; each row's hit bar fraction is computed
        // in _buildLayout() from the keyboard strip heights.
        this.ROWS = [
            { keys: ['Q','W','E','R','T','Y','U','I','O','P'], name: 'Treble', midiMin: 66, midiMax:  86, r: 255, g: 150, b:  25 },
            { keys: ['A','S','D','F','G','H','J','K','L',';'], name: 'Mid',    midiMin: 45, midiMax:  65, r:  30, g: 210, b: 140 },
            { keys: ['Z','X','C','V','B','N','M',',','.','/'], name: 'Bass',   midiMin: 24, midiMax:  44, r: 110, g:  55, b: 245 },
        ];

        // Active hits: `${rowIdx}-${col}` → timestamp
        this._hits  = new Map();
        this._layout = null;
    }

    setMidiPlayer(player) { this.midiPlayer = player; }

    resize(w, h) {
        this.width  = w;
        this.height = h;
        this.initialized = true;
        this._buildLayout(w, h);
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        let rowIdx, col;
        if (noteInfo.index !== undefined && noteInfo.index >= 0 && noteInfo.index < 30) {
            // Keyboard press: physical key layout (z-/ = row 0, a-; = row 1, q-p = row 2)
            rowIdx = Math.min(2, Math.floor(noteInfo.index / 10));
            col    = noteInfo.index % 10;
        } else {
            // MIDI player (index = midi number, outside 0-29)
            ({ rowIdx, col } = this._midiToCell(noteInfo.midi));
        }
        this._hits.set(`${rowIdx}-${col}`, this.time);
    }

    onNoteOff() {}
    getAudioModulation() { return { vibrato: 0, resonance: 0, harmonicSpace: 0 }; }

    // ── Helpers ───────────────────────────────────────────────────────────

    _midiToCell(midi) {
        for (let ri = 0; ri < this.ROWS.length; ri++) {
            const row = this.ROWS[ri];
            if (midi >= row.midiMin && midi <= row.midiMax) {
                const span = row.midiMax - row.midiMin + 1;
                const col  = Math.min(9, Math.floor((midi - row.midiMin) / span * 10));
                return { rowIdx: ri, col };
            }
        }
        return { rowIdx: 1, col: 4 };
    }

    _buildLayout(w, h) {
        // Keyboard area: 3 equal strips stacked at the bottom
        const kbRowH = Math.round(h * 0.09);   // each key row height
        const colW   = w / 10;

        // Row 0 (Q) is topmost keyboard row, row 2 (Z) is bottommost
        this._layout = this.ROWS.map((row, ri) => {
            const hitBarY = h - kbRowH * (3 - ri); // ri=0 → highest, ri=2 → lowest
            const kbY     = hitBarY;
            return { hitBarY, kbY, kbH: kbRowH };
        });

        this._colW   = colW;
        this._kbRowH = kbRowH;
    }

    // ── Main render ───────────────────────────────────────────────────────

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized || !this._layout) this.resize(w, h);
        this.time += dt;

        const runwayBottom = this._layout[0].hitBarY; // top of the keyboard block

        // ── Background ───────────────────────────────────────────────────
        ctx.fillStyle = '#07070f';
        ctx.fillRect(0, 0, w, h);

        // Faint per-column lane lines in the runway
        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        ctx.lineWidth   = 1;
        for (let c = 1; c < 10; c++) {
            const x = c * this._colW;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, runwayBottom); ctx.stroke();
        }

        // ── Falling notes ────────────────────────────────────────────────
        if (this.midiPlayer?.playing && this.midiPlayer.currentPiece) {
            const now      = (performance.now() / 1000) - this.midiPlayer.startTime;
            const bpmScale = 60 / this.midiPlayer.currentPiece.bpm;
            const la       = this.lookahead;

            for (const [midi, onset, duration, velocity] of this.midiPlayer.notes) {
                const noteTime  = onset * bpmScale;
                const timeUntil = noteTime - now;
                if (timeUntil > la || timeUntil < -0.45) continue;

                const { rowIdx, col } = this._midiToCell(midi);
                const row = this.ROWS[rowIdx];
                const ly  = this._layout[rowIdx];

                const cx    = col * this._colW + this._colW * 0.5;
                const hw    = this._colW * 0.5 - 2;

                // All notes fall from y=0; arrive at hitBarY when timeUntil==0
                const tFrac = 1 - timeUntil / la;             // 0 at top, 1 at hit bar
                const noteH = Math.max(8, Math.min(ly.hitBarY * 0.14,
                              duration * bpmScale * ly.hitBarY / la));
                const noteY = ly.hitBarY * tFrac - noteH;

                const fade  = timeUntil > 0 ? 1 : Math.max(0, 1 + timeUntil / 0.45);
                const alpha = 0.88 * fade;

                // Glow as note approaches its bar
                if (timeUntil >= 0 && timeUntil < 0.15) {
                    ctx.shadowBlur  = 18;
                    ctx.shadowColor = `rgb(${row.r},${row.g},${row.b})`;
                }

                const rx = cx - hw, rw = hw * 2, rr = Math.min(5, hw * 0.3);
                ctx.fillStyle = `rgba(${row.r},${row.g},${row.b},${alpha})`;
                ctx.beginPath(); ctx.roundRect(rx, noteY, rw, noteH, rr); ctx.fill();

                ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
                ctx.beginPath(); ctx.roundRect(rx, noteY, rw, Math.min(3, noteH * 0.25), rr); ctx.fill();

                ctx.shadowBlur = 0;
            }
        }

        // ── Hit bars & keyboard strips ───────────────────────────────────
        const fontSize = Math.max(9, Math.min(14, this._colW * 0.44));
        ctx.font         = `bold ${fontSize}px monospace`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        for (let ri = 0; ri < this.ROWS.length; ri++) {
            const row = this.ROWS[ri];
            const ly  = this._layout[ri];

            // Per-column hit pulse
            const pulse = new Float32Array(10);
            for (let c = 0; c < 10; c++) {
                const t = this._hits.get(`${ri}-${c}`);
                if (t !== undefined) {
                    const age = this.time - t;
                    pulse[c] = age < 0.25 ? 1 - age / 0.25 : 0;
                }
            }
            const rowPulse = Math.max(...pulse);

            // Hit bar
            ctx.shadowBlur  = 5 + rowPulse * 18;
            ctx.shadowColor = `rgb(${row.r},${row.g},${row.b})`;
            ctx.fillStyle   = `rgba(${row.r},${row.g},${row.b},${0.65 + rowPulse * 0.35})`;
            ctx.fillRect(0, ly.hitBarY - 2, w, rowPulse > 0 ? 5 : 2);
            ctx.shadowBlur  = 0;

            // Key cells
            for (let ci = 0; ci < 10; ci++) {
                const p  = pulse[ci];
                const kx = ci * this._colW + 1;
                const ky = ly.kbY + 1;
                const kw = this._colW - 2;
                const kh = ly.kbH - 2;

                ctx.fillStyle = p > 0
                    ? `rgba(${row.r},${row.g},${row.b},${0.20 + p * 0.80})`
                    : `rgba(${row.r},${row.g},${row.b},0.10)`;
                ctx.fillRect(kx, ky, kw, kh);

                ctx.strokeStyle = `rgba(${row.r},${row.g},${row.b},${0.25 + p * 0.40})`;
                ctx.lineWidth   = 0.5;
                ctx.strokeRect(kx, ky, kw, kh);

                if (p > 0) {
                    ctx.shadowBlur  = 10 * p;
                    ctx.shadowColor = `rgb(${row.r},${row.g},${row.b})`;
                    ctx.fillRect(kx, ky, kw, kh);
                    ctx.shadowBlur  = 0;
                }

                ctx.fillStyle = `rgba(255,255,255,${0.38 + p * 0.62})`;
                ctx.fillText(row.keys[ci], ci * this._colW + this._colW * 0.5, ly.kbY + ly.kbH * 0.5);
            }
        }

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign    = 'left';

        // ── Idle message ─────────────────────────────────────────────────
        if (!this.midiPlayer?.playing) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.font      = `${Math.max(12, Math.min(18, w / 80))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('Open the Piano player and press Play', w / 2, runwayBottom * 0.45);
            ctx.textAlign = 'left';
        }

        // Expire stale hits
        for (const [key, t] of this._hits) {
            if (this.time - t > 0.35) this._hits.delete(key);
        }
    }
}
