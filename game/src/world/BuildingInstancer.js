// SOLMAR NIGHTS: instanced building rendering — bodies, windows, roofs.
// Building instancing system for performance - creates instanced meshes for buildings
const BUILDING_COLORS_INST = [
    0x888888, 0x777777, 0x999999, 0xaaaaaa, 0x666666,
    0xbb9977, 0x998877, 0x776655, 0x887766, 0x99aaaa
];
const WINDOW_COLOR_INST = 0x4488ff;
const WINDOW_EMISSIVE_INST = 0x4488ff;
const WINDOW_EMISSIVE_INTENSITY_INST = 0.8;
const WINDOW_ROUGHNESS_INST = 0.1;
const WINDOW_METALNESS_INST = 0.9;
const WINDOW_OPACITY_INST = 0.8;
const WINDOW_LIT_COLOR_INST = 0xffffaa;
const WINDOW_LIT_EMISSIVE_INST = 0xffffaa;
const WINDOW_LIT_EMISSIVE_INTENSITY_INST = 1.5;
const WINDOW_LIT_OPACITY_INST = 0.9;
const ROOF_COLOR_INST = 0x332211;
const ROOF_ROUGHNESS_INST = 0.8;
const ROOF_METALNESS_INST = 0.1;
const MIN_SIZE_FACTOR_INST = 0.25;
const MAX_SIZE_FACTOR_INST = 0.9;
const BUILDING_PAD_FACTOR = 0.8;
const HEIGHT_MIN_INST = 8;
const HEIGHT_MAX_INST = 40;
const FLOOR_HEIGHT_INST = 3.5;
const PARK_CHANCE_INST = 0.15;
const DETAIL_CHANCE_INST = 0.3;
const WINDOW_SIZE_INST = 1.2;
const WINDOW_SPACING_INST = 2.5;
const SILL_HEIGHT_INST = 1;
const WINDOW_LIT_CHANCE_INST = 0.7;
const LANDMARK_HEIGHT_THRESHOLD = 30;
const LANDMARK_MAX_COUNT = 5;
const SPIRE_RADIUS = 2;
const SPIRE_HEIGHT = 15;
const SPIRE_COLOR = 0xffcc00;
const SPIRE_EMISSIVE = 0xffcc00;
const SPIRE_EMISSIVE_INTENSITY = 0.5;
const SPIRE_ROUGHNESS = 0.3;
const SPIRE_METALNESS = 0.7;
const LIGHT_RADIUS = 0.5;
const LIGHT_COLOR = 0xff0000;
const LIGHT_EMISSIVE = 0xff0000;
const LIGHT_EMISSIVE_INTENSITY = 2;
const LIGHT_ROUGHNESS = 0.1;
const LIGHT_METALNESS = 0.9;
const SPIRE_Y_OFFSET = 7.5;
const LIGHT_Y_OFFSET = 15;

class BuildingInstancer {
    constructor(game) {
        this.game = game;
        this.buildingBodies = null;      // InstancedMesh for building bodies
        this.windowMeshes = null;         // InstancedMesh for all windows
        this.roofMeshes = [];             // Roof meshes (fewer, can stay as groups)
        this.detailMeshes = [];           // Detail meshes
        this.buildingData = [];           // Store building data for collision
        this.landmarks = [];              // Landmark buildings for missions
        
        // Materials
        this.bodyMaterials = [];
        this.windowMat = null;
        this.windowLitMat = null;
        this.roofMat = null;
        
        this.initMaterials();
    }

