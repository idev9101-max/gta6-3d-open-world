// Pause menu UI - handles pause screen and save/load/quit actions
const NOTIFICATION_LIFETIME = 2000;

class PauseMenu {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('pause-screen');
        this.btnResume = document.getElementById('btn-resume');
        this.btnSave = document.getElementById('btn-save');
        this.btnLoad = document.getElementById('btn-load');
        this.btnQuit = document.getElementById('btn-quit');
        
        this.setupButtons();
    }

    setupButtons() {
        this.btnResume.addEventListener('click', () => this.game.resume());
        this.btnSave.addEventListener('click', () => this.saveGame());
        this.btnLoad.addEventListener('click', () => this.loadGame());
        this.btnQuit.addEventListener('click', () => this.quitToTitle());
    }

    show() {
        this.screen.classList.remove('hidden');
        this.game.input.setEnabled(false);
    }

    hide() {
        this.screen.classList.add('hidden');
    }

    saveGame() {
        if (this.game.saveGame()) {
            this.showNotification('Game Saved!');
        }
    }

    loadGame() {
        if (this.game.loadGame()) {
            this.hide();
            this.game.setState('playing');
            this.showNotification('Game Loaded!');
        }
    }

    quitToTitle() {
        this.hide();
        this.game.quitToTitle();
    }

    showNotification(text) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = text;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, NOTIFICATION_LIFETIME);
    }
}

window.PauseMenu = PauseMenu;