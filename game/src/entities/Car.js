// Base car class with arcade physics
const CAR_BODY_COLORS = [
    0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff, 0x33ffff,
    0xffffff, 0x222222, 0x884422, 0xff8800, 0x8800ff, 0x00ff88
];
const DEFAULT_MAX_SPEED = 35;
const DEFAULT_MAX_REVERSE_SPEED = -12;
const DEFAULT_ACCELERATION = 25;
const DEFAULT_BRAKE_FORCE = 30;
const DEFAULT_HANDBRAKE_FORCE = 40;
const DEFAULT_STEER_SPEED = 3.5;
const DEFAULT_STEER_RETURN = 5;
const DEFAULT_DRAG = 0.3;
const DEFAULT_MASS = 1200;
const WHEELBASE = 2.7;

class Car {
    constructor(game, options = {}) {
        this.game = game;
        this.id = options.id || 'car_' + MathUtils.randomInt(1000, 9999);
        
        // Physics
        this.position = options.position || new THREE.Vector3(0, 0.5, 0);
        this.rotation = new THREE.Euler(0, options.rotation || 0, 0);
        this.velocity = new THREE.Vector3();
        this.angularVelocity = 0;
        
        // Car specs
        this.maxSpeed = options.maxSpeed || DEFAULT_MAX_SPEED;
        this.maxReverseSpeed = options.maxReverseSpeed || DEFAULT_MAX_REVERSE_SPEED;
        this.acceleration = options.acceleration || DEFAULT_ACCELERATION;
        this.brakeForce = options.brakeForce || DEFAULT_BRAKE_FORCE;
        this.handbrakeForce = DEFAULT_HANDBRAKE_FORCE;
        this.steerSpeed = options.steerSpeed || DEFAULT_STEER_SPEED;
        this.steerReturn = DEFAULT_STEER_RETURN;
        this.drag = DEFAULT_DRAG;
        this.mass = DEFAULT_MASS;
        
        // State
        this.health = options.health || 1000;
        this.maxHealth = this.health;
        this.isPlayerVehicle = options.isPlayerVehicle || false;
        this.isParked = options.isParked || false;
        this.engineRunning = false;
        this.engineRPM = 0;
        this.gear = 1;
        this.speed = 0;
        
        // Input
        this.input = { accelerate: 0, brake: 0, steer: 0, handbrake: false };
        
        // Visual
        this.mesh = null;
        this.wheels = [];
        this.bodyColor = options.color || MathUtils.choice(CAR_BODY_COLORS);
        
        // Effects
        this.smokeParticles = null;
        this.fireParticles = null;
        this.engineSound = null;
        this.sirenSound = null;
        
        // Lights
        this.headlights = [];
        this.taillights = [];
        this.lightObjects = [];
    }

    init() {
        this.createMesh();
        this.createWheels();
        this.createLights();
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        if (this.isPlayerVehicle) {
            this.startEngine();
        }
    }

