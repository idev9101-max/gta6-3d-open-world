// SOLMAR NIGHTS: mission UI — start/complete/failed/busted screens.
// Mission UI screens - mission start, complete, failed, busted, game over
const ELEMENT_IDS = {
    MISSION_COMPLETE_SCREEN: 'mission-complete-screen',
    MISSION_COMPLETE_TEXT: 'mission-complete-text',
    MISSION_PAYOUT: 'mission-payout',
    BTN_MISSION_CONTINUE: 'btn-mission-continue',
    BUSTED_SCREEN: 'busted-screen',
    BTN_BUSTED_CONTINUE: 'btn-busted-continue',
    STORY_SCREEN: 'story-screen',
    STORY_CONTENT: 'story-content'
};
const CONTINUE_HINT = '<div class="continue-hint">Press any key to continue</div>';
const BUSTED_TEXT = 'You lost your weapons and cash';
const GAME_OVER_TEXT = 'You were wasted!';
const MISSION_FAILED_COLOR = '#ff4444';

class MissionUI {
    constructor(game) {
        this.game = game;
        this.missionCompleteScreen = document.getElementById(ELEMENT_IDS.MISSION_COMPLETE_SCREEN);
        this.missionCompleteText = document.getElementById(ELEMENT_IDS.MISSION_COMPLETE_TEXT);
        this.missionPayout = document.getElementById(ELEMENT_IDS.MISSION_PAYOUT);
        this.btnMissionContinue = document.getElementById(ELEMENT_IDS.BTN_MISSION_CONTINUE);
        
        this.bustedScreen = document.getElementById(ELEMENT_IDS.BUSTED_SCREEN);
        this.btnBustedContinue = document.getElementById(ELEMENT_IDS.BTN_BUSTED_CONTINUE);
        
        this.storyScreen = document.getElementById(ELEMENT_IDS.STORY_SCREEN);
        this.storyContent = document.getElementById(ELEMENT_IDS.STORY_CONTENT);
        
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
            ${CONTINUE_HINT}
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
            <h2 style="color: ${MISSION_FAILED_COLOR};">Mission Failed</h2>
            <p>${reason}</p>
            ${CONTINUE_HINT}
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
        this.bustedScreen.querySelector('p').textContent = GAME_OVER_TEXT;
        this.showBusted();
    }

    hideStory() {
        this.storyScreen.classList.add('hidden');
        this.game.input.setEnabled(true);
    }
}

window.MissionUI = MissionUI;