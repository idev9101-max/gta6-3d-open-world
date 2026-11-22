// Mission UI screens
class MissionUI {
    constructor(game) {
        this.game = game;
        this.missionCompleteScreen = document.getElementById('mission-complete-screen');
        this.missionCompleteText = document.getElementById('mission-complete-text');
        this.missionPayout = document.getElementById('mission-payout');
        this.btnMissionContinue = document.getElementById('btn-mission-continue');
        
        this.bustedScreen = document.getElementById('busted-screen');
        this.btnBustedContinue = document.getElementById('btn-busted-continue');
        
        this.storyScreen = document.getElementById('story-screen');
        this.storyContent = document.getElementById('story-content');
        
        this.setupButtons();
    }

    setupButtons() {
        this.btnMissionContinue.addEventListener('click', () => this.hideMissionComplete());
        this.btnBustedContinue.addEventListener('click', () => this.hideBusted());
    }

    showMissionStart(mission) {
        this.storyContent.innerHTML = `
            <h2>${mission.name}</h2>
            <p>${mission.description}</p>
            <p style="color: #888; margin-top: 1rem;">Reward: $${mission.reward.toLocaleString()}</p>
            <div class="continue-hint">Press any key to continue</div>
        `;
        this.storyScreen.classList.remove('hidden');
        this.game.input.setEnabled(false);
        
        // Auto-close after key press
        const handler = () => {
            this.hideStory();
            window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
    }

    showMissionComplete(mission, payout) {
        this.missionCompleteText.innerHTML = `
            <h2>${mission.name}</h2>
            <p>Mission completed successfully!</p>
        `;
        this.missionPayout.textContent = '$' + payout.toLocaleString();
        this.missionCompleteScreen.classList.remove('hidden');
        this.game.input.setEnabled(false);
        this.game.audio.playMissionComplete();
    }

    hideMissionComplete() {
        this.missionCompleteScreen.classList.add('hidden');
        this.game.input.setEnabled(true);
    }

    showMissionFailed(reason) {
        this.storyContent.innerHTML = `
            <h2 style="color: #ff4444;">Mission Failed</h2>
            <p>${reason}</p>
            <div class="continue-hint">Press any key to continue</div>
        `;
        this.storyScreen.classList.remove('hidden');
        this.game.input.setEnabled(false);
        
        const handler = () => {
            this.hideStory();
            window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
    }

    showBusted() {
        this.bustedScreen.classList.remove('hidden');
        this.game.input.setEnabled(false);
        this.game.audio.playBusted();
    }

    hideBusted() {
        this.bustedScreen.classList.add('hidden');
        this.game.setState('playing');
        this.game.player.reset();
        this.game.world.reset();
        this.game.missionManager.reset();
        this.game.input.setEnabled(true);
    }

    showGameOver() {
        this.bustedScreen.querySelector('h1').textContent = 'GAME OVER';
        this.bustedScreen.querySelector('p').textContent = 'You were wasted!';
        this.showBusted();
    }

    hideStory() {
        this.storyScreen.classList.add('hidden');
        this.game.input.setEnabled(true);
    }
}

window.MissionUI = MissionUI;