// Traffic car - AI driven on waypoints
const WAYPOINT_THRESHOLD = 8;
const STUCK_THRESHOLD = 0.1;
const STUCK_TIME_LIMIT = 3;
const DRIVE_STYLE_MIN = 0.7;
const DRIVE_STYLE_MAX = 1.3;
const FRONT_SENSOR_RANGE = 15;
const SIDE_SENSOR_OFFSET = 1.5;
const SIDE_SENSOR_RANGE = 15;
const RANDOM_BEHAVIOR_CHANCE = 0.001;
const FLEE_SPEED_MULT = 1.5;

class TrafficCar extends Car {
    constructor(game, options = {}) {
        super(game, options);
        
        this.waypoints = options.waypoints || [];
        this.currentWaypoint = 0;
        this.targetWaypoint = null;
        this.waypointThreshold = WAYPOINT_THRESHOLD;
        this.driveStyle = MathUtils.random(DRIVE_STYLE_MIN, DRIVE_STYLE_MAX); // Aggressive to cautious
        this.maxSpeed *= this.driveStyle;
        this.acceleration *= this.driveStyle;
        this.brakeForce *= this.driveStyle;
        
        // AI state
        this.state = 'follow'; // follow, stop, avoid, stuck
        this.stuckTimer = 0;
        this.lastPosition = new THREE.Vector3();
        this.stopTimer = 0;
        this.laneOffset = MathUtils.choice([-1.5, 0, 1.5]); // Lane position
        
        // Sensors
        this.frontRaycaster = new THREE.Raycaster();
        this.sideRaycasters = [new THREE.Raycaster(), new THREE.Raycaster()];
    }

    init() {
        super.init();
        this.findNextWaypoint();
    }

    findNextWaypoint() {
        if (this.waypoints.length === 0) return;
        
        let closest = null;
        let closestDist = Infinity;
        
        for (let i = 0; i < this.waypoints.length; i++) {
            const dist = this.position.distanceTo(this.waypoints[i].position);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        }
        
        this.currentWaypoint = closest;
        this.targetWaypoint = this.waypoints[this.currentWaypoint];
    }

    update(delta) {
        if (this.health <= 0) return;
        
        this.updateAI(delta);
        super.update(delta);
    }

    updateAI(delta) {
        if (!this.targetWaypoint || this.waypoints.length === 0) {
            this.input = { accelerate: 0, brake: 1, steer: 0, handbrake: false };
            return;
        }
        
        // Check if reached waypoint
        const distToTarget = this.position.distanceTo(this.targetWaypoint.position);
        
        if (distToTarget < this.waypointThreshold) {
            this.advanceWaypoint();
        }
        
        // Sensors
        this.updateSensors();
        
        // Calculate steering to target
        const toTarget = this.targetWaypoint.position.clone().sub(this.position);
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
        
        const forwardDot = toTarget.dot(forward);
        const rightDot = toTarget.dot(right);
        
        // Steering
        let steer = 0;
        if (forwardDot > 0) {
            steer = MathUtils.clamp(rightDot / 10, -1, 1);
        } else {
            // Target behind us - turn around
            steer = rightDot > 0 ? 1 : -1;
        }
        
        // Obstacle avoidance
        if (this.frontHit && this.frontHit.distance < FRONT_SENSOR_RANGE) {
            // Brake and steer around
            this.input.brake = 0.8;
            this.input.accelerate = 0;
            
            if (this.sideHits[0] && this.sideHits[0].distance > this.sideHits[1].distance) {
                steer += 0.5; // Steer left
            } else if (this.sideHits[1]) {
                steer -= 0.5; // Steer right
            }
        } else {
            // Normal driving
            const targetSpeed = this.maxSpeed * 0.8;
            if (this.speed < targetSpeed) {
                this.input.accelerate = 0.7;
                this.input.brake = 0;
            } else {
                this.input.accelerate = 0;
                this.input.brake = 0.1;
            }
        }
        
        this.input.steer = MathUtils.clamp(steer, -1, 1);
        this.input.handbrake = false;
        
        // Stuck detection
        const moved = this.position.distanceTo(this.lastPosition);
        if (moved < STUCK_THRESHOLD && this.speed > 1) {
            this.stuckTimer += delta;
            if (this.stuckTimer > STUCK_TIME_LIMIT) {
                this.handleStuck();
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition.copy(this.position);
        
        // Random behavior
        if (Math.random() < RANDOM_BEHAVIOR_CHANCE) {
            this.driveStyle = MathUtils.random(DRIVE_STYLE_MIN, DRIVE_STYLE_MAX);
        }
    }

    updateSensors() {
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
        const origin = this.position.clone().add(new THREE.Vector3(0, 0.5, 2));
        
        // Front sensor
        this.frontRaycaster.set(origin, forward);
        const frontHits = this.frontRaycaster.intersectObjects(this.game.world.collisionMeshes, true);
        this.frontHit = frontHits.length > 0 ? frontHits[0] : null;
        
        // Side sensors
        this.sideHits = [null, null];
        for (let i = 0; i < 2; i++) {
            const dir = right.clone().multiplyScalar(i === 0 ? -1 : 1);
            const sideOrigin = origin.clone().addScaledVector(dir, SIDE_SENSOR_OFFSET);
            this.sideRaycasters[i].set(sideOrigin, forward);
            const hits = this.sideRaycasters[i].intersectObjects(this.game.world.collisionMeshes, true);
            this.sideHits[i] = hits.length > 0 ? hits[0] : null;
        }
    }

    advanceWaypoint() {
        // Find connected waypoint
        if (this.targetWaypoint.connections && this.targetWaypoint.connections.length > 0) {
            const next = MathUtils.choice(this.targetWaypoint.connections);
            // Find index of this waypoint
            for (let i = 0; i < this.waypoints.length; i++) {
                if (this.waypoints[i].position.distanceTo(next.position) < 1) {
                    this.currentWaypoint = i;
                    this.targetWaypoint = this.waypoints[i];
                    break;
                }
            }
        } else {
            // Just go to next in list (loop)
            this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
            this.targetWaypoint = this.waypoints[this.currentWaypoint];
        }
    }

    handleStuck() {
        // Reverse and turn
        this.input.accelerate = 0;
        this.input.brake = 1;
        this.input.steer = Math.random() < 0.5 ? 1 : -1;
        this.input.handbrake = true;
        this.stuckTimer = 0;
    }

    takeDamage(amount, hitPoint = null) {
        super.takeDamage(amount, hitPoint);
        
        // Flee behavior when damaged
        if (this.health < this.maxHealth * 0.5) {
            this.maxSpeed *= FLEE_SPEED_MULT;
            this.driveStyle = 1.5;
        }
    }
}

window.TrafficCar = TrafficCar;