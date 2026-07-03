/** Minimal .mid file parser — returns { bpm, notes: [[midi, onsetSec, durationSec, velocity]] } */
export function parseMidiFile(arrayBuffer) {
    const d = new DataView(arrayBuffer);
    let pos = 0;
    const read = (n) => { const v = []; for (let i = 0; i < n; i++) v.push(d.getUint8(pos++)); return v; };
    const readU16 = () => { const v = d.getUint16(pos); pos += 2; return v; };
    const readU32 = () => { const v = d.getUint32(pos); pos += 4; return v; };
    const readVLQ = () => { let v = 0, b; do { b = d.getUint8(pos++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };

    // Header
    const hdr = String.fromCharCode(...read(4));
    if (hdr !== 'MThd') throw new Error('Not a MIDI file');
    readU32(); // header length
    const format = readU16();
    const numTracks = readU16();
    const ticksPerBeat = readU16();

    let bpm = 120;
    const allEvents = [];

    for (let t = 0; t < numTracks; t++) {
        const trkHdr = String.fromCharCode(...read(4));
        if (trkHdr !== 'MTrk') throw new Error('Bad track');
        const trkLen = readU32();
        const trkEnd = pos + trkLen;
        let tick = 0, lastStatus = 0;

        while (pos < trkEnd) {
            tick += readVLQ();
            let status = d.getUint8(pos);
            if (status < 0x80) { status = lastStatus; } else { pos++; lastStatus = status; }
            const cmd = status & 0xf0;

            if (cmd === 0x90 || cmd === 0x80) {
                const note = d.getUint8(pos++);
                const vel = d.getUint8(pos++);
                allEvents.push({ tick, cmd: (cmd === 0x90 && vel > 0) ? 'on' : 'off', note, vel: vel / 127, track: t });
            } else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) { pos += 2; }
            else if (cmd === 0xc0 || cmd === 0xd0) { pos += 1; }
            else if (status === 0xff) {
                const type = d.getUint8(pos++);
                const len = readVLQ();
                if (type === 0x51 && len === 3) { // tempo
                    const uspqn = (d.getUint8(pos) << 16) | (d.getUint8(pos + 1) << 8) | d.getUint8(pos + 2);
                    bpm = Math.round(60000000 / uspqn);
                }
                pos += len;
            } else if (status === 0xf0 || status === 0xf7) { const len = readVLQ(); pos += len; }
            else { /* unknown */ }
        }
        pos = trkEnd;
    }

    // Convert to [midi, onsetSec, durationSec, velocity]
    const secPerTick = 60 / (bpm * ticksPerBeat);
    const noteOns = new Map();
    const notes = [];

    allEvents.sort((a, b) => a.tick - b.tick);
    for (const ev of allEvents) {
        const key = `${ev.track}-${ev.note}`;
        if (ev.cmd === 'on') {
            noteOns.set(key, ev);
        } else {
            const on = noteOns.get(key);
            if (on) {
                const onset = on.tick * secPerTick;
                const dur = Math.max(0.01, (ev.tick - on.tick) * secPerTick);
                notes.push([on.note, onset, dur, on.vel]);
                noteOns.delete(key);
            }
        }
    }
    // Close any hanging notes
    const lastTick = allEvents.length ? allEvents[allEvents.length - 1].tick : 0;
    for (const [, on] of noteOns) {
        notes.push([on.note, on.tick * secPerTick, Math.max(0.01, (lastTick - on.tick) * secPerTick), on.vel]);
    }
    notes.sort((a, b) => a[1] - b[1]);
    const duration = notes.length ? notes[notes.length - 1][1] + notes[notes.length - 1][2] : 0;
    return { bpm, notes, duration, noteCount: notes.length };
}
