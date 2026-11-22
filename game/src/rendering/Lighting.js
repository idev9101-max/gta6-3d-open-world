// SOLMAR NIGHTS - lighting: hemisphere + dir moon + neon streetlight points.

var Lighting = function () {
    this.hemi = null;
    this.dir = null;
    this.streetlights = [];
};

Lighting.prototype.build = function (scene) {
    // Hemisphere: dim night sky, darker ground
    this.hemi = new THREE.HemisphereLight(0x001133, 0x000000, 0.5);
    scene.add(this.hemi);

    // Directional moon light
    this.dir = new THREE.DirectionalLight(0xbbddff, 0.55);
    this.dir.position.set(100, 150, -60);
    this.dir.castShadow = true;
    this.dir.shadow.mapSize.width = 1024;
    this.dir.shadow.mapSize.height = 1024;
    this.dir.shadow.camera.near = 0.5;
    this.dir.shadow.camera.far = 400;
    this.dir.shadow.camera.left = -120;
    this.dir.shadow.camera.right = 120;
    this.dir.shadow.camera.top = 120;
    this.dir.shadow.camera.bottom = -120;
    scene.add(this.dir);

    // Neon streetlight points along roads
    var spacing = 40;
    var half = 180;
    var colors = [0xffaa00, 0x00ffff, 0xff0055, 0x00ff88];
    var idx = 0;
    for (var x = -half; x <= half; x += spacing) {
        for (var z = -half; z <= half; z += spacing) {
            if ((x + z) % 80 !== 0) continue; // only intersection lamps
            var c = colors[idx++ % colors.length];
            var light = new THREE.PointLight(c, 0.8, 18);
            light.position.set(x, 5, z);
            light.castShadow = false;
            scene.add(light);
            // lamp post
            var post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 5, 8),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            post.position.set(x, 2.5, z);
            scene.add(post);
            this.streetlights.push(light);
        }
    }
};

Lighting.prototype.updateTime = function (tod) {
    // moon brightness varies slightly
    if (this.dir) {
        var night = tod > 19 || tod < 5;
        this.dir.intensity = night ? 0.6 : 0.05;
        this.hemi.intensity = night ? 0.4 : 0.05;
    }
};
