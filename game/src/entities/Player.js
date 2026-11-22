// SOLMAR NIGHTS - player: third-person on foot + driving, weapons, health/armor.

var Player = function (game) {
    this.game = game;
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.aimDir = new THREE.Vector3(0, 0, 1);
    this.inVehicle = false;
    this.vehicle = null;
    this.onFoot = true;

    this.health = 100;
    this.armor = 0;
    this.maxHealth = 100;

    this.move = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.speed = 0;
    this.walkSpeed = 4.5;
    this.runSpeed = 8;
    this.jumpForce = 0;
    this.grounded = true;
    this.crouch = false;

    this.enterCooldown = 0;
};

Player.prototype.init = function () {
    var group = new THREE.Group();
    var body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xffaa00 })
    );
    body.position.y = 0;
    body.castShadow = true;
    group.add(body);
    group.position.copy(this.position);
    group.quaternion.copy(this.quaternion);
    this.mesh = group;
    this.mesh.userData.player = this;
    this.game.scene.add(this.mesh);
};

Player.prototype.spawn = function (x, y, z, rot) {
    this.position.set(x, y, z);
    this.quaternion.setFromEuler(new THREE.Euler(0, rot, 0));
    if (this.mesh) {
        this.mesh.position.copy(this.position);
        this.mesh.quaternion.copy(this.quaternion);
    }
    this.health = this.maxHealth;
    this.armor = 0;
    this.inVehicle = false;
    this.vehicle = null;
    this.onFoot = true;
};

Player.prototype.respawn = function () {
    this.spawn(0, 1, 0, 0);
};

Player.prototype.setOnFoot = function (onFoot) {
    this.onFoot = onFoot;
    this.inVehicle = !onFoot;
    this.game.cam.inVehicle = !onFoot;
};

Player.prototype.enterVehicle = function (car) {
    this.vehicle = car;
    this.inVehicle = true;
    this.onFoot = false;
    this.game.cam.inVehicle = true;
    car.enter(this);
    // hide player mesh inside car roughly
    if (this.mesh) this.mesh.visible = false;
    this.game.audio.engineStart();
};

Player.prototype.exitVehicle = function () {
    var car = this.vehicle;
    if (car) {
        car.exit();
        this.vehicle = null;
    }
    this.inVehicle = false;
    this.onFoot = true;
    this.game.cam.inVehicle = false;
    if (this.mesh) this.mesh.visible = true;
    this.game.audio.engineStop();
};

Player.prototype.update = function (dt) {
    var game = this.game;
    var input = game.input;
    var moveSpeed = this.inVehicle ? 0 : (input.isRunning() ? this.runSpeed : this.walkSpeed);

    if (this.enterCooldown > 0) this.enterCooldown -= dt;

    // E enter/exit
    if (input.wasPressed('KeyE') && this.enterCooldown <= 0) {
        this.enterCooldown = 0.6;
        if (!this.inVehicle) {
            // find nearby car
            var nearest = null, nearestD = 6;
            var all = game.world.vehicles.concat(game.world.probeParked || [], game.world.probeTraffic || []);
            for (var i = 0; i < all.length; i++) {
                var c = all[i];
                var d = MathUtils.dist3d(this.position.x, 0, this.position.z, c.position.x, 0, c.position.z);
                if (d < nearestD) { nearestD = d; nearest = c; }
            }
            if (nearest) this.enterVehicle(nearest);
        } else {
            this.exitVehicle();
        }
    }

    if (this.inVehicle && this.vehicle) {
        // driving handled in Car.update via input; just sync position/quat
        this.position.copy(this.vehicle.position);
        this.quaternion.copy(this.vehicle.quaternion);
        this.aimDir.copy(this.vehicle.getForward());
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.quaternion.copy(this.quaternion);
        }
        return;
    }

    // On foot movement
    var mv = input.getMoveVector();
    var target = mv.x * mv.x + mv.z * mv.z > 0.01 ? moveSpeed : 0;
    this.speed = MathUtils.lerp(this.speed, target, dt * 10);

    // rotate toward move direction
    if (mv.x !== 0 || mv.z !== 0) {
        var desiredYaw = Math.atan2(mv.x, mv.z);
        var curYaw = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
        var diff = MathUtils.wrapAngle(desiredYaw - curYaw);
        this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, MathUtils.clamp(diff, -1, 1) * dt * 8, 0)));
    }

    var forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    forward.y = 0;
    this.position.add(forward.multiplyScalar(this.speed * dt));
    this.position.y = 0;

    // keep in city
    var half = 176;
    this.position.x = MathUtils.clamp(this.position.x, -half, half);
    this.position.z = MathUtils.clamp(this.position.z, -half, half);

    // aim direction from mouse (screen space -> world dir roughly)
    var cam = game.camera;
    var camForward = new THREE.Vector3(0, 0, 1).applyQuaternion(cam.quaternion);
    camForward.y = 0; camForward.normalize();
    this.aimDir.copy(camForward);

    if (this.mesh) {
        this.mesh.position.copy(this.position);
        this.mesh.quaternion.copy(this.quaternion);
    }
};

Player.prototype.takeDamage = function (amount) {
    var actual = amount;
    if (this.armor > 0) {
        var absorb = Math.min(this.armor, amount);
        this.armor -= absorb;
        actual -= absorb;
    }
    this.health = MathUtils.clamp(this.health - actual, 0, this.maxHealth);
    this.game.hud.updateHealth(this.health, this.armor);
    this.game.audio.hurt();
    if (this.health <= 0) {
        this.game.gameOverBusted();
    }
};

Player.prototype.getSpeedKmh = function () {
    if (this.inVehicle && this.vehicle) return this.vehicle.getSpeedKmh();
    return this.speed * 10;
};
