// SOLMAR NIGHTS: police car — pursuit, ramming, siren lights.
// Police car - chases player
const POLICE_CAR_MAX_SPEED = 45;
const POLICE_CAR_ACCELERATION = 35;
const POLICE_CAR_BRAKE_FORCE = 40;
const POLICE_CAR_STEER_SPEED = 4.5;
const POLICE_CAR_RAM_COOLDOWN_BASE = 3;
const POLICE_CAR_RAM_COOLDOWN_VAR = 3;
const POLICE_CAR_CLOSE_DIST = 15;
const POLICE_CAR_RAM_DIST = 10;
const POLICE_CAR_RAM_SPEED = 15;
const POLICE_CAR_RAM_FORWARD_DOT = 0.5;
const POLICE_CAR_FAR_DIST = 60;
const POLICE_CAR_THROTTLE_ACCEL = 0.9;
const POLICE_CAR_THROTTLE_BRAKE = 0.2;
const POLICE_CAR_HANDBRAKE_DIST = 8;
const POLICE_CAR_HANDBRAKE_SPEED = 20;
const POLICE_CAR_HANDBRAKE_STEER_MULT = 1.5;
const POLICE_CAR_OBSTACLE_DIST = 15;
const POLICE_CAR_OBSTACLE_RANGE = 20;
const POLICE_CAR_BODY_COLOR = 0x222266;
const POLICE_LIGHT_BAR_SIZE = { w: 1.6, h: 0.15, d: 0.8 };
const POLICE_SIREN_SIZE = { w: 0.2, h: 0.12, d: 0.12 };
const POLICE_SIREN_COLORS = [0xff0000, 0x0000ff];
const POLICE_SIREN_POSITIONS = [
    { x: -0.65, z: 0.3 },
    { x: 0.65, z: 0.3 },
    { x: -0.65, z: -0.3 },
    { x: 0.65, z: -0.3 }
];
const POLICE_SIREN_PHASE_OFFSETS = [0, Math.PI/2, Math.PI, Math.PI*1.5];
const POLICE_SIREN_SPEED = 10;
const POLICE_SIREN_BASE_INTENSITY = 0.5;
const POLICE_SIREN_INTENSITY_MULT = 2;
const POLICE_SIREN_LIGHT_INTENSITY = 15;
const POLICE_TEXT_SIZE = { w: 2, h: 0.4 };
const POLICE_TEXT_POSITION = { x: 0, y: 1.3, z: 2.3 };
const POLICE_TEXT_ROTATION = -0.2;
const POLICE_DAMAGED_SPEED = 50;
const POLICE_DAMAGED_ACCEL = 40;
const POLICE_DAMAGED_HEALTH_THRESHOLD = 0.5;

