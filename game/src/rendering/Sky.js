// SOLMAR NIGHTS - sky: gradient night dome + stars + moon.

var Sky = function () {
    this.dome = null;
    this.stars = null;
    this.moon = null;
    this.timeOfDay = 22;
};

Sky.prototype.build = function (scene) {
    // Night gradient dome
    var geo = new THREE.SphereGeometry(500, 32, 16);
    geo.scale(-1, 1, 1); // invert normals
    var colors = [];
    var pos = geo.attributes.position.array;
    for (var i = 0; i < pos.length / 3; i++) {
        var y = pos[i * 3 + 1] / 500;
        var t = (y + 1) / 2;
        var top = new THREE.Color(0x020408);
        var mid = new THREE.Color(0x0a0a2a);
        var bot = new THREE.Color(0x141a33);
        var c = new THREE.Color().lerpColors(t < 0.5 ? top : mid, bot, Math.abs(t - 0.5) * 2);
        colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    var mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    this.dome = new THREE.Mesh(geo, mat);
    scene.add(this.dome);

    // Stars
    var starCount = 400;
    var starGeo = new THREE.BufferGeometry();
    var starPos = [], starCols = [];
    for (var i = 0; i < starCount; i++) {
        starPos.push(Math.random() * 1000 - 500, 100 + Math.random() * 300, Math.random() * 1000 - 500);
        var c = Math.random() > 0.9 ? 0x00ffff : 0xffffff;
        starCols.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCols, 3));
    var starMat = new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0.8 });
    this.stars = new THREE.Points(starGeo, starMat);
    scene.add(this.stars);

    // Moon
    var moonGeo = new THREE.SphereGeometry(4, 16, 16);
    var moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.position.set(120, 120, -80);
    scene.add(this.moon);
};

Sky.prototype.updateTime = function (tod) {
    this.timeOfDay = tod;
    // transition tint: deep night
    var phase = Math.sin((tod / 24) * Math.PI * 2);
    var intensity = 0.3 + Math.max(0, -phase) * 0.3;
    if (this.moon) this.moon.visible = tod > 18 || tod < 6;
};
