// HUD system
class HUD {
    constructor(game) {
        this.game = game;
        this.healthFill = document.getElementById('health-fill');
        this.armorFill = document.getElementById('armor-fill');
        this.wantedStars = document.getElementById('wanted-stars');
        this.missionText = document.getElementById('mission-text');
        this.moneyDisplay = document.getElementById('money-display');
        this.ammoDisplay = document.getElementById('ammo-display');
        this.minimap = new Minimap(game);
        
        this.missionTextTimeout = null;
        this.lastHealth = 100;
        this.lastArmor = 0;
    }

    update(delta) {
        this.minimap.update(delta);
    }

    updateFromPlayer() {
        this.updateHealth();
        this.updateArmor();
        this.updateMoney();
        this.updateAmmo();
        this.updateWantedStars();
    }

    updateHealth() {
        const player = this.game.player;
        const percent = (player.health / player.maxHealth) * 100;
        this.healthFill.style.width = percent + '%';
        
        // Flash on damage
        if (player.health < this.lastHealth) {
            this.healthFill.style.background = '#ff4444';
            setTimeout(() => {
                this.healthFill.style.background = 'linear-gradient(90deg, #cc0000, #ff4444)';
            }, 200);
        }
        this.lastHealth = player.health;
    }

    updateArmor() {
        const player = this.game.player;
        const percent = (player.armor / player.maxArmor) * 100;
        this.armorFill.style.width = percent + '%';
        this.armorFill.parentElement.style.display = player.armor > 0 ? 'block' : 'none';
        this.lastArmor = player.armor;
    }

    updateWantedStars() {
        const stars = this.wantedStars.children;
        const level = this.game.player.wantedLevel;
        
        for (let i = 0; i < stars.length; i++) {
            if (i < level) {
                stars[i].classList.add('active');
            } else {
                stars[i].classList.remove('active');
            }
        }
    }

    updateMoney() {
        this.moneyDisplay.textContent = '$' + this.game.player.money.toLocaleString();
    }

    updateAmmo() {
        const player = this.game.player;
        this.ammoDisplay.textContent = `AMMO: ${player.ammo}/${player.maxAmmo}`;
        
        if (player.isReloading) {
            this.ammoDisplay.textContent += ' (RELOADING)';
        }
    }

    showMissionText(text) {
        this.missionText.textContent = text;
        this.missionText.style.display = 'block';
        
        if (this.missionTextTimeout) clearTimeout(this.missionTextTimeout);
        this.missionTextTimeout = setTimeout(() => {
            this.hideMissionText();
        }, 5000);
    }

    hideMissionText() {
        this.missionText.style.display = 'none';
    }

    onResize() {
        this.minimap.onResize();
    }
}

window.HUD = HUD;