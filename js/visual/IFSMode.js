/**
 * IFSMode — Iterated Function System fractal visualizer
 * Notes seed independent walkers that trace different regions of the fractal.
 */
import { IFSMath } from '../math/IFSMath.js';

export class IFSMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.ifs  = new IFSMath();
        this.subsets = Object.keys(this.ifs.presets).map(k => this.ifs.presets[k].name);
        this.subIndex = 0;
    }

    resize() {}

    setSubset(index) {
        this.subIndex = ((index % this.subsets.length) + this.subsets.length) % this.subsets.length;
        const key = Object.keys(this.ifs.presets)[this.subIndex];
        this.ifs.setPreset(key);
    }

    setPreset(name) { this.ifs.setPreset(name); }

    onNoteOn(info) {
        if (info) this.ifs.addNote(info);
    }

    getAudioModulation() { return this.ifs.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        const complexity = mathEngine.get('complexity');
        const hue        = mathEngine.get('colorHue');

        this.ifs.step(dt, complexity);

        const mod = this.ifs.getAudioModulation();
        mathEngine.write('vis_filterMod',  mod.filterMod);
        mathEngine.write('vis_lfoRateMod', mod.lfoRate);
        mathEngine.write('vis_detuneMod',  mod.detuneMod);

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, w, h);

        this.ifs.render(ctx, w, h, hue);
    }
}
