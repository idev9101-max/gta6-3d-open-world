// SOLMAR NIGHTS: third-person chase camera with smoothing, collision and shake.
// Third-person chase camera system
const MIN_CHASE_DISTANCE = 2;
const MAX_CHASE_DISTANCE = 30;
const CAMERA_COLLISION_RADIUS = 0.3;

class CameraController {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;
        
        // Chase camera parameters
        this.chaseDistance = 8;      // Distance behind player
        this.chaseHeight = 3.5;        // Height above player feet
        this.lookAheadDistance = 4;  // How far ahead to look
        this.lookAtHeight = 1.5;     // Height of look-at point above player feet
        
        // Current smoothed values
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        
        // Smoothing factors
        this.positionSmoothing = 0.1;
        this.lookAtSmoothing = 0.08;
        
        // Collision
        this.collisionRadius = CAMERA_COLLISION_RADIUS;
        this.collisionSmoothing = 0.15;
        this.minDistance = MIN_CHASE_DISTANCE;
        
        // Orbit control (mouse/gamepad)
        this.yaw = 0;
        this.idealYaw = 0;
        this.rotationSmoothing = 0.08;
        
        // Vehicle mode
        this.isVehicle = false;
        this.vehicleChaseDistance = 12;
        this.vehicleChaseHeight = 4;
        this.vehicleLookAheadDistance = 6;
        this.vehicleLookAtHeight = 1;
        
        // Shake
        this.shakeIntensity = 0;
        this.shakeTime = 0;
        this.shakeTimer = 0;
        
        // Collidable objects (set by Game)
        this.collidableObjects = [];
        
