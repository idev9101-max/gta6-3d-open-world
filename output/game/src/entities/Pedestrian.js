// Pedestrian AI
class Pedestrian {
    constructor(game, options = {}) {
        this.game = game;
        this.id = options.id || 'ped_' + MathUtils.randomInt(1000, 9999);
        
        this.position = options.position || new THREE.Vector3(0, 1, 0);
        this.rotation = new THREE.Euler(0, options.rotation || 0, 0);
        this.velocity = new THREE.Vector3();
        
        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.speed = MathUtils.random(1.5, 3);
        this.runSpeed = this.speed * 3;
        
        // AI
        this.state = 'wander'; // wander, flee, panic, dead
        this.targetPosition = null;
        this.wanderTimer = 0;
        this.fleeTimer = 0;
        this.panicTimer = 0;
        this.lastSeenThreat = null;
        
        // Animation
        this.animTime = 0;
        this.isRunning = false;
        
        // Visual
        this.mesh = null;
        this.bodyParts = {};
        this.colors = {
            skin: MathUtils.choice([0xffdbac, 0xe8c4a0, 0xd4a574, 0xc68642, 0x8d5524]),
            shirt: MathUtils.choice([0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0xffffff, 0x888888]),
            pants: MathUtils.choice([0x222244, 0x444444, 0x224422, 0x442222, 0x333333])
        };
        
        // Type
        this.isPolice = false;
        this.isMissionTarget = false;
    }

    init() {
        this.createMesh();
        this.game.scene.add(this.mesh);
        this.mesh.position.copy(this.position);
        this.pickNewWanderTarget();
    }

    createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.userData = { entity: this, type: 'pedestrian' };
        
        const skinMat = new THREE.MeshStandardMaterial({ color: this.colors.skin, roughness: 0.7, metalness: 0.1 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: this.colors.shirt, roughness: 0.8, metalness: 0.1 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: this.colors.pants, roughness: 0.8, metalness: 0.1 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
        
        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.35, 0.55, 0.2);
        this.bodyParts.torso = new THREE.Mesh(torsoGeo, shirtMat);
        this.bodyParts.torso.position.y = 1.15;
        this.bodyParts.torso.castShadow = true;
        this.mesh.add(this.bodyParts.torso);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
        this.bodyParts.head = new THREE.Mesh(headGeo, skinMat);
        this.bodyParts.head.position.y = 1.65;
        this.bodyParts.head.castShadow = true;
        this.mesh.add(this.bodyParts.head);
        
        // Hair/hat
        if (Math.random() < 0.7) {
            const hairGeo = new THREE.BoxGeometry(0.21, 0.08, 0.21);
            const hairMat = new THREE.MeshStandardMaterial({ color: MathUtils.choice([0x111111, 0x332211, 0x886644, 0xccaa88]), roughness: 0.9 });
            this.bodyParts.hair = new THREE.Mesh(hairGeo, hairMat);
            this.bodyParts.hair.position.y = 1.78;
            this.mesh.add(this.bodyParts.hair);
        }
        
        // Arms
        const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        this.bodyParts.leftArm = new THREE.Mesh(armGeo, skinMat);
        this.bodyParts.leftArm.position.set(-0.25, 1.25, 0);
        this.bodyParts.leftArm.castShadow = true;
        this.mesh.add(this.bodyParts.leftArm);
        
        this.bodyParts.rightArm = new THREE.Mesh(armGeo, skinMat);
        this.bodyParts.rightArm.position.set(0.25, 1.25, 0);
        this.bodyParts.rightArm.castShadow = true;
        this.mesh.add(this.bodyParts.rightArm);
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
        this.bodyParts.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.bodyParts.leftLeg.position.set(-0.1, 0.55, 0);
        this.bodyParts.leftLeg.castShadow = true;
        this.mesh.add(this.bodyParts.leftLeg);
        
        this.bodyParts.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.bodyParts.rightLeg.position.set(0.1, 0.55, 0);
        this.bodyParts.rightLeg.castShadow = true;
        this.mesh.add(this.bodyParts.rightLeg);
        
        // Shoes
        const shoeGeo = new THREE.BoxGeometry(0.16, 0.08, 0.22);
        this.bodyParts.leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        this.bodyParts.leftShoe.position.set(-0.1, 0.04, 0.05);
        this.mesh.add(this.bodyParts.leftShoe);
        
        this.bodyParts.rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        this.bodyParts.rightShoe.position.set(0.1, 0.04, 0.05);
        this.mesh.add(this.bodyParts.rightShoe);
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
        
        // Check for threats
        let threat = null;
        let threatDist = Infinity;
        
        // Player vehicle threat
        if (player.isInVehicle && player.vehicle) {
            const vehDist = this.position.distanceTo(player.vehicle.mesh.position);
            if (vehDist < 15 && player.vehicle.speed > 10) {
                threat = player.vehicle.mesh.position;
                threatDist = vehDist;
            }
        }
        
        // Gunshots
        if (player.shootPressed && playerDist < 30) {
            threat = player.position;
            threatDist = playerDist;
        }
        
        // Explosions, etc.
        for (const car of this.game.world.vehicles) {
            if (car.health < car.maxHealth * 0.3) {
                const d = this.position.distanceTo(car.mesh.position);
                if (d < 20 && d < threatDist) {
                    threat = car.mesh.position;
                    threatDist = d;
                }
            }
        }
        
        // State machine
        switch (this.state) {
            case 'wander':
                this.wanderTimer -= delta;
                if (this.wanderTimer <= 0 || !this.targetPosition) {
                    this.pickNewWanderTarget();
                }
                
                if (threat) {
                    this.state = 'flee';
                    this.lastSeenThreat = threat.clone();
                    this.fleeTimer = 5 + Math.random() * 5;
                }
                break;
                
            case 'flee':
                this.fleeTimer -= delta;
                this.isRunning = true;
                
                if (this.lastSeenThreat) {
                    const awayDir = this.position.clone().sub(this.lastSeenThreat).normalize();
                    this.targetPosition = this.position.clone().addScaledVector(awayDir, 30);
                }
                
                if (this.fleeTimer <= 0 || (threat && this.position.distanceTo(threat) > 40)) {
                    this.state = 'panic';
                    this.panicTimer = 3;
                }
                break;
                
            case 'panic':
                this.panicTimer -= delta;
                this.isRunning = true;
                
                if (this.panicTimer <= 0) {
                    this.state = 'wander';
                    this.wanderTimer = 2;
                    this.isRunning = false;
                }
                break;
        }
        
        // Keep on sidewalks
        this.constrainToWalkable();
    }

