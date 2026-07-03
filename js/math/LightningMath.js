/**
 * LightningMath — DLA-inspired lightning bolt generation
 * Generates branching discharge paths between random endpoints.
 * Bolts decay over time. Branching factor is controllable.
 */
export class LightningMath {
    constructor() {
        this.bolts = [];           // Array of bolt objects
        this.maxBolts = 10;        // Max simultaneous bolts
        this.branchFactor = 8;     // How many sub-branches per bolt (2-14)
        this.maxSegments = 600;    // Max total segments across all bolts
    }

    /**
     * Generate a new lightning bolt between two points
     */
    generateBolt(x1, y1, x2, y2, energy = 1.0) {
        const segments = [];
        this._buildBranch(segments, x1, y1, x2, y2, energy, 0, this.branchFactor);

        this.bolts.push({
            segments,
            age: 0,
            life: 0.6 + energy * 0.5,
            maxLife: 0.6 + energy * 0.5,
            energy,
            flash: 1.0,
            originX: x1,
            originY: y1,
        });

        // Cap total bolts
        while (this.bolts.length > this.maxBolts) {
            this.bolts.shift();
        }
    }

    /**
     * Recursively build a branching bolt path
     */
    _buildBranch(segments, x1, y1, x2, y2, energy, depth, maxDepth) {
        if (depth > maxDepth || segments.length > this.maxSegments) return;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Base case: short enough to draw directly
        if (dist < 0.015 || depth > 8) {
            segments.push({
                x1, y1, x2, y2,
                brightness: energy * (1 - depth * 0.12),
                energy: energy * (1 - depth * 0.12),
                depth,
                isBranch: depth > 0,
            });
            return;
        }

        // Midpoint displacement
        const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * dist * 0.4;
        const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * dist * 0.4;

        // Main path continues through displaced midpoint
        this._buildBranch(segments, x1, y1, midX, midY, energy, depth + 1, maxDepth);
        this._buildBranch(segments, midX, midY, x2, y2, energy, depth + 1, maxDepth);

        // Branch off at midpoint (higher probability for more impressive bolts)
        if (depth < maxDepth - 1 && Math.random() < 0.45 * (1 - depth / maxDepth)) {
            const branchAngle = (Math.random() - 0.5) * Math.PI * 0.9;
            const branchLen = dist * (0.35 + Math.random() * 0.45);
            const angle = Math.atan2(dy, dx) + branchAngle;
            const bx = midX + Math.cos(angle) * branchLen;
            const by = midY + Math.sin(angle) * branchLen;
            this._buildBranch(segments, midX, midY, bx, by, energy * 0.6, depth + 2, maxDepth);
        }
    }

    /**
     * Update bolt ages, remove dead bolts
     */
    update(dt) {
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            const bolt = this.bolts[i];
            bolt.age += dt;
            bolt.life = Math.max(0, bolt.maxLife - bolt.age);
            bolt.flash *= 0.85;

            if (bolt.age > bolt.maxLife) {
                this.bolts.splice(i, 1);
            }
        }
    }

    /**
     * Set branching factor (2-8)
     */
    setBranchFactor(factor) {
        this.branchFactor = Math.max(2, Math.min(14, Math.floor(factor)));
    }

    /**
     * Alias for setBranchFactor (used by UI)
     */
    setIntensity(val) {
        this.setBranchFactor(val);
    }

    /**
     * Trigger a bolt from a note event (convenience method)
     */
    triggerBolt(normalizedX, velocity) {
        const x1 = normalizedX;
        const y1 = 0.05 + Math.random() * 0.15;
        const x2 = normalizedX + (Math.random() - 0.5) * 0.3;
        const y2 = 0.7 + Math.random() * 0.25;
        this.generateBolt(x1, y1, x2, y2, 0.5 + velocity * 0.5);
    }

    /**
     * Get total active segment count (for audio coupling)
     */
    getTotalSegments() {
        let total = 0;
        for (const bolt of this.bolts) {
            total += bolt.segments.length;
        }
        return total;
    }

    /**
     * Get audio modulation — honest coupling from bolt data
     */
    getAudioModulation() {
        const totalSegs = this.getTotalSegments();
        const activeBolts = this.bolts.length;

        // Total flash energy (high right after a bolt, decays fast)
        let flashEnergy = 0;
        for (const bolt of this.bolts) {
            flashEnergy += bolt.flash * bolt.energy;
        }

        return {
            filterMod: Math.min(1, flashEnergy * 0.8),
            detuneMod: Math.min(1, totalSegs / this.maxSegments) * 0.5,
            harmonics: Math.min(1, activeBolts / this.maxBolts),
        };
    }
}
