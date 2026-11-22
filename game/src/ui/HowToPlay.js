// SOLMAR NIGHTS: how-to-play screen — control scheme reference.
// How to play screen - displays control scheme and gameplay info
const BACK_BUTTON_ID = 'btn-howto-back';

class HowToPlay {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('howto-screen');
        this.btnBack = document.getElementById(BACK_BUTTON_ID);
        
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