// Player character - on foot and in vehicle
const MAX_WALK_SPEED = 4;
const MAX_RUN_SPEED = 8;
const ACCELERATION = 30;
const DECELERATION = 20;
const JUMP_FORCE = 10;
const GRAVITY = 25;
const MAX_HEALTH = 100;
const MAX_ARMOR = 100;
const INITIAL_AMMO = 12;
const INITIAL_MAX_AMMO = 60;
const MAX_WANTED_TIMER = 120;
const VEHICLE_ENTER_DIST = 4;
const PLAYER_HEIGHT = 1.0;
const GROUND_CHECK_DIST = 1.5;
const FALLBACK_Y = 1.0;
const PLAYER_COLLISION_RADIUS = 0.35;
const VEHICLE_COLLISION_DIST = 2;
const WALL_SLIDE_FACTOR = 1;
const ANIM_RUN_SPEED = 12;
const ANIM_WALK_SPEED = 8;
const ANIM_IDLE_SPEED = 2;
const RUN_ARM_SWING = 0.8;
const WALK_ARM_SWING = 0.5;
const RUN_LEG_SWING = 0.9;
const WALK_LEG_SWING = 0.6;
const RUN_TORSO_LEAN = -0.15;
const FOOTSTEP_PHASE_THRESHOLD = 0.1;
const FOOTSTEP_COOLDOWN = 0.3;
const SHOOT_COOLDOWN = 0.15;
const SHOOT_DAMAGE = 25;
const SHOOT_RANGE = 100;
const RELOAD_TIME = 1.5;
const PLAYER_MUZZLE_FLASH_LIFETIME = 50;
const CAMERA_SHAKE_INTENSITY = 0.15;
const DEFAULT_SPAWN_Y = 3.0;

class Player {
    constructor(game) {
        this.game = game;
        this.mesh = null;
        this.camera = game.camera;
        
        // Physics
        this.position = new THREE.Vector3(0, 1, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0);
        this.speed = 0;
        this.maxWalkSpeed = MAX_WALK_SPEED;
        this.maxRunSpeed = MAX_RUN_SPEED;
        this.acceleration = ACCELERATION;
        this.deceleration = DECELERATION;
        this.jumpForce = JUMP_FORCE;
        this.gravity = GRAVITY;
        this.isGrounded = true;
        this.isRunning = false;
        this.isJumping = false;
        
        // Animations
        this.animTime = 0;
        this.animState = 'idle'; // idle, walk, run, jump
        this.bodyParts = {};
        
        // Health/Armor
        this.health = MAX_HEALTH;
        this.maxHealth = MAX_HEALTH;
        this.armor = 0;
        this.maxArmor = MAX_ARMOR;
        this.money = 0;
        this.ammo = INITIAL_AMMO;
        this.maxAmmo = INITIAL_MAX_AMMO;
        
        // Wanted
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.maxWantedTimer = MAX_WANTED_TIMER; // seconds to lose wanted
        this.lastCrimeTime = 0;
        
        // Vehicle
        this.isInVehicle = false;
        this.vehicle = null;
        this.vehicleInput = { accelerate: 0, brake: 0, steer: 0, handbrake: false };
        this.moveInput = { x: 0, z: 0 };
        
        // Combat
        this.isAiming = false;
        this.shootCooldown = 0;
        this.reloadTime = 0;
        this.isReloading = false;
        
        // Input buffer
        this.jumpPressed = false;
        this.interactPressed = false;
        this.shootPressed = false;
        this.reloadPressed = false;
        
        // Camera relative movement
        this.moveDirection = new THREE.Vector3();
        
        // ID
        this.id = 'player_' + MathUtils.randomInt(1000, 9999);
    }

    init() {
        this.createMesh();
        this.game.scene.add(this.mesh);
        this.mesh.position.copy(this.position);
        // Safe default spawn height; ground snap happens after world.init in Game.init
        this.position.y = DEFAULT_SPAWN_Y;
        this.mesh.position.y = DEFAULT_SPAWN_Y;
    }

    // Called by Game.init after world.init() completes
    snapToGround() {
        if (!this.game.world || !this.game.world.collisionMeshes) return;
        const raycaster = new THREE.Raycaster(
            this.position.clone().add(new THREE.Vector3(0, 50, 0)),
            new THREE.Vector3(0, -1, 0),
            0, 100
        );
        const intersects = raycaster.intersectObjects(this.game.world.collisionMeshes, true);
        if (intersects.length > 0) {
            this.position.y = intersects[0].point.y + PLAYER_HEIGHT;
        } else {
            this.position.y = PLAYER_HEIGHT;
        }
        this.mesh.position.copy(this.position);
    }

    createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.userData = { entity: this, type: 'player' };
        
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0xddaa88, 
            roughness: 0.7, 
            metalness: 0.1 
        });
        const clothesMat = new THREE.MeshStandardMaterial({ 
            color: 0x224488, 
            roughness: 0.8, 
            metalness: 0.1 
        });
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: 0xddaa88, 
            roughness: 0.7, 
            metalness: 0.1 
        });
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: 0x221100, 
            roughness: 0.9, 
            metalness: 0.1 
        });
        
        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        this.bodyParts.torso = new THREE.Mesh(torsoGeo, clothesMat);
        this.bodyParts.torso.position.y = 1.15;
        this.bodyParts.torso.castShadow = true;
        this.mesh.add(this.bodyParts.torso);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        this.bodyParts.head = new THREE.Mesh(headGeo, skinMat);
        this.bodyParts.head.position.y = 1.7;
        this.bodyParts.head.castShadow = true;
        this.mesh.add(this.bodyParts.head);
        
        // Hair
        const hairGeo = new THREE.BoxGeometry(0.26, 0.12, 0.26);
        this.bodyParts.hair = new THREE.Mesh(hairGeo, hairMat);
        this.bodyParts.hair.position.y = 1.85;
        this.mesh.add(this.bodyParts.hair);
        
        // Arms
        const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.15);
        this.bodyParts.leftArm = new THREE.Mesh(armGeo, skinMat);
        this.bodyParts.leftArm.position.set(-0.35, 1.25, 0);
        this.bodyParts.leftArm.castShadow = true;
        this.mesh.add(this.bodyParts.leftArm);
        
        this.bodyParts.rightArm = new THREE.Mesh(armGeo, skinMat);
        this.bodyParts.rightArm.position.set(0.35, 1.25, 0);
        this.bodyParts.rightArm.castShadow = true;
        this.mesh.add(this.bodyParts.rightArm);
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
        this.bodyParts.leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x112244, roughness: 0.8 }));
        this.bodyParts.leftLeg.position.set(-0.15, 0.6, 0);
        this.bodyParts.leftLeg.castShadow = true;
        this.mesh.add(this.bodyParts.leftLeg);
        
        this.bodyParts.rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x112244, roughness: 0.8 }));
        this.bodyParts.rightLeg.position.set(0.15, 0.6, 0);
        this.bodyParts.rightLeg.castShadow = true;
        this.mesh.add(this.bodyParts.rightLeg);
        
        // Gun (hidden when not aiming)
        const gunGeo = new THREE.BoxGeometry(0.1, 0.15, 0.3);
        this.bodyParts.gun = new THREE.Mesh(gunGeo, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 }));
        this.bodyParts.gun.position.set(0.25, 1.3, 0.2);
        this.bodyParts.gun.visible = false;
        this.mesh.add(this.bodyParts.gun);
        
        // Collision capsule (approximated by box for simplicity)
        this.collisionBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0.5, 1.8, 0.3)
        );
    }

    update(delta) {
        if (this.isInVehicle) {
            this.updateInVehicle(delta);
        } else {
            this.updateOnFoot(delta);
        }
        
        this.updateAnimation(delta);
        this.updateWanted(delta);
        this.updateCombat(delta);
        this.updateMeshTransform();
    }

    updateOnFoot(delta) {
        const input = this.game.input;
        
        // Get input
        this.moveInput = input.getMovementVector();
        this.isRunning = input.isRunning();
        this.jumpPressed = input.isJumpPressed();
        this.interactPressed = input.isInteractPressed();
        this.shootPressed = input.isAttackDown();
        this.reloadPressed = input.isReloadPressed();
        
        // Calculate move direction relative to camera
        const camForward = this.game.cameraController.getForwardVector();
        const camRight = this.game.cameraController.getRightVector();
        
        this.moveDirection.set(0, 0, 0);
        this.moveDirection.addScaledVector(camForward, -this.moveInput.z);
        this.moveDirection.addScaledVector(camRight, this.moveInput.x);
        this.moveDirection.normalize();
        
        // Movement physics
        const maxSpeed = this.isRunning ? this.maxRunSpeed : this.maxWalkSpeed;
        const accel = this.isGrounded ? this.acceleration : this.acceleration * 0.3;
        
        if (this.moveDirection.length() > 0) {
            // Accelerate
            const targetVel = this.moveDirection.clone().multiplyScalar(maxSpeed);
            this.velocity.lerp(targetVel, accel * delta);
            
            // Rotate player to face movement direction
            const targetRot = Math.atan2(this.moveDirection.x, this.moveDirection.z);
            this.rotation.y = MathUtils.lerpAngle(this.rotation.y, targetRot, 15 * delta);
        } else {
            // Decelerate
            this.velocity.x *= Math.max(0, 1 - this.deceleration * delta);
            this.velocity.z *= Math.max(0, 1 - this.deceleration * delta);
        }
        
        // Jump
        if (this.jumpPressed && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.game.audio.playFootstep(this.position, this.isRunning);
        }
        
        // Gravity
        this.velocity.y -= this.gravity * delta;
        
        // Apply velocity
        const newPos = this.position.clone().addScaledVector(this.velocity, delta);
        
        // Collision detection
        const collisionResult = this.checkCollisions(newPos);
        if (collisionResult.collided) {
            // Slide along wall
            this.position.copy(collisionResult.position);
            this.velocity.x = collisionResult.velocity.x;
            this.velocity.z = collisionResult.velocity.z;
        } else {
            this.position.copy(newPos);
        }
        
        // Ground check
        this.checkGrounded();
        
        // Interact - enter vehicle
        if (this.interactPressed) {
            this.tryEnterVehicle();
        }
        
        // Sync mesh position
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation.y;
    }

    updateInVehicle(delta) {
        const input = this.game.input;
        this.vehicleInput = input.getVehicleInput();
        
        // Exit vehicle
        if (input.isInteractPressed()) {
            this.exitVehicle();
            return;
        }
        
        // Delegate to vehicle
        if (this.vehicle) {
            this.vehicle.setInput(this.vehicleInput);
        }
        
        // Update player position to match vehicle
        this.position.copy(this.vehicle.mesh.position);
        this.position.y += 0.8;
        this.rotation.y = this.vehicle.mesh.rotation.y;
    }

    tryEnterVehicle() {
        // Check nearby vehicles (parked or traffic)
        const vehicles = [...this.game.world.parkedCars, ...this.game.world.trafficCars];
        let nearest = null;
        let nearestDist = VEHICLE_ENTER_DIST;
        
        for (const car of vehicles) {
            if (car.health <= 0) continue;
            const dist = car.mesh.position.distanceTo(this.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = car;
            }
        }
        
        if (nearest) {
            this.enterVehicle(nearest);
        }
    }

    enterVehicle(vehicle) {
        if (this.isInVehicle) return;
        
        this.isInVehicle = true;
        this.vehicle = vehicle;
        vehicle.enterVehicle(this);
        
        // Hide player mesh
        this.mesh.visible = false;
        
        // Switch camera to vehicle mode
        this.game.cameraController.setVehicleMode(true, 'car');
        
        // Play sound
        this.game.audio.playPickup(this.position);
    }

    exitVehicle() {
        if (!this.isInVehicle || !this.vehicle) return;
        
        const exitPos = this.vehicle.getExitPosition();
        this.position.copy(exitPos);
        this.position.y = 1;
        this.mesh.position.copy(this.position);
        
        this.vehicle.exitVehicle();
        this.vehicle = null;
        this.isInVehicle = false;
        
        // Show player mesh
        this.mesh.visible = true;
        
        // Switch camera back
        this.game.cameraController.setVehicleMode(false);
    }

    checkCollisions(newPos) {
        const radius = PLAYER_COLLISION_RADIUS;
        const result = { collided: false, position: newPos.clone(), velocity: this.velocity.clone() };
        
        // Check world collision bounds
        for (const bounds of this.game.world.collisionBounds) {
            const dist = bounds.distanceToPoint(newPos);
            if (dist < radius) {
                result.collided = true;
                
                // Find closest point on bounds
                const closest = new THREE.Vector3();
                bounds.clampPoint(newPos, closest);
                
                // Push out
                const pushDir = newPos.clone().sub(closest).normalize();
                result.position.copy(closest).addScaledVector(pushDir, radius);
                
                // Cancel velocity component into wall
                const velDot = this.velocity.dot(pushDir);
                if (velDot < 0) {
                    result.velocity.addScaledVector(pushDir, -velDot * WALL_SLIDE_FACTOR);
                }
            }
        }
        
        // Check vehicle collisions
        for (const car of this.game.world.vehicles) {
            if (car === this.vehicle) continue;
            if (car.mesh.position.distanceTo(newPos) < radius + VEHICLE_COLLISION_DIST) {
                const pushDir = newPos.clone().sub(car.mesh.position).normalize();
                result.position.addScaledVector(pushDir, 0.1);
                result.collided = true;
            }
        }
        
        return result;
    }

    checkGrounded() {
        // Raycast down
        const raycaster = new THREE.Raycaster(
            this.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            new THREE.Vector3(0, -1, 0),
            0, 2.0
        );
        
        const meshes = this.game.world?.collisionMeshes || [];
        const intersects = meshes.length > 0 ? raycaster.intersectObjects(meshes, true) : [];
        this.isGrounded = intersects.length > 0 && intersects[0].distance < GROUND_CHECK_DIST;
        
        if (this.isGrounded && intersects[0]) {
            // Snap to ground
            this.position.y = intersects[0].point.y + PLAYER_HEIGHT;
            this.velocity.y = Math.max(0, this.velocity.y);
            this.isJumping = false;
        } else {
            // Fallback: never fall below y=1 (ground level + player height)
            if (this.position.y < FALLBACK_Y) {
                this.position.y = FALLBACK_Y;
                this.velocity.y = 0;
                this.isGrounded = true;
                this.isJumping = false;
            }
        }
    }

    updateAnimation(delta) {
        if (this.isInVehicle) return;
        
        const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        
        if (!this.isGrounded) {
            this.animState = 'jump';
        } else if (speed > 0.5) {
            this.animState = this.isRunning ? 'run' : 'walk';
        } else {
            this.animState = 'idle';
        }
        
        // Animation time
        const animSpeed = this.animState === 'run' ? ANIM_RUN_SPEED : this.animState === 'walk' ? ANIM_WALK_SPEED : ANIM_IDLE_SPEED;
        this.animTime += delta * animSpeed;
        
        // Animate body parts
        if (this.bodyParts.leftArm && this.bodyParts.rightArm) {
            const swing = Math.sin(this.animTime) * (this.animState === 'run' ? RUN_ARM_SWING : this.animState === 'walk' ? WALK_ARM_SWING : 0);
            const legSwing = Math.sin(this.animTime) * (this.animState === 'run' ? RUN_LEG_SWING : this.animState === 'walk' ? WALK_LEG_SWING : 0);
            
            this.bodyParts.leftArm.rotation.x = -swing;
            this.bodyParts.rightArm.rotation.x = swing;
            this.bodyParts.leftLeg.rotation.x = -legSwing;
            this.bodyParts.rightLeg.rotation.x = legSwing;
            
            // Body lean when running
            if (this.animState === 'run') {
                this.bodyParts.torso.rotation.x = RUN_TORSO_LEAN;
            } else {
                this.bodyParts.torso.rotation.x = 0;
            }
        }
        
        // Footstep sounds
        if ((this.animState === 'walk' || this.animState === 'run') && this.isGrounded) {
            const footStepPhase = this.animTime % (Math.PI * 2);
            if (Math.abs(footStepPhase - Math.PI) < FOOTSTEP_PHASE_THRESHOLD || Math.abs(footStepPhase) < FOOTSTEP_PHASE_THRESHOLD) {
                if (!this.lastFootstep || this.animTime - this.lastFootstep > FOOTSTEP_COOLDOWN) {
                    this.game.audio.playFootstep(this.position, this.isRunning);
                    this.lastFootstep = this.animTime;
                }
            }
        }
    }

    updateWanted(delta) {
        if (this.wantedLevel > 0) {
            this.wantedTimer -= delta;
            
            // Check if player is in sight of police
            let inSight = false;
            for (const cop of [...this.game.world.policeCars, ...this.game.world.policePeds]) {
                if (cop.mesh.position.distanceTo(this.position) < 40) {
                    // Simple LOS check
                    const dir = this.position.clone().sub(cop.mesh.position).normalize();
                    const raycaster = new THREE.Raycaster(cop.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dir, 0, 40);
                    const hits = raycaster.intersectObjects(this.game.world.collisionMeshes, true);
                    if (hits.length === 0 || hits[0].distance > this.position.distanceTo(cop.mesh.position)) {
                        inSight = true;
                        break;
                    }
                }
            }
            
            if (inSight) {
                this.wantedTimer = this.maxWantedTimer;
            }
            
            if (this.wantedTimer <= 0) {
                this.wantedLevel = Math.max(0, this.wantedLevel - 1);
                this.wantedTimer = this.maxWantedTimer;
                this.game.hud.updateWantedStars();
            }
        }
    }

    addWanted(stars) {
        this.wantedLevel = Math.min(5, this.wantedLevel + stars);
        this.wantedTimer = this.maxWantedTimer;
        this.game.hud.updateWantedStars();
        
        // Spawn police if not already present
        if (this.wantedLevel >= 1 && this.game.world.policeCars.length === 0 && this.game.world.policePeds.length === 0) {
            this.game.world.spawnPoliceNearPlayer();
        }
    }

