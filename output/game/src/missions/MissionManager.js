// Mission manager - handles mission flow
class MissionManager {
    constructor(game) {
        this.game = game;
        this.missions = Missions;
        this.currentMissionIndex = 0;
        this.currentMission = null;
        this.currentObjectiveIndex = 0;
        this.completedMissions = [];
        this.missionProgress = 0;
        this.activeMarkers = [];
        this.missionEntities = []; // Spawned mission-specific entities
        this.tailTarget = null;
        this.timedObjectiveTimer = 0;
        this.isInMission = false;
    }

    startMission(index) {
        if (index >= this.missions.length) return false;
        
        this.currentMissionIndex = index;
        this.currentMission = this.missions[index];
        this.currentObjectiveIndex = 0;
        this.isInMission = true;
        this.missionProgress = 0;
        
        this.setupMission();
        this.game.missionUI.showMissionStart(this.currentMission);
        this.game.hud.showMissionText(this.getCurrentObjectiveText());
        
        return true;
    }

    setupMission() {
        this.clearMissionEntities();
        this.createObjectiveMarker();
        
        // Mission-specific setup
        switch (this.currentMission.id) {
            case 'mission_1':
                this.spawnGangMembers();
                break;
            case 'mission_2':
                this.spawnPackage();
                break;
            case 'mission_3':
                this.spawnInformant();
                break;
            case 'mission_4':
                this.spawnEnemyVehicles();
                break;
            case 'mission_5':
                this.setupBankHeist();
                break;
            case 'mission_6':
                this.spawnMansionEnemies();
                break;
        }
    }

    createObjectiveMarker() {
        this.clearMarkers();
        const marker = new MissionMarker(this.game, this.currentMission, this.currentObjectiveIndex);
        this.activeMarkers.push(marker);
    }

    clearMarkers() {
        this.activeMarkers.forEach(m => m.dispose());
        this.activeMarkers = [];
    }

    getCurrentObjectiveText() {
        if (!this.currentMission) return '';
        const obj = this.currentMission.objectives[this.currentObjectiveIndex];
        return obj ? obj.text : '';
    }

    update(delta) {
        if (!this.isInMission || !this.currentMission) return;
        
        const obj = this.currentMission.objectives[this.currentObjectiveIndex];
        if (!obj) return;
        
        // Update markers
        this.activeMarkers.forEach(m => m.update(delta));
        
        // Update mission entities
        this.updateMissionEntities(delta);
        
        // Check objective completion
        this.checkObjective(obj);
        
        // Update timed objectives
        if (obj.type === 'timed' || (obj.type === 'tail' && obj.duration)) {
            this.timedObjectiveTimer -= delta;
            if (this.timedObjectiveTimer <= 0) {
                this.failMission('Time ran out!');
            }
        }
    }

    checkObjective(obj) {
        const player = this.game.player;
        
        switch (obj.type) {
            case 'enter_vehicle':
                if (player.isInVehicle) this.nextObjective();
                break;
                
            case 'drive':
                if (obj.position && player.position.distanceTo(obj.position) < (obj.radius || 10)) {
                    this.nextObjective();
                }
                break;
                
            case 'kill':
                // Checked via entity death events
                break;
                
            case 'pickup':
                if (obj.position && player.position.distanceTo(obj.position) < 3) {
                    this.nextObjective();
                }
                break;
                
            case 'enter':
                if (obj.position && player.position.distanceTo(obj.position) < 3) {
                    this.nextObjective();
                }
                break;
                
            case 'wait':
                if (!obj.waitTimer) obj.waitTimer = obj.duration;
                obj.waitTimer -= this.game.delta;
                if (obj.waitTimer <= 0) this.nextObjective();
                break;
                
            case 'escape':
                if (player.wantedLevel === 0) this.nextObjective();
                break;
                
            case 'tail':
                this.checkTailObjective(obj);
                break;
                
            case 'destroy':
                // Checked via vehicle destruction
                break;
                
            case 'survive':
                if (!obj.surviveTimer) obj.surviveTimer = obj.duration;
                obj.surviveTimer -= this.game.delta;
                if (obj.surviveTimer <= 0) this.nextObjective();
                break;
        }
    }

