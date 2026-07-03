/**
 * PresetCatalogue — A permanent bank for high-fidelity, "Gold" patches.
 * This file stores successful iterations so we can always revert or reference them.
 */

export const CATALOGUE = {
    // ── LEADS ─────────────────────────────────────────────────────────────
    
    // 1. Chaotic Attractor "Hot Fudge" v2 (Pure, warm, no noise, filtered square)
    attractor_hotfudge_v2: { 
        osc1:'square', 
        fFreq:500, 
        fRes:0, 
        a:0.08, 
        d:0.4, 
        s:0.8, 
        r:0.5, 
        reverb:0.05, 
        dist:0, 
        sig:'fFreq' 
    },

    // 2. Chaotic Attractor "Hot Fudge" v1 (Slightly brighter, with sub)
    attractor_hotfudge_v1: { 
        osc1:'square', 
        sub:0.3, 
        subOct:-1, 
        fFreq:1200, 
        fRes:1.5, 
        a:0.02, 
        d:0.3, 
        s:0.8, 
        r:0.4, 
        dist:0.15, 
        distType:'soft', 
        reverb:0.2, 
        chorus:0.15, 
        sig:'fRes' 
    }
};