        // Initialize immediately if target exists
        if (target) {
            this.initialize();
        }
    }
    
    initialize() {
        if (!this.target) return;
        
        // Set initial yaw to idealYaw immediately (no lerp)
        this.yaw = this.idealYaw;
        
        // Set initial camera position and lookAt
        this.updateIdealPosition();
        this.currentPosition.copy(this.idealPosition);
        this.currentLookAt.copy(this.idealLookAt);
        
        // Apply to camera immediately
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }
    
    setTarget(target) {
        this.target = target;
        this.initialize();
    }
    
    refresh() {
        if (!this.target) return;
        this.updateIdealPosition();
        this.currentPosition.copy(this.idealPosition);
        this.currentLookAt.copy(this.idealLookAt);
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }

    setVehicleMode(isVehicle) {
        this.isVehicle = isVehicle;
    }

    update(delta, input) {
        if (!this.target) return;
        
        this.handleInput(input);
        this.updateIdealPosition();
        this.handleCollisions(delta);
        this.smoothCamera(delta);
        this.updateCamera(delta);
    }

    handleInput(input) {
        const sensitivity = 0.002;
        
        // Mouse look - orbit around player
        if (input.isRightMouseDown()) {
            const delta = input.getMouseDelta();
            this.idealYaw -= delta.x * sensitivity;
        }
        
        // Gamepad right stick
        if (input.gamepad && input.gamepad.rightStick) {
            const { x, y } = input.gamepad.rightStick;
            if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                this.idealYaw -= x * sensitivity * 100;
            }
        }
    }

    updateIdealPosition() {
        if (!this.target) return;
        
        const targetPos = this.target.position.clone();
        const up = new THREE.Vector3(0, 1, 0);
        const forward = this.getTargetForward();
        
        // Get current chase parameters
        const chaseDistance = this.isVehicle ? this.vehicleChaseDistance : this.chaseDistance;
        const chaseHeight = this.isVehicle ? this.vehicleChaseHeight : this.chaseHeight;
        const lookAheadDistance = this.isVehicle ? this.vehicleLookAheadDistance : this.lookAheadDistance;
        const lookAtHeight = this.isVehicle ? this.vehicleLookAtHeight : this.lookAtHeight;
        
        // Apply yaw rotation to forward vector
        const rotatedForward = forward.clone().applyAxisAngle(up, this.yaw);
        
        // Ideal camera position: behind and above player
        const idealPos = targetPos.clone()
            .addScaledVector(rotatedForward, -chaseDistance)
            .addScaledVector(up, chaseHeight);
        
        // Ideal look-at point: ahead and above player
        const idealLookAt = targetPos.clone()
            .addScaledVector(rotatedForward, lookAheadDistance)
            .addScaledVector(up, lookAtHeight);
        
        this.idealPosition = idealPos;
        this.idealLookAt = idealLookAt;
    }

    handleCollisions(delta) {
        if (!this.target || !this.camera) return;
        
        const targetPos = this.target.position.clone();
        const direction = this.idealPosition.clone().sub(this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0))).normalize();
        const distance = this.idealPosition.distanceTo(this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0)));
        
        // Raycast for camera collision
        const raycaster = new THREE.Raycaster(
            this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0)),
            direction,
            0,
            distance
        );
        const intersects = raycaster.intersectObjects(this.collidableObjects, true);
        
        if (intersects.length > 0) {
            const hitDist = intersects[0].distance - this.collisionRadius;
            const clampedDist = Math.max(hitDist, this.minDistance);
            
            const hitPoint = this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0))
                .add(direction.multiplyScalar(clampedDist));
            
            // Ensure camera stays above ground
            if (hitPoint.y < this.target.position.y + (this.isVehicle ? 2 : 1.5)) {
                const adjustedDir = direction.clone();
                adjustedDir.y = Math.max(adjustedDir.y, 0.15);
                adjustedDir.normalize();
                this.currentPosition.lerp(
                    this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0))
                        .add(adjustedDir.multiplyScalar(clampedDist)),
                    this.collisionSmoothing
                );
            } else {
                this.currentPosition.lerp(
                    this.target.position.clone().add(new THREE.Vector3(0, this.isVehicle ? 1 : 1.5, 0))
                        .add(direction.multiplyScalar(clampedDist)),
                    this.collisionSmoothing
                );
            }
        } else {
            this.currentPosition.lerp(this.idealPosition, this.positionSmoothing);
        }
        
        this.currentLookAt.lerp(this.idealLookAt, this.lookAtSmoothing);
    }

    getCollidableObjects() {
        return this.collidableObjects || [];
    }

    setCollidableObjects(objects) {
        this.collidableObjects = objects;
    }

    getTargetForward() {
        // Get forward from target's rotation (y-axis)
        const forward = new THREE.Vector3(0, 0, 1);
        if (this.target && this.target.rotation) {
            forward.applyEuler(new THREE.Euler(0, this.target.rotation.y, 0));
        }
        return forward;
    }

    smoothCamera(delta) {
        // Smooth yaw
        this.yaw = MathUtils.lerpAngle(this.yaw, this.idealYaw, this.rotationSmoothing);
    }

    updateCamera(delta) {
        if (!this.camera || !this.currentPosition || !this.currentLookAt) return;
        
        // Apply shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;
            const factor = this.shakeTimer / this.shakeTime;
            const intensity = this.shakeIntensity * factor;
            
            this.currentPosition.x += (Math.random() - 0.5) * intensity;
            this.currentPosition.y += (Math.random() - 0.5) * intensity * 0.5;
            this.currentPosition.z += (Math.random() - 0.5) * intensity;
        }
        
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }

    setDistance(dist) {
        this.chaseDistance = MathUtils.clamp(dist, MIN_CHASE_DISTANCE, MAX_CHASE_DISTANCE);
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity || 0.5;
        this.shakeTime = duration || 0.3;
        this.shakeTimer = this.shakeTime;
    }

    getForwardVector() {
        return this.getTargetForward();
    }

    getRightVector() {
        const forward = this.getForwardVector();
        return new THREE.Vector3(-forward.z, 0, forward.x);
    }
}

window.CameraController = CameraController;