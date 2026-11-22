// SOLMAR NIGHTS - instanced building renderer (InstancedMesh for many buildings).

var BuildingInstancer = function () {
    this.mesh = null;
    this.count = 0;
    this.dummy = new THREE.Object3D();
    this.colors = [];
    this.scales = [];
    this.positions = [];
};

BuildingInstancer.prototype.build = function (maxCount) {
    this.count = maxCount;
    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.2 });
    this.mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    return this.mesh;
};

BuildingInstancer.prototype.clear = function () {
    this.count = 0;
    if (this.mesh) this.mesh.count = 0;
    if (this.mesh) this.mesh.instanceMatrix.needsUpdate = true;
};

BuildingInstancer.prototype.add = function (x, y, z, sx, sy, sz, color) {
    if (this.count >= this.mesh.count) return;
    var i = this.count++;
    this.dummy.position.set(x, y, z);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
    if (color) {
        if (!this.mesh.instanceColor) {
            this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(this.mesh.count * 3), 3);
        }
        this.mesh.instanceColor.setXYZ(i, color.r, color.g, color.b);
        this.mesh.instanceColor.needsUpdate = true;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
};

BuildingInstancer.prototype.update = function () {
    if (this.mesh) {
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
};
