// SOLMAR NIGHTS - building types and geometry generators for the city blocks.

var BuildingType = {
    APARTMENT: 0,
    OFFICE: 1,
    STORE: 2,
    WAREHOUSE: 3,
    CLUB: 4
};

var Building = function (type, x, z, w, d, h, color) {
    this.type = type;
    this.x = x;
    this.z = z;
    this.w = w;
    this.d = d;
    this.h = h;
    this.color = color;
    this.mesh = null;
    this.neonMesh = null;
};

Building.prototype.makeMesh = function () {
    var group = new THREE.Group();
    group.position.set(this.x, this.h / 2, this.z);

    var main = new THREE.Mesh(
        new THREE.BoxGeometry(this.w, this.h, this.d),
        new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.7, metalness: 0.2 })
    );
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    // Roof
    var roof = new THREE.Mesh(
        new THREE.BoxGeometry(this.w * 1.05, 0.6, this.d * 1.05),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    roof.position.y = this.h / 2 + 0.3;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Neon accent strip near top
    var neonHeight = 0.4;
    var neonMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    var neon = new THREE.Mesh(
        new THREE.BoxGeometry(this.w * 0.95, neonHeight, this.d * 0.95),
        neonMat
    );
    neon.position.y = this.h / 2 - neonHeight / 2;
    group.add(neon);

    // Windows (simple emissive dots via a few small planes)
    this._addWindows(group);

    this.mesh = group;
    return group;
};

Building.prototype._addWindows = function (group) {
    var rows = Math.max(2, Math.floor(this.h / 4));
    var colsW = Math.max(1, Math.floor(this.w / 2.5));
    var colsD = Math.max(1, Math.floor(this.d / 2.5));
    var winGeo = new THREE.PlaneGeometry(0.7, 0.9);
    var winMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.6 });
    for (var r = 0; r < rows; r++) {
        var ry = -this.h / 2 + 1 + r * (this.h / rows);
        for (var cw = 0; cw < colsW; cw++) {
            var wx = -this.w / 2 + 0.8 + cw * (this.w / colsW);
            var l = new THREE.Mesh(winGeo, winMat);
            l.position.set(wx, ry, this.d / 2 + 0.01);
            l.rotation.y = 0;
            group.add(l);
            var rgt = new THREE.Mesh(winGeo, winMat);
            rgt.position.set(wx, ry, -this.d / 2 - 0.01);
            rgt.rotation.y = Math.PI;
            group.add(rgt);
        }
        for (var cd = 0; cd < colsD; cd++) {
            var wz = -this.d / 2 + 0.8 + cd * (this.d / colsD);
            var f = new THREE.Mesh(winGeo, winMat);
            f.position.set(this.w / 2 + 0.01, ry, wz);
            f.rotation.y = Math.PI / 2;
            group.add(f);
            var b = new THREE.Mesh(winGeo, winMat);
            b.position.set(-this.w / 2 - 0.01, ry, wz);
            b.rotation.y = -Math.PI / 2;
            group.add(b);
        }
    }
};

// Palette: night-time building colors (dark with neon variation)
Building.PALETTE = [
    0x1a1a2e, 0x23233a, 0x0f0f1a, 0x16213e, 0x0a0a12, 0x1f1f33
];

Building.randomColor = function (rng) {
    return new THREE.Color(Building.PALETTE[rng.int(0, Building.PALETTE.length - 1)]);
};

Building.randomNeonColor = function (rng) {
    var palette = [0xff0055, 0x00ffff, 0xffaa00, 0x00ff88, 0xff00ff, 0x0088ff];
    return new THREE.Color(palette[rng.int(0, palette.length - 1)]);
};
