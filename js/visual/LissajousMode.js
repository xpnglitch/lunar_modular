/**
 * LissajousMode — Parametric Lissajous Triptych
 * Upgraded to a multi-pattern layout that fills the widescreen monitor.
 * 
 * Features three distinct zones:
 * - LEFT (BASS): Reacts to low-frequency energy. Large, slow, heavy phosphors.
 * - CENTER (MID): The primary melodic pattern. Detailed and harmonic.
 * - RIGHT (TREBLE): Reacts to high-frequency energy. Fast, vibrating, small clusters.
 * 
 * Includes stretching and lateral drift to ensure the entire screen space is utilized.
 */
import { LissajousMath } from '../math/LissajousMath.js';

export class LissajousMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        // Three independent math instances for the three zones
        this.mathBass = new LissajousMath();
        this.mathMid = new LissajousMath();
        this.mathTreble = new LissajousMath();
        
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.activeNotes = new Map();
        this.initialized = false;
        
        // Energy tracking for frequency bands
        this.bassEnergy = 0;
        this.midEnergy = 0;
        this.trebleEnergy = 0;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.activeNotes.set(noteInfo.index, {
            frequency: noteInfo.frequency,
            velocity: noteInfo.velocity
        });
        this._syncMath();
    }

    onNoteOff(noteIndex) {
        this.activeNotes.delete(noteIndex);
        this._syncMath();
    }

    _syncMath() {
        const notes = Array.from(this.activeNotes.values());
        if (notes.length === 0) {
            [this.mathBass, this.mathMid, this.mathTreble].forEach(m => {
                m.noteFreqA = 0; m.noteFreqB = 0; m.noteEnergy = 0;
            });
            return;
        }

        const freqs = notes.map(n => n.frequency).sort((a, b) => a - b);
        const ratio = freqs[freqs.length - 1] / freqs[0];
        const avgVel = notes.reduce((s, n) => s + n.velocity, 0) / notes.length;

        // Mid gets the pure harmonic ratio
        this.mathMid.noteFreqA = ratio;
        this.mathMid.noteFreqB = 1.0;
        this.mathMid.noteEnergy = avgVel;

        // Bass gets a sub-harmonic version
        this.mathBass.noteFreqA = ratio * 0.5;
        this.mathBass.noteFreqB = 0.5;
        this.mathBass.noteEnergy = avgVel * 0.8;

        // Treble gets a multiplier version
        this.mathTreble.noteFreqA = ratio * 2.0;
        this.mathTreble.noteFreqB = 2.0;
        this.mathTreble.noteEnergy = avgVel * 1.2;
    }

    _updateEnergy() {
        const data = this.math.getAnalyserData();
        if (!data) return;

        // Bass: 0-20 (roughly < 200Hz)
        let bSum = 0; for (let i = 0; i < 15; i++) bSum += data[i];
        this.bassEnergy = (bSum / 15) / 255;

        // Mid: 20-80 (roughly 200Hz - 2kHz)
        let mSum = 0; for (let i = 15; i < 70; i++) mSum += data[i];
        this.midEnergy = (mSum / 55) / 255;

        // Treble: 80-255 (roughly > 2kHz)
        let tSum = 0; for (let i = 70; i < 200; i++) tSum += data[i];
        this.trebleEnergy = (tSum / 130) / 255;
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this._updateEnergy();

        const complexity = mathEngine.get('complexity') || 0.3;
        const intensity = mathEngine.get('intensity') || 0.5;
        const speed = mathEngine.get('speed') || 1.0;
        const hue = mathEngine.get('colorHue') || 220;

        // Step all math instances
        this.mathBass.step(dt, complexity, speed * 0.4);
        this.mathMid.step(dt, complexity, speed);
        this.mathTreble.step(dt, complexity, speed * 1.8);

        ctx.globalCompositeOperation = 'lighter';

        // --- Render Triple Zones ---
        // We define three centers across the screen
        const zones = [
            { id: 'bass', math: this.mathBass, cx: w * 0.22, energy: this.bassEnergy, hOff: -30, size: 0.3, thick: 2.2 },
            { id: 'mid', math: this.mathMid, cx: w * 0.5, energy: this.midEnergy, hOff: 0, size: 0.4, thick: 1.5 },
            { id: 'treble', math: this.mathTreble, cx: w * 0.78, energy: this.trebleEnergy, hOff: 40, size: 0.3, thick: 0.8 }
        ];

        zones.forEach(zone => {
            const cy = h * 0.5 + Math.sin(this.time * 0.3 + (zone.cx / w)) * 20;
            const amp = Math.min(w, h) * zone.size * (1.0 + zone.energy * 0.2);
            const numLayers = 3 + Math.floor(complexity * 6);
            const steps = 600 + Math.floor(intensity * 1000);

            for (let l = 0; l < numLayers; l++) {
                const lT = l / numLayers;
                const lAlpha = (0.2 + zone.energy * 0.5 + intensity * 0.3) * (1 - lT * 0.6);
                const lHue = (hue + zone.hOff + lT * 30) % 360;
                
                if (lAlpha < 0.01) continue;

                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const u = i / steps;
                    const tMod = this.time * (1.2 + speed * 1.5);
                    const pos = zone.math.getPosition(u * Math.PI * 2 + tMod, l, amp * (0.9 + lT * 0.1), complexity);
                    
                    const x = zone.cx + pos.x;
                    const y = cy + pos.y;
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `hsla(${lHue}, 80%, ${65 + lT * 10}%, ${lAlpha})`;
                ctx.lineWidth = zone.thick * (1 - lT * 0.4);
                ctx.stroke();
            }

            // Central core for each zone
            const dotT = this.time * (1.2 + speed * 1.5);
            const dotPos = zone.math.getPosition(dotT, 0, amp, complexity);
            const dotX = zone.cx + dotPos.x;
            const dotY = cy + dotPos.y;
            
            const g = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 15 + zone.energy * 30);
            g.addColorStop(0, `hsla(${hue + zone.hOff}, 90%, 80%, ${0.6 * zone.energy})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(dotX, dotY, 15 + zone.energy * 30, 0, Math.PI * 2); ctx.fill();
        });

        ctx.globalCompositeOperation = 'source-over';
    }
}
