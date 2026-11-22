// SOLMAR NIGHTS - mission intro/outro UI (complete, failed, busted).

var MissionUI = function (game) {
    this.game = game;
    this.completeEl = document.getElementById('mission-complete-screen');
    this.completeText = document.getElementById('mission-complete-text');
    this.payoutEl = document.getElementById('mission-payout');
    this.bustedEl = document.getElementById('busted-screen');
    this.visible = false;
};

MissionUI.prototype.init = function () {
    var self = this;
    document.getElementById('btn-mission-continue').addEventListener('click', function () {
        self.hideComplete();
        var next = self.game.missionManager.currentIndex + 1;
        if (next < self.game.missions.count()) {
            self.game.missionManager.startMission(next);
        }
    });
    document.getElementById('btn-busted-continue').addEventListener('click', function () {
        self.hideBusted();
        self.game.player.respawn();
        self.game.paused = false;
    });
    this.hideComplete();
    this.hideBusted();
};

MissionUI.prototype.showMissionComplete = function (name, payout) {
    this.visible = true;
    this.completeEl.classList.remove('hidden');
    this.completeText.textContent = name;
    this.payoutEl.textContent = 'PAYOUT: $' + payout;
};

MissionUI.prototype.hideComplete = function () {
    this.visible = false;
    this.completeEl.classList.add('hidden');
};

MissionUI.prototype.showMissionFailed = function () {
    // brief failure notice via mission text
    this.game.missionManager.showMissionText('MISSION FAILED', true);
};

MissionUI.prototype.hideBusted = function () {
    this.bustedEl.classList.add('hidden');
};