    checkTailObjective(obj) {
        if (!this.tailTarget) return;
        
        const dist = this.game.player.position.distanceTo(this.tailTarget.position);
        
        if (dist > obj.maxDistance) {
            this.failMission('Lost the target!');
        } else if (dist < obj.minDistance) {
            this.game.hud.showMissionText('Too close! Back off!');
        } else {
            obj.duration -= this.game.delta;
            if (obj.duration <= 0) this.nextObjective();
        }
    }

    nextObjective() {
        this.currentObjectiveIndex++;
        this.missionProgress = this.currentObjectiveIndex / this.currentMission.objectives.length;
        
        if (this.currentObjectiveIndex >= this.currentMission.objectives.length) {
            this.completeMission();
        } else {
            this.createObjectiveMarker();
            this.game.hud.showMissionText(this.getCurrentObjectiveText());
            
            // Setup next objective specifics
            const obj = this.currentMission.objectives[this.currentObjectiveIndex];
            if (obj.type === 'timed') this.timedObjectiveTimer = obj.duration;
            if (obj.type === 'tail') this.timedObjectiveTimer = obj.duration;
            if (obj.type === 'wait') obj.waitTimer = obj.duration;
            if (obj.type === 'survive') obj.surviveTimer = obj.duration;
        }
    }

    registerKill(targetType) {
        if (!this.currentMission) return;
        
        const obj = this.currentMission.objectives[this.currentObjectiveIndex];
        if (obj && obj.type === 'kill' && obj.targetType === targetType) {
            obj.count--;
            this.game.hud.showMissionText(`${obj.count} ${targetType}(s) remaining`);
            if (obj.count <= 0) this.nextObjective();
        }
    }

    registerVehicleDestroyed() {
        if (!this.currentMission) return;
        
        const obj = this.currentMission.objectives[this.currentObjectiveIndex];
        if (obj && obj.type === 'destroy') {
            obj.count--;
            this.game.hud.showMissionText(`${obj.count} vehicles remaining`);
            if (obj.count <= 0) this.nextObjective();
        }
    }

    completeMission() {
        this.isInMission = false;
        this.completedMissions.push(this.currentMission.id);
        this.game.player.addMoney(this.currentMission.reward);
        this.game.missionUI.showMissionComplete(this.currentMission, this.currentMission.reward);
        this.clearMarkers();
        this.clearMissionEntities();
        this.game.hud.hideMissionText();
        
        // Unlock next mission
        if (this.currentMission.unlocks) {
            const nextIndex = this.missions.findIndex(m => m.id === this.currentMission.unlocks);
            if (nextIndex !== -1 && nextIndex > this.currentMissionIndex) {
                // Next mission available
            }
        }
    }

    failMission(reason) {
        this.isInMission = false;
        this.game.missionUI.showMissionFailed(reason);
        this.clearMarkers();
        this.clearMissionEntities();
        this.game.hud.hideMissionText();
    }

    cancelMission() {
        this.isInMission = false;
        this.clearMarkers();
        this.clearMissionEntities();
        this.game.hud.hideMissionText();
    }

    // Mission-specific entity spawning
    spawnGangMembers() {
        const positions = [
            new THREE.Vector3(150, 0, 100),
            new THREE.Vector3(160, 0, 110),
            new THREE.Vector3(140, 0, 90),
            new THREE.Vector3(170, 0, 100),
            new THREE.Vector3(130, 0, 110)
        ];
        
        positions.forEach(pos => {
            const ped = new Pedestrian(this.game, { position: pos.clone() });
            ped.isMissionTarget = true;
            ped.targetType = 'gang';
            ped.health = 100;
            ped.init();
            this.missionEntities.push(ped);
            this.game.scene.add(ped.mesh);
        });
    }