    initMaterials() {
        // Building body materials - limited palette for instancing
        this.bodyMaterials = BUILDING_COLORS_INST.map(c => new THREE.MeshStandardMaterial({
            color: c,
            roughness: 0.7,
            metalness: 0.1
        }));
        
        this.windowMat = new THREE.MeshStandardMaterial({
            color: WINDOW_COLOR_INST,
            emissive: WINDOW_EMISSIVE_INST,
            emissiveIntensity: WINDOW_EMISSIVE_INTENSITY_INST,
            roughness: WINDOW_ROUGHNESS_INST,
            metalness: WINDOW_METALNESS_INST,
            transparent: true,
            opacity: WINDOW_OPACITY_INST,
            side: THREE.DoubleSide
        });
        
        this.windowLitMat = new THREE.MeshStandardMaterial({
            color: WINDOW_LIT_COLOR_INST,
            emissive: WINDOW_LIT_EMISSIVE_INST,
            emissiveIntensity: WINDOW_LIT_EMISSIVE_INTENSITY_INST,
            roughness: WINDOW_ROUGHNESS_INST,
            metalness: WINDOW_METALNESS_INST,
            transparent: true,
            opacity: WINDOW_LIT_OPACITY_INST,
            side: THREE.DoubleSide
        });
        
        this.roofMat = new THREE.MeshStandardMaterial({
            color: ROOF_COLOR_INST,
            roughness: ROOF_ROUGHNESS_INST,
            metalness: ROOF_METALNESS_INST
        });
    }

    generate(roadNetwork) {
        this.roadNetwork = roadNetwork;
        this.buildingData = [];
        
        const blockSize = roadNetwork.blockSize;
        const halfSize = roadNetwork.citySize * blockSize / 2;
        const buildingPad = blockSize * BUILDING_PAD_FACTOR;
        
        // Collect all building data first
        const buildingInfos = [];
        
        for (let gx = 0; gx < roadNetwork.citySize; gx++) {
            for (let gz = 0; gz < roadNetwork.citySize; gz++) {
                const block = roadNetwork.grid[gx][gz];
                if (!block.hasBuilding) continue;
                if (Math.random() < PARK_CHANCE_INST) continue; // Parks/plazas
                
                const wx = block.worldX;
                const wz = block.worldZ;
                
                const minSize = blockSize * MIN_SIZE_FACTOR_INST;
                const maxSize = buildingPad * MAX_SIZE_FACTOR_INST;
                const width = MathUtils.random(minSize, maxSize);
                const depth = MathUtils.random(minSize, maxSize);
                const height = MathUtils.random(HEIGHT_MIN_INST, HEIGHT_MAX_INST);
                const floors = Math.floor(height / FLOOR_HEIGHT_INST);
                
                const x = wx + MathUtils.random(-buildingPad/2 + width/2, buildingPad/2 - width/2);
                const z = wz + MathUtils.random(-buildingPad/2 + depth/2, buildingPad/2 - depth/2);
                
                const bodyMatIndex = Math.floor(Math.random() * this.bodyMaterials.length);
                const roofType = MathUtils.randomInt(0, 3);
                const hasDetails = Math.random() < DETAIL_CHANCE_INST;
                
                buildingInfos.push({
                    x, z, width, depth, height, floors,
                    bodyMatIndex, roofType, hasDetails,
                    bounds: new THREE.Box3().setFromCenterAndSize(
                        new THREE.Vector3(x, height/2, z),
                        new THREE.Vector3(width, height, depth)
                    )
                });
            }
        }
        
        // Create instanced building bodies
        this.createBuildingBodies(buildingInfos);
        
        // Create instanced windows
        this.createWindows(buildingInfos);
        
        // Create roofs and details (as groups, fewer in number)
        this.createRoofsAndDetails(buildingInfos);
        
        // Store building data for collision
        this.buildingData = buildingInfos.map((info, i) => ({
            ...info,
            instanceIndex: i,
            type: 'building'
        }));
        
        // Create landmarks - pick a few tall buildings as landmarks
        this.createLandmarks(buildingInfos);
        
        return this.getAllMeshes();
    }