    pickNewWanderTarget() {
        // Find nearby sidewalk position
        const attempts = 10;
        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            const target = this.position.clone().add(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
            
            // Snap to sidewalk
            const roadPos = this.game.world.cityGenerator.roadNetwork.getNearestRoadPosition(target);
            if (roadPos) {
                // Offset to sidewalk
                const road = this.game.world.cityGenerator.roadNetwork.getRoadAt(roadPos);
                if (road) {
                    const perp = new THREE.Vector3(-road.direction.z, 0, road.direction.x);
                    const side = Math.random() < 0.5 ? 1 : -1;
                    target.copy(roadPos).addScaledVector(perp, side * (this.game.world.cityGenerator.roadNetwork.roadWidth/2 + this.game.world.cityGenerator.roadNetwork.sidewalkWidth/2));
                }
                this.targetPosition = target;
                break;
            }
        }
        
        if (!this.targetPosition) {
            this.targetPosition = this.position.clone().add(new THREE.Vector3(MathUtils.random(-10,10), 0, MathUtils.random(-10,10)));
        }
        
        this.wanderTimer = 5 + Math.random() * 10;
    }

    constrainToWalkable() {
        // Simple constraint - don't go too far into roads
        if (this.game.world.cityGenerator.roadNetwork.isOnRoad(this.position)) {
            // Push to nearest sidewalk
            const sidewalkPos = this.game.world.cityGenerator.roadNetwork.getNearestRoadPosition(this.position);
            if (sidewalkPos) {
                const road = this.game.world.cityGenerator.roadNetwork.getRoadAt(sidewalkPos);
                if (road) {
                    const perp = new THREE.Vector3(-road.direction.z, 0, road.direction.x);
                    const side = Math.sign(this.position.clone().sub(sidewalkPos).dot(perp));
                    this.position.addScaledVector(perp, side * 0.1);
                }
            }
        }
    }

    updateMovement(delta) {
        if (!this.targetPosition) return;
        
        const toTarget = this.targetPosition.clone().sub(this.position);
        const dist = toTarget.length();
        
        if (dist < 2) {
            this.velocity.set(0, 0, 0);
            return;
        }
        
        const desiredSpeed = this.isRunning ? this.runSpeed : this.speed;
        const direction = toTarget.normalize();
        
        // Simple steering
        this.velocity.lerp(direction.multiplyScalar(desiredSpeed), 5 * delta);
        
        // Apply
        this.position.addScaledVector(this.velocity, delta);
        this.position.y = 1;
        
        // Rotate to face movement
        if (this.velocity.length() > 0.1) {
            const targetRot = Math.atan2(this.velocity.x, this.velocity.z);
            this.rotation.y = MathUtils.lerpAngle(this.rotation.y, targetRot, 10 * delta);
        }
    }

    updateAnimation(delta) {
        const speed = this.velocity.length();
        
        if (speed > 0.5) {
            this.animTime += delta * (this.isRunning ? 15 : 8);
            
            const swing = Math.sin(this.animTime) * (this.isRunning ? 1 : 0.7);
            this.bodyParts.leftArm.rotation.x = -swing;
            this.bodyParts.rightArm.rotation.x = swing;
            this.bodyParts.leftLeg.rotation.x = -swing * 1.2;
            this.bodyParts.rightLeg.rotation.x = swing * 1.2;
        } else {
            // Idle
            this.animTime += delta * 1;
            this.bodyParts.leftArm.rotation.x = Math.sin(this.animTime) * 0.1;
            this.bodyParts.rightArm.rotation.x = -Math.sin(this.animTime) * 0.1;
            this.bodyParts.leftLeg.rotation.x = 0;
            this.bodyParts.rightLeg.rotation.x = 0;
        }
    }

    updateMeshTransform() {
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation.y;
    }

    takeDamage(amount, hitPoint, attacker) {
        this.health = Math.max(0, this.health - amount);
        
        this.game.effects.createBloodSpray(hitPoint || this.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
        this.game.effects.showDamageNumber(this.position.clone().add(new THREE.Vector3(0, 2, 0)), amount);
        
        // React to being shot
        if (this.state !== 'dead') {
            this.state = 'flee';
            this.lastSeenThreat = attacker ? attacker.position.clone() : this.position.clone();
            this.fleeTimer = 10;
            this.isRunning = true;
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.state = 'dead';
        this.velocity.set(0, 0, 0);
        this.mesh.rotation.z = Math.PI / 2;
        this.mesh.position.y = 0.3;
        
        // Drop money
        if (Math.random() < 0.3) {
            this.game.effects.createPickup(this.position.clone(), 'money', MathUtils.randomInt(10, 50));
        }
    }

    dispose() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

window.Pedestrian = Pedestrian;