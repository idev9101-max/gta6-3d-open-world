// Math utilities - common math helpers used throughout the game
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const DEG_TO_RAD_FACTOR = Math.PI / 180;
const RAD_TO_DEG_FACTOR = 180 / Math.PI;

const MathUtils = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    lerp: (a, b, t) => a + (b - a) * t,
    lerpAngle: (a, b, t) => {
        let diff = b - a;
        diff = diff % TWO_PI;
        if (diff > Math.PI) diff -= TWO_PI;
        if (diff < -Math.PI) diff += TWO_PI;
        return a + diff * t;
    },
    random: (min, max) => min + Math.random() * (max - min),
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    dist2D: (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1),
    angleTo: (x1, z1, x2, z2) => Math.atan2(z2 - z1, x2 - x1),
    normalizeAngle: (angle) => {
        while (angle > Math.PI) angle -= TWO_PI;
        while (angle < -Math.PI) angle += TWO_PI;
        return angle;
    },
    degToRad: (deg) => deg * DEG_TO_RAD_FACTOR,
    radToDeg: (rad) => rad * RAD_TO_DEG_FACTOR,
    smoothStep: (t) => t * t * (3 - 2 * t),
    smootherStep: (t) => t * t * t * (t * (t * 6 - 15) + 10),
    map: (value, inMin, inMax, outMin, outMax) => 
        outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin)),
    snapToGrid: (value, gridSize) => Math.round(value / gridSize) * gridSize,
    isPointInRect: (x, z, rx, rz, rw, rh) => 
        x >= rx && x <= rx + rw && z >= rz && z <= rz + rh,
    lineIntersectsRect: (x1, z1, x2, z2, rx, rz, rw, rh) => {
        // Cohen-Sutherland line clipping
        const LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
        const computeCode = (x, z) => {
            let code = 0;
            if (x < rx) code |= LEFT;
            else if (x > rx + rw) code |= RIGHT;
            if (z < rz) code |= BOTTOM;
            else if (z > rz + rh) code |= TOP;
            return code;
        };
        let code1 = computeCode(x1, z1);
        let code2 = computeCode(x2, z2);
        let accept = false;
        while (true) {
            if (!(code1 | code2)) { accept = true; break; }
            else if (code1 & code2) break;
            else {
                const code = code1 || code2;
                let x, z;
                if (code & TOP) { x = x1 + (x2 - x1) * (rz + rh - z1) / (z2 - z1); z = rz + rh; }
                else if (code & BOTTOM) { x = x1 + (x2 - x1) * (rz - z1) / (z2 - z1); z = rz; }
                else if (code & RIGHT) { z = z1 + (z2 - z1) * (rx + rw - x1) / (x2 - x1); x = rx + rw; }
                else if (code & LEFT) { z = z1 + (z2 - z1) * (rx - x1) / (x2 - x1); x = rx; }
                if (code === code1) { x1 = x; z1 = z; code1 = computeCode(x1, z1); }
                else { x2 = x; z2 = z; code2 = computeCode(x2, z2); }
            }
        }
        return accept;
    },
    safeLerpFactor: (value, min, max) => {
        if (typeof value !== 'number' || !isFinite(value)) return 0;
        return Math.max(0, Math.min(1, (value - min) / (max - min)));
    },
    safeColor: (color, fallback = 0x888888) => {
        if (color === undefined || color === null) return fallback;
        if (typeof color === 'number' && isFinite(color)) return color;
        return fallback;
    }
};

window.MathUtils = MathUtils;