    createMesh() {
        this.mesh = new THREE.Group();
        this.mesh.userData = { entity: this, type: 'car' };
        
        // Body materials
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: this.bodyColor, 
            roughness: 0.3, 
            metalness: 0.7,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1
        });
        const glassMat = new THREE.MeshStandardMaterial({ 
            color: 0x112233, 
            roughness: 0.1, 
            metalness: 0.9,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const trimMat = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc, 
            roughness: 0.2, 
            metalness: 0.8 
        });
        const tireMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.9, 
            metalness: 0.1 
        });
        const rimMat = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa, 
            roughness: 0.3, 
            metalness: 0.8 
        });
        
        // Car dimensions
        const length = 4.5;
        const width = 2.0;
        const height = 1.3;
        const wheelBase = 2.7;
        const wheelRadius = 0.35;
        const wheelWidth = 0.22;
        
        // Main body (lower)
        const bodyGeo = new THREE.BoxGeometry(width, height * 0.5, length);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height * 0.25 + 0.1;
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);
        
        // Cabin (upper)
        const cabinGeo = new THREE.BoxGeometry(width * 0.85, height * 0.6, length * 0.55);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.y = height * 0.5 + height * 0.3 + 0.1;
        cabin.position.z = -length * 0.05;
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        this.mesh.add(cabin);
        
        // Windows
        const windowGeo = new THREE.BoxGeometry(width * 0.83, height * 0.5, length * 0.53);
        const windows = new THREE.Mesh(windowGeo, glassMat);
        windows.position.copy(cabin.position);
        windows.position.y += 0.02;
        this.mesh.add(windows);
        
        // Front windshield (slanted)
        const windshieldGeo = new THREE.BoxGeometry(width * 0.8, height * 0.5, 0.1);
        const windshield = new THREE.Mesh(windshieldGeo, glassMat);
        windshield.position.set(0, height * 0.5 + 0.1, length * 0.28);
        windshield.rotation.x = -0.4;
        this.mesh.add(windshield);
        
        // Rear windshield
        const rearWindowGeo = new THREE.BoxGeometry(width * 0.8, height * 0.4, 0.1);
        const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat);
        rearWindow.position.set(0, height * 0.5 + 0.05, -length * 0.28);
        rearWindow.rotation.x = 0.3;
        this.mesh.add(rearWindow);
        
        // Hood
        const hoodGeo = new THREE.BoxGeometry(width * 0.9, 0.2, length * 0.45);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, height * 0.35 + 0.1, length * 0.25);
        hood.castShadow = true;
        this.mesh.add(hood);
        
        // Trunk
        const trunkGeo = new THREE.BoxGeometry(width * 0.9, 0.2, length * 0.35);
        const trunk = new THREE.Mesh(trunkGeo, bodyMat);
        trunk.position.set(0, height * 0.35 + 0.1, -length * 0.25);
        trunk.castShadow = true;
        this.mesh.add(trunk);
        
        // Bumpers
        const bumperGeo = new THREE.BoxGeometry(width * 1.02, 0.25, 0.15);
        const frontBumper = new THREE.Mesh(bumperGeo, trimMat);
        frontBumper.position.set(0, 0.3, length * 0.5 + 0.07);
        this.mesh.add(frontBumper);
        
        const rearBumper = new THREE.Mesh(bumperGeo, trimMat);
        rearBumper.position.set(0, 0.3, -length * 0.5 - 0.07);
        this.mesh.add(rearBumper);
        
        // Exhaust
        const exhaustGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const exhaust = new THREE.Mesh(exhaustGeo, trimMat);
        exhaust.position.set(width * 0.4, 0.25, -length * 0.5);
        exhaust.rotation.x = Math.PI / 2;
        this.mesh.add(exhaust);
        
        // Collision box
        this.collisionBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(0, height / 2 + 0.1, 0),
            new THREE.Vector3(width, height + 0.2, length)
        );
    }

    createWheels() {
        const wheelRadius = 0.35;
        const wheelWidth = 0.22;
        const wheelBase = 2.7;
        const trackWidth = 1.6;
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8 });
        
        const positions = [
            { x: -trackWidth/2, z: wheelBase/2 },  // FL
            { x: trackWidth/2, z: wheelBase/2 },   // FR
            { x: -trackWidth/2, z: -wheelBase/2 }, // RL
            { x: trackWidth/2, z: -wheelBase/2 }   // RR
        ];
        
        for (let i = 0; i < 4; i++) {
            const pos = positions[i];
            
            // Tire
            const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.position.set(pos.x, wheelRadius + 0.1, pos.z);
            tire.castShadow = true;
            tire.receiveShadow = true;
            this.mesh.add(tire);
            
            // Rim
            const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.01, 10);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.copy(tire.position);
            this.mesh.add(rim);
            
            this.wheels.push({
                mesh: tire,
                rim: rim,
                position: new THREE.Vector3(pos.x, wheelRadius + 0.1, pos.z),
                rotation: 0,
                isFront: i < 2,
                isLeft: i % 2 === 0,
                steerAngle: 0
            });
        }
    }

    createLights() {
        const length = 4.5;
        const width = 2.0;
        const height = 1.3;
        
        // Headlights
        const headlightGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const headlightMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffee, 
            transparent: true, 
            opacity: 0.9 
        });
        
        for (const side of [-1, 1]) {
            const hl = new THREE.Mesh(headlightGeo, headlightMat);
            hl.position.set(side * width * 0.45, height * 0.3, length * 0.5);
            hl.visible = false;
            this.mesh.add(hl);
            this.headlights.push(hl);
            
            // Light cone
            const light = new THREE.SpotLight(0xffffee, 0, 50, Math.PI / 6, 0.3, 1);
            light.position.copy(hl.position);
            light.target.position.set(side * width * 0.45, 0, length * 0.5 + 30);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            this.mesh.add(light);
            this.mesh.add(light.target);
            this.lightObjects.push(light);
        }
        
        // Taillights
        const tailMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8 
        });
        
        for (const side of [-1, 1]) {
            const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.05), tailMat);
            tl.position.set(side * width * 0.4, height * 0.35, -length * 0.5);
            this.mesh.add(tl);
            this.taillights.push(tl);
            
            // Brake light
            const brakeLight = new THREE.PointLight(0xff0000, 0, 10, 2);
            brakeLight.position.copy(tl.position);
            this.mesh.add(brakeLight);
            this.lightObjects.push(brakeLight);
        }
        
        // Reverse lights
        const revMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        for (const side of [-1, 1]) {
            const rl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.05), revMat);
            rl.position.set(side * width * 0.25, height * 0.25, -length * 0.5);
            rl.visible = false;
            this.mesh.add(rl);
            this.lightObjects.push(rl);
        }
    }

    setInput(input) {
        this.input = input;
    }

    startEngine() {
        this.engineRunning = true;
        if (this.game.audio.enabled) {
            this.engineSound = this.game.audio.createEngineSound(this.id);
        }
    }

    stopEngine() {
        this.engineRunning = false;
        if (this.engineSound) {
            this.game.audio.stopEngineSound(this.id);
            this.engineSound = null;
        }
    }

    update(delta) {
        if (this.isParked && !this.isPlayerVehicle) return;
        
        this.updatePhysics(delta);
        this.updateWheels(delta);
        this.updateLights();
        this.updateEngineSound(delta);
        this.updateDamageEffects(delta);
        this.updateMeshTransform();
    }

    updatePhysics(delta) {
        // Calculate forward vector
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
        
        // Current speed
        this.speed = this.velocity.dot(forward);
        
        // Engine force
        let engineForce = 0;
        if (this.engineRunning) {
            if (this.input.accelerate > 0) {
                engineForce = this.input.accelerate * this.acceleration * this.mass;
            } else if (this.input.brake > 0) {
                engineForce = -this.input.brake * this.brakeForce * this.mass;
            }
        }
        
        // Apply engine force
        if (engineForce !== 0) {
            this.velocity.addScaledVector(forward, engineForce * delta / this.mass);
        }
        
        // Steering
        let targetSteer = 0;
        if (Math.abs(this.speed) > 0.5) {
            targetSteer = -this.input.steer * this.steerSpeed * (1 - Math.min(Math.abs(this.speed) / this.maxSpeed, 0.8));
        }
        
        // Smooth steer
        this.steerAngle = MathUtils.lerp(this.steerAngle || 0, targetSteer, this.steerReturn * delta);
        
        // Apply steering (angular velocity)
        if (Math.abs(this.speed) > 0.1) {
            this.angularVelocity = this.steerAngle * this.speed / WHEELBASE; // wheelbase
            this.rotation.y += this.angularVelocity * delta;
        } else {
            this.angularVelocity *= 0.9;
        }
        
        // Handbrake
        if (this.input.handbrake && Math.abs(this.speed) > 1) {
            this.angularVelocity += this.input.steer * this.handbrakeForce * delta / this.mass;
            // Reduce lateral grip
            const lateralSpeed = this.velocity.dot(right);
            this.velocity.addScaledVector(right, -lateralSpeed * 0.5 * delta);
        }
        
        // Drag
        const speed = this.velocity.length();
        if (speed > 0) {
            const dragForce = this.drag * speed * speed;
            const dragDir = this.velocity.clone().normalize().multiplyScalar(-1);
            this.velocity.addScaledVector(dragDir, dragForce * delta / this.mass);
        }
        
        // Clamp speed
        const forwardSpeed = this.velocity.dot(forward);
        if (forwardSpeed > this.maxSpeed) {
            this.velocity.addScaledVector(forward, -(forwardSpeed - this.maxSpeed));
        } else if (forwardSpeed < this.maxReverseSpeed) {
            this.velocity.addScaledVector(forward, -(forwardSpeed - this.maxReverseSpeed));
        }
        
        // Apply velocity
        this.position.addScaledVector(this.velocity, delta);
        this.position.y = 0.5; // Keep on ground
        
        // Simple collision with world
        this.checkCollisions();
    }

    checkCollisions() {
        const bounds = new THREE.Box3().setFromCenterAndSize(
            this.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
            new THREE.Vector3(2.0, 1.6, 4.5)
        );
        
        for (const obj of this.game.world.collisionBounds) {
            if (obj === this.collisionBox) continue;
            if (bounds.intersectsBox(obj)) {
                // Simple push out
                const closest = new THREE.Vector3();
                obj.clampPoint(this.position, closest);
                const pushDir = this.position.clone().sub(closest).normalize();
                this.position.addScaledVector(pushDir, 0.2);
                
                // Bounce
                this.velocity.multiplyScalar(-0.3);
                
                // Damage
                this.takeDamage(20 * this.velocity.length() / 10);
                
                this.game.audio.playCollision(this.velocity.length() / 10);
                break;
            }
        }
        
        // Vehicle-vehicle collisions
        for (const other of this.game.world.vehicles) {
            if (other === this) continue;
            const dist = this.position.distanceTo(other.position);
            if (dist < 3.5) {
                const pushDir = this.position.clone().sub(other.position).normalize();
                this.position.addScaledVector(pushDir, 0.15);
                this.velocity.multiplyScalar(0.5);
                this.takeDamage(15);
            }
        }
    }

    updateWheels(delta) {
        for (const wheel of this.wheels) {
            // Rotation
            wheel.rotation += this.speed * delta * 2.5;
            wheel.mesh.rotation.x = wheel.rotation;
            wheel.rim.rotation.x = wheel.rotation;
            
            // Steering (front wheels)
            if (wheel.isFront) {
                wheel.steerAngle = MathUtils.lerp(wheel.steerAngle || 0, this.steerAngle, 10 * delta);
                wheel.mesh.rotation.y = wheel.steerAngle;
                wheel.rim.rotation.y = wheel.steerAngle;
            }
        }
    }

    updateLights() {
        const isNight = this.game.world.timeOfDay > 0.7 || this.game.world.timeOfDay < 0.05;
        const headlightsOn = isNight || this.isPlayerVehicle;
        
        for (const hl of this.headlights) {
            hl.visible = headlightsOn;
        }
        for (const light of this.lightObjects) {
            if (light instanceof THREE.SpotLight) {
                light.intensity = headlightsOn ? 30 : 0;
            }
        }
        
        // Brake lights
        const braking = this.input.brake > 0 || (this.speed > 0 && this.input.accelerate === 0);
        for (let i = 0; i < this.taillights.length; i++) {
            this.taillights[i].material.opacity = braking ? 1 : 0.3;
            if (this.lightObjects[i + 2]) {
                this.lightObjects[i + 2].intensity = braking ? 10 : 0;
            }
        }
        
        // Reverse lights
        const reversing = this.speed < -1 && this.input.accelerate === 0;
        for (let i = 4; i < this.lightObjects.length; i++) {
            if (this.lightObjects[i] instanceof THREE.Mesh) {
                this.lightObjects[i].visible = reversing;
            }
        }
    }

    updateEngineSound(delta) {
        if (this.engineSound && this.game.audio.enabled) {
            const rpm = MathUtils.clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1);
            this.game.audio.updateEngineSound(this.id, rpm, this.speed, this.isPlayerVehicle);
        }
    }

    updateDamageEffects(delta) {
        const healthRatio = this.health / this.maxHealth;
        
        if (healthRatio < 0.4 && !this.smokeParticles) {
            this.createSmoke();
        }
        if (healthRatio < 0.2 && !this.fireParticles) {
            this.createFire();
        }
        
        if (this.smokeParticles) {
            this.updateParticles(this.smokeParticles, delta, healthRatio < 0.2 ? 2 : 1);
        }
        if (this.fireParticles) {
            this.updateParticles(this.fireParticles, delta, 1, true);
        }
    }

    createSmoke() {
        const geo = new THREE.BufferGeometry();
        const count = 30;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const lifetimes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 1;
            positions[i * 3 + 2] = -2;
            sizes[i] = MathUtils.random(0.3, 0.6);
            lifetimes[i] = MathUtils.random(0, 1);
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        const mat = new THREE.PointsMaterial({
            color: 0x444444,
            size: 1,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        this.smokeParticles = new THREE.Points(geo, mat);
        this.mesh.add(this.smokeParticles);
        this.smokeParticles.userData = { positions: positions.slice(), type: 'smoke' };
    }

    createFire() {
        const geo = new THREE.BufferGeometry();
        const count = 20;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const lifetimes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = MathUtils.random(-0.5, 0.5);
            positions[i * 3 + 1] = 0.8;
            positions[i * 3 + 2] = MathUtils.random(-1, 1);
            sizes[i] = MathUtils.random(0.2, 0.4);
            lifetimes[i] = MathUtils.random(0, 1);
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        const mat = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 1,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.fireParticles = new THREE.Points(geo, mat);
        this.mesh.add(this.fireParticles);
        this.fireParticles.userData = { positions: positions.slice(), type: 'fire' };
    }

    updateParticles(particles, delta, intensity, isFire = false) {
        const positions = particles.geometry.attributes.position;
        const lifetimes = particles.geometry.attributes.lifetime;
        const basePositions = particles.userData.positions;
        const count = positions.count;
        
        for (let i = 0; i < count; i++) {
            lifetimes.array[i] += delta * (isFire ? 3 : 1.5) * intensity;
            
            if (lifetimes.array[i] >= 1) {
                lifetimes.array[i] = 0;
                positions.setX(i, basePositions[i * 3] + MathUtils.random(-0.2, 0.2));
                positions.setY(i, basePositions[i * 3 + 1]);
                positions.setZ(i, basePositions[i * 3 + 2] + MathUtils.random(-0.2, 0.2));
            } else {
                const life = lifetimes.array[i];
                positions.setY(i, basePositions[i * 3 + 1] + life * (isFire ? 1.5 : 2));
                positions.setX(i, positions.getX(i) + MathUtils.random(-0.02, 0.02) * intensity);
                positions.setZ(i, positions.getZ(i) + MathUtils.random(-0.02, 0.02) * intensity);
            }
        }
        
        positions.needsUpdate = true;
        lifetimes.needsUpdate = true;
    }

    updateMeshTransform() {
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation.y;
    }

    takeDamage(amount, hitPoint = null) {
        this.health = Math.max(0, this.health - amount);
        
        if (hitPoint) {
            this.game.effects.createHitEffect(hitPoint, new THREE.Vector3(0, 1, 0));
        }
        
        if (this.health <= 0) {
            this.explode();
        }
    }

    explode() {
        this.game.audio.playExplosion(this.position);
        this.game.effects.createExplosion(this.position);
        this.game.cameraController.shake(1.0);
        
        // Remove after delay
        setTimeout(() => {
            this.dispose();
        }, 1000);
    }

    getExitPosition() {
        // Exit on driver side (left)
        const left = new THREE.Vector3(-1, 0, 0).applyEuler(this.rotation);
        return this.position.clone().addScaledVector(left, 2.5);
    }

    enterVehicle(driver) {
        this.isPlayerVehicle = true;
        this.isParked = false;
        this.startEngine();
    }

    exitVehicle() {
        this.isPlayerVehicle = false;
        this.stopEngine();
    }

    dispose() {
        if (this.engineSound) this.game.audio.stopEngineSound(this.id);
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}

window.Car = Car;