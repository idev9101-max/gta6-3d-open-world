// SOLMAR NIGHTS - traffic car: cruises roads, stops at lights.

var TrafficCar = function (game) {
    Car.call(this, game);
    this.maxSpeed = 14;
    this.targetNode = null;
    this.targetPoint = null;
    this.t = 0;
    this.state = 'cruise'; // cruise, stop, wait
    this.waitTimer = 0;
    this.color.set(MathUtils.randomNeonColor(new MathUtils.SeededRNG(Date.now())));
};
TrafficCar.prototype = Object.create(Car.prototype);
TrafficCar.prototype.constructor = TrafficCar;

TrafficCar.prototype.init = function (x, y, z, rot) {
    Car.prototype.init.call(this, x, y, z, rot);
    this.setColor(this.color);
    this._pickTarget();
};

TrafficCar.prototype._pickTarget = function () {
    var segs = this.game.world.roads.segments;
    if (segs.length === 0) return;
    var s = segs[Math.floor(Math.random() * segs.length)];
    this.targetPoint = new THREE.Vector2(s.end.x, s.end.y);
    this.t = 0;
    this.state = 'cruise';
};

TrafficCar.prototype.update = function (dt) {
    if (this.dead) return;
    var game = this.game;
    var roads = game.world.roads;

    // Steer toward target point along road
    var dir = new THREE.Vector2(this.targetPoint.x - this.position.x, this.targetPoint.z - this.position.z);
    var dist = dir.length();
    if (dist > 2) {
        dir.normalize();
        var desiredYaw = Math.atan2(dir.x, dir.y);
        var curYaw = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
        var diff = MathUtils.wrapAngle(desiredYaw - curYaw);
        var turn = MathUtils.clamp(diff, -1, 1) * this.steerSpeed * dt * 1.5;
        this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0)));
        this.speed = MathUtils.lerp(this.speed, this.maxSpeed, dt * 2);
    } else {
        this.speed = MathUtils.lerp(this.speed, 0, dt * 3);
        this._pickTarget();
    }

    // Stop at red lights near intersections
    var inter = roads.getIntersection(this.position.x, this.position.z);
    if (inter) {
        var dirNS = Math.abs(this.getForward().z) > Math.abs(this.getForward().x);
        var green = dirNS ? inter.lightNS === 'green' : inter.lightEW === 'green';
        var near = MathUtils.dist2d(this.position.x, this.position.z, inter.x, inter.z) < 8;
        if (near && !green) {
            this.speed = MathUtils.lerp(this.speed, 0, dt * 5);
        }
    }

    // Avoid player car lightly
    var p = game.player;
    if (p.inVehicle && p.vehicle) {
        var d = MathUtils.dist3d(this.position.x, 0, this.position.z, p.vehicle.position.x, 0, p.vehicle.position.z);
        if (d < 6) {
            this.speed = MathUtils.lerp(this.speed, 0, dt * 6);
        }
    }

    Car.prototype.update.call(this, dt);
};
