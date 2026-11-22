// SOLMAR NIGHTS - ocean: animated plane around the city with simple wave shader.

var Ocean = function () {
    this.mesh = null;
    this.time = 0;
    this.size = 1200;
};

Ocean.prototype.build = function (scene) {
    var geo = new THREE.PlaneGeometry(this.size, this.size, 64, 64);
    geo.rotateX(-Math.PI / 2);
    var material = new THREE.MeshStandardMaterial({
        color: 0x001522,
        roughness: 0.2,
        metalness: 0.5,
        emissive: 0x001122,
        emissiveIntensity: 0.4,
        flatShading: true
    });
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.receiveShadow = true;
    this.mesh.position.y = -0.5;
    scene.add(this.mesh);

    // Store original vertex positions for wave animation
    this._origPos = geo.attributes.position.array;
    this._vertexCount = this._origPos.length / 3;
};

Ocean.prototype.update = function (dt) {
    if (!this.mesh) return;
    this.time += dt;
    var pos = this.mesh.geometry.attributes.position;
    var array = pos.array;
    for (var i = 0; i < this._vertexCount; i++) {
        var base = i * 3;
        // original x,z stored? We only have current; recompute from base is lossy.
        // Instead use original positions array for reference
        var ox = this._origPos[base];
        var oz = this._origPos[base + 2];
        var wave = Math.sin(ox * 0.5 + this.time * 2) * Math.cos(oz * 0.5 + this.time * 1.5);
        wave += 0.5 * Math.sin(ox * 1.2 - this.time * 1.2);
        wave += 0.3 * Math.sin((ox + oz) * 0.8 + this.time);
        array[base + 1] = wave * 0.6;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
};
