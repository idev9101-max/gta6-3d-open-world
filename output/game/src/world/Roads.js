// Road system - procedural grid with mesh generation
class RoadNetwork {
    constructor(citySize = 60, blockSize = 20) {
        this.citySize = citySize;
        this.blockSize = blockSize;
        this.roadWidth = 8;
        this.sidewalkWidth = 2;
        this.grid = [];
        this.intersections = [];
        this.roadMeshes = [];
        this.sidewalkMeshes = [];
        this.blockCenters = [];
        this.roads = []; // Road data for traffic waypoints
    }

    generate() {
        const halfSize = this.citySize * this.blockSize / 2;
        
        // Create grid of blocks
        for (let gx = 0; gx < this.citySize; gx++) {
            this.grid[gx] = [];
            for (let gz = 0; gz < this.citySize; gz++) {
                const wx = (gx - this.citySize / 2) * this.blockSize;
                const wz = (gz - this.citySize / 2) * this.blockSize;
                this.grid[gx][gz] = {
                    x: gx, z: gz,
                    worldX: wx, worldZ: wz,
                    building: null,
                    hasBuilding: Math.random() < 0.7
                };
                this.blockCenters.push(new THREE.Vector3(wx, 0, wz));
            }
        }
        
        // Generate road geometry and road data
        this.generateRoadGeometry();
        
        return this;
    }

