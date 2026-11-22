// SOLMAR NIGHTS - police car: pursues and rams the player.

var PoliceCar = function (game) {
    Car.call(this, game);
    this.color.set(0xffffff);
    this.sirenActive = true;
    this.targetPlayer = null;
    this.chaseSpeed = 20;
    this.ramDistance = 2.5;
};
PoliceCar.prototype = Object.create(Car.prototype);
PoliceCar.prototype.constructor = PoliceCar;

PoliceCar.prototype.init = function (x, y, z, rot) {
    Car.prototype.init.call(this, x, y, z, rot);
    this.setColor(this.color);
    // siren lights on roof
    this.sirenL = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    this.sirenL.position.set(-0.6, 1.4, 0.6);
    this.mesh.add(this.sirenL);
    this.sirenR = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
    this.sirenR.position.set(0.6, 1.4, 0.6);
    this.mesh.add(this.sirenR);
};

PoliceCar.prototype.update = function (dt) {
    var game = this.game;

    if (this.targetPlayer && this.targetPlayer.position) {
        var dir = new THREE.Vector3(this.targetPlayer.position.x - this.position.x, 0, this.targetPlayer.position.z - this.position.z);
        var dist = dir.length();
        if (dist > this.ramDistance) {
            dir.normalize();
            var yaw = Math.atan2(dir.x, dir.z);
            var cur = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
            var diff = MathUtils.wrapAngle(yaw - cur);
            var steer = MathUtils.clamp(diff, -1, 1);
            this.steer = steer;
            this.speed = MathUtils.lerp(this.speed, this.chaseSpeed, dt * 2);
        } else {
            this.speed = MathUtils.lerp(this.speed, 0, dt * 3);
            // ram
            if (Math.random() * 60 < 1) {
                game.addWanted(1);
                game.audio.thump(1);
                var p = this.targetPlayer;
                if (p.inVehicle && p.vehicle) {
                    var knock = new THREE.Vector3().subVectors(p.vehicle.position, this.position).normalize().multiplyScalar(12);
                    p.vehicle.speed += 8;
                }
            }
        }
    } else {
        this.speed = MathUtils.lerp(this.speed, 0, dt * 2);
        this.steer = 0;
    }

    // siren flash
    if (this.sirenActive && this.sirenL) {
        var on = (Date.now() % 800) < 400;
        this.sirenL.material.color.setHex(on ? 0xff0000 : 0x330000);
        this.sirenR.material.color.setHex(on ? 0x0000ff : 0x000033);
    }

    Car.prototype.update.call(this, dt);
};
