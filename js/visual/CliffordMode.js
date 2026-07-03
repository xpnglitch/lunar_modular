/**
 * CliffordMode — Clifford & De Jong strange attractor visualizer
 * Renders the density histogram as a glowing heatmap.
 */
import { CliffordMath } from '../math/CliffordMath.js';

export class CliffordMode {
    constructor(mathEngine) {
        this.math    = mathEngine;
        this.clifford = new CliffordMath();
        this.subsets = Object.keys(this.clifford.presets).map(k => this.clifford.presets[k].name);
        this.subIndex = 0;
    }

    resize() {}

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        const key = Object.keys(this.clifford.presets)[this.subIndex];
        this.clifford.setPreset(key);
    }

    setPreset(name) { this.clifford.setPreset(name); }

    onNoteOn(info) {
        if (info) this.clifford.onNoteOn(info);
    }

    getAudioModulation() { return this.clifford.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const hue        = mathEngine.get('colorHue');

        this.clifford.step(dt, complexity);

        // Write to signal bus
        const mod = this.clifford.getAudioModulation();
        mathEngine.write('vis_filterMod',  mod.filterMod);
        mathEngine.write('vis_lfoRateMod', mod.lfoRate);
        mathEngine.write('vis_detuneMod',  mod.detuneMod);

        // Background fade
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, w, h);

        this.clifford.render(ctx, w, h, hue);
    }
}
