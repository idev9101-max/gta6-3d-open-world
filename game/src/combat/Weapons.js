// SOLMAR NIGHTS - weapons: pistol + SMG, firing, ammo, reload, tracers.

var WeaponDef = function (name, damage, range, fireRate, ammo, maxAmmo, spread, reloadTime, bulletColor) {
    this.name = name;
    this.damage = damage;
    this.range = range;
    this.fireRate = fireRate; // shots per second
    this.ammo = ammo;
    this.maxAmmo = maxAmmo;
    this.spread = spread;
    this.reloadTime = reloadTime;
    this.bulletColor = bulletColor;
};

var Weapons = function (game) {
    this.game = game;
    this.weapons = {
        pistol: new WeaponDef('PISTOL', 25, 120, 3, 12, 60, 0.02, 1.5, 0xffaa00),
        smg: new WeaponDef('SMG', 14, 90, 12, 30, 120, 0.08, 2.0, 0x00ffff)
    };
    this.current = 'pistol';
    this.nextFireTime = 0;
    this.reloading = false;
    this.reloadFinishTime = 0;
    this.isFiring = false;
    this.fireTimer = 0;
};

Weapons.prototype.getCurrent = function () {
    return this.weapons[this.current];
};

Weapons.prototype.switch = function (name) {
    if (this.weapons[name]) this.current = name;
    this.game.hud.updateAmmo();
};

Weapons.prototype.reload = function () {
    if (this.reloading) return;
    var w = this.getCurrent();
    if (w.ammo >= w.maxAmmo) return;
    this.reloading = true;
    this.reloadFinishTime = this.game.clock.getElapsedTime() + w.reloadTime;
    this.game.audio.blip(false);
    this.game.hud.updateAmmo();
};

Weapons.prototype.update = function (dt) {
    this.isFiring = false;
    if (this.reloading) {
        if (this.game.clock.getElapsedTime() >= this.reloadFinishTime) {
            this.reloading = false;
            this.getCurrent().ammo = this.getCurrent().maxAmmo;
            this.game.audio.blip(true);
            this.game.hud.updateAmmo();
        }
    }
};

Weapons.prototype.canFire = function () {
    var w = this.getCurrent();
    if (this.reloading) return false;
    if (w.ammo <= 0) return false;
    return this.game.clock.getElapsedTime() >= this.nextFireTime;
};

Weapons.prototype.fire = function (origin, direction) {
    if (!this.canFire()) return null;
    var w = this.getCurrent();
    var now = this.game.clock.getElapsedTime();
    this.nextFireTime = now + 1 / w.fireRate;
    w.ammo--;
    this.isFiring = true;
    this.fireTimer = 0.08;
    this.game.hud.updateAmmo();

    this.game.audio.gunshot(w.name === 'smg' ? 'smg' : 'pistol');

    // Apply spread
    var dir = direction.clone();
    if (w.spread > 0) {
        var rx = (Math.random() - 0.5) * w.spread;
        var ry = (Math.random() - 0.5) * w.spread;
        dir.applyEuler(new THREE.Euler(ry, rx, 0));
        dir.normalize();
    }

    var result = this._shoot(origin, dir, w);
    this.game.effects.spawnMuzzleFlash(origin.x, origin.y, origin.z);
    this.game.effects.spawnTracer(origin.x, origin.y, origin.z, dir, w.range, w.bulletColor);
    return result;
};

Weapons.prototype._shoot = function (origin, dir, w) {
    var ray = new THREE.Ray(origin, dir);
    var hit = { entity: null, position: null, distance: w.range };

    var targets = [];
    var world = this.game.world;
    world.vehicles.forEach(function (v) { if (!v.dead) targets.push(v.mesh); });
    world.pedestrians.forEach(function (p) { if (p.alive) targets.push(p.mesh); });
    if (this.game.player && this.game.player.mesh && !this.game.player.inVehicle) targets.push(this.game.player.mesh);

    var closest = w.range;
    for (var i = 0; i < targets.length; i++) {
        var mesh = targets[i];
        var box = new THREE.Box3().setFromObject(mesh);
        var t = ray.intersectBox(box, new THREE.Vector3());
        if (t) {
            var d = origin.distanceTo(t);
            if (d < closest) {
                closest = d;
                hit.position = t.clone();
                hit.entity = mesh.userData.car || mesh.userData.ped || mesh.userData.player;
            }
        }
    }

    if (hit.position) {
        this.game.effects.spawnImpact(hit.position.x, hit.position.y, hit.position.z, w.bulletColor, w.damage);
        if (hit.entity) {
            if (hit.entity.takeDamage) hit.entity.takeDamage(w.damage);
            if (hit.entity.health !== undefined && hit.entity.health <= 0) {
                if (hit.entity.userData && hit.entity.userData.ped) {
                    game.addWanted(1);
                }
            }
            // crime -> wanted
            if (hit.entity.userData && hit.entity.userData.ped) game.addWanted(1);
            else if (hit.entity.userData && hit.entity.userData.car) game.addWanted(0.5);
        }
    }
    return hit;
};
