/**
 * Matrix4D — Utility for 4D rotations and projections
 * Essential for the Hypercube mode (Tesseract visualization).
 */
export class Matrix4D {
    static rotateXY(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [
            c, -s, 0, 0,
            s,  c, 0, 0,
            0,  0, 1, 0,
            0,  0, 0, 1
        ];
    }

    static rotateXZ(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [
            c, 0, -s, 0,
            0, 1,  0, 0,
            s, 0,  c, 0,
            0, 0,  0, 1
        ];
    }

    static rotateXW(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [
            c, 0, 0, -s,
            0, 1, 0,  0,
            0, 0, 1,  0,
            s, 0, 0,  c
        ];
    }

    static rotateYW(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [
            1, 0, 0, 0,
            0, c, 0, -s,
            0, 0, 1, 0,
            0, s, 0, c
        ];
    }

    static rotateZW(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, c, -s,
            0, 0, s, c
        ];
    }

    static multiply(a, b) {
        const res = new Array(16).fill(0);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    res[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        return res;
    }

    static transform(m, v) {
        const res = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            res[i] = m[i * 4 + 0] * v[0] +
                     m[i * 4 + 1] * v[1] +
                     m[i * 4 + 2] * v[2] +
                     m[i * 4 + 3] * v[3];
        }
        return res;
    }
}
