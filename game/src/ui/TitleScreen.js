// SOLMAR NIGHTS - title screen: new game, continue, how to play.

var TitleScreen = function (game) {
    this.game = game;
    this.el = document.getElementById('title-screen');
    this.visible = false;
};

TitleScreen.prototype.init = function () {
    var self = this;
    document.getElementById('btn-new-game').addEventListener('click', function () {
        self.hide();
        self.game.startGame();
    });
    document.getElementById('btn-continue').addEventListener('click', function () {
        self.hide();
        self.game.startGame();
        if (self.game.saveData) {
            self.game.missionManager.completedCount = self.game.saveData.missionsCompleted || 0;
            self.game.hud.updateMoney();
        }
    });
    document.getElementById('btn-howto').addEventListener('click', function () {
        self.game.howToPlay.show();
    });
    document.getElementById('btn-continue').disabled = !SaveLoad.hasSave();
    this.hide();
};

TitleScreen.prototype.show = function () {
    this.visible = true;
    this.el.classList.remove('hidden');
    document.getElementById('btn-continue').disabled = !SaveLoad.hasSave();
    this.game.input.enabled = false;
    this.game.input.unlock();
};

TitleScreen.prototype.hide = function () {
    this.visible = false;
    this.el.classList.add('hidden');
    this.game.input.enabled = true;
    this.game.input.lock();
};

TitleScreen.prototype.update = function (dt) {
    // no-op
};
