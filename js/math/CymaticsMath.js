/**
 * CymaticsMath — Chladni plate pattern math.
 * Single note: static eigenfunction.
 * Chord: live interference (frequencies beat over time).
 */
export class CymaticsMath {
    constructor() {
        this.notes = new Map(); // noteIndex → { m, n, frequency }
        this.time  = 0;
    }

    _frequencyToMode(frequency) {
        const semitone = Math.round(12 * Math.log2(Math.max(20, frequency) / 16.35));
        const m = 1 + (semitone % 11);
        const n = 1 + ((semitone * 7 + 3) % 13);
        return { m, n };
    }

    addNote(noteIndex, frequency) {
        const { m, n } = this._frequencyToMode(frequency);
        this.notes.set(noteIndex, { m, n, frequency: Math.max(20, frequency) });
    }

    removeNote(noteIndex) {
        this.notes.delete(noteIndex);
    }

    get active() { return this.notes.size > 0; }
    get isChord() { return this.notes.size > 1; }

    /**
     * Sample displacement at normalised (x, y).
     * Chord: each mode oscillates at own frequency → real interference.
     */
    sample(x, y) {
        if (this.notes.size === 0) return 0;

        let total = 0;
        for (const { m, n, frequency } of this.notes.values()) {
            const phase = this.notes.size > 1
                ? Math.cos((frequency / 440) * 2.0 * this.time)
                : 1.0;
            const t1 = Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
            const t2 = Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y);
            total += (t1 - t2) * phase;
        }
        return total;
    }

    /**
     * Fast row/column separable bake into pre-allocated buffer.
     * Pre-computes cos(m*PI*x) for each column, cos(n*PI*y) for each row,
     * then combines — O(W+H) trig calls instead of O(W*H).
     */
    bakeFast(buf, resW, resH, morphT, prevM, prevN, doMorph) {
        if (this.notes.size === 0) return 0;

        // Gather active modes
        const modes = [];
        for (const { m, n, frequency } of this.notes.values()) {
            const phase = this.notes.size > 1
                ? Math.cos((frequency / 440) * 2.0 * this.time)
                : 1.0;
            modes.push({ m, n, phase });
        }

        // Pre-compute trig tables for each mode
        const tables = modes.map(({ m, n }) => {
            const cosM_x = new Float32Array(resW);
            const cosN_x = new Float32Array(resW);
            const cosM_y = new Float32Array(resH);
            const cosN_y = new Float32Array(resH);
            for (let px = 0; px < resW; px++) {
                const x = px / resW;
                cosM_x[px] = Math.cos(m * Math.PI * x);
                cosN_x[px] = Math.cos(n * Math.PI * x);
            }
            for (let py = 0; py < resH; py++) {
                const y = py / resH;
                cosM_y[py] = Math.cos(m * Math.PI * y);
                cosN_y[py] = Math.cos(n * Math.PI * y);
            }
            return { cosM_x, cosN_x, cosM_y, cosN_y };
        });

        // Pre-compute morph trig tables if needed
        let prevCosM_x, prevCosN_x, prevCosM_y, prevCosN_y;
        if (doMorph) {
            prevCosM_x = new Float32Array(resW);
            prevCosN_x = new Float32Array(resW);
            prevCosM_y = new Float32Array(resH);
            prevCosN_y = new Float32Array(resH);
            for (let px = 0; px < resW; px++) {
                const x = px / resW;
                prevCosM_x[px] = Math.cos(prevM * Math.PI * x);
                prevCosN_x[px] = Math.cos(prevN * Math.PI * x);
            }
            for (let py = 0; py < resH; py++) {
                const y = py / resH;
                prevCosM_y[py] = Math.cos(prevM * Math.PI * y);
                prevCosN_y[py] = Math.cos(prevN * Math.PI * y);
            }
        }

        let maxVal = 1e-5;

        for (let py = 0; py < resH; py++) {
            const rowOff = py * resW;
            for (let px = 0; px < resW; px++) {
                let v = 0;
                for (let mi = 0; mi < modes.length; mi++) {
                    const t = tables[mi];
                    const t1 = t.cosM_x[px] * t.cosN_y[py];
                    const t2 = t.cosN_x[px] * t.cosM_y[py];
                    v += (t1 - t2) * modes[mi].phase;
                }

                if (doMorph) {
                    const vPrev = prevCosM_x[px] * prevCosN_y[py]
                                - prevCosN_x[px] * prevCosM_y[py];
                    v = vPrev + (v - vPrev) * morphT;
                }

                const absV = Math.abs(v);
                buf[rowOff + px] = absV;
                if (absV > maxVal) maxVal = absV;
            }
        }

        return maxVal;
    }

    tick(dt) { this.time += dt; }

    getAudioModulation() {
        return { filterMod: this.active ? 0.7 : 0.2, lfoRate: 0.3, detuneMod: 0.1 };
    }
}
