/**
 * EKGMonitorMode â€” Medical EKG-style multi-lead waveform display.
 * Ported from VideoPlayer overlay to standalone Harmonia mode.
 */
export class EKGMonitorMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.noteImpact = 0;
    }

    resize(w, h) {}

    onNoteOn(noteInfo) {
        if (noteInfo) this.noteImpact = Math.min(1, this.noteImpact + noteInfo.velocity * 0.5);
    }

    onNoteOff() {}

    render(ctx, w, h, mathEngine, dt) {
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const hue = mathEngine.get('colorHue');
        const complexity = mathEngine.get('complexity');
        const analyser = mathEngine.getAnalyserData();
        const timeData = mathEngine.getTimeDomainData ? mathEngine.getTimeDomainData() : null;

        this.time += dt * speed;
        this.noteImpact *= 0.95;

        const numLeads = 2 + Math.floor(complexity * 3);
        const leadH = (h * 0.7) / numLeads;
        const baseY = h * 0.15;
        const hueOffsets = [0, 120, 240, 60, 180];

        const energy = analyser ? Array.from(analyser.slice(0, 64)).reduce((a, b) => a + b, 0) / (64 * 255) : 0.3;

        ctx.globalCompositeOperation = 'lighter';

        for (let lead = 0; lead < numLeads; lead++) {
            const cy = baseY + lead * leadH + leadH * 0.5;
            const leadHue = (hue + hueOffsets[lead % hueOffsets.length]) % 360;

            // Grid lines
            ctx.strokeStyle = `hsla(${leadHue},40%,25%,0.15)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(w, cy);
            ctx.stroke();
            for (let g = 0; g < 5; g++) {
                const gy = cy + (g - 2) * (leadH * 0.2);
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }

            // EKG trace
            const step = w / 512;
            ctx.strokeStyle = `hsla(${leadHue},100%,65%,0.9)`;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 6 + energy * 12;
            ctx.shadowColor = `hsl(${leadHue},100%,60%)`;
            ctx.beginPath();

            for (let i = 0; i < 512; i++) {
                // Use time domain for waveform, modulated by freq band
                const waveVal = timeData ? (timeData[Math.floor(i * (timeData.length / 512))] / 128 - 1) : Math.sin(i * 0.05 + this.time * 5 + lead);
                const binIdx = analyser ? Math.floor((lead / numLeads + i / 512 * (1 / numLeads)) * analyser.length * 0.6) : 0;
                const freqMod = analyser ? analyser[Math.min(binIdx, analyser.length - 1)] / 255 : 0.3;
                const amp = leadH * 0.35 * (0.3 + freqMod * 0.7 + this.noteImpact * 0.3);
                const y = cy + waveVal * amp;
                i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
            }
            ctx.stroke();

            // Lead label
            ctx.shadowBlur = 0;
            ctx.fillStyle = `hsla(${leadHue},80%,60%,0.5)`;
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`LEAD ${lead + 1}`, 8, cy - leadH * 0.35);
        }

        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }

    clear() {
        this.time = 0;
        this.noteImpact = 0;
    }

    // EKG pulse peak → filter spike, pulse rate → lfoRate
    getAudioModulation() {
        const t = this.time || 0; const beat = Math.max(0, 1 - ((t % 1) * 3));
        return { filterMod: 0.3 + beat * 0.65, lfoRate: 0.15 + beat * 0.3, detuneMod: 0 };
    }
}