    spawnPackage() {
        // Visual package marker
        const geo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.7 });
        this.packageMesh = new THREE.Mesh(geo, mat);
        this.packageMesh.position.set(400, 0.5, 350);
        this.game.scene.add(this.packageMesh);
        
        // Bobbing animation
        this.packageBobTime = 0;
    }

    spawnInformant() {
        const pos = new THREE.Vector3(0, 0, 200);
        this.tailTarget = new TrafficCar(this.game, { position: pos.clone() });
        this.tailTarget.isMissionTarget = true;
        this.tailTarget.targetType = 'informant';
        this.tailTarget.init();
        this.missionEntities.push(this.tailTarget);
        this.game.scene.add(this.tailTarget.mesh);
    }

    spawnEnemyVehicles() {
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const pos = new THREE.Vector3(
                -400 + Math.cos(angle) * 30,
                0.5,
                Math.sin(angle) * 30
            );
            const car = new TrafficCar(this.game, { position: pos });
            car.isMissionTarget = true;
            car.targetType = 'vehicle';
            car.bodyColor = 0xcc0000;
            car.init();
            this.missionEntities.push(car);
            this.game.scene.add(car.mesh);
        }
    }

    setupBankHeist() {
        // Vault area
        const vaultGeo = new THREE.BoxGeometry(4, 3, 4);
        const vaultMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.5 });
        this.vaultMesh = new THREE.Mesh(vaultGeo, vaultMat);
        this.vaultMesh.position.set(50, 1.5, 50);
        this.game.scene.add(this.vaultMesh);
        
        // Money bag
        const bagGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0x228822 });
        this.moneyBag = new THREE.Mesh(bagGeo, bagMat);
        this.moneyBag.position.set(50, 0.5, 50);
        this.game.scene.add(this.moneyBag);
    }

    spawnMansionEnemies() {
        // Bodyguards
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const pos = new THREE.Vector3(
                -500 + Math.cos(angle) * 25,
                0,
                -400 + Math.sin(angle) * 25
            );
            const ped = new PolicePed(this.game, { position: pos });
            ped.isMissionTarget = true;
            ped.targetType = 'bodyguard';
            ped.health = 150;
            ped.init();
            this.missionEntities.push(ped);
            this.game.scene.add(ped.mesh);
        }
        
        // Boss
        const boss = new PolicePed(this.game, { position: new THREE.Vector3(-500, 0, -400) });
        boss.isMissionTarget = true;
        boss.targetType = 'boss';
        boss.health = 500;
        boss.maxHealth = 500;
        boss.bodyParts.torso.scale.set(1.3, 1.3, 1.3);
        boss.init();
        this.missionEntities.push(boss);
        this.game.scene.add(boss.mesh);
    }

    updateMissionEntities(delta) {
        // Animate package
        if (this.packageMesh) {
            this.packageBobTime += delta * 2;
            this.packageMesh.position.y = 0.5 + Math.sin(this.packageBobTime) * 0.2;
            this.packageMesh.rotation.y += delta;
        }
        
        // Check entity deaths
        this.missionEntities = this.missionEntities.filter(e => {
            if (e.health <= 0) {
                if (e.isMissionTarget) {
                    this.registerKill(e.targetType);
                }
                if (e.mesh && e.mesh.parent) {
                    e.mesh.parent.remove(e.mesh);
                }
                e.dispose();
                return false;
            }
            return true;
        });
    }

    clearMissionEntities() {
        this.missionEntities.forEach(e => {
            if (e.mesh && e.mesh.parent) {
                e.mesh.parent.remove(e.mesh);
            }
            e.dispose();
        });
        this.missionEntities = [];
        
        if (this.packageMesh) {
            this.game.scene.remove(this.packageMesh);
            this.packageMesh.geometry.dispose();
            this.packageMesh.material.dispose();
            this.packageMesh = null;
        }
        
        if (this.vaultMesh) {
            this.game.scene.remove(this.vaultMesh);
            this.vaultMesh.geometry.dispose();
            this.vaultMesh.material.dispose();
            this.vaultMesh = null;
        }
        
        if (this.moneyBag) {
            this.game.scene.remove(this.moneyBag);
            this.moneyBag.geometry.dispose();
            this.moneyBag.material.dispose();
            this.moneyBag = null;
        }
        
        this.tailTarget = null;
    }

    reset() {
        this.currentMissionIndex = 0;
        this.currentMission = null;
        this.currentObjectiveIndex = 0;
        this.completedMissions = [];
        this.missionProgress = 0;
        this.isInMission = false;
        this.cancelMission();
    }
}

window.MissionManager = MissionManager;