updateCombat(delta) {
        if (this.shootCooldown > 0) this.shootCooldown -= delta;
        if (this.reloadTime > 0) {
            this.reloadTime -= delta;
            if (this.reloadTime <= 0) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                this.game.hud.updateAmmo();
            }
        }
        
        if (this.reloadPressed && this.ammo < this.maxAmmo && !this.isReloading && this.reloadTime <= 0) {
            this.startReload();
        }
        
        if (this.shootPressed && this.shootCooldown <= 0 && this.ammo > 0 && !this.isReloading) {
            this.shoot();
        }
    }
    
    startReload() {
        this.isReloading = true;
        this.reloadTime = RELOAD_TIME;
        this.game.audio.playPickup(this.position); // Reload sound placeholder
    }
    
    shoot() {
        if (this.ammo <= 0 || this.isReloading) return;
        
        this.ammo--;
        this.shootCooldown = SHOOT_COOLDOWN;
        this.game.hud.updateAmmo();
        
        // Raycast from camera
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.game.camera);
        
        // Muzzle flash
        this.createMuzzleFlash();
        
        // Trace
        const intersects = raycaster.intersectObjects(this.game.scene.children, true);
        
        for (const hit of intersects) {
            if (hit.distance > SHOOT_RANGE) break;
            
            // Check what we hit
            let target = hit.object;
            while (target.parent && !target.userData.entity) {
                target = target.parent;
            }
            
            if (target.userData.entity) {
                const entity = target.userData.entity;
                if (entity.takeDamage) {
                    entity.takeDamage(SHOOT_DAMAGE, hit.point, this);
                    this.game.effects.createHitEffect(hit.point, hit.face.normal);
                    this.game.effects.showDamageNumber(hit.point, SHOOT_DAMAGE);
                    break;
                }
            } else if (hit.object.userData.type === 'building' || hit.object.userData.type === 'road') {
                this.game.effects.createBulletHole(hit.point, hit.face.normal);
                break;
            }
        }
        
        // Tracer effect
        this.game.effects.createTracer(this.getMuzzlePosition(), raycaster.ray.direction);
        
        this.game.audio.playGunshot(this.position);
        this.game.cameraController.shake(CAMERA_SHAKE_INTENSITY);
    }

    getMuzzlePosition() {
        if (this.bodyParts.gun) {
            const pos = new THREE.Vector3();
            this.bodyParts.gun.getWorldPosition(pos);
            return pos;
        }
        return this.position.clone().add(new THREE.Vector3(0.3, 1.5, 0.5).applyEuler(new THREE.Euler(0, this.rotation.y, 0)));
    }

    createMuzzleFlash() {
        const pos = this.getMuzzlePosition();
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.8 })
        );
        flash.position.copy(pos);
        this.game.scene.add(flash);
        
        setTimeout(() => {
            this.game.scene.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }, PLAYER_MUZZLE_FLASH_LIFETIME);
    }

    updateMeshTransform() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;
        }
    }

    takeDamage(amount, hitPoint, attacker) {
        if (this.health <= 0) return;
        
        // Armor absorbs first
        if (this.armor > 0) {
            const armorDamage = Math.min(this.armor, amount);
            this.armor -= armorDamage;
            amount -= armorDamage;
        }
        
        this.health = Math.max(0, this.health - amount);
        this.game.hud.updateHealth();
        
        // Blood effect
        this.game.effects.createBloodSpray(hitPoint);
        
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.health = 0;
        this.game.gameOver(true); // Busted
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.game.hud.updateHealth();
    }

    addArmor(amount) {
        this.armor = Math.min(this.maxArmor, this.armor + amount);
        this.game.hud.updateArmor();
    }

    addMoney(amount) {
        this.money += amount;
        this.game.hud.updateMoney();
    }

    addAmmo(amount) {
        this.maxAmmo = Math.max(this.maxAmmo, this.maxAmmo + amount);
        this.ammo = this.maxAmmo;
        this.game.hud.updateAmmo();
    }

    reset() {
        this.position.set(0, 1, 0);
        this.velocity.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.health = MAX_HEALTH;
        this.armor = 0;
        this.money = 0;
        this.ammo = INITIAL_AMMO;
        this.maxAmmo = INITIAL_MAX_AMMO;
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.isInVehicle = false;
        this.vehicle = null;
        
        if (this.mesh) {
            this.mesh.visible = true;
            this.mesh.position.copy(this.position);
        }
        
        this.game.hud.updateFromPlayer();
    }

    dispose() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

window.Player = Player;