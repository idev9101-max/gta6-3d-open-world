// SOLMAR NIGHTS: police ped — patrol, chase, shoot at the player.
// Police entities - PoliceCar and PolicePed
const POLICE_PED_HEALTH = 150;
const POLICE_PED_SPEED = 3;
const POLICE_PED_RUN_SPEED = 7;
const POLICE_SHOOT_COOLDOWN = 0.8;
const POLICE_SHOOT_COOLDOWN_VAR = 0.4;
const POLICE_SHOOT_RANGE = 40;
const POLICE_ACCURACY = 0.6;
const POLICE_SPREAD_FACTOR = 0.3;
const POLICE_PATROL_TIMER_BASE = 10;
const POLICE_PATROL_TIMER_VAR = 10;
const POLICE_CHASE_DIST = 30;
const POLICE_SHOOT_WANTED = 3;
const POLICE_CHASE_WANTED = 1;
const POLICE_BADGE_COLOR = 0xffcc00;
const POLICE_HAT_COLOR = 0x111133;
const POLICE_SHIRT_COLOR = 0x222266;
const POLICE_PANTS_COLOR = 0x111133;
const POLICE_HOLSTER_COLOR = 0x111111;
const POLICE_MUZZLE_FLASH_LIFETIME = 50;
const POLICE_DAMAGE = 15;
const POLICE_WANTED_ON_HIT = 1;
const POLICE_AMMO_DROP_CHANCE = 0.5;
const POLICE_AMMO_DROP_AMOUNT = 12;

class PolicePed extends Pedestrian {
    constructor(game, options = {}) {
        super(game, options);
        
        this.isPolice = true;
        this.health = POLICE_PED_HEALTH;
        this.maxHealth = POLICE_PED_HEALTH;
        this.speed = POLICE_PED_SPEED;
        this.runSpeed = POLICE_PED_RUN_SPEED;
        
        // Combat
        this.shootCooldown = 0;
        this.shootRange = POLICE_SHOOT_RANGE;
        this.accuracy = POLICE_ACCURACY;
        this.lastShotTime = 0;
        
        // Behavior
        this.patrolPoints = [];
        this.currentPatrol = 0;
        this.state = 'patrol'; // patrol, chase, shoot, investigate
        this.target = null;
        
        // Visual - police uniform
        this.colors.shirt = POLICE_SHIRT_COLOR;
        this.colors.pants = POLICE_PANTS_COLOR;
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
        
        if (wanted >= POLICE_SHOOT_WANTED) {
            // Shoot at player
            this.state = 'shoot';
            this.target = player;
        } else if (wanted >= POLICE_CHASE_WANTED && playerDist < POLICE_CHASE_DIST) {
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
                    this.patrolTimer = POLICE_PATROL_TIMER_BASE + Math.random() * POLICE_PATROL_TIMER_VAR;
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
            this.shootCooldown = POLICE_SHOOT_COOLDOWN + Math.random() * POLICE_SHOOT_COOLDOWN_VAR;
            this.shootAtTarget();
        }
    }
    
    shootAtTarget() {
        if (!this.target) return;
        
        // Raycast to target
        const origin = this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const direction = this.target.position.clone().sub(origin).normalize();
        
        // Add inaccuracy
        const spread = (1 - this.accuracy) * POLICE_SPREAD_FACTOR;
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
                this.game.player.takeDamage(POLICE_DAMAGE, hit.point, this);
                this.game.effects.createHitEffect(hit.point, hit.face.normal);
                this.game.effects.showDamageNumber(hit.point, POLICE_DAMAGE);
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
        }, POLICE_MUZZLE_FLASH_LIFETIME);
    }

takeDamage(amount, hitPoint, attacker) {
        super.takeDamage(amount, hitPoint, attacker);
        
        // Alert nearby police
        if (attacker === this.game.player) {
            this.game.player.addWanted(POLICE_WANTED_ON_HIT);
        }
    }
    
    die() {
        super.die();
        // Drop weapon/ammo
        if (Math.random() < POLICE_AMMO_DROP_CHANCE) {
            this.game.effects.createPickup(this.position.clone(), 'ammo', POLICE_AMMO_DROP_AMOUNT);
        }
    }
}

// Export both
window.PoliceCar = window.PoliceCar; // Already defined in PoliceCar.js
window.PolicePed = PolicePed;