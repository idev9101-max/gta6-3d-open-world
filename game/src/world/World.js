// SOLMAR NIGHTS: city simulation — entity spawning, traffic/pedestrians, wanted AI.
/**
 * World - owns and manages the city simulation: road network, buildings,
 * traffic, parked cars, pedestrians, police, day/night time of day, weather,
 * collision bounds and entity spawning/despawning. Entities live in vehicle
 * and pedestrian lists and are culled when their mesh leaves the scene.
 */
const MAX_INITIAL_PARKED_CARS = 40;
const TARGET_TRAFFIC_CARS = 15;
const TARGET_PEDESTRIANS = 40;

class World {
    constructor(game) {
        this.game = game;
        this.cityGenerator = null;
        this.vehicles = [];
        this.trafficCars = [];
        this.parkedCars = [];
        this.pedestrians = [];
        this.policeCars = [];
        this.policePeds = [];
        this.collisionBounds = []; // Box3 for distance checks
        this.collisionMeshes = []; // Object3D for raycasting
        this.timeOfDay = 0.25; // 0-1, 0.25 = morning
        this.sunAngle = 0;
        this.weather = 'clear';
    }

    async init() {
        this.cityGenerator = new CityGenerator(this.game);
        await this.cityGenerator.generate();
        this.collisionBounds = this.cityGenerator.getCollisionObjects();
        this.collisionMeshes = this.cityGenerator.getCollisionMeshes();
        this.game.cameraController.setCollidableObjects(this.collisionMeshes);
        
        // Spawn initial parked cars
        this.spawnInitialParkedCars();
        
        // Spawn initial traffic
        this.spawnInitialTraffic();
        
        // Spawn initial pedestrians
        this.spawnInitialPedestrians();
        
        return this;
    }

    spawnInitialParkedCars() {
        const spots = this.cityGenerator.parkedCarSpots;
        const count = Math.min(spots.length, MAX_INITIAL_PARKED_CARS);
        
        for (let i = 0; i < count; i++) {
            const spot = spots[i];
            if (Math.random() < 0.7) {
                this.spawnParkedCar(spot.position, spot.rotation);
            }
        }
    }

    spawnInitialTraffic() {
        const waypoints = this.cityGenerator.getTrafficWaypoints();
        if (waypoints.length === 0) return;
        
        const count = TARGET_TRAFFIC_CARS;
        for (let i = 0; i < count; i++) {
            const wp = waypoints[Math.floor(Math.random() * waypoints.length)];
            this.spawnTrafficCar(wp.position, wp.direction);
        }
    }

    spawnInitialPedestrians() {
        const spawns = this.cityGenerator.pedestrianSpawnPoints;
        const count = Math.min(spawns.length, 50);
        
        for (let i = 0; i < count; i++) {
            const pos = spawns[i].clone();
            pos.y = 1;
            this.spawnPedestrian(pos);
        }
    }

    spawnParkedCar(position, rotation) {
        const car = new Car(this.game, { 
            position: position.clone(), 
            rotation: rotation || 0,
            isParked: true,
            isPlayerVehicle: false
        });
        car.init();
        this.parkedCars.push(car);
        this.vehicles.push(car);
        this.game.scene.add(car.mesh);
        return car;
    }

    spawnTrafficCar(position, direction) {
        const car = new TrafficCar(this.game, { 
            position: position.clone(), 
            direction: direction.clone(),
            waypoints: this.cityGenerator.getTrafficWaypoints()
        });
        car.init();
        this.trafficCars.push(car);
        this.vehicles.push(car);
        this.game.scene.add(car.mesh);
        return car;
    }

    spawnPedestrian(position, rotation) {
        const ped = new Pedestrian(this.game, { 
            position: position.clone(), 
            rotation: rotation || Math.random() * Math.PI * 2
        });
        ped.init();
        this.pedestrians.push(ped);
        this.game.scene.add(ped.mesh);
        return ped;
    }

    spawnPoliceCar(position, rotation) {
        const car = new PoliceCar(this.game, { 
            position: position.clone(), 
            rotation: rotation || 0
        });
        car.init();
        this.policeCars.push(car);
        this.vehicles.push(car);
        this.game.scene.add(car.mesh);
        return car;
    }