    createBuildingBodies(buildingInfos) {
        // Group buildings by material for instancing
        const materialGroups = {};
        
        buildingInfos.forEach((info, index) => {
            const matKey = info.bodyMatIndex;
            if (!materialGroups[matKey]) {
                materialGroups[matKey] = [];
            }
            materialGroups[matKey].push({...info, index});
        });
        
        this.buildingBodies = [];
        
        Object.entries(materialGroups).forEach(([matIndex, buildings]) => {
            if (buildings.length === 0) return;
            
            // Use a representative geometry (average size)
            const avgWidth = buildings.reduce((sum, b) => sum + b.width, 0) / buildings.length;
            const avgDepth = buildings.reduce((sum, b) => sum + b.depth, 0) / buildings.length;
            const avgHeight = buildings.reduce((sum, b) => sum + b.height, 0) / buildings.length;
            
            const geometry = new THREE.BoxGeometry(avgWidth, avgHeight, avgHeight);
            const material = this.bodyMaterials[parseInt(matIndex)];
            
            const instancedMesh = new THREE.InstancedMesh(geometry, material, buildings.length);
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;
            instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            const dummy = new THREE.Object3D();
            buildings.forEach((info, i) => {
                dummy.position.set(info.x, info.height / 2, info.z);
                dummy.rotation.y = 0;
                dummy.scale.set(info.width / avgWidth, info.height / avgHeight, info.depth / avgDepth);
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(i, dummy.matrix);
            });
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.game.scene.add(instancedMesh);
            this.buildingBodies.push({ mesh: instancedMesh, buildings });
        });
    }

