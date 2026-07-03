import { DigitalRainMath } from '../math/DigitalRainMath.js';

/**
 * DigitalRainMode — Neural Data Rain.
 * A high-fidelity "Matrix" style visualization. 
 * Features vertical data streams with glow-heads, character-fade trails,
 * high-frequency digital flicker, and note-triggered data surges.
 */
export class DigitalRainMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new DigitalRainMath();
        this.initialized = false;
        this.time = 0;
        
        // Character sets for the rain
        this.subsets = ["KATAKANA", "BINARY", "HEX", "SYMBOLS"];
        this.charSets = [
            "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ",
            "01",
            "0123456789ABCDEF",
            " !@#$%^&*()_+-=[]{}|;':\",./<>?"
        ];
        this.subIndex = 0;
        this.charSet = this.charSets[0];
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.initialized = true;
    }

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        this.charSet = this.charSets[this.subIndex];
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;

        const complexity = Number(mathEngine.get('complexity')) || 0.5;
        const intensity = Number(mathEngine.get('intensity')) || 0.5;
        const hue = Number(mathEngine.get('colorHue')) || 120; // Matrix Green baseline
        const speed = Number(mathEngine.get('speed')) || 1.0;
        const lightPressure = mathEngine.getLightPressure();

        this.mathInstance.step(dt, complexity, speed, lightPressure);
        const energy = Number(this.mathInstance.energy) || 0;

        // --- BACKGROUND ---
        ctx.fillStyle = '#010402';
        ctx.fillRect(0, 0, w, h);

        // --- RENDER STREAMS ---
        ctx.font = `${Math.floor(10 + complexity * 10)}px monospace`;
        ctx.textAlign = 'center';

        const cols = this.mathInstance.columns;
        const colWidth = w / cols.length;

        for (const col of cols) {
            const tx = col.x * w;
            const headY = col.head * h;
            const charSize = Math.floor(10 + complexity * 10);
            
            // Draw characters in the trail
            const trailCount = Math.floor(col.trail);
            for (let i = 0; i < trailCount; i++) {
                const charY = headY - i * charSize;
                if (charY < -20 || charY > h + 20) continue;

                const alpha = (1 - i / trailCount) * (0.3 + intensity * 0.7);
                const isHead = (i === 0);
                
                // Color mapping: head is bright, trail is spectral
                let lHue = (hue + i * 2) % 360;
                let lLight = isHead ? 90 : 50 - (i / trailCount) * 40;
                
                ctx.fillStyle = `hsla(${lHue}, 100%, ${lLight}%, ${alpha})`;
                
                // High-volatility flicker or random character selection
                const charPoolIdx = (col.chars[i % col.chars.length] + Math.floor(this.time * 5)) % this.charSet.length;
                const char = this.charSet[charPoolIdx];

                // Glow for head
                if (isHead) {
                    ctx.shadowBlur = 10 + energy * 20;
                    ctx.shadowColor = `hsla(${lHue}, 100%, 80%, 0.8)`;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fillText(char, tx, charY);
            }
        }
        ctx.shadowBlur = 0;

        // --- POST-PROCESSING: CHROMATIC BLOOM & SCANLINES ---
        ctx.globalCompositeOperation = 'lighter';
        if (energy > 0.4) {
            const bloom = energy * 15;
            ctx.filter = `blur(${bloom}px) saturate(2)`;
            ctx.drawImage(ctx.canvas, 0, 0); // Self-bloom
            ctx.filter = 'none';
        }
        ctx.globalCompositeOperation = 'source-over';

        // Horizontal scanlines
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }

        // Edge vignette
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }
}
