/**
 * GravityMath — Multi-point Gravity Attractor
 * Simulates multiple moving gravity wells attracting a particle cloud.
 * Fixes: soft boundary reflection, attractor clamping, dt-scaled forces.
 */
export class GravityMath {
    constructor(particleCount = 2000) {
        this.particleCount = particleCount;
        this.particles = Array.from({ length: particleCount }, () => ({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.008,
            vy: (Math.random() - 0.5) * 0.008,
            hue: Math.random() * 360
        }));

        this.attractors = [
            { x: 0.3, y: 0.5, mass: 1, ox: 0.3, oy: 0.5 },
            { x: 0.7, y: 0.5, mass: 1, ox: 0.7, oy: 0.5 }
        ];

        this.friction = 0.98;
        this.gravity = 0.05;
        this.time = 0;
    }

    addAttractor(x, y, mass = 1) {
        const cx = Math.max(0.05, Math.min(0.95, x));
        const cy = Math.max(0.05, Math.min(0.95, y));
        this.attractors.push({ x: cx, y: cy, mass, ox: cx, oy: cy });
        if (this.attractors.length > 8) this.attractors.shift();
    }

    step(dt, intensity, gravity, friction) {
        this.time += dt;
        const clampedDt = Math.min(dt, 0.05); // cap dt to avoid explosion on tab switch

        // Move attractors — bounded orbit around their origin
        this.attractors.forEach((att, i) => {
            const drift = 0.12 + i * 0.04;
            att.x = att.ox + Math.sin(this.time * 0.4 + i * 1.3) * drift;
            att.y = att.oy + Math.cos(this.time * 0.55 + i * 2.1) * drift;
            // Hard clamp so they stay on screen
            att.x = Math.max(0.05, Math.min(0.95, att.x));
            att.y = Math.max(0.05, Math.min(0.95, att.y));
        });

        const gScale = gravity * intensity * clampedDt * 60; // normalize to 60fps

        this.particles.forEach(pt => {
            this.attractors.forEach(att => {
                const dx = att.x - pt.x;
                const dy = att.y - pt.y;
                const distSq = dx * dx + dy * dy + 0.001;
                const dist = Math.sqrt(distSq);
                const force = (att.mass * gScale) / (dist * 100);
                pt.vx += (dx / dist) * force;
                pt.vy += (dy / dist) * force;
            });

            pt.vx *= friction;
            pt.vy *= friction;

            // Clamp extreme velocities to prevent loss
            const maxV = 0.025;
            const spd = Math.hypot(pt.vx, pt.vy);
            if (spd > maxV) {
                pt.vx = (pt.vx / spd) * maxV;
                pt.vy = (pt.vy / spd) * maxV;
            }

            pt.x += pt.vx;
            pt.y += pt.vy;

            // Hue shifts with velocity
            pt.hue = (pt.hue + spd * 180) % 360;

            // Soft boundary — reflect velocity instead of teleporting
            if (pt.x < 0) { pt.x = 0; pt.vx = Math.abs(pt.vx) * 0.5; }
            if (pt.x > 1) { pt.x = 1; pt.vx = -Math.abs(pt.vx) * 0.5; }
            if (pt.y < 0) { pt.y = 0; pt.vy = Math.abs(pt.vy) * 0.5; }
            if (pt.y > 1) { pt.y = 1; pt.vy = -Math.abs(pt.vy) * 0.5; }
        });
    }

    clear() {
        this.time = 0;
        this.particles.forEach(pt => {
            pt.x = Math.random();
            pt.y = Math.random();
            pt.vx = (Math.random() - 0.5) * 0.008;
            pt.vy = (Math.random() - 0.5) * 0.008;
        });
        // Reset attractors to defaults
        this.attractors = [
            { x: 0.3, y: 0.5, mass: 1, ox: 0.3, oy: 0.5 },
            { x: 0.7, y: 0.5, mass: 1, ox: 0.7, oy: 0.5 }
        ];
    }
}
