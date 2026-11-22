// Police car - chases player
class PoliceCar extends Car {
    constructor(game, options = {}) {
        super(game, options);
        
        this.maxSpeed = 45;
        this.acceleration = 35;
        this.brakeForce = 40;
        this.steerSpeed = 4.5;
        
        this.target = null; // Player or target vehicle
        this.state = 'chase'; // chase, ram, pit, stopped
        this.ramCooldown = 0;
        this.sirenOn = true;
        
        // Police visual
        this.bodyColor = 0x222266;
        this.lightBar = null;
        this.sirenLights = [];
    }

    init() {
        super.init();
        this.createPoliceVisuals();
        this.startEngine();
        this.createSiren();
    }

    createPoliceVisuals() {
        // Light bar on roof
        const barGeo = new THREE.BoxGeometry(1.6, 0.15, 0.8);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        this.lightBar = new THREE.Mesh(barGeo, barMat);
        this.lightBar.position.set(0, 1.55, -0.2);
        this.mesh.add(this.lightBar);
        
        // Siren lights
        const sirenGeo = new THREE.BoxGeometry(0.2, 0.12, 0.12);
        const colors = [0xff0000, 0x0000ff];
        
        for (let i = 0; i < 4; i++) {
            const color = colors[i % 2];
            const mat = new THREE.MeshStandardMaterial({ 
                color: color, 
                emissive: color, 
                emissiveIntensity: 2,
                roughness: 0.1,
                metalness: 0.9
            });
            const siren = new THREE.Mesh(sirenGeo, mat);
            
            const x = (i % 2 === 0 ? -1 : 1) * 0.65;
            const z = (i < 2 ? 1 : -1) * 0.3;
            siren.position.set(x, 1.65, z);
            this.mesh.add(siren);
            
            // Point light
            const light = new THREE.PointLight(color, 0, 20, 2);
            light.position.copy(siren.position);
            this.mesh.add(light);
            
            this.sirenLights.push({ mesh: siren, light, color, phase: i * Math.PI / 2 });
        }
        
        // POLICE text
        const textGeo = new THREE.PlaneGeometry(2, 0.4);
        const textMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        // Simple text representation
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(0, 1.3, 2.3);
        textMesh.rotation.x = -0.2;
        this.mesh.add(textMesh);
    }

    createSiren() {
        this.sirenSound = this.game.audio.createSiren(this.id);
    }

    update(delta) {
        if (this.health <= 0) return;
        
        this.updateAI(delta);
        super.update(delta);
        this.updateSiren(delta);
    }

    updateAI(delta) {
        const player = this.game.player;
        this.target = player.isInVehicle ? player.vehicle.mesh : player.mesh;
        
        if (!this.target) {
            this.input = { accelerate: 0, brake: 1, steer: 0, handbrake: false };
            return;
        }
        
        const dist = this.position.distanceTo(this.target.position);
        const toTarget = this.target.position.clone().sub(this.position);
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
        
        const forwardDot = toTarget.dot(forward);
        const rightDot = toTarget.dot(right);
        
        // Steering
        let steer = 0;
        if (forwardDot > 0) {
            steer = MathUtils.clamp(rightDot / 8, -1, 1);
        } else {
            steer = rightDot > 0 ? 1 : -1;
        }
        
        // Speed control
        let targetSpeed = this.maxSpeed;
        
        if (dist < 15) {
            // Close - ram or PIT
            targetSpeed = this.maxSpeed * 1.2;
            
            // Ram attack
            this.ramCooldown -= delta;
            if (this.ramCooldown <= 0 && forwardDot > 0.5 && dist < 10 && this.speed > 15) {
                this.input.accelerate = 1;
                this.ramCooldown = 3 + Math.random() * 3;
            }
        } else if (dist > 60) {
            // Too far - speed up
            targetSpeed = this.maxSpeed;
        }
        
        // Throttle
        if (this.speed < targetSpeed) {
            this.input.accelerate = 0.9;
            this.input.brake = 0;
        } else {
            this.input.accelerate = 0;
            this.input.brake = 0.2;
        }
        
        // Handbrake for sharp turns
        if (Math.abs(rightDot) > 8 && this.speed > 20) {
            this.input.handbrake = true;
            this.input.steer = steer * 1.5;
        } else {
            this.input.handbrake = false;
            this.input.steer = steer;
        }
        
        // Obstacle avoidance
        this.avoidObstacles();
    }

    avoidObstacles() {
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const origin = this.position.clone().add(new THREE.Vector3(0, 0.5, 3));
        
        const raycaster = new THREE.Raycaster(origin, forward, 0, 20);
        const hits = raycaster.intersectObjects(this.game.world.collisionMeshes, true);
        
        if (hits.length > 0 && hits[0].distance < 15) {
            this.input.brake = 0.8;
            this.input.accelerate = 0;
        }
    }

    updateSiren(delta) {
        if (!this.sirenOn) return;
        
        for (let i = 0; i < this.sirenLights.length; i++) {
            const siren = this.sirenLights[i];
            siren.phase += delta * 10;
            const intensity = (Math.sin(siren.phase) + 1) / 2;
            
            siren.mesh.material.emissiveIntensity = 0.5 + intensity * 2;
            siren.light.intensity = intensity * 15;
        }
        
        if (this.sirenSound) {
            this.game.audio.updateSiren(this.id, true);
        }
    }

    takeDamage(amount, hitPoint) {
        super.takeDamage(amount, hitPoint);
        
        // More aggressive when damaged
        if (this.health < this.maxHealth * 0.5) {
            this.maxSpeed = 50;
            this.acceleration = 40;
        }
    }

    dispose() {
        if (this.sirenSound) {
            this.game.audio.updateSiren(this.id, false);
        }
        super.dispose();
    }
}

window.PoliceCar = PoliceCar;