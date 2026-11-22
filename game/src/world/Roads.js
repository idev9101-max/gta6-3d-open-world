// SOLMAR NIGHTS - road network. 9x9 blocks on a 40-unit grid, roads between
// block centers, intersections with traffic lights.

var RoadSegment = function (start, end, dir) {
    this.start = start;   // Vector3 (x,z)
    this.end = end;       // Vector3 (x,z)
    this.dir = dir;       // normalized Vector2 (x,z) direction of travel lane
    this.lanes = 2;
    this.width = 10;
    this.light = null;    // {state:'red'|'yellow'|'green', timer}
};

var Intersection = function (x, z) {
    this.x = x;
    this.z = z;
    this.segments = [];
    this.lightNS = 'green';
    this.lightEW = 'red';
    this.timer = 0;
};

var Roads = function () {
    this.blockSize = 40;
    this.blocks = 9; // 9x9 blocks
    this.half = (this.blocks * this.blockSize) / 2;
    this.roadWidth = 10;
    this.segments = [];
    this.intersections = [];
    this.mesh = null;
    this.group = new THREE.Group();
};

Roads.prototype.generate = function () {
    var bs = this.blockSize;
    var n = this.blocks;
    var half = this.half;

    // Vertical roads (x = const) and horizontal roads (z = const) at block boundaries
    for (var i = 0; i <= n; i++) {
        var x = -half + i * bs;
        for (var j = 0; j < n; j++) {
            var z1 = -half + j * bs;
            var z2 = z1 + bs;
            var seg = new RoadSegment(new THREE.Vector2(x, z1), new THREE.Vector2(x, z2), new THREE.Vector2(0, 1));
            this.segments.push(seg);
        }
    }
    for (var i = 0; i <= n; i++) {
        var z = -half + i * bs;
        for (var j = 0; j < n; j++) {
            var x1 = -half + j * bs;
            var x2 = x1 + bs;
            var seg = new RoadSegment(new THREE.Vector2(x1, z), new THREE.Vector2(x2, z), new THREE.Vector2(1, 0));
            this.segments.push(seg);
        }
    }

    // Intersections at every road crossing
    for (var i = 0; i <= n; i++) {
        var x = -half + i * bs;
        for (var j = 0; j <= n; j++) {
            var z = -half + j * bs;
            this.intersections.push(new Intersection(x, z));
        }
    }

    this._buildMesh();
};

Roads.prototype._buildMesh = function () {
    var geo = new THREE.BufferGeometry();
    var pos = [], col = [];
    var w = this.roadWidth;
    var bs = this.blockSize;
    var n = this.blocks;
    var half = this.half;

    // Draw road quads for each segment (simple flat strips)
    for (var i = 0; i < this.segments.length; i++) {
        var s = this.segments[i];
        var hx = (s.dir.x !== 0) ? w / 2 : 0;
        var hz = (s.dir.z !== 0) ? w / 2 : 0;
        // quad corners
        var c = [
            new THREE.Vector3(s.start.x - hx, 0.02, s.start.y - hz),
            new THREE.Vector3(s.end.x - hx, 0.02, s.end.y - hz),
            new THREE.Vector3(s.end.x + hx, 0.02, s.end.y + hz),
            new THREE.Vector3(s.start.x + hx, 0.02, s.start.y + hz)
        ];
        var neon = new THREE.Color(0x00ff88);
        var dark = new THREE.Color(0x0a1414);
        for (var ci = 0; ci < 4; ci++) {
            pos.push(c[ci].x, c[ci].y, c[ci].z);
            col.push(ci % 2 === 0 ? dark.r : neon.r, ci % 2 === 0 ? dark.g : neon.g, ci % 2 === 0 ? dark.b : neon.b);
        }
        // two triangles
        var idxBase = (i * 4);
        // indices handled by draw range? use index array
    }
    // Build index array
    var indices = [];
    for (var i = 0; i < this.segments.length; i++) {
        var base = i * 4;
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(indices);
    var mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);

    // Lane markings (dashed center lines) as a simple line loop per segment
    this._buildMarkings();
};

Roads.prototype._buildMarkings = function () {
    var marks = [];
    var bs = this.blockSize;
    for (var i = 0; i < this.segments.length; i++) {
        var s = this.segments[i];
        var steps = Math.floor(bs / 4);
        for (var j = 0; j < steps; j++) {
            var t0 = j / steps;
            var t1 = (j + 0.5) / steps;
            var p0 = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(s.start.x, 0.05, s.start.y),
                new THREE.Vector3(s.end.x, 0.05, s.end.y), t0);
            var p1 = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(s.start.x, 0.05, s.start.y),
                new THREE.Vector3(s.end.x, 0.05, s.end.y), t1);
            marks.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        }
    }
    if (marks.length === 0) return;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(marks, 3));
    var mat = new THREE.LineBasicMaterial({ color: 0xffffff });
    var lines = new THREE.LineSegments(geo, mat);
    this.group.add(lines);
};

Roads.prototype.getSegmentAt = function (x, z) {
    // nearest road segment
    var best = null, bestD = 1e9;
    for (var i = 0; i < this.segments.length; i++) {
        var s = this.segments[i];
        var d = MathUtils.dist2d(s.start.x, s.start.y, x, z);
        if (d < bestD) { bestD = d; best = s; }
    }
    return best;
};

Roads.prototype.getClosestPointOnRoad = function (x, z) {
    var best = null, bestD = 1e9, bestT = 0;
    for (var i = 0; i < this.segments.length; i++) {
        var s = this.segments[i];
        var dx = s.end.x - s.start.x, dz = s.end.y - s.start.y;
        var len2 = dx * dx + dz * dz;
        var t = ((x - s.start.x) * dx + (z - s.start.y) * dz) / len2;
        t = MathUtils.clamp(t, 0, 1);
        var px = s.start.x + dx * t, pz = s.start.y + dz * t;
        var d = MathUtils.dist2d(x, z, px, pz);
        if (d < bestD) { bestD = d; best = new THREE.Vector2(px, pz); bestT = t; }
    }
    return { point: best, t: bestT, dist: bestD };
};

Roads.prototype.updateLights = function (dt) {
    for (var i = 0; i < this.intersections.length; i++) {
        var inter = this.intersections[i];
        inter.timer -= dt;
        if (inter.timer <= 0) {
            if (inter.lightNS === 'green') {
                inter.lightNS = 'yellow'; inter.timer = 1.5;
            } else if (inter.lightNS === 'yellow') {
                inter.lightNS = 'red'; inter.lightEW = 'green'; inter.timer = 5;
            } else if (inter.lightNS === 'red') {
                inter.lightNS = 'green'; inter.lightEW = 'red'; inter.timer = 5;
            }
        }
    }
};

Roads.prototype.isLightGreen = function (x, z, dir) {
    // dir: 'ns' or 'ew'
    var inter = this.getIntersection(x, z);
    if (!inter) return true;
    if (dir === 'ns') return inter.lightNS === 'green';
    if (dir === 'ew') return inter.lightEW === 'green';
    return true;
};

Roads.prototype.getIntersection = function (x, z) {
    var snap = function (v) { return Math.round(v / 40) * 40; };
    var sx = snap(x), sz = snap(z);
    for (var i = 0; i < this.intersections.length; i++) {
        var inter = this.intersections[i];
        if (inter.x === sx && inter.z === sz) return inter;
    }
    return null;
};
