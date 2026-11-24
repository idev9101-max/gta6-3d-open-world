// SOLMAR NIGHTS - base car entity with arcade driving physics.

var NEON_STRIP_HEIGHT = 1.28;

var Car = function (game) {
    this.game = game;
    this.mesh = null;
    this.body = null;
    this.wheels = [];
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.speed = 0;
    this.maxSpeed = 26;
    this.accel = 18;
    this.brakeForce = 28;
    this.steerSpeed = 2.2;
    this.steer = 0;
    this.handbrake = false;
    this.friction = 0.88;
    this.health = 1000;
    this.dead = false;
    this.parked = false;
    this.driver = null;
    this.color = new THREE.Color(0xffffff);
    this.sirenActive = false;
    this.sirenSide = 0;
};

Car.prototype.init = function (x, y, z, rot) {
    this.position.set(x, y, z);
    this.quaternion.setFromEuler(new THREE.Euler(0, rot, 0));

    var group = new THREE.Group();
    // Body
    var bodyGeo = new THREE.BoxGeometry(2, 1.2, 4.2);
    var bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3, metalness: 0.6 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.6;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    group.add(this.body);

    // Roof / cabin
    var cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.8, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    cabin.position.set(0, 1.2, 0);
    group.add(cabin);

    // Wheels
    var wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var wheelPos = [
        { x: -1.1, z: 1.4 }, { x: 1.1, z: 1.4 },
        { x: -1.1, z: -1.4 }, { x: 1.1, z: -1.4 }
    ];
    for (var i = 0; i < 4; i++) {
        var w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wheelPos[i].x, 0.3, wheelPos[i].z);
        w.castShadow = true;
        group.add(w);
        this.wheels.push(w);
    }

    // Neon accent strip (sides)
    var strip = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.18, 4.4),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    strip.position.set(0, NEON_STRIP_HEIGHT, 0);
    group.add(strip);

    group.position.copy(this.position);
    group.quaternion.copy(this.quaternion);
    this.mesh = group;
    this.mesh.userData.car = this;
};

Car.prototype.setColor = function (color) {
    this.color.copy(color);
    if (this.body) this.body.material.color.copy(color);
};

Car.prototype.setSpeed = function (s) {
    this.speed = s;
};

Car.prototype.enter = function (driver) {
    this.driver = driver;
};

Car.prototype.exit = function () {
    this.driver = null;
};

Car.prototype.remove = function () {
    if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
};

Car.prototype.update = function (dt) {
    if (this.dead) return;

    var input = this.game.input;
    var driving = (this.driver === this.game.player && this.game.player.inVehicle);

    var targetSpeed = this.speed;
    var steerInput = 0;

    if (driving && !this.game.paused) {
        // throttle / brake
        if (input.isDown('KeyW')) targetSpeed += this.accel * dt;
        if (input.isDown('KeyS')) targetSpeed -= this.brakeForce * dt;
        this.handbrake = input.isDown('Space');

        // steer scales with speed
        var maxSteer = MathUtils.clamp(Math.abs(this.speed) / this.maxSpeed, 0.2, 1);
        if (input.isDown('KeyA')) this.steer += this.steerSpeed * dt * maxSteer;
        if (input.isDown('KeyD')) this.steer -= this.steerSpeed * dt * maxSteer;
        this.steer = MathUtils.clamp(this.steer, -maxSteer, maxSteer);
        steerInput = this.steer;
    } else {
        // AI / traffic / parked
        if (this.parked) {
            targetSpeed = 0;
            this.steer = 0;
        }
        if (this.handbrake) targetSpeed *= 0.9;
    }

    // Apply friction / drag
    if (!driving || (!input.isDown('KeyW') && !input.isDown('KeyS'))) {
        targetSpeed *= this.friction;
    }
    if (this.handbrake) targetSpeed *= 0.82;

    // speed cap
    var cap = this.maxSpeed;
    targetSpeed = MathUtils.clamp(targetSpeed, -cap, cap);

    // Handbrake drift: reduce speed faster, allow rotation even at low speed
    var driftFactor = this.handbrake ? 0.6 : 1.0;
    this.speed = MathUtils.lerp(this.speed, targetSpeed, dt * 8);

    // rotate based on speed + steer
    if (Math.abs(this.speed) > 0.1) {
        var turn = this.speed * steerInput * 2.5 * dt * driftFactor;
        this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)));
    }

    // move forward
    var forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    this.position.add(forward.multiplyScalar(this.speed * dt));
    this.position.y = 0;

    // wheel spin
    var spin = this.speed * dt * 8;
    for (var i = 0; i < this.wheels.length; i++) {
        this.wheels[i].rotation.x += spin;
    }

    // Siren flash for police cars
    if (this.sirenActive) {
        this.sirenSide = 1 - this.sirenSide;
    }

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);

    // Collision with world bounds (city edge) - soft stop
    var half = 176;
    if (this.position.x < -half) { this.position.x = -half; this.speed *= -0.5; }
    if (this.position.x > half) { this.position.x = half; this.speed *= -0.5; }
    if (this.position.z < -half) { this.position.z = -half; this.speed *= -0.5; }
    if (this.position.z > half) { this.position.z = half; this.speed *= -0.5; }
};

Car.prototype.getForward = function () {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
};

Car.prototype.getSpeedKmh = function () {
    return Math.abs(this.speed) * 20;
};
