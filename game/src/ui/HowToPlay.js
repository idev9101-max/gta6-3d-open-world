// SOLMAR NIGHTS - how to play screen.

var HowToPlay = function (game) {
    this.game = game;
    this.el = document.getElementById('howto-screen');
    this.visible = false;
};

HowToPlay.prototype.init = function () {
    var self = this;
    document.getElementById('btn-howto-back').addEventListener('click', function () { self.hide(); });
    this.hide();
};

HowToPlay.prototype.show = function () {
    this.visible = true;
    this.el.classList.remove('hidden');
    this.game.input.enabled = false;
    this.game.input.unlock();
};

HowToPlay.prototype.hide = function () {
    this.visible = false;
    this.el.classList.add('hidden');
    this.game.input.enabled = true;
    this.game.input.lock();
};