class PoliceCar extends Car {
    constructor(game, options = {}) {
        super(game, options);
        
        this.maxSpeed = POLICE_CAR_MAX_SPEED;
        this.acceleration = POLICE_CAR_ACCELERATION;
        this.brakeForce = POLICE_CAR_BRAKE_FORCE;
        this.steerSpeed = POLICE_CAR_STEER_SPEED;
        
        this.target = null; // Player or target vehicle
        this.state = 'chase'; // chase, ram, pit, stopped
        this.ramCooldown = 0;
        this.sirenOn = true;
        
        // Police visual
        this.bodyColor = POLICE_CAR_BODY_COLOR;
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
        const barGeo = new THREE.BoxGeometry(
            POLICE_LIGHT_BAR_SIZE.w, POLICE_LIGHT_BAR_SIZE.h, POLICE_LIGHT_BAR_SIZE.d
        );
        const barMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        this.lightBar = new THREE.Mesh(barGeo, barMat);
        this.lightBar.position.set(0, 1.55, -0.2);
        this.mesh.add(this.lightBar);
        
        // Siren lights
        const sirenGeo = new THREE.BoxGeometry(
            POLICE_SIREN_SIZE.w, POLICE_SIREN_SIZE.h, POLICE_SIREN_SIZE.d
        );
        const colors = POLICE_SIREN_COLORS;
        
        for (let i = 0; i < POLICE_SIREN_POSITIONS.length; i++) {
            const color = colors[i % 2];
            const mat = new THREE.MeshStandardMaterial({ 
                color: color, 
                emissive: color, 
                emissiveIntensity: 2,
                roughness: 0.1,
                metalness: 0.9
            });
            const siren = new THREE.Mesh(sirenGeo, mat);
            
            const pos = POLICE_SIREN_POSITIONS[i];
            siren.position.set(pos.x, 1.65, pos.z);
            this.mesh.add(siren);
            
            // Point light
            const light = new THREE.PointLight(color, 0, 20, 2);
            light.position.copy(siren.position);
            this.mesh.add(light);
            
            this.sirenLights.push({ mesh: siren, light, color, phase: POLICE_SIREN_PHASE_OFFSETS[i] });
        }
        
        // POLICE text
        const textGeo = new THREE.PlaneGeometry(POLICE_TEXT_SIZE.w, POLICE_TEXT_SIZE.h);
        const textMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        // Simple text representation
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(POLICE_TEXT_POSITION.x, POLICE_TEXT_POSITION.y, POLICE_TEXT_POSITION.z);
        textMesh.rotation.x = POLICE_TEXT_ROTATION;
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
        
        if (dist < POLICE_CAR_CLOSE_DIST) {
            // Close - ram or PIT
            targetSpeed = this.maxSpeed * 1.2;
            
            // Ram attack
            this.ramCooldown -= delta;
            if (this.ramCooldown <= 0 && forwardDot > POLICE_CAR_RAM_FORWARD_DOT && dist < POLICE_CAR_RAM_DIST && this.speed > POLICE_CAR_RAM_SPEED) {
                this.input.accelerate = 1;
                this.ramCooldown = POLICE_CAR_RAM_COOLDOWN_BASE + Math.random() * POLICE_CAR_RAM_COOLDOWN_VAR;
            }
        } else if (dist > POLICE_CAR_FAR_DIST) {
            // Too far - speed up
            targetSpeed = this.maxSpeed;
        }
        
        // Throttle
        if (this.speed < targetSpeed) {
            this.input.accelerate = POLICE_CAR_THROTTLE_ACCEL;
            this.input.brake = 0;
        } else {
            this.input.accelerate = 0;
            this.input.brake = POLICE_CAR_THROTTLE_BRAKE;
        }
        
        // Handbrake for sharp turns
        if (Math.abs(rightDot) > POLICE_CAR_HANDBRAKE_DIST && this.speed > POLICE_CAR_HANDBRAKE_SPEED) {
            this.input.handbrake = true;
            this.input.steer = steer * POLICE_CAR_HANDBRAKE_STEER_MULT;
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
        
        const raycaster = new THREE.Raycaster(origin, forward, 0, POLICE_CAR_OBSTACLE_RANGE);
        const hits = raycaster.intersectObjects(this.game.world.collisionMeshes, true);
        
        if (hits.length > 0 && hits[0].distance < POLICE_CAR_OBSTACLE_DIST) {
            this.input.brake = 0.8;
            this.input.accelerate = 0;
        }
    }
    
    updateSiren(delta) {
        if (!this.sirenOn) return;
        
        for (let i = 0; i < this.sirenLights.length; i++) {
            const siren = this.sirenLights[i];
            siren.phase += delta * POLICE_SIREN_SPEED;
            const intensity = (Math.sin(siren.phase) + 1) / 2;
            
            siren.mesh.material.emissiveIntensity = POLICE_SIREN_BASE_INTENSITY + intensity * POLICE_SIREN_INTENSITY_MULT;
            siren.light.intensity = intensity * POLICE_SIREN_LIGHT_INTENSITY;
        }
        
        if (this.sirenSound) {
            this.game.audio.updateSiren(this.id, true);
        }
    }

    takeDamage(amount, hitPoint) {
        super.takeDamage(amount, hitPoint);
        
        // More aggressive when damaged
        if (this.health < this.maxHealth * POLICE_DAMAGED_HEALTH_THRESHOLD) {
            this.maxSpeed = POLICE_DAMAGED_SPEED;
            this.acceleration = POLICE_DAMAGED_ACCEL;
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