// SOLMAR NIGHTS - camera: smooth third-person follow with collision-free boom

var Camera = function () {
    this.threeCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.target = new THREE.Vector3();
    this.ideal = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();
    this.distance = 6;
    this.height = 3.2;
    this.horizontalAngle = 0;
    this.verticalAngle = -0.25;
    this.smooth = 8;
    this.collisionRadius = 0.35;
    this.inVehicle = false;
    this.vehicleOffset = new THREE.Vector3(0, 1.6, -5.5);
    this.vehicleLookOffset = new THREE.Vector3(0, 0.6, 4);
};

Camera.prototype.update = function (dt, targetPos, targetQuat, aimDir, walls) {
    var idealDist = this.inVehicle ? 4.5 : this.distance;
    var idealHeight = this.inVehicle ? 1.8 : this.height;

    var forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(targetQuat);
    forward.y = 0;
    forward.normalize();

    var right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(targetQuat);
    right.y = 0;
    right.normalize();

    // Apply mouse look offsets
    this.horizontalAngle += 0; // controlled externally via look input
    var yaw = this.horizontalAngle;
    var pitch = MathUtils.clamp(this.verticalAngle, -1.1, 0.4);

    var camForward = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    var camRight = new THREE.Vector3(
        Math.sin(yaw - Math.PI / 2),
        0,
        Math.cos(yaw - Math.PI / 2)
    ).normalize();

    var idealPos;
    if (this.inVehicle) {
        // over-hood / third-person behind vehicle
        idealPos = targetPos.clone()
            .add(forward.multiplyScalar(-this.vehicleOffset.z))
            .add(new THREE.Vector3(0, this.vehicleOffset.y, 0));
        // slight side offset for hood view
        var side = camRight.clone().multiplyScalar(0.4);
        idealPos.add(side);
        this.lookAtTarget.copy(targetPos).add(forward.clone().multiplyScalar(4)).add(new THREE.Vector3(0, 0.6, 0));
    } else {
        idealPos = targetPos.clone().add(camForward.clone().multiplyScalar(-idealDist));
        idealPos.y = targetPos.y + idealHeight;
        this.lookAtTarget.copy(targetPos).add(new THREE.Vector3(0, 1.0, 0));
    }

    // Collision-free boom: raycast from target to ideal, pull in if blocked
    var finalPos = this._boomCast(targetPos, idealPos, walls);

    this.position.lerp(finalPos, 1 - Math.exp(-this.smooth * dt));
    this.threeCamera.position.copy(this.position);
    this.threeCamera.lookAt(this.lookAtTarget);
};

Camera.prototype._boomCast = function (from, to, walls) {
    // Simple sphere-vs-box sweep using provided wall bounds
    var dir = new THREE.Vector3().subVectors(to, from);
    var dist = dir.length();
    dir.normalize();
    var hitDist = dist;
    if (walls) {
        for (var i = 0; i < walls.length; i++) {
            var b = walls[i];
            var t = this._rayBoxIntersect(from, dir, b.min, b.max);
            if (t !== null && t > 0.1 && t < hitDist) hitDist = t;
        }
    }
    var result = from.clone().add(dir.multiplyScalar(hitDist - this.collisionRadius * 0.5));
    return result;
};

Camera.prototype._rayBoxIntersect = function (origin, dir, min, max) {
    var invDir = new THREE.Vector3(1 / dir.x, 1 / dir.y, 1 / dir.z);
    var t1 = (min.x - origin.x) * invDir.x;
    var t2 = (max.x - origin.x) * invDir.x;
    var tmin = Math.min(t1, t2);
    var tmax = Math.max(t1, t2);
    var t3 = (min.y - origin.y) * invDir.y;
    var t4 = (max.y - origin.y) * invDir.y;
    var tymin = Math.min(t3, t4);
    var tymax = Math.max(t3, t4);
    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    var t5 = (min.z - origin.z) * invDir.z;
    var t6 = (max.z - origin.z) * invDir.z;
    var tzmin = Math.min(t5, t6);
    var tzmax = Math.max(t5, t6);
    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;
    if (tmax < 0) return null;
    return tmin > 0 ? tmin : tmax;
};
