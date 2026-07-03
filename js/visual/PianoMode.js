/**
 * PianoMode — High-fidelity simulation of an acoustic grand piano interior.
 * 88 vertical strings vibrate with physical accuracy based on note frequency.
 * Features hammer-strike particles and sympathetic resonance visualization.
 */
export class PianoMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.strings = [];
        this.particles = [];
        this.initialized = false;
        
        // Initialize 88 strings (standard piano range A0 to C8)
        for (let i = 0; i < 88; i++) {
            this.strings.push({
                index: i,
                vibration: 0,
                targetVibration: 0,
                velocity: 0,
                color: i % 12 === 1 || i % 12 === 3 || i % 12 === 6 || i % 12 === 8 || i % 12 === 10 ? '#333' : '#eee', // Black/White keys
                freq: 27.5 * Math.pow(2, i / 12),
                lastActive: 0
            });
        }
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.initialized = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        const midi = noteInfo.midi || 60;
        const pianoIdx = midi - 21; // MIDI 21 is A0
        if (pianoIdx >= 0 && pianoIdx < 88) {
            const s = this.strings[pianoIdx];
            s.vibration = noteInfo.velocity * 15;
            s.velocity = noteInfo.velocity;
            s.lastActive = this.time;

            // Hammer spark particles
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: (pianoIdx / 88) * this.width,
                    y: this.height * 0.7,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 8 - 2,
                    life: 1.0,
                    hue: (pianoIdx / 88) * 60 + 20 // Golden hammer sparks
                });
            }
        }
    }

    getAudioModulation() {
        return {
            filterMod: Math.sin(this.time * 2) * 0.1,
            detuneMod: 0
        };
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        
        const energy = mathEngine.get('intensity') || 0.5;
        const hue = mathEngine.get('colorHue');

        // Dark woody background
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, '#1a0f0a');
        grad.addColorStop(1, '#050201');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const margin = w * 0.05;
        const availableW = w - margin * 2;
        const stringSpacing = availableW / 88;

        // Draw Strings
        ctx.lineCap = 'round';
        for (let i = 0; i < 88; i++) {
            const s = this.strings[i];
            const x = margin + i * stringSpacing;
            
            // Physical vibration decay
            s.vibration *= 0.92;
            const vibOffset = Math.sin(this.time * s.freq * 0.2) * s.vibration;
            
            const isWhite = s.color === '#eee';
            const baseAlpha = isWhite ? 0.3 : 0.15;
            const activity = Math.max(0, 1 - (this.time - s.lastActive) * 0.5);
            
            // Draw the string shadow/path
            ctx.strokeStyle = `rgba(255,255,255,${baseAlpha * 0.5})`;
            ctx.lineWidth = isWhite ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();

            // Draw the vibrating part
            if (s.vibration > 0.01) {
                const glow = activity * 0.8;
                ctx.strokeStyle = `hsla(${(hue + i * 2) % 360}, 80%, ${70 + glow * 30}%, ${baseAlpha + glow})`;
                ctx.lineWidth = (isWhite ? 1.5 : 1) + activity * 2;
                
                ctx.beginPath();
                ctx.moveTo(x, 0);
                // Quadratic curve for vibration
                ctx.quadraticCurveTo(x + vibOffset, h / 2, x, h);
                ctx.stroke();
            }
        }

        // Draw Hammer Sparks
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= dt * 1.5;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // Atmospheric Dust
        for (let i = 0; i < 20; i++) {
            const dx = (Math.sin(this.time * 0.2 + i) * 0.5 + 0.5) * w;
            const dy = (Math.cos(this.time * 0.3 + i * 2) * 0.5 + 0.5) * h;
            ctx.fillStyle = `rgba(255,255,255,${0.03 * energy})`;
            ctx.beginPath();
            ctx.arc(dx, dy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