    generateRoadGeometry() {
        const halfSize = this.citySize * this.blockSize / 2;
        const totalWidth = this.roadWidth + this.sidewalkWidth * 2;
        
        // Create road material
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const sidewalkMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const lineMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.0,
            emissive: 0xffffaa,
            emissiveIntensity: 0.3
        });

        // Horizontal roads (along X axis)
        for (let gz = 0; gz <= this.citySize; gz++) {
            const z = (gz - this.citySize / 2) * this.blockSize;
            
            // Road data for waypoints
            const halfSize = this.citySize * this.blockSize / 2;
            const start = new THREE.Vector3(-halfSize, 0, z);
            const end = new THREE.Vector3(halfSize, 0, z);
            const direction = new THREE.Vector3(1, 0, 0);
            const length = this.citySize * this.blockSize;
            
            this.roads.push({
                start: start,
                end: end,
                direction: direction,
                length: length,
                type: 'horizontal',
                lanes: 2,
                waypoints: []
            });
            
            // Road
            const roadGeo = new THREE.BoxGeometry(this.citySize * this.blockSize, 0.15, this.roadWidth);
            const roadMesh = new THREE.Mesh(roadGeo, roadMat);
            roadMesh.position.set(0, 0.05, z);
            roadMesh.receiveShadow = true;
            this.roadMeshes.push(roadMesh);
            
            // Sidewalks
            const swGeo = new THREE.BoxGeometry(this.citySize * this.blockSize, 0.1, this.sidewalkWidth);
            const swNorth = new THREE.Mesh(swGeo, sidewalkMat);
            swNorth.position.set(0, 0.1, z - this.roadWidth/2 - this.sidewalkWidth/2);
            swNorth.receiveShadow = true;
            this.sidewalkMeshes.push(swNorth);
            
            const swSouth = new THREE.Mesh(swGeo, sidewalkMat);
            swSouth.position.set(0, 0.1, z + this.roadWidth/2 + this.sidewalkWidth/2);
            swSouth.receiveShadow = true;
            this.sidewalkMeshes.push(swSouth);
            
            // Center line (dashed)
            if (gz < this.citySize) {
                for (let gx = 0; gx < this.citySize; gx++) {
                    const x = (gx - this.citySize / 2) * this.blockSize;
                    const lineGeo = new THREE.BoxGeometry(this.blockSize * 0.6, 0.16, 0.3);
                    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
                    lineMesh.position.set(x, 0.17, z);
                    this.roadMeshes.push(lineMesh);
                }
            }
        }
        
        // Vertical roads (along Z axis)
        for (let gx = 0; gx <= this.citySize; gx++) {
            const x = (gx - this.citySize / 2) * this.blockSize;
            
            // Road data for waypoints
            const halfSize = this.citySize * this.blockSize / 2;
            const start = new THREE.Vector3(x, 0, -halfSize);
            const end = new THREE.Vector3(x, 0, halfSize);
            const direction = new THREE.Vector3(0, 0, 1);
            const length = this.citySize * this.blockSize;
            
            this.roads.push({
                start: start,
                end: end,
                direction: direction,
                length: length,
                type: 'vertical',
                lanes: 2,
                waypoints: []
            });
            
            // Road
            const roadGeo = new THREE.BoxGeometry(this.roadWidth, 0.15, this.citySize * this.blockSize);
            const roadMesh = new THREE.Mesh(roadGeo, roadMat);
            roadMesh.position.set(x, 0.05, 0);
            roadMesh.receiveShadow = true;
            this.roadMeshes.push(roadMesh);
            
            // Sidewalks
            const swGeo = new THREE.BoxGeometry(this.sidewalkWidth, 0.1, this.citySize * this.blockSize);
            const swWest = new THREE.Mesh(swGeo, sidewalkMat);
            swWest.position.set(x - this.roadWidth/2 - this.sidewalkWidth/2, 0.1, 0);
            swWest.receiveShadow = true;
            this.sidewalkMeshes.push(swWest);
            
            const swEast = new THREE.Mesh(swGeo, sidewalkMat);
            swEast.position.set(x + this.roadWidth/2 + this.sidewalkWidth/2, 0.1, 0);
            swEast.receiveShadow = true;
            this.sidewalkMeshes.push(swEast);
            
            // Center line
            if (gx < this.citySize) {
                for (let gz = 0; gz < this.citySize; gz++) {
                    const z = (gz - this.citySize / 2) * this.blockSize;
                    const lineGeo = new THREE.BoxGeometry(0.3, 0.16, this.blockSize * 0.6);
                    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
                    lineMesh.position.set(x, 0.17, z);
                    this.roadMeshes.push(lineMesh);
                }
            }
        }
        
        // Intersections - roundabouts or just flat
        for (let gx = 0; gx <= this.citySize; gx++) {
            for (let gz = 0; gz <= this.citySize; gz++) {
                const x = (gx - this.citySize / 2) * this.blockSize;
                const z = (gz - this.citySize / 2) * this.blockSize;
                this.intersections.push({ x, z, gx, gz });
            }
        }
        
        // Generate waypoints for traffic
        this.generateWaypoints();
    }
    
    generateWaypoints() {
        const laneOffset = this.roadWidth / 4; // Offset for lanes
        
        for (const road of this.roads) {
            const numPoints = Math.ceil(road.length / 20);
            const perp = new THREE.Vector3(-road.direction.z, 0, road.direction.x);
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const pos = road.start.clone().lerp(road.end, t);
                
                // Two lanes per direction
                // Forward lane
                road.waypoints.push({
                    position: pos.clone().add(perp.clone().multiplyScalar(laneOffset)),
                    direction: road.direction.clone(),
                    road: road,
                    lane: 0
                });
                
                // Backward lane
                road.waypoints.push({
                    position: pos.clone().add(perp.clone().multiplyScalar(-laneOffset)),
                    direction: road.direction.clone().multiplyScalar(-1),
                    road: road,
                    lane: 1
                });
            }
        }
        
        // Connect waypoints at intersections
        this.connectWaypointsAtIntersections();
    }
    
    connectWaypointsAtIntersections() {
        for (const intersection of this.intersections) {
            const nearbyWaypoints = [];
            
            for (const road of this.roads) {
                for (const wp of road.waypoints) {
                    if (wp.position.distanceTo(new THREE.Vector3(intersection.x, 0, intersection.z)) < 15) {
                        nearbyWaypoints.push(wp);
                    }
                }
            }
            
            // Connect crossing waypoints
            for (const wp1 of nearbyWaypoints) {
                for (const wp2 of nearbyWaypoints) {
                    if (wp1.road !== wp2.road && wp1.position.distanceTo(wp2.position) < 20) {
                        if (!wp1.connections) wp1.connections = [];
                        wp1.connections.push(wp2);
                    }
                }
            }
        }
    }

    getRoadMeshes() {
        return [...this.roadMeshes, ...this.sidewalkMeshes];
    }

    getIntersections() {
        return this.intersections;
    }

    getBlockCenters() {
        return this.blockCenters;
    }

    isOnRoad(position) {
        const halfRoad = this.roadWidth / 2;
        const gx = Math.floor((position.x + this.citySize * this.blockSize / 2) / this.blockSize);
        const gz = Math.floor((position.z + this.citySize * this.blockSize / 2) / this.blockSize);
        
        // Check if near horizontal road
        const nearestHRoadZ = Math.round(position.z / this.blockSize) * this.blockSize;
        if (Math.abs(position.z - nearestHRoadZ) < halfRoad + this.sidewalkWidth) return true;
        
        // Check if near vertical road
        const nearestVRoadX = Math.round(position.x / this.blockSize) * this.blockSize;
        if (Math.abs(position.x - nearestVRoadX) < halfRoad + this.sidewalkWidth) return true;
        
        return false;
    }

    isOnSidewalk(position) {
        const halfRoad = this.roadWidth / 2;
        const sidewalkOuter = halfRoad + this.sidewalkWidth;
        
        // Check horizontal sidewalks
        const nearestHRoadZ = Math.round(position.z / this.blockSize) * this.blockSize;
        const distH = Math.abs(position.z - nearestHRoadZ);
        if (distH > halfRoad && distH < sidewalkOuter) return true;
        
        // Check vertical sidewalks
        const nearestVRoadX = Math.round(position.x / this.blockSize) * this.blockSize;
        const distV = Math.abs(position.x - nearestVRoadX);
        if (distV > halfRoad && distV < sidewalkOuter) return true;
        
        return false;
    }

    getNearestRoadPosition(position) {
        const halfRoad = this.roadWidth / 2;
        
        // Find nearest horizontal road
        const nearestHRoadZ = Math.round(position.z / this.blockSize) * this.blockSize;
        const distH = Math.abs(position.z - nearestHRoadZ);
        
        // Find nearest vertical road
        const nearestVRoadX = Math.round(position.x / this.blockSize) * this.blockSize;
        const distV = Math.abs(position.x - nearestVRoadX);
        
        if (distH < distV) {
            return new THREE.Vector3(position.x, 0.2, MathUtils.clamp(position.z, nearestHRoadZ - halfRoad, nearestHRoadZ + halfRoad));
        } else {
            return new THREE.Vector3(MathUtils.clamp(position.x, nearestVRoadX - halfRoad, nearestVRoadX + halfRoad), 0.2, position.z);
        }
    }

    getRoadAt(position) {
        const halfRoad = this.roadWidth / 2;
        
        // Check horizontal roads
        const nearestHRoadZ = Math.round(position.z / this.blockSize) * this.blockSize;
        if (Math.abs(position.z - nearestHRoadZ) < halfRoad) {
            return { direction: new THREE.Vector3(1, 0, 0), type: 'horizontal' };
        }
        
        // Check vertical roads
        const nearestVRoadX = Math.round(position.x / this.blockSize) * this.blockSize;
        if (Math.abs(position.x - nearestVRoadX) < halfRoad) {
            return { direction: new THREE.Vector3(0, 0, 1), type: 'vertical' };
        }
        
        return null;
    }

    getRandomRoadPosition() {
        const gx = MathUtils.randomInt(0, this.citySize - 1);
        const gz = MathUtils.randomInt(0, this.citySize - 1);
        const x = (gx - this.citySize / 2) * this.blockSize + MathUtils.random(-this.roadWidth/2, this.roadWidth/2);
        const z = (gz - this.citySize / 2) * this.blockSize + MathUtils.random(-this.roadWidth/2, this.roadWidth/2);
        return new THREE.Vector3(x, 0.5, z);
    }

    getRandomSidewalkPosition() {
        const isHorizontal = Math.random() < 0.5;
        const g = MathUtils.randomInt(0, this.citySize - 1);
        const along = MathUtils.randomInt(0, this.citySize - 1);
        
        if (isHorizontal) {
            const z = (g - this.citySize / 2) * this.blockSize;
            const side = Math.random() < 0.5 ? -1 : 1;
            const x = (along - this.citySize / 2) * this.blockSize + MathUtils.random(-this.blockSize/2, this.blockSize/2);
            const offsetZ = z + side * (this.roadWidth/2 + this.sidewalkWidth/2);
            return new THREE.Vector3(x, 0.5, offsetZ);
        } else {
            const x = (g - this.citySize / 2) * this.blockSize;
            const side = Math.random() < 0.5 ? -1 : 1;
            const z = (along - this.citySize / 2) * this.blockSize + MathUtils.random(-this.blockSize/2, this.blockSize/2);
            const offsetX = x + side * (this.roadWidth/2 + this.sidewalkWidth/2);
            return new THREE.Vector3(offsetX, 0.5, z);
        }
    }
}

window.RoadNetwork = RoadNetwork;