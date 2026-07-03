import { DataStreamMath } from '../math/DataStreamMath.js';

/**
 * DataStreamMode — Flowing binary/hex data visualization.
 * 
 * Columns of flowing data characters (binary, hex, symbols) stream
 * upward and across. Data packets highlight and pulse when notes
 * play. Information-dense, cyberpunk data-wall aesthetic.
 */
export class DataStreamMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new DataStreamMath();
        this.streams = [];
        this.packets = [];
        this.hexChars = '0123456789ABCDEF';
    }

    _initStreams(w, h) {
        this.streams = [];
        const fontSize = 12;
        const cols = Math.floor(w / (fontSize * 2));
        for (let c = 0; c < cols; c++) {
            this.streams.push({
                x: c * fontSize * 2 + fontSize,
                speed: 20 + Math.random() * 60,
                offset: Math.random() * h,
                chars: [],
                direction: Math.random() < 0.3 ? 1 : -1 // most go up, some down
            });
            // Generate character column
            const charCount = Math.floor(h / fontSize) + 5;
            for (let i = 0; i < charCount; i++) {
                this.streams[c].chars.push(this._randomData());
            }
        }
    }

    _randomData() {
        const type = Math.random();
        if (type < 0.4) return this.hexChars[Math.floor(Math.random() * 16)];
        if (type < 0.7) return Math.random() < 0.5 ? '0' : '1';
        return ['◆', '◇', '▸', '▹', '∞', '≡', '⊕', '⊗'][Math.floor(Math.random() * 8)];
    }

    resize(w, h) { this.width = w; this.height = h; this._initStreams(w, h); }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Highlight data packet
        this.packets.push({
            x: noteInfo.normalizedPosition,
            y: 0.2 + Math.random() * 0.6,
            w: 0.08 + noteInfo.velocity * 0.1,
            h: 0.03 + noteInfo.velocity * 0.04,
            energy: noteInfo.velocity,
            life: 1.0,
            hue: Math.random() * 360
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        if (this.streams.length === 0) this._initStreams(w, h);

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity');
        const speed = mathEngine.get('speed');
        const energy = this.mathInstance.energy;
        const fontSize = 12;

        // Background
        ctx.fillStyle = `hsla(${hue + 200}, 25%, 3%, 1)`;
        ctx.fillRect(0, 0, w, h);

        // Stream text
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';

        for (const stream of this.streams) {
            stream.offset += stream.speed * speed * dt * stream.direction;

            // Randomize occasional chars
            if (Math.random() < 0.02 * speed) {
                const idx = Math.floor(Math.random() * stream.chars.length);
                stream.chars[idx] = this._randomData();
            }

            for (let i = 0; i < stream.chars.length; i++) {
                const cy = (i * fontSize + stream.offset) % (h + fontSize * 5) - fontSize * 2;
                if (cy < -fontSize || cy > h + fontSize) continue;

                const ny = cy / h;
                // Base dimness
                let alpha = 0.15 + intensity * 0.15;
                let lightness = 35;
                let sat = 60;
                let charHue = 180 + (hue - 220) * 0.3; // cyan-ish

                // Proximity to data packets
                for (const p of this.packets) {
                    const dx = Math.abs(stream.x / w - p.x);
                    const dy = Math.abs(ny - p.y);
                    if (dx < p.w && dy < p.h) {
                        alpha = 0.7 + p.energy * 0.3;
                        lightness = 60 + p.energy * 25;
                        sat = 100;
                        charHue = p.hue;
                    }
                }

                // Energy boost
                alpha *= (0.5 + energy * 0.5);

                ctx.fillStyle = `hsla(${charHue}, ${sat}%, ${lightness}%, ${alpha})`;
                ctx.fillText(stream.chars[i], stream.x, cy);
            }
        }

        ctx.textAlign = 'start';

        // Data packets - highlight rectangles
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const p = this.packets[i];
            p.life -= dt * 1.2;
            if (p.life <= 0) { this.packets.splice(i, 1); continue; }

            const px = p.x * w; const py = p.y * h;
            const pw = p.w * w; const ph = p.h * h;
            const alpha = p.life * p.energy;

            // Border glow
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`;
            ctx.shadowBlur = 10;
            ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
            ctx.shadowBlur = 0;

            // Corner brackets
            const cornerLen = 8;
            ctx.lineWidth = 2;
            const cx1 = px - pw / 2, cy1 = py - ph / 2;
            const cx2 = px + pw / 2, cy2 = py + ph / 2;
            ctx.beginPath();
            ctx.moveTo(cx1 + cornerLen, cy1); ctx.lineTo(cx1, cy1); ctx.lineTo(cx1, cy1 + cornerLen);
            ctx.moveTo(cx2 - cornerLen, cy1); ctx.lineTo(cx2, cy1); ctx.lineTo(cx2, cy1 + cornerLen);
            ctx.moveTo(cx1 + cornerLen, cy2); ctx.lineTo(cx1, cy2); ctx.lineTo(cx1, cy2 - cornerLen);
            ctx.moveTo(cx2 - cornerLen, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 - cornerLen);
            ctx.stroke();
        }

        // Horizontal data bars (ambient)
        const barCount = 2 + Math.floor(energy * 4);
        for (let b = 0; b < barCount; b++) {
            const by = (Math.sin(this.time * 0.3 + b * 2) * 0.5 + 0.5) * h;
            ctx.fillStyle = `hsla(180, 50%, 30%, ${0.02 + energy * 0.02})`;
            ctx.fillRect(0, by, w, 1);
        }

        while (this.packets.length > 20) this.packets.shift();
    }
}
