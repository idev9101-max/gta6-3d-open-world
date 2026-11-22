// City generator - coordinates all world generation
const CITY_SIZE = 60;
const BLOCK_SIZE = 20;
const PARKING_SPOT_OFFSET = 3;
const PARKING_CHANCE = 0.6;
const PARKING_Z_VARIANCE = 1/3;
const PEDESTRIAN_SPAWN_COUNT = 200;
const CROSS_TOWN_ROUTES = 8;
const CROSS_TOWN_RADIUS_FACTOR = 0.4;
const GROUND_EXTRA_SIZE = 100;
const GROUND_COLOR = 0x445533;

class CityGenerator {
    constructor(game) {
        this.game = game;
        this.roadNetwork = null;
        this.buildingInstancer = null;
        this.ocean = null;
        this.parkedCarSpots = [];
        this.pedestrianSpawnPoints = [];
        this.trafficWaypoints = [];
        this.missionMarkers = [];
    }

    async generate() {
        console.log('Generating city...');
        
        // 1. Roads
        this.roadNetwork = new RoadNetwork(CITY_SIZE, BLOCK_SIZE);
        this.roadNetwork.generate();
        this.addRoadMeshesToScene();
        
        // 2. Buildings (instanced for performance)
        this.buildingInstancer = new BuildingInstancer(this.game);
        this.buildingInstancer.generate(this.roadNetwork);
        
        // 3. Ocean
        this.ocean = new Ocean(CITY_SIZE, BLOCK_SIZE);
        this.ocean.init();
        this.game.scene.add(this.ocean.getMesh());
        
        // Create ground plane
        this.createGroundPlane();
        
        // 4. Generate spawn points
        this.generateSpawnPoints();
        
        // 5. Create traffic waypoints from roads
        this.generateTrafficWaypoints();
        
        // 6. Foam particles
        this.foamParticles = this.ocean.createFoamParticles(this.game.scene);
        
        console.log('City generation complete');
        return this;
    }

    addRoadMeshesToScene() {
        const meshes = this.roadNetwork.getRoadMeshes();
        meshes.forEach(m => this.game.scene.add(m));
    }

    addBuildingMeshesToScene() {
        // Buildings are added directly by BuildingInstancer
    }

    generateSpawnPoints() {
        const blockSize = this.roadNetwork.blockSize;
        const citySize = this.roadNetwork.citySize;
        
        // Parked car spots - along roads
        for (let gx = 0; gx < citySize; gx++) {
            for (let gz = 0; gz < citySize; gz++) {
                const wx = (gx - citySize/2) * blockSize;
                const wz = (gz - citySize/2) * blockSize;
                
                // Parking spots on each side of block
                const spots = [
                    { x: wx - blockSize/2 + PARKING_SPOT_OFFSET, z: wz + MathUtils.random(-blockSize * PARKING_Z_VARIANCE, blockSize * PARKING_Z_VARIANCE), rot: Math.PI/2 },
                    { x: wx + blockSize/2 - PARKING_SPOT_OFFSET, z: wz + MathUtils.random(-blockSize * PARKING_Z_VARIANCE, blockSize * PARKING_Z_VARIANCE), rot: -Math.PI/2 },
                    { x: wx + MathUtils.random(-blockSize * PARKING_Z_VARIANCE, blockSize * PARKING_Z_VARIANCE), z: wz - blockSize/2 + PARKING_SPOT_OFFSET, rot: 0 },
                    { x: wx + MathUtils.random(-blockSize * PARKING_Z_VARIANCE, blockSize * PARKING_Z_VARIANCE), z: wz + blockSize/2 - PARKING_SPOT_OFFSET, rot: Math.PI }
                ];
                
                spots.forEach(s => {
                    if (Math.random() < PARKING_CHANCE) { // 60% chance per spot
                        this.parkedCarSpots.push({
                            position: new THREE.Vector3(s.x, 0.5, s.z),
                            rotation: s.rot
                        });
                    }
                });
            }
        }
        
        // Pedestrian spawn points - on sidewalks
        for (let i = 0; i < PEDESTRIAN_SPAWN_COUNT; i++) {
            const pos = this.roadNetwork.getRandomSidewalkPosition();
            this.pedestrianSpawnPoints.push(pos.clone());
        }
        
        // Mission markers at landmarks (if any exist)
        const landmarks = this.buildingInstancer?.landmarks || [];
        landmarks.forEach((lm, idx) => {
            const pos = lm.position.clone();
            pos.y = 1;
            this.missionMarkers.push({
                position: pos,
                landmarkIndex: idx
            });
        });
    }

    generateTrafficWaypoints() {
        // Use road network waypoints
        const roads = this.roadNetwork.roads;
        roads.forEach(road => {
            if (road.waypoints) {
                road.waypoints.forEach(wp => {
                    this.trafficWaypoints.push({
                        position: wp.position.clone(),
                        direction: wp.direction.clone(),
                        connections: wp.connections || []
                    });
                });
            }
        });
        
        // If no waypoints generated, create simple ones
        if (this.trafficWaypoints.length === 0) {
            this.createSimpleWaypoints();
        }
    }

