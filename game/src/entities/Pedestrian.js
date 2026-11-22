// SOLMAR NIGHTS - pedestrian: wanders sidewalks, reacts to danger.

var Pedestrian = function (game) {
    this.game = game;
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.speed = 0;
    this.wanderTimer = 0;
    this.wanderTarget = new THREE.Vector3();
    this.state = 'wander'; // wander, flee, panic
    this.fleeTarget = null;
    this.alive = true;
    this.color = new THREE.Color(0xaaaaaa);
};

Pedestrian.prototype.init = function (x, y, z, rot) {
    this.position.set(x, y, z);
    this.quaternion.setFromEuler(new THREE.Euler(0, rot, 0));

    var group = new THREE.Group();
    var body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.6, 0.5),
        new THREE.MeshStandardMaterial({ color: this.color })
    );
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);
    var head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xddaa88 })
    );
    head.position.y = 1.8;
    group.add(head);
    group.position.copy(this.position);
    group.quaternion.copy(this.quaternion);
    this.mesh = group;
    this.mesh.userData.ped = this;
};

Pedestrian.prototype.update = function (dt) {
    if (!this.alive) return;

    var game = this.game;

    if (this.state === 'wander') {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            this.wanderTarget.set(
                this.position.x + (Math.random() - 0.5) * 12,
                0,
                this.position.z + (Math.random() - 0.5) * 12
            );
            this.wanderTimer = 3 + Math.random() * 4;
        }
        var dir = new THREE.Vector3(this.wanderTarget.x - this.position.x, 0, this.wanderTarget.z - this.position.z);
        var dist = dir.length();
        if (dist > 1.5) {
            dir.normalize();
            var yaw = Math.atan2(dir.x, dir.z);
            var cur = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
            var diff = MathUtils.wrapAngle(yaw - cur);
            this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, MathUtils.clamp(diff, -1, 1) * dt * 2, 0)));
            this.speed = MathUtils.lerp(this.speed, 2.5, dt * 2);
        } else {
            this.speed = MathUtils.lerp(this.speed, 0, dt * 3);
        }
    }

    // React to nearby player crime / gunshots
    var p = game.player;
    if (p.inVehicle === false) {
        var d = MathUtils.dist3d(this.position.x, 0, this.position.z, p.position.x, 0, p.position.z);
        if (d < 10 && game.weapons && game.weapons.isFiring) {
            this.state = 'flee';
            this.fleeTarget = new THREE.Vector3().subVectors(this.position, p.position).normalize().multiplyScalar(30).add(this.position);
        }
    }

    if (this.state === 'flee' && this.fleeTarget) {
        var dir = new THREE.Vector3(this.fleeTarget.x - this.position.x, 0, this.fleeTarget.z - this.position.z);
        var dist = dir.length();
        if (dist > 1.5) {
            dir.normalize();
            var yaw = Math.atan2(dir.x, dir.z);
            var cur = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
            var diff = MathUtils.wrapAngle(yaw - cur);
            this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, MathUtils.clamp(diff, -1, 1) * dt * 3, 0)));
            this.speed = MathUtils.lerp(this.speed, 4, dt * 3);
        } else {
            this.state = 'wander';
        }
    }

    // move
    var forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    this.position.add(forward.multiplyScalar(this.speed * dt));
    this.position.y = 0;

    // keep in city
    var half = 176;
    this.position.x = MathUtils.clamp(this.position.x, -half, half);
    this.position.z = MathUtils.clamp(this.position.z, -half, half);

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
};

Pedestrian.prototype.hit = function () {
    if (!this.alive) return;
    this.alive = false;
    this.game.addWanted(1);
    this.game.audio.hurt();
    // fade body
    var self = this;
    var t = 0;
    var fade = function () {
        t += 0.016;
        if (self.mesh) self.mesh.material ? null : null;
        if (self.bodyMesh) self.bodyMesh.material.opacity = Math.max(0, 1 - t);
        if (t < 1) requestAnimationFrame(fade);
        else self.remove();
    };
    fade();
};

Pedestrian.prototype.remove = function () {
    if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
};
