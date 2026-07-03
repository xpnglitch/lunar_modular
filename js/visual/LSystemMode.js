import { LSystemMath } from '../math/LSystemMath.js';

/**
 * LSystemMode — Organic cybernetic circuit tree.
 * A procedural L-system that grows upward like a glowing neon circuit board.
 * Notes send electron pulses traveling along the branches. 
 * Heavy audio creates recursive explosive growth at the tips.
 */
export class LSystemMode {
    constructor(mathEngine) {
        this.math = mathEngine;
        this.time = 0;
        this.mathInstance = new LSystemMath();
        this.pulses = [];
        this.paths = [];
        this.maxDepth = 6;
        this.initialized = false;
        this.growthPhase = 0;
        this._useGrammar = false; // true when a named style is selected
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this._generateTree(w, h);
        this.initialized = true;
    }

    // Pre-calculate the tree paths because doing recursion with thousands of lines
    // every frame is extremely slow. We will cache the paths and just draw them.
    _generateTree(w, h) {
        this.paths = [];
        const startLen = h * 0.22;
        this._buildBranch(w/2, h * 0.95, -Math.PI / 2, startLen, this.maxDepth, 0, []);
    }

    _buildBranch(x, y, angle, len, depth, nodeIndex, parentPathID) {
        if (depth === 0) return;

        const endX = x + Math.cos(angle) * len;
        const endY = y + Math.sin(angle) * len;
        const branchID = parentPathID.concat(nodeIndex);

        this.paths.push({
            p1: {x, y}, p2: {x: endX, y: endY},
            depth, maxDepth: this.maxDepth,
            angle, len, id: branchID
        });

        // Stochastic L-system rules
        const splits = depth > 2 ? (Math.random() < 0.8 ? 2 : 3) : 2;
        const angleSpread = 0.4 + Math.random() * 0.3;
        
        let startAngle = angle - (angleSpread * (splits - 1)) / 2;
        for (let i = 0; i < splits; i++) {
            // Circuit-board aesthetics: strict 45/90 degree snaps
            let splitAngle = startAngle + i * angleSpread;
            // Snap to nearest 45 degree (PI/4)
            splitAngle = Math.round(splitAngle / (Math.PI / 4)) * (Math.PI / 4);
            
            const shrink = 0.65 + Math.random() * 0.15;
            this._buildBranch(endX, endY, splitAngle, len * shrink, depth - 1, i, branchID);
        }
    }

    setStyle(name) {
        this.mathInstance.setStyle(name);
        this._useGrammar = true;
    }

    onNoteOn(noteInfo) {
        if (!noteInfo || !this.initialized) return;
        this.mathInstance.addPulse(noteInfo.normalizedPosition, noteInfo.velocity);
        
        // Spawn an electron pulse at the root
        this.pulses.push({
            progress: 0,         // 0 to maxDepth
            speed: 5 + noteInfo.velocity * 5,
            hueShift: noteInfo.normalizedPosition * 90 - 45,
            vel: noteInfo.velocity,
            life: 1.0
        });

        // Occasionally rebuild the tree structure on hard hits
        if (noteInfo.velocity > 0.85 && Math.random() < 0.2) {
            this._generateTree(this.width, this.height);
            this.growthPhase = 0; // animate the growth in
        }
    }

    getAudioModulation() { return this.mathInstance.getAudioModulation(); }

