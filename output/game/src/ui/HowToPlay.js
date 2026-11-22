// How to play screen
class HowToPlay {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('howto-screen');
        this.btnBack = document.getElementById('btn-howto-back');
        
        this.setupButtons();
    }

    setupButtons() {
        this.btnBack.addEventListener('click', () => this.hide());
    }

    show() {
        this.screen.classList.remove('hidden');
        this.game.input.setEnabled(false);
    }

    hide() {
        this.screen.classList.add('hidden');
        if (this.game.state === 'title') {
            this.game.titleScreen.show();
        }
    }
}

window.HowToPlay = HowToPlay;