    spawnPolicePed(position, rotation) {
        const ped = new PolicePed(this.game, { 
            position: position.clone(), 
            rotation: rotation || Math.random() * Math.PI * 2
        });
        ped.init();
        this.policePeds.push(ped);
        this.game.scene.add(ped.mesh);
        return ped;
    }

    spawnPoliceNearPlayer() {
        const playerPos = this.game.player.mesh.position;
        const spawnRadius = 60;
        
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * spawnRadius;
            const pos = new THREE.Vector3(
                playerPos.x + Math.cos(angle) * dist,
                0.5,
                playerPos.z + Math.sin(angle) * dist
            );
            
            // Try to snap to road
            const roadPos = this.cityGenerator.roadNetwork.getNearestRoadPosition(pos);
            if (roadPos) {
                pos.copy(roadPos);
                pos.y = 0.5;
            }
            
            if (Math.random() < 0.6) {
                this.spawnPoliceCar(pos);
            } else {
                this.spawnPolicePed(pos);
            }
        }
    }

    getNearestVehicle(position, maxDist = 10) {
        let nearest = null;
        let nearestDist = maxDist;
        
        for (const car of this.vehicles) {
            if (car.isPlayerVehicle) continue;
            const dist = car.mesh.position.distanceTo(position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = car;
            }
        }
        return nearest;
    }

    getVehicleById(id) {
        for (const car of this.vehicles) {
            if (car.id === id) return car;
        }
        return null;
    }

    updateLighting() {
        // Day/night cycle
        const time = this.timeOfDay || 0.25;
        this.sunAngle = time * Math.PI * 2 - Math.PI / 2;
        
        // Sun position
        const sunHeight = Math.sin(this.sunAngle);
        const sunAzimuth = time * Math.PI * 2;
        
        this.game.sunLight.position.set(
            Math.cos(sunAzimuth) * 200 * Math.cos(this.sunAngle),
            200 * sunHeight,
            Math.sin(sunAzimuth) * 200 * Math.cos(this.sunAngle)
        );
        
        // Sun intensity and color
        let sunIntensity, sunColor, ambientIntensity, hemiSkyColor, hemiGroundColor, fogColor, fogDensity;
        
        if (sunHeight > 0.3) { // Day
            sunIntensity = 1.2;
            sunColor = 0xffffee;
            ambientIntensity = 0.4;
            hemiSkyColor = 0x87ceeb;
            hemiGroundColor = 0x224422;
            fogColor = 0x87ceeb;
            fogDensity = 0.002;
        } else if (sunHeight > -0.2) { // Dawn/Dusk
            const factor = MathUtils.safeLerpFactor(sunHeight, -0.2, 0.3);
            sunIntensity = 0.3 + factor * 0.9;
            sunColor = new THREE.Color().lerpColors(new THREE.Color(0xff6600), new THREE.Color(0xffffee), factor);
            ambientIntensity = 0.2 + factor * 0.2;
            hemiSkyColor = new THREE.Color().lerpColors(new THREE.Color(0x331122), new THREE.Color(0x87ceeb), factor);
            hemiGroundColor = new THREE.Color().lerpColors(new THREE.Color(0x111122), new THREE.Color(0x224422), factor);
            fogColor = new THREE.Color().lerpColors(new THREE.Color(0x331122), new THREE.Color(0x87ceeb), factor);
            fogDensity = 0.003;
        } else { // Night
            sunIntensity = 0.05;
            sunColor = 0x444466;
            ambientIntensity = 0.1;
            hemiSkyColor = 0x000022;
            hemiGroundColor = 0x001111;
            fogColor = 0x000011;
            fogDensity = 0.004;
        }
        
        this.game.sunLight.intensity = sunIntensity;
        this.game.sunLight.color.set(sunColor);
        this.game.ambientLight.intensity = ambientIntensity;
        this.game.hemiLight.color.set(hemiSkyColor);
        this.game.hemiLight.groundColor.set(hemiGroundColor);
        this.game.scene.fog.color.set(fogColor);
        this.game.scene.fog.density = fogDensity;
        
        // Update renderer tone mapping exposure for night
        this.game.renderer.toneMappingExposure = sunHeight > 0 ? 1.0 : 0.7 + sunHeight * 0.5;
        
        // Update building window lights
        this.updateBuildingLights(sunHeight < 0);
        
        // Update street lights
        this.updateStreetLights(sunHeight < 0);
    }

    updateBuildingLights(night) {
        // Windows are already emissive, just adjust intensity
        // This would iterate through building windows in a real implementation
    }

    updateStreetLights(night) {
        // Street lights would be managed here
    }

    update(delta) {
        // Update all entities
        for (const car of this.vehicles) {
            if (car.mesh && car.mesh.parent) car.update(delta);
        }
        
        // Remove dead vehicles
        this.vehicles = this.vehicles.filter(c => c.mesh && c.mesh.parent && c.health > 0);
        this.trafficCars = this.trafficCars.filter(c => c.mesh && c.mesh.parent && c.health > 0);
        this.parkedCars = this.parkedCars.filter(c => c.mesh && c.mesh.parent && c.health > 0);
        this.policeCars = this.policeCars.filter(c => c.mesh && c.mesh.parent && c.health > 0);
        
        // Update pedestrians
        for (const ped of this.pedestrians) {
            if (ped.mesh && ped.mesh.parent) ped.update(delta);
        }
        this.pedestrians = this.pedestrians.filter(p => p.mesh && p.mesh.parent && p.health > 0);
        
        // Update police
        for (const ped of this.policePeds) {
            if (ped.mesh && ped.mesh.parent) ped.update(delta);
        }
        this.policePeds = this.policePeds.filter(p => p.mesh && p.mesh.parent && p.health > 0);
        
        // Maintain traffic density
        this.maintainTrafficDensity();
        
        // Maintain pedestrian density
        this.maintainPedestrianDensity();
        
        // Update city generator (ocean, foam)
        this.cityGenerator.update(delta);
    }

    maintainTrafficDensity() {
        const targetCount = TARGET_TRAFFIC_CARS;
        if (this.trafficCars.length < targetCount && Math.random() < 0.01) {
            const waypoints = this.cityGenerator.getTrafficWaypoints();
            if (waypoints.length > 0) {
                const wp = MathUtils.choice(waypoints);
                // Spawn away from player
                const playerPos = this.game.player.mesh.position;
                if (wp.position.distanceTo(playerPos) > 80) {
                    this.spawnTrafficCar(wp.position, wp.direction);
                }
            }
        }
    }

    maintainPedestrianDensity() {
        const targetCount = TARGET_PEDESTRIANS;
        if (this.pedestrians.length < targetCount && Math.random() < 0.02) {
            const spawns = this.cityGenerator.pedestrianSpawnPoints;
            if (spawns.length > 0) {
                const pos = MathUtils.choice(spawns).clone();
                pos.y = 1;
                const playerPos = this.game.player.mesh.position;
                if (pos.distanceTo(playerPos) > 50) {
                    this.spawnPedestrian(pos);
                }
            }
        }
    }

    reset() {
        // Remove all entities
        [...this.vehicles, ...this.pedestrians, ...this.policePeds].forEach(e => {
            if (e.mesh && e.mesh.parent) {
                e.mesh.parent.remove(e.mesh);
                e.dispose();
            }
        });
        
        this.vehicles = [];
        this.trafficCars = [];
        this.parkedCars = [];
        this.pedestrians = [];
        this.policeCars = [];
        this.policePeds = [];
        
        // Respawn
        this.spawnInitialParkedCars();
        this.spawnInitialTraffic();
        this.spawnInitialPedestrians();
    }

    checkCollision(position, radius, ignore = null) {
        // Check against buildings
        for (const bounds of this.collisionBounds) {
            if (bounds === ignore) continue;
            const dist = bounds.distanceToPoint(position);
            if (dist < radius) return true;
        }
        return false;
    }

    getGroundHeight(x, z) {
        // Ocean height
        if (this.cityGenerator.ocean) {
            const oceanHeight = this.cityGenerator.ocean.getHeightAt(x, z);
            const halfSize = this.cityGenerator.roadNetwork.citySize * this.cityGenerator.roadNetwork.blockSize / 2;
            if (z > halfSize * 0.7) return oceanHeight;
        }
        return 0;
    }
}

window.World = World;