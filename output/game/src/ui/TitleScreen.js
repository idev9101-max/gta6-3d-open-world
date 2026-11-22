// Title screen UI
class TitleScreen {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('title-screen');
        this.btnNewGame = document.getElementById('btn-new-game');
        this.btnContinue = document.getElementById('btn-continue');
        this.btnHowto = document.getElementById('btn-howto');
        
        this.setupButtons();
        this.checkSaveExists();
    }

    setupButtons() {
        this.btnNewGame.addEventListener('click', () => this.game.newGame());
        this.btnContinue.addEventListener('click', () => this.continueGame());
        this.btnHowto.addEventListener('click', () => this.showHowTo());
    }

    checkSaveExists() {
        if (SaveLoad.hasSave()) {
            this.btnContinue.disabled = false;
        }
    }

    show() {
        this.screen.classList.remove('hidden');
        this.game.input.setEnabled(false);
        this.checkSaveExists();
    }

    hide() {
        this.screen.classList.add('hidden');
    }

    continueGame() {
        if (this.game.loadGame()) {
            this.hide();
            this.game.setState('playing');
        }
    }

    showHowTo() {
        this.hide();
        this.game.howToPlay.show();
    }
}

window.TitleScreen = TitleScreen;