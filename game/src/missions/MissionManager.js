// SOLMAR NIGHTS - mission manager: state, HUD text, world markers, payout.

var MissionManager = function (game) {
    this.game = game;
    this.missions = game.missions;
    this.currentIndex = -1;
    this.current = null;
    this.active = false;
    this.completedCount = 0;
    this.autoHideTimer = null;
    this.autoHideDelay = 7;

    // mission-specific state
    this.checkpointIndex = 0;
    this.surviveTimer = 0;
    this.surviveDuration = 0;
    this.markerMesh = null;
};

MissionManager.prototype.startMission = function (id) {
    var def = this.missions.get(id);
    if (!def) return;
    this.current = def;
    this.currentIndex = id;
    this.active = true;
    this.checkpointIndex = 0;
    this.surviveTimer = 0;
    if (def.wantedLevel) this.game.setWanted(def.wantedLevel);

    this._placeMarker();
    this.showMissionText(def.briefing, false);
    this.game.audio.blip(true);
};

MissionManager.prototype.completeMission = function () {
    if (!this.current) return;
    var payout = this.current.payout;
    this.game.saveData.money = (this.game.saveData.money || 0) + payout;
    this.completedCount++;
    this.active = false;
    this.game.saveData.missionsCompleted = this.completedCount;
    SaveLoad.save(this.game.saveData);
    this._removeMarker();
    this.game.missionUI.showMissionComplete(this.current.name, payout);
    this.game.audio.blip(true);
    this.game.hud.updateMoney();
};

MissionManager.prototype.failMission = function () {
    if (!this.current) return;
    this.active = false;
    this._removeMarker();
    this.game.missionUI.showMissionFailed();
    this.game.hud.updateMissionText('');
};

MissionManager.prototype.update = function (dt) {
    if (!this.active || !this.current) return;
    var game = this.game;

    switch (this.current.type) {
        case 'drive':
            var dist = MathUtils.dist3d(game.player.position.x, 0, game.player.position.z, this.current.target.x, 0, this.current.target.z);
            if (game.player.inVehicle && game.player.vehicle && dist < 6) {
                this.completeMission();
            }
            break;
        case 'checkpoints':
            var cp = this.current.checkpoints[this.checkpointIndex];
            var dist = MathUtils.dist3d(game.player.position.x, 0, game.player.position.z, cp.x, 0, cp.z);
            if (game.player.inVehicle && game.player.vehicle && dist < 5) {
                this.checkpointIndex++;
                game.audio.blip(true);
                if (this.checkpointIndex >= this.current.checkpoints.length) {
                    this.completeMission();
                } else {
                    this._placeMarker();
                }
            }
            break;
        case 'survive':
            this.surviveTimer += dt;
            if (this.surviveTimer >= this.surviveDuration) {
                this.completeMission();
            }
            break;
    }

    // update marker position (bobbing)
    if (this.markerMesh) {
        this.markerMesh.position.y = 1 + Math.sin(game.clock.getElapsedTime() * 3) * 0.6;
        this.markerMesh.rotation.y += dt * 2;
    }
};

MissionManager.prototype._placeMarker = function () {
    this._removeMarker();
    var target = this.current.target;
    if (this.current.type === 'checkpoints') {
        target = this.current.checkpoints[this.checkpointIndex];
    }
    if (!target) return;
    var geo = new THREE.RingGeometry(1, 1.6, 16);
    var mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
    this.markerMesh = new THREE.Mesh(geo, mat);
    this.markerMesh.position.set(target.x, 1, target.z);
    this.markerMesh.rotation.x = -Math.PI / 2;
    this.game.scene.add(this.markerMesh);
};

MissionManager.prototype._removeMarker = function () {
    if (this.markerMesh) {
        this.game.scene.remove(this.markerMesh);
        this.markerMesh = null;
    }
};

MissionManager.prototype.showMissionText = function (text, persistent) {
    var el = document.getElementById('mission-text');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    if (this.autoHideTimer) {
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = null;
    }
    if (!persistent) {
        var self = this;
        this.autoHideTimer = setTimeout(function () {
            el.style.display = 'none';
            self.autoHideTimer = null;
        }, this.autoHideDelay * 1000);
    }
};

MissionManager.prototype.cancelAutoHide = function () {
    if (this.autoHideTimer) {
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = null;
    }
    var el = document.getElementById('mission-text');
    if (el) el.style.display = 'block';
};

MissionManager.prototype.reportCrime = function () {
    // minor mission interaction: nothing special
};