    createWindows(buildingInfos) {
        const windowSize = 1.2;
        const windowSpacing = 2.5;
        const sillHeight = 1;
        
        // Count total windows
        let totalWindows = 0;
        const windowData = [];
        
        buildingInfos.forEach((info, buildingIndex) => {
            for (let floor = 0; floor < info.floors; floor++) {
                const y = sillHeight + floor * (info.height / info.floors);
                
                const sides = [
                    { axis: 'z', pos: info.depth/2 + 0.01, rot: 0, count: Math.floor(info.width / windowSpacing) },
                    { axis: 'z', pos: -info.depth/2 - 0.01, rot: Math.PI, count: Math.floor(info.width / windowSpacing) },
                    { axis: 'x', pos: info.width/2 + 0.01, rot: -Math.PI/2, count: Math.floor(info.depth / windowSpacing) },
                    { axis: 'x', pos: -info.width/2 - 0.01, rot: Math.PI/2, count: Math.floor(info.depth / windowSpacing) }
                ];
                
                sides.forEach(side => {
                    for (let i = 0; i < side.count; i++) {
                        const offset = (i - (side.count - 1) / 2) * windowSpacing;
                        const isLit = Math.random() < 0.7;
                        
                        let wx, wz, rot;
                        if (side.axis === 'z') {
                            wx = info.x + offset;
                            wz = info.z + side.pos;
                            rot = side.rot;
                        } else {
                            wx = info.x + side.pos;
                            wz = info.z + offset;
                            rot = side.rot;
                        }
                        
                        const wy = y;
                        
                        windowData.push({
                            x: wx, y: wy, z: wz,
                            rotation: rot,
                            lit: isLit,
                            buildingIndex
                        });
                        totalWindows++;
                    }
                });
            }
        });
        
        if (totalWindows === 0) return;
        
        // Create instanced window mesh
        const windowGeo = new THREE.PlaneGeometry(1.2, 1.2);
        
        // We need two materials (lit and unlit) - create two instanced meshes
        const litWindows = windowData.filter(w => w.lit);
        const unlitWindows = windowData.filter(w => !w.lit);
        
        [litWindows, unlitWindows].forEach((windows, matIndex) => {
            if (windows.length === 0) return;
            
            const material = matIndex === 0 ? this.windowLitMat : this.windowMat;
            const mesh = new THREE.InstancedMesh(windowGeo, material, windows.length);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            const dummy = new THREE.Object3D();
            windows.forEach((win, i) => {
                dummy.position.set(win.x, win.y, win.z);
                dummy.rotation.y = win.rotation;
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            
            mesh.instanceMatrix.needsUpdate = true;
            this.game.scene.add(mesh);
            this.windowMeshes = this.windowMeshes || [];
            this.windowMeshes.push(mesh);
        });
    }

    createRoofsAndDetails(buildingInfos) {
        // Roofs and details are fewer, keep as individual meshes
        buildingInfos.forEach(info => {
            const group = new THREE.Group();
            group.position.set(info.x, 0, info.z);
            
            // Roof
            const roofType = info.roofType;
            this.addRoof(group, info.width, info.depth, info.height, roofType);
            
            // Details
            if (info.hasDetails) {
                this.addDetail(group, info.width, info.depth, info.height, this.bodyMaterials[info.bodyMatIndex]);
            }
            
            if (group.children.length > 0) {
                this.game.scene.add(group);
                this.roofMeshes.push(group);
            }
        });
    }

    addRoof(group, width, depth, height, type) {
        const roofMat = this.roofMat;
        
        switch (type) {
            case 0: // Flat roof with parapet
                const parapetGeo = new THREE.BoxGeometry(width + 0.5, 1, depth + 0.5);
                const parapet = new THREE.Mesh(parapetGeo, roofMat);
                parapet.position.set(0, height + 0.5, 0);
                parapet.castShadow = true;
                group.add(parapet);
                
                // AC units
                for (let i = 0; i < 3; i++) {
                    const acGeo = new THREE.BoxGeometry(2, 1, 1.5);
                    const ac = new THREE.Mesh(acGeo, this.bodyMaterials[0]);
                    ac.position.set(
                        MathUtils.random(-width/3, width/3),
                        height + 1.5,
                        MathUtils.random(-depth/3, depth/3)
                    );
                    ac.castShadow = true;
                    group.add(ac);
                }
                break;
                
            case 1: // Pitched roof
                const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height * 0.15, 4);
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.set(0, height + height * 0.075, 0);
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                group.add(roof);
                break;
                
            case 2: // Dome
                const domeGeo = new THREE.SphereGeometry(Math.max(width, depth) * 0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const dome = new THREE.Mesh(domeGeo, roofMat);
                dome.position.set(0, height, 0);
                dome.castShadow = true;
                group.add(dome);
                break;
                
            case 3: // Helipad
                const padGeo = new THREE.CylinderGeometry(Math.max(width, depth) * 0.3, Math.max(width, depth) * 0.3, 0.5, 8);
                const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }));
                pad.position.set(0, height + 0.25, 0);
                pad.castShadow = true;
                group.add(pad);
                break;
        }
    }

    addDetail(group, width, depth, height, mat) {
        const detailCount = MathUtils.randomInt(1, 4);
        for (let i = 0; i < detailCount; i++) {
            const floor = MathUtils.randomInt(1, Math.floor(height / 3.5) - 1);
            const y = floor * 3.5 + 1;
            const side = MathUtils.randomInt(0, 3);
            
            const balGeo = new THREE.BoxGeometry(
                side < 2 ? width * 0.6 : 0.5,
                0.3,
                side >= 2 ? depth * 0.6 : 0.5
            );
            const balMat = new THREE.MeshStandardMaterial({ 
                color: mat.color, 
                roughness: mat.roughness, 
                metalness: mat.metalness 
            });
            const balcony = new THREE.Mesh(balGeo, balMat);
            
            if (side === 0) balcony.position.set(0, y, depth/2 + 0.25);
            else if (side === 1) balcony.position.set(0, y, -depth/2 - 0.25);
            else if (side === 2) balcony.position.set(width/2 + 0.25, y, 0);
            else balcony.position.set(-width/2 - 0.25, y, 0);
            
            balcony.castShadow = true;
            group.add(balcony);
        }
    }

    getAllMeshes() {
        const meshes = [];
        if (this.buildingBodies) {
            this.buildingBodies.forEach(b => meshes.push(b.mesh));
        }
        if (this.windowMeshes) {
            this.windowMeshes.forEach(m => meshes.push(m));
        }
        if (this.roofMeshes) {
            this.roofMeshes.forEach(g => meshes.push(g));
        }
        return meshes;
    }

    createLandmarks(buildingInfos) {
        // Pick a few tall buildings as landmarks (height > 30)
        const tallBuildings = buildingInfos.filter(b => b.height > LANDMARK_HEIGHT_THRESHOLD);
        const landmarkCount = Math.min(LANDMARK_MAX_COUNT, tallBuildings.length);
        
        for (let i = 0; i < landmarkCount; i++) {
            const info = tallBuildings[i];
            // Create a distinctive landmark group at the building position
            const group = new THREE.Group();
            group.position.set(info.x, 0, info.z);
            group.userData = { 
                type: 'landmark',
                buildingData: info,
                bounds: new THREE.Box3().setFromCenterAndSize(
                    new THREE.Vector3(info.x, info.height/2 + 10, info.z),
                    new THREE.Vector3(info.width + 10, info.height + 20, info.depth + 10)
                )
            };
            
            // Add a distinctive spire/antenna on top
            const spireGeo = new THREE.ConeGeometry(SPIRE_RADIUS, SPIRE_HEIGHT, 4);
            const spireMat = new THREE.MeshStandardMaterial({ 
                color: SPIRE_COLOR, 
                emissive: SPIRE_EMISSIVE, 
                emissiveIntensity: SPIRE_EMISSIVE_INTENSITY,
                roughness: SPIRE_ROUGHNESS, 
                metalness: SPIRE_METALNESS 
            });
            const spire = new THREE.Mesh(spireGeo, spireMat);
            spire.position.set(0, info.height + SPIRE_Y_OFFSET, 0);
            spire.castShadow = true;
            group.add(spire);
            
            // Add blinking light at top
            const lightGeo = new THREE.SphereGeometry(LIGHT_RADIUS, 8, 8);
            const lightMat = new THREE.MeshStandardMaterial({ 
                color: LIGHT_COLOR, 
                emissive: LIGHT_EMISSIVE, 
                emissiveIntensity: LIGHT_EMISSIVE_INTENSITY,
                roughness: LIGHT_ROUGHNESS,
                metalness: LIGHT_METALNESS
            });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(0, info.height + LIGHT_Y_OFFSET, 0);
            light.userData = { isBlinking: true };
            group.add(light);
            
            this.game.scene.add(group);
            this.landmarks.push(group);
        }
    }

    getAllMeshes() {
        const meshes = [];
        if (this.buildingBodies) {
            this.buildingBodies.forEach(b => meshes.push(b.mesh));
        }
        if (this.windowMeshes) {
            this.windowMeshes.forEach(m => meshes.push(m));
        }
        if (this.roofMeshes) {
            this.roofMeshes.forEach(g => meshes.push(g));
        }
        return meshes;
    }

    getCollisionObjects() {
        return this.buildingData.map(b => b.bounds);
    }

    getCollisionMeshes(roadMeshes = [], groundMesh = null) {
        // Return all collision-capable meshes for raycasting
        // Includes InstancedMesh objects (building bodies, windows) and roof/detail groups
        const meshes = [];
        if (this.buildingBodies) {
            this.buildingBodies.forEach(b => meshes.push(b.mesh));
        }
        if (this.windowMeshes) {
            this.windowMeshes.forEach(m => meshes.push(m));
        }
        if (this.roofMeshes) {
            this.roofMeshes.forEach(g => meshes.push(g));
        }
        if (this.landmarks) {
            this.landmarks.forEach(l => meshes.push(l));
        }
        if (roadMeshes) {
            meshes.push(...roadMeshes);
        }
        if (groundMesh) {
            meshes.push(groundMesh);
        }
        return meshes;
    }

    getBuildingClusterCenter() {
        if (!this.buildingData || this.buildingData.length === 0) {
            return new THREE.Vector3(0, 0, 0);
        }
        let sumX = 0, sumZ = 0;
        this.buildingData.forEach(b => {
            sumX += b.x;
            sumZ += b.z;
        });
        return new THREE.Vector3(sumX / this.buildingData.length, 0, sumZ / this.buildingData.length);
    }
}

window.BuildingInstancer = BuildingInstancer;