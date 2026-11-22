// SOLMAR NIGHTS - math utilities (seeded RNG, clamping, interpolation, geometry helpers)

var MathUtils = {
    PI2: Math.PI * 2,
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,

    clamp: function (value, min, max) {
        return value < min ? min : value > max ? max : value;
    },

    lerp: function (a, b, t) {
        return a + (b - a) * t;
    },

    smoothstep: function (a, b, t) {
        t = MathUtils.clamp((t - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    },

    smootherstep: function (a, b, t) {
        t = MathUtils.clamp((t - a) / (b - a), 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    },

    // Seeded pseudo-random number generator (mulberry32). Deterministic for probe shots.
    SeededRNG: function (seed) {
        this.seed = seed >>> 0;
        this.next = function () {
            var t = this.seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        this.range = function (min, max) {
            return min + (max - min) * this.next();
        };
        this.int = function (min, max) {
            return Math.floor(this.range(min, max + 1));
        };
        this.pick = function (arr) {
            return arr[this.int(0, arr.length - 1)];
        };
        this.bool = function (p) {
            return p === undefined ? this.next() < 0.5 : this.next() < p;
        };
    },

    dist2d: function (x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    dist2dSq: function (x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    dist3d: function (x1, y1, z1, x2, y2, z2) {
        var dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    dist3dSq: function (x1, y1, z1, x2, y2, z2) {
        var dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
        return dx * dx + dy * dy + dz * dz;
    },

    wrapAngle: function (angle) {
        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    },

    angleDiff: function (a, b) {
        return MathUtils.wrapAngle(a - b);
    },

    approxEqual: function (a, b, eps) {
        return eps === undefined ? Math.abs(a - b) < 1e-4 : Math.abs(a - b) < eps;
    },

    mapRange: function (value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },

    // Generate a random color in neon palette
    randomNeonColor: function (rng) {
        var palette = [0xff0055, 0x00ffff, 0xffaa00, 0x00ff88, 0xff00ff, 0xaa00ff, 0x0088ff];
        return palette[rng.int(0, palette.length - 1)];
    }
};
