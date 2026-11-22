// Police entities - PoliceCar and PolicePed
class PolicePed extends Pedestrian {
    constructor(game, options = {}) {
        super(game, options);
        
        this.isPolice = true;
        this.health = 150;
        this.maxHealth = 150;
        this.speed = 3;
        this.runSpeed = 7;
        
        // Combat
        this.shootCooldown = 0;
        this.shootRange = 40;
        this.accuracy = 0.6;
        this.lastShotTime = 0;
        
        // Behavior
        this.patrolPoints = [];
        this.currentPatrol = 0;
        this.state = 'patrol'; // patrol, chase, shoot, investigate
        this.target = null;
        
        // Visual - police uniform
        this.colors.shirt = 0x222266;
        this.colors.pants = 0x111133;
    }

    init() {
        super.init();
        this.createPoliceVisuals();
    }

    createPoliceVisuals() {
        // Badge
        const badgeGeo = new THREE.PlaneGeometry(0.15, 0.15);
        const badgeMat = new THREE.MeshBasicMaterial({ 
            color: 0xffcc00, 
            transparent: true, 
            opacity: 1,
            side: THREE.DoubleSide
        });
        this.badge = new THREE.Mesh(badgeGeo, badgeMat);
        this.badge.position.set(0.18, 1.3, 0.11);
        this.mesh.add(this.badge);
        
        // Hat
        const hatGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x111133, roughness: 0.5, metalness: 0.2 });
        this.hat = new THREE.Mesh(hatGeo, hatMat);
        this.hat.position.set(0, 1.8, 0);
        this.mesh.add(this.hat);
        
        // Gun holster
        const holsterGeo = new THREE.BoxGeometry(0.08, 0.2, 0.05);
        const holsterMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        this.holster = new THREE.Mesh(holsterGeo, holsterMat);
        this.holster.position.set(0.25, 1.1, -0.1);
        this.mesh.add(this.holster);
    }

    update(delta) {
        if (this.health <= 0) {
            if (this.state !== 'dead') this.die();
            return;
        }
        
        this.updateAI(delta);
        this.updateMovement(delta);
        this.updateAnimation(delta);
        this.updateMeshTransform();
    }

    updateAI(delta) {
        const player = this.game.player;
        const playerDist = this.position.distanceTo(player.position);
        
        // Wanted level determines behavior
        const wanted = player.wantedLevel;
        
        if (wanted >= 3) {
            // Shoot at player
            this.state = 'shoot';
            this.target = player;
        } else if (wanted >= 1 && playerDist < 30) {
            // Chase player
            this.state = 'chase';
            this.target = player;
        } else {
            // Patrol
            this.state = 'patrol';
            this.target = null;
        }
        
        switch (this.state) {
            case 'patrol':
                this.patrolTimer = (this.patrolTimer || 0) - delta;
                if (this.patrolTimer <= 0 || !this.targetPosition) {
                    this.pickPatrolPoint();
                    this.patrolTimer = 10 + Math.random() * 10;
                }
                this.isRunning = false;
                break;
                
            case 'chase':
                if (this.target) {
                    this.targetPosition = this.target.position.clone();
                    this.isRunning = true;
                }
                break;
                
            case 'shoot':
                if (this.target) {
                    this.targetPosition = this.target.position.clone();
                    this.isRunning = false;
                    this.tryShoot(delta);
                }
                break;
        }
    }

    pickPatrolPoint() {
        const spawns = this.game.world.cityGenerator.pedestrianSpawnPoints;
        if (spawns.length > 0) {
            this.targetPosition = MathUtils.choice(spawns).clone();
            this.targetPosition.y = 1;
        }
    }

    tryShoot(delta) {
        if (!this.target) return;
        
        this.shootCooldown -= delta;
        const dist = this.position.distanceTo(this.target.position);
        
        if (dist <= this.shootRange && this.shootCooldown <= 0) {
            // Face target
            const toTarget = this.target.position.clone().sub(this.position);
            this.rotation.y = Math.atan2(toTarget.x, toTarget.z);
            
            // Shoot
            this.shootCooldown = 0.8 + Math.random() * 0.4;
            this.shootAtTarget();
        }
    }

    shootAtTarget() {
        if (!this.target) return;
        
        // Raycast to target
        const origin = this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const direction = this.target.position.clone().sub(origin).normalize();
        
        // Add inaccuracy
        const spread = (1 - this.accuracy) * 0.3;
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        const raycaster = new THREE.Raycaster(origin, direction, 0, this.shootRange);
        const intersects = raycaster.intersectObjects(this.game.scene.children, true);
        
        for (const hit of intersects) {
            if (hit.distance > this.shootRange) break;
            
            let target = hit.object;
            while (target.parent && !target.userData.entity) {
                target = target.parent;
            }
            
            if (target.userData.entity === this.game.player) {
                this.game.player.takeDamage(15, hit.point, this);
                this.game.effects.createHitEffect(hit.point, hit.face.normal);
                this.game.effects.showDamageNumber(hit.point, 15);
                break;
            } else if (target.userData.type === 'building' || target.userData.type === 'road') {
                this.game.effects.createBulletHole(hit.point, hit.face.normal);
                break;
            }
        }
        
        // Muzzle flash
        this.createMuzzleFlash(origin);
        this.game.effects.createTracer(origin, direction);
        this.game.audio.playGunshot(this.position);
    }

    createMuzzleFlash(position) {
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.8 })
        );
        flash.position.copy(position);
        this.game.scene.add(flash);
        
        setTimeout(() => {
            this.game.scene.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }, 50);
    }

    takeDamage(amount, hitPoint, attacker) {
        super.takeDamage(amount, hitPoint, attacker);
        
        // Alert nearby police
        if (attacker === this.game.player) {
            this.game.player.addWanted(1);
        }
    }

    die() {
        super.die();
        // Drop weapon/ammo
        if (Math.random() < 0.5) {
            this.game.effects.createPickup(this.position.clone(), 'ammo', 12);
        }
    }
}

// Export both
window.PoliceCar = window.PoliceCar; // Already defined in PoliceCar.js
window.PolicePed = PolicePed;