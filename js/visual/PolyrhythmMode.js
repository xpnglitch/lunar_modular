/**
 * Polyrhythm Training Mode
 * Progressive sequencer that increases rhythmic density bar-by-bar.
 */
export class PolyrhythmMode {
    constructor() {
        this.bpm = 120;
        this.startTime = 0;
        this.active = false;
        
        // Sequence definition: { beatsPerBar, durationBars, label, color }
        this.sequence = [
            { id: 'count-in', bpv: 4, bars: 1, label: "COUNT IN", color: "#888" },
            { id: '1', bpv: 1, bars: 4, label: "WHOLE (1)", color: "#ff4444" },
            { id: '2', bpv: 2, bars: 4, label: "HALF (2)", color: "#ff7744" },
            { id: '3', bpv: 3, bars: 4, label: "TRIPLETS (3)", color: "#ffaa44" },
            { id: '4', bpv: 4, bars: 4, label: "QUARTERS (4)", color: "#ffdd44" },
            { id: '5', bpv: 5, bars: 4, label: "QUINTUPLETS (5)", color: "#ddff44" },
            { id: '6', bpv: 6, bars: 4, label: "SEXTUPLETS (6)", color: "#aaff44" },
            { id: '7', bpv: 7, bars: 4, label: "SEPTUPLETS (7)", color: "#77ff44" },
            { id: '8', bpv: 8, bars: 4, label: "EIGHTHS (8)", color: "#44ff44" },
            { id: '9', bpv: 9, bars: 4, label: "NONUPLETS (9)", color: "#44ffaa" },
            { id: '10', bpv: 10, bars: 4, label: "10THS", color: "#44ffdd" },
            { id: '11', bpv: 11, bars: 4, label: "11THS", color: "#44ddff" },
            { id: '12', bpv: 12, bars: 4, label: "12THS", color: "#44aaff" },
            { id: '13', bpv: 13, bars: 4, label: "13THS", color: "#4477ff" },
            { id: '14', bpv: 14, bars: 4, label: "14THS", color: "#4444ff" },
            { id: '15', bpv: 15, bars: 4, label: "15THS", color: "#7744ff" },
            { id: '16', bpv: 16, bars: 4, label: "SIXTEENTHS (16)", color: "#aa44ff" }
        ];

        this.currentStageIdx = 0;
        this.currentBar = 0;
        this.lastTriggeredIdx = -1;
        this.clickCallback = null;
    }

    setParams(bpm) {
        this.bpm = bpm;
        this.reset();
    }

    reset() {
        this.startTime = performance.now();
        this.currentStageIdx = 0;
        this.currentBar = 0;
        this.lastTriggeredIdx = -1;
    }

    setClickCallback(cb) {
        this.clickCallback = cb;
    }

    render(ctx, W, H, mathEngine, dt) {
        const now = performance.now();
        const elapsed = (now - this.startTime) / 1000;
        
        const bps = this.bpm / 60;
        const barDur = 4 / bps;
        
        const totalElapsedBars = elapsed / barDur;
        this.currentBar = Math.floor(totalElapsedBars);
        const barPhase = totalElapsedBars % 1;

        // Determine current stage
        let barsAcc = 0;
        let stage = this.sequence[0];
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.currentBar < barsAcc + this.sequence[i].bars) {
                this.currentStageIdx = i;
                stage = this.sequence[i];
                break;
            }
            barsAcc += this.sequence[i].bars;
        }

        // Trigger Click
        const subDivIdx = Math.floor(barPhase * stage.bpv);
        const globalIdx = this.currentBar * 1000 + subDivIdx; // Unique per hit
        
        if (globalIdx !== this.lastTriggeredIdx) {
            const isStrong = subDivIdx === 0;
            if (this.clickCallback) this.clickCallback(isStrong);
            this.lastTriggeredIdx = globalIdx;
        }

        // --- Visuals ---
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.35;
        
        // 3D-ish Glow Circle
        ctx.save();
        ctx.translate(cx, cy);
        
        // Back glow
        ctx.globalAlpha = 0.15;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
        g.addColorStop(0, stage.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;

        // Main Ring
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 10; ctx.stroke();
        
        // Draw Dots for current stage
        for (let i = 0; i < stage.bpv; i++) {
            const ang = (i / stage.bpv) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(ang) * R, y = Math.sin(ang) * R;
            const active = i === subDivIdx;
            
            ctx.beginPath(); ctx.arc(x, y, active ? 8 : 4, 0, Math.PI * 2);
            ctx.fillStyle = active ? '#fff' : stage.color;
            if (active) {
                ctx.shadowColor = stage.color; ctx.shadowBlur = 20;
            } else {
                ctx.globalAlpha = 0.4;
            }
            ctx.fill();
            ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;
        }

        // Spinning Arm
        const armAng = barPhase * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(armAng) * (R + 20), Math.sin(armAng) * (R + 20));
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = "bold 24px 'Orbitron'"; ctx.fillStyle = stage.color;
        ctx.fillText(stage.label, 0, -R - 60);
        
        ctx.font = "14px 'Share Tech Mono'"; ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(`BAR ${this.currentBar + 1} | BPM ${this.bpm}`, 0, R + 60);

        ctx.restore();
    }
}
