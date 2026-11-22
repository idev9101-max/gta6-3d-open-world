// SOLMAR NIGHTS - police pedestrian: chases the player when wanted.

var Police = function (game) {
    Pedestrian.call(this, game);
    this.color.set(0x000044);
    this.maxChaseSpeed = 5;
};
Police.prototype = Object.create(Pedestrian.prototype);
Police.prototype.constructor = Police;

Police.prototype.update = function (dt) {
    if (!this.alive) return;
    var game = this.game;
    var p = game.player;

    if (game.wantedLevel > 0 && p.position) {
        var dir = new THREE.Vector3(p.position.x - this.position.x, 0, p.position.z - this.position.z);
        var dist = dir.length();
        if (dist > 2) {
            dir.normalize();
            var yaw = Math.atan2(dir.x, dir.z);
            var cur = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ').y;
            var diff = MathUtils.wrapAngle(yaw - cur);
            this.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, MathUtils.clamp(diff, -1, 1) * dt * 3, 0)));
            this.speed = MathUtils.lerp(this.speed, this.maxChaseSpeed, dt * 3);
            if (dist < 1.5) {
                game.gameOverBusted();
            }
        } else {
            this.speed = MathUtils.lerp(this.speed, 0, dt * 3);
        }
    } else {
        this.speed = MathUtils.lerp(this.speed, 0, dt * 3);
    }

    Pedestrian.prototype.update.call(this, dt);
};
