import { PopArtMath } from '../math/PopArtMath.js';

/**
 * PopArtMode — Lichtenstein/Warhol visual language: Ben-Day dot panels, bold flat color fields,
 * halftone patterns, comic-book action lines on note hits.
 */
export class PopArtMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.mathInstance = new PopArtMath();
        this.time = 0;
        this.panels = [];        // color panel grid
        this.actionLines = [];   // comic book speed lines
        this.dots = [];          // Ben-Day dot fields per panel
        this.flashPanels = new Set();
        this.initialized = false;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._buildPanels(w, h);
        this.initialized = true;
    }

    _buildPanels(w, h) {
        const cols = 3, rows = 2;
        this.panels = [];
        const panelW = w / cols, panelH = h / rows;
        const palette = [0, 45, 195, 300, 60, 170]; // hue offsets
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                this.panels.push({
                    x: c * panelW, y: r * panelH, w: panelW, h: panelH,
                    hueBase: palette[idx],
                    patternType: ['dots', 'lines', 'dots', 'solid', 'dots', 'lines'][idx],
                    saturation: 85 + Math.random() * 15,
                    brightness: 1.0,
                    flash: 0,
                });
            }
        }
    }

    onNoteOn(noteInfo) {
        if (!noteInfo) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        // Flash a panel
        const panelIdx = Math.floor(noteInfo.normalizedPosition * this.panels.length);
        const panel = this.panels[Math.min(panelIdx, this.panels.length - 1)];
        if (panel) panel.flash = noteInfo.velocity;

        // Comic book action lines emanating from panel center
        const w = this.width || 800, h = this.height || 600;
        this.actionLines.push({
            cx: panel ? panel.x + panel.w / 2 : w / 2,
            cy: panel ? panel.y + panel.h / 2 : h / 2,
            life: 1.0, vel: noteInfo.velocity,
            lineCount: 16 + Math.floor(noteInfo.velocity * 20),
            maxLen: Math.min(w, h) * (0.2 + noteInfo.velocity * 0.35),
        });
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    _drawBenDayDots(ctx, x, y, w, h, dotColor, bgColor, spacing) {
        // Background
        ctx.fillStyle = bgColor; ctx.fillRect(x, y, w, h);
        // Dot grid
        const r = spacing * 0.38;
        ctx.fillStyle = dotColor;
        for (let dy = y; dy < y + h + spacing; dy += spacing) {
            for (let dx = x; dx < x + w + spacing; dx += spacing) {
                ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    _drawHalftoneLine(ctx, x, y, w, h, color, spacing) {
        ctx.fillStyle = `rgba(0,0,0,0.85)`;  ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = spacing * 0.35;
        for (let dy = y; dy < y + h + spacing; dy += spacing) {
            ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + w, dy); ctx.stroke();
        }
    }

    render(ctx, w, h, mathEngine, dt) {
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.update(dt, mathEngine.get('complexity'));
        const baseHue = mathEngine.get('colorHue');
        const energy = this.mathInstance.energy;

        // === Draw panels ===
        for (const panel of this.panels) {
            panel.flash = Math.max(0, panel.flash - dt * 2.5);
            const ph = (baseHue + panel.hueBase) % 360;
            const flash = panel.flash;
            const dotSpacing = Math.max(4, 12 - energy * 4);

            switch (panel.patternType) {
                case 'dots':
                    this._drawBenDayDots(ctx, panel.x, panel.y, panel.w, panel.h,
                        `hsla(${ph},${panel.saturation}%,45%,${0.8 + flash * 0.2})`,
                        `hsla(${(ph + 60) % 360},90%,${80 + flash * 15}%,1)`,
                        dotSpacing + 4);
                    break;
                case 'lines':
                    this._drawHalftoneLine(ctx, panel.x, panel.y, panel.w, panel.h,
                        `hsla(${ph},100%,${55 + flash * 30}%,0.9)`, dotSpacing + 2);
                    break;
                case 'solid':
                    ctx.fillStyle = `hsla(${ph},100%,${45 + flash * 35}%,1)`;
                    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
                    // Lighter center
                    const cg = ctx.createRadialGradient(panel.x + panel.w / 2, panel.y + panel.h / 2, 0,
                        panel.x + panel.w / 2, panel.y + panel.h / 2, Math.min(panel.w, panel.h) * 0.6);
                    cg.addColorStop(0, `rgba(255,255,255,${0.25 + flash * 0.4})`);
                    cg.addColorStop(1, 'transparent');
                    ctx.fillStyle = cg; ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
                    break;
            }

            // Flash overlay
            if (flash > 0.01) {
                ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`;
                ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
            }

            // Panel border (bold black)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
        }

        // === Comic action lines ===
        this.actionLines = this.actionLines.filter(a => a.life > 0.01);
        for (const al of this.actionLines) {
            al.life -= dt * 2.0;
            ctx.globalCompositeOperation = 'source-over';
            for (let l = 0; l < al.lineCount; l++) {
                const a = (l / al.lineCount) * Math.PI * 2 + al.life * 0.3;
                const len = al.maxLen * al.life * (0.5 + Math.random() * 0.5);
                ctx.strokeStyle = `rgba(255,255,255,${al.life * al.vel * 0.9})`;
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(al.cx, al.cy);
                ctx.lineTo(al.cx + Math.cos(a) * len, al.cy + Math.sin(a) * len);
                ctx.stroke();
            }
            // Center flash circle
            ctx.fillStyle = `rgba(255,255,255,${al.life * al.vel * 0.7})`;
            ctx.beginPath(); ctx.arc(al.cx, al.cy, Math.max(0.1, 20 * al.vel * al.life), 0, Math.PI * 2); ctx.fill();
        }

        // === Panel grid lines (foreground) ===
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
        const cols = 3, rows = 2;
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath(); ctx.moveTo(c * (w / cols), 0); ctx.lineTo(c * (w / cols), h); ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * (h / rows)); ctx.lineTo(w, r * (h / rows)); ctx.stroke();
        }
    }
}