    createSimpleWaypoints() {
        const blockSize = this.roadNetwork.blockSize;
        const citySize = this.roadNetwork.citySize;
        
        // Loop around city perimeter
        const perimeter = [];
        for (let gx = 0; gx < citySize; gx++) {
            const x = (gx - citySize/2) * blockSize;
            perimeter.push(new THREE.Vector3(x, 0.5, -citySize/2 * blockSize));
        }
        for (let gz = 0; gz < citySize; gz++) {
            const z = (gz - citySize/2) * blockSize;
            perimeter.push(new THREE.Vector3(citySize/2 * blockSize, 0.5, z));
        }
        for (let gx = citySize - 1; gx >= 0; gx--) {
            const x = (gx - citySize/2) * blockSize;
            perimeter.push(new THREE.Vector3(x, 0.5, citySize/2 * blockSize));
        }
        for (let gz = citySize - 1; gz >= 0; gz--) {
            const z = (gz - citySize/2) * blockSize;
            perimeter.push(new THREE.Vector3(-citySize/2 * blockSize, 0.5, z));
        }
        
        // Connect into loop
        for (let i = 0; i < perimeter.length; i++) {
            const next = (i + 1) % perimeter.length;
            this.trafficWaypoints.push({
                position: perimeter[i],
                direction: perimeter[next].clone().sub(perimeter[i]).normalize(),
                connections: [{ position: perimeter[next] }]
            });
        }
        
        // Add some cross-town routes
        const center = new THREE.Vector3(0, 0.5, 0);
        for (let i = 0; i < CROSS_TOWN_ROUTES; i++) {
            const angle = (i / CROSS_TOWN_ROUTES) * Math.PI * 2;
            const pos = new THREE.Vector3(Math.cos(angle) * citySize * blockSize * CROSS_TOWN_RADIUS_FACTOR, 0.5, Math.sin(angle) * citySize * blockSize * CROSS_TOWN_RADIUS_FACTOR);
            this.trafficWaypoints.push({
                position: pos,
                direction: center.clone().sub(pos).normalize(),
                connections: [{ position: center }]
            });
        }
    }

    getRandomParkedCarSpot() {
        return MathUtils.choice(this.parkedCarSpots);
    }

    getRandomPedestrianSpawn() {
        return MathUtils.choice(this.pedestrianSpawnPoints).clone();
    }

    getCityCenterRoadPosition() {
        // Use the actual building cluster center from BuildingInstancer
        const clusterCenter = this.buildingInstancer.getBuildingClusterCenter();
        const blockSize = this.roadNetwork.blockSize;
        
        // Snap to nearest road intersection
        const gx = Math.round(clusterCenter.x / blockSize);
        const gz = Math.round(clusterCenter.z / blockSize);
        
        const centerX = gx * blockSize;
        const centerZ = gz * blockSize;
        
        // Pick a random road near center - horizontal or vertical
        const isHorizontal = Math.random() < 0.5;
        const offset = MathUtils.random(-blockSize/2, blockSize/2);
        
        if (isHorizontal) {
            // On horizontal road (z = centerZ)
            return new THREE.Vector3(centerX + offset, 0.5, centerZ);
        } else {
            // On vertical road (x = centerX)
            return new THREE.Vector3(centerX, 0.5, centerZ + offset);
        }
    }

    getRandomPedestrianSpawn() {
        return MathUtils.choice(this.pedestrianSpawnPoints).clone();
    }

    getTrafficWaypoints() {
        return this.trafficWaypoints;
    }

    getMissionMarkers() {
        return this.missionMarkers;
    }

    getCollisionObjects() {
        return this.buildingInstancer.getCollisionObjects();
    }

    getCollisionMeshes() {
        const roadMeshes = this.roadNetwork.getRoadMeshes();
        return this.buildingInstancer.getCollisionMeshes(roadMeshes, this.groundMesh);
    }

    createGroundPlane() {
        const halfSize = this.roadNetwork.citySize * this.roadNetwork.blockSize / 2;
        const groundSize = halfSize * 2 + GROUND_EXTRA_SIZE;
        
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1);
        const groundMat = new THREE.MeshBasicMaterial({ 
            color: GROUND_COLOR, 
            side: THREE.DoubleSide,
            depthWrite: true
        });
        
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.position.y = 0;
        this.groundMesh.receiveShadow = true;
        this.groundMesh.name = 'cityGround';
        
        this.game.scene.add(this.groundMesh);
    }

    update(delta) {
        if (this.ocean) this.ocean.update(delta);
        if (this.foamParticles) this.ocean.updateFoam(this.foamParticles, delta);
    }
}

window.CityGenerator = CityGenerator;