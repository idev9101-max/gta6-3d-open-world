// SOLMAR NIGHTS - HUD: health, armor, cash, stars, weapon+ammo, mission text, speed.

var HUD = function (game) {
    this.game = game;
    this.els = {};
};

HUD.prototype.init = function () {
    var ids = ['health-fill', 'armor-fill', 'wanted-stars', 'money-display', 'ammo-display', 'mission-text'];
    for (var i = 0; i < ids.length; i++) {
        this.els[ids[i]] = document.getElementById(ids[i]);
    }
    this.els['crosshair'] = document.getElementById('crosshair');
    this.updateHealth(100, 0);
    this.updateWanted(0);
    this.updateMoney();
    this.updateAmmo();
};

HUD.prototype.update = function (dt) {
    var game = this.game;
    var speedEl = this.els['speed-display'];
    var player = game.player;
    if (!speedEl) {
        speedEl = document.createElement('div');
        speedEl.id = 'speed-display';
        speedEl.style.position = 'fixed';
        speedEl.style.bottom = '20px';
        speedEl.style.left = '20px';
        speedEl.style.color = '#ffaa00';
        speedEl.style.textShadow = '0 0 4px #000';
        speedEl.style.fontSize = '1.1rem';
        document.body.appendChild(speedEl);
        this.els['speed-display'] = speedEl;
    }
    if (player.inVehicle && player.vehicle) {
        speedEl.textContent = 'SPD ' + Math.floor(player.vehicle.getSpeedKmh()) + ' KM/H';
        speedEl.style.display = 'block';
        if (this.els['crosshair']) this.els['crosshair'].style.display = 'none';
    } else {
        speedEl.style.display = 'none';
        if (this.els['crosshair']) this.els['crosshair'].style.display = 'block';
    }
};

HUD.prototype.updateHealth = function (hp, armor) {
    var hf = this.els['health-fill'];
    var af = this.els['armor-fill'];
    if (hf) hf.style.width = Math.max(0, Math.min(100, hp)) + '%';
    if (af) af.style.width = Math.max(0, Math.min(100, armor)) + '%';
};

HUD.prototype.updateWanted = function (level) {
    var stars = document.querySelectorAll('.star');
    for (var i = 0; i < stars.length; i++) {
        stars[i].classList.toggle('active', i < level);
    }
};

HUD.prototype.updateMoney = function () {
    if (this.els['money-display']) this.els['money-display'].textContent = '$' + (this.game.saveData.money || 0);
};

HUD.prototype.updateAmmo = function () {
    var w = this.game.weapons.getCurrent();
    var el = this.els['ammo-display'];
    if (!el) return;
    if (this.game.player.inVehicle) {
        el.textContent = '';
    } else if (this.game.weapons.reloading) {
        el.textContent = 'RELOADING...';
    } else {
        el.textContent = w.name + '  ' + w.ammo + '/' + w.maxAmmo;
    }
};

HUD.prototype.updateMissionText = function (text) {
    var el = this.els['mission-text'];
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
};
