// SOLMAR NIGHTS - pause menu: resume, save, load, quit.

var PauseMenu = function (game) {
    this.game = game;
    this.el = document.getElementById('pause-screen');
    this.visible = false;
};

PauseMenu.prototype.init = function () {
    var self = this;
    document.getElementById('btn-resume').addEventListener('click', function () { self.hide(); });
    document.getElementById('btn-save').addEventListener('click', function () {
        self.game.saveData.money = self.game.saveData.money || 0;
        self.game.saveData.missionsCompleted = self.game.missionManager.completedCount;
        SaveLoad.save(self.game.saveData);
        self.game.hud.updateMoney();
    });
    document.getElementById('btn-load').addEventListener('click', function () {
        self.game.saveData = SaveLoad.load();
        self.game.hud.updateMoney();
        self.game.missionManager.completedCount = self.game.saveData.missionsCompleted || 0;
        self.hide();
    });
    document.getElementById('btn-quit').addEventListener('click', function () {
        self.hide();
        self.game.titleScreen.show();
        self.game.player.respawn();
    });
    this.hide();
};

PauseMenu.prototype.setVisible = function (v) {
    this.visible = v;
    this.el.classList.toggle('hidden', !v);
    if (v) this.game.input.enabled = false;
    else {
        this.game.input.enabled = true;
        this.game.input.lock();
    }
};

PauseMenu.prototype.show = function () { this.setVisible(true); };
PauseMenu.prototype.hide = function() { this.setVisible(false); };

PauseMenu.prototype.update = function (dt) {
    // no-op
};