    render(ctx, w, h, mathEngine, dt) {
        if (this._useGrammar) {
            // Grammar-based rendering via LSystemMath
            this.time += dt;
            this.mathInstance.step(dt, mathEngine.get('complexity'));
            const hue = mathEngine.get('colorHue');
            ctx.fillStyle = `hsla(${hue},90%,4%,0.35)`;
            ctx.fillRect(0, 0, w, h);
            this.mathInstance.render(ctx, w, h, hue);
            const mod = this.mathInstance.getAudioModulation();
            mathEngine.write('vis_filterMod', mod.filterMod);
            return;
        }
        // ── Default circuit-tree rendering ───────────────────────────────
        if (!this.initialized) this.resize(w, h);
        this.time += dt;
        this.mathInstance.step(dt, mathEngine.get('complexity'));

        const hue = mathEngine.get('colorHue');
        const intensity = mathEngine.get('intensity') || 0.5;
        const energy = this.mathInstance.energy;

        // Animate growth
        if (this.growthPhase < 1) this.growthPhase += dt * 1.5;
        else this.growthPhase = 1;

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, `hsla(${hue}, 90%, 5%, 1)`);
        bgGrad.addColorStop(1, `hsla(${(hue + 40) % 360}, 100%, 12%, 1)`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';

        // --- Draw the cached tree ---
        // We draw layers so thicker branches are under thinner ones, but for composite 'lighter' it doesn't matter too much.
        
        // Draw all paths
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        
        for (const p of this.paths) {
            // Growth animation visibility
            const normalizedDepth = (this.maxDepth - p.depth) / this.maxDepth; // 0 at root, 1 at leaves
            if (this.growthPhase < normalizedDepth) continue; // hasn't grown yet

            const alpha = 0.15 + (p.depth / this.maxDepth) * 0.4;
            const lw = p.depth * 1.2;

            ctx.beginPath();
            ctx.moveTo(p.p1.x, p.p1.y);
            ctx.lineTo(p.p2.x, p.p2.y);

            // Sway with audio energy/time
            const sway = Math.sin(this.time * 2 + p.p2.y * 0.01) * energy * 15 * normalizedDepth;
            const px2 = p.p2.x + sway;

            // Core circuit trace
            ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(p.p1.x, p.p1.y);
            ctx.lineTo(px2, p.p2.y);
            ctx.stroke();

            // Terminal nodes (capacitors/data sinks)
            if (p.depth === 1) {
                const nodeSize = 3 + energy * 6;
                ctx.fillStyle = `hsla(${hue + 30}, 100%, 70%, ${0.5 + energy * 0.5})`;
                ctx.beginPath(); ctx.arc(px2, p.p2.y, nodeSize, 0, Math.PI * 2); ctx.fill();
            }
        }

        // --- Draw Electron Pulses ---
        // A pulse travels up the tree. Progress corresponds to tree depth.
        this.pulses = this.pulses.filter(p => p.progress < this.maxDepth + 1);
        
        for (const pulse of this.pulses) {
            pulse.progress += pulse.speed * dt;
            
            // Find all paths that match this progress 'layer'
            // For example, if progress is 2.5, it is halfway along depth layer 2
            const currentLevel = Math.floor(pulse.progress);
            const levelFrac = pulse.progress - currentLevel;
            
            // To trace exactly, we filter paths where (maxDepth - depth) == currentLevel
            const activePaths = this.paths.filter(p => (this.maxDepth - p.depth) === currentLevel);
            
            for (const p of activePaths) {
                // Determine point along path
                const sway = Math.sin(this.time * 2 + p.p2.y * 0.01) * energy * 15 * (currentLevel / this.maxDepth);
                const px2 = p.p2.x + sway;

                const currX = p.p1.x + (px2 - p.p1.x) * levelFrac;
                const currY = p.p1.y + (p.p2.y - p.p1.y) * levelFrac;

                // Draw glowing electron
                const pSize = (4 + pulse.vel * 12) * (p.depth / this.maxDepth);
                const pHue = (hue + pulse.hueShift) % 360;

                const pGrad = ctx.createRadialGradient(currX, currY, 0, currX, currY, pSize * 2);
                pGrad.addColorStop(0, `hsla(${pHue}, 100%, 95%, 1)`);
                pGrad.addColorStop(0.3, `hsla(${pHue}, 100%, 70%, 0.8)`);
                pGrad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = pGrad;
                ctx.beginPath(); ctx.arc(currX, currY, pSize * 2, 0, Math.PI * 2); ctx.fill();
            }

            // Burst at tips when reaching the end
            if (currentLevel >= this.maxDepth) {
                const tips = this.paths.filter(p => p.depth === 1);
                for (const tip of tips) {
                    const sway = Math.sin(this.time * 2 + tip.p2.y * 0.01) * energy * 15;
                    const r = 15 + pulse.vel * 40 * Math.random();
                    const tg = ctx.createRadialGradient(tip.p2.x + sway, tip.p2.y, 0, tip.p2.x + sway, tip.p2.y, r);
                    const pHue = (hue + pulse.hueShift) % 360;
                    tg.addColorStop(0, `hsla(${pHue}, 100%, 80%, 0.6)`);
                    tg.addColorStop(1, 'transparent');
                    ctx.fillStyle = tg;
                    ctx.beginPath(); ctx.arc(tip.p2.x + sway, tip.p2.y, r, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
