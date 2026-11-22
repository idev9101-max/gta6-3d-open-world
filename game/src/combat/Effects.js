// SOLMAR NIGHTS - effects: object pool for bullets, particles, tracers, muzzle flash, sparks.

var Effects = function (game) {
    this.game = game;
    this.particles = [];
    this.tracers = [];
    this.sparks = [];
    this.flashes = [];
    this.maxParticles = 200;
};

Effects.prototype.init = function () {
    var scene = this.game.scene;

    // Tracer geometry (shared)
    this.tracerGeo = new THREE.BufferGeometry();
    // built per tracer
};

Effects.prototype.spawnMuzzleFlash = function (x, y, z) {
    var light = new THREE.PointLight(0xffaa00, 2, 6);
    light.position.set(x, y, z);
    this.game.scene.add(light);
    var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    this.flashes.push({ light: light, mesh: mesh, life: 0.08 });
};

Effects.prototype.spawnTracer = function (x, y, z, dir, range, color) {
    var end = dir.clone().multiplyScalar(range);
    var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(x + end.x, y + end.y, z + end.z)]);
    var mat = new THREE.LineBasicMaterial({ color: color instanceof THREE.Color ? color : new THREE.Color(color || 0xffaa00) });
    var line = new THREE.Line(geo, mat);
    this.game.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.06 });
};

Effects.prototype.spawnImpact = function (x, y, z, color, damage) {
    var col = color instanceof THREE.Color ? color : new THREE.Color(color || 0xffffff);
    var light = new THREE.PointLight(col, 1.5, 5);
    light.position.set(x, y, z);
    this.game.scene.add(light);
    var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: col })
    );
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    var sparkCount = 6;
    for (var i = 0; i < sparkCount; i++) {
        var s = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        s.position.set(x, y, z);
        var vx = (Math.random() - 0.5) * 4;
        var vy = Math.random() * 4;
        var vz = (Math.random() - 0.5) * 4;
        this.game.scene.add(s);
        this.sparks.push({ mesh: s, vx: vx, vy: vy, vz: vz, life: 0.4 });
    }
    this.flashes.push({ light: light, mesh: mesh, life: 0.1 });
};

Effects.prototype.spawnParticle = function (x, y, z, color, speed) {
    var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: color instanceof THREE.Color ? color : new THREE.Color(0xffffff) })
    );
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    this.particles.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        vz: (Math.random() - 0.5) * speed,
        life: 0.6 + Math.random() * 0.6
    });
};

Effects.prototype.update = function (dt) {
    // flashes
    for (var i = this.flashes.length - 1; i >= 0; i--) {
        var f = this.flashes[i];
        f.life -= dt;
        var mul = f.life / 0.1;
        if (f.mesh) f.mesh.scale.setScalar(Math.max(0, mul * 2));
        if (f.light) f.light.intensity = Math.max(0, 2 * mul);
        if (f.life <= 0) {
            if (f.mesh && f.mesh.parent) f.mesh.parent.remove(f.mesh);
            if (f.light && f.light.parent) f.light.parent.remove(f.light);
            this.flashes.splice(i, 1);
        }
    }
    // tracers
    for (var i = this.tracers.length - 1; i >= 0; i--) {
        var t = this.tracers[i];
        t.life -= dt;
        if (t.mesh && t.mesh.parent) t.mesh.material.opacity = Math.max(0, t.life / 0.06);
        if (t.life <= 0) {
            if (t.mesh && t.mesh.parent) t.mesh.parent.remove(t.mesh);
            this.tracers.splice(i, 1);
        }
    }
    // sparks
    for (var i = this.sparks.length - 1; i >= 0; i--) {
        var s = this.sparks[i];
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 12 * dt; // gravity
        s.life -= dt;
        s.mesh.material.opacity = Math.max(0, s.life / 0.4);
        if (s.life <= 0) {
            if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh);
            this.sparks.splice(i, 1);
        }
    }
    // particles
    for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9 * dt;
        p.life -= dt;
        p.mesh.material.opacity = Math.max(0, p.life / 1.2);
        if (p.life <= 0) {
            if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
            this.particles.splice(i, 1);
        }
    }
};
