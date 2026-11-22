// Building generation with varied architecture
class BuildingGenerator {
    constructor(roadNetwork) {
        this.roadNetwork = roadNetwork;
        this.buildings = [];
        this.landmarks = [];
        this.palms = [];
        this.materials = null;
    }

    initMaterials() {
        // Building base materials
        const buildingColors = [
            0x888888, 0x777777, 0x999999, 0xaaaaaa, 0x666666,
            0xbb9977, 0x998877, 0x776655, 0x887766, 0x99aaaa
        ];
        
        this.materials = {
            building: buildingColors.map(c => new THREE.MeshStandardMaterial({
                color: c,
                roughness: 0.7,
                metalness: 0.1
            })),
            window: new THREE.MeshStandardMaterial({
                color: 0x4488ff,
                emissive: 0x4488ff,
                emissiveIntensity: 0.8,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.8
            }),
            windowLit: new THREE.MeshStandardMaterial({
                color: 0xffffaa,
                emissive: 0xffffaa,
                emissiveIntensity: 1.5,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.9
            }),
            roof: new THREE.MeshStandardMaterial({
                color: 0x332211,
                roughness: 0.8,
                metalness: 0.1
            }),
            landmark: [
                new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.6, metalness: 0.2 }),
                new THREE.MeshStandardMaterial({ color: 0x88ccaa, roughness: 0.5, metalness: 0.3 }),
                new THREE.MeshStandardMaterial({ color: 0xaa88cc, roughness: 0.5, metalness: 0.3 }),
                new THREE.MeshStandardMaterial({ color: 0xcc8888, roughness: 0.5, metalness: 0.2 })
            ],
            palmTrunk: new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8, metalness: 0.1 }),
            palmFrond: new THREE.MeshStandardMaterial({ 
                color: 0x228822, 
                roughness: 0.7, 
                metalness: 0.1,
                side: THREE.DoubleSide
            })
        };
    }

    generate() {
        if (!this.materials) this.initMaterials();
        
        const blockSize = this.roadNetwork.blockSize;
        const halfSize = this.roadNetwork.citySize * blockSize / 2;
        const buildingPad = blockSize * 0.8;
        
        // Generate buildings on blocks
        for (let gx = 0; gx < this.roadNetwork.citySize; gx++) {
            for (let gz = 0; gz < this.roadNetwork.citySize; gz++) {
                const block = this.roadNetwork.grid[gx][gz];
                if (!block.hasBuilding) continue;
                
                // Skip some blocks for parks/plazas
                if (Math.random() < 0.15) continue;
                
                const wx = block.worldX;
                const wz = block.worldZ;
                
                // Determine building type
                const isLandmark = Math.random() < 0.03;
                
                if (isLandmark) {
                    this.createLandmark(wx, wz, buildingPad);
                } else {
                    this.createBuilding(wx, wz, buildingPad);
                }
            }
        }
        
        // Generate palm trees along coast
        this.generatePalms();
        
        return this;
    }

    createBuilding(wx, wz, pad) {
        const blockSize = this.roadNetwork.blockSize;
        const minSize = blockSize * 0.25;
        const maxSize = pad * 0.9;
        
        // Random footprint
        const width = MathUtils.random(minSize, maxSize);
        const depth = MathUtils.random(minSize, maxSize);
        const height = MathUtils.random(8, 40);
        const floors = Math.floor(height / 3.5);
        
        // Position with some variation
        const x = wx + MathUtils.random(-pad/2 + width/2, pad/2 - width/2);
        const z = wz + MathUtils.random(-pad/2 + depth/2, pad/2 - depth/2);
        
        const building = new THREE.Group();
        building.position.set(x, 0, z);
        building.userData = { 
            type: 'building', 
            width, depth, height, floors,
            bounds: new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(x, height/2, z),
                new THREE.Vector3(width, height, depth)
            )
        };
        
        const mat = MathUtils.choice(this.materials.building);
        const windowMat = this.materials.window;
        const windowLitMat = this.materials.windowLit;
        const roofMat = this.materials.roof;
        
        // Main building body
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMesh = new THREE.Mesh(bodyGeo, mat);
        bodyMesh.position.y = height / 2;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        building.add(bodyMesh);
        
        // Windows - instanced for performance
        this.addWindows(building, width, depth, height, floors, windowMat, windowLitMat);
        
        // Roof
        const roofType = MathUtils.randomInt(0, 3);
        this.addRoof(building, width, depth, height, roofType, roofMat);
        
        // Random details
        if (Math.random() < 0.3) this.addDetail(building, width, depth, height, mat);
        
        this.buildings.push(building);
        return building;
    }

    addWindows(building, width, depth, height, floors, windowMat, windowLitMat) {
        const windowSize = 1.2;
        const windowSpacing = 2.5;
        const sillHeight = 1;
        
        // Create window geometry
        const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize);
        
        for (let floor = 0; floor < floors; floor++) {
            const y = sillHeight + floor * (height / floors);
            
            // Windows on all 4 sides
            const sides = [
                { axis: 'z', pos: depth/2 + 0.01, rot: 0, count: Math.floor(width / windowSpacing) },
                { axis: 'z', pos: -depth/2 - 0.01, rot: Math.PI, count: Math.floor(width / windowSpacing) },
                { axis: 'x', pos: width/2 + 0.01, rot: -Math.PI/2, count: Math.floor(depth / windowSpacing) },
                { axis: 'x', pos: -width/2 - 0.01, rot: Math.PI/2, count: Math.floor(depth / windowSpacing) }
            ];
            
            for (const side of sides) {
                for (let i = 0; i < side.count; i++) {
                    const offset = (i - (side.count - 1) / 2) * windowSpacing;
                    const windowMesh = new THREE.Mesh(
                        windowGeo, 
                        Math.random() < 0.7 ? windowLitMat : windowMat
                    );
                    
                    if (side.axis === 'z') {
                        windowMesh.position.set(offset, y, side.pos);
                    } else {
                        windowMesh.position.set(side.pos, y, offset);
                    }
                    windowMesh.rotation.y = side.rot;
                    building.add(windowMesh);
                }
            }
        }
    }

    addRoof(building, width, depth, height, type, roofMat) {
        switch (type) {
            case 0: // Flat roof with parapet
                const parapetGeo = new THREE.BoxGeometry(width + 0.5, 1, depth + 0.5);
                const parapet = new THREE.Mesh(parapetGeo, roofMat);
                parapet.position.set(0, height + 0.5, 0);
                parapet.castShadow = true;
                building.add(parapet);
                
                // AC units
                for (let i = 0; i < 3; i++) {
                    const acGeo = new THREE.BoxGeometry(2, 1, 1.5);
                    const ac = new THREE.Mesh(acGeo, this.materials.building[0]);
                    ac.position.set(
                        MathUtils.random(-width/3, width/3),
                        height + 1.5,
                        MathUtils.random(-depth/3, depth/3)
                    );
                    ac.castShadow = true;
                    building.add(ac);
                }
                break;
                
            case 1: // Pitched roof
                const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height * 0.15, 4);
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.set(0, height + height * 0.075, 0);
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                building.add(roof);
                break;
                
            case 2: // Dome
                const domeGeo = new THREE.SphereGeometry(Math.max(width, depth) * 0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const dome = new THREE.Mesh(domeGeo, roofMat);
                dome.position.set(0, height, 0);
                dome.castShadow = true;
                building.add(dome);
                break;
                
            case 3: // Helipad
                const padGeo = new THREE.CylinderGeometry(Math.max(width, depth) * 0.3, Math.max(width, depth) * 0.3, 0.5, 8);
                const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }));
                pad.position.set(0, height + 0.25, 0);
                pad.castShadow = true;
                building.add(pad);
                
                // H marker
                const hGeo = new THREE.PlaneGeometry(3, 3);
                const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
                const hMesh = new THREE.Mesh(hGeo, hMat);
                hMesh.position.set(0, height + 0.51, 0);
                hMesh.rotation.x = -Math.PI / 2;
                building.add(hMesh);
                break;
        }
    }

    addDetail(building, width, depth, height, mat) {
        // Balconies, awnings, etc.
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
            building.add(balcony);
        }
    }

    createLandmark(wx, wz, pad) {
        const type = MathUtils.randomInt(0, 4);
        let landmark;
        
        switch (type) {
            case 0: // Tall tower
                landmark = this.createTower(wx, wz, pad);
                break;
            case 1: // Dome building
                landmark = this.createDomeBuilding(wx, wz, pad);
                break;
            case 2: // Bridge/arch
                landmark = this.createArch(wx, wz, pad);
                break;
            case 3: // Stadium
                landmark = this.createStadium(wx, wz, pad);
                break;
            case 4: // Lighthouse (near coast)
                landmark = this.createLighthouse(wx, wz, pad);
                break;
        }
        
        if (landmark) {
            landmark.userData.type = 'landmark';
            this.landmarks.push(landmark);
        }
        
        return landmark;
    }

    createTower(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const baseSize = pad * 0.6;
        const height = MathUtils.random(80, 150);
        const taper = 0.3;
        const segments = 20;
        const mat = MathUtils.choice(this.materials.landmark);
        const windowLitMat = this.materials.windowLit;
        
        // Tapered tower using cylinder segments
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const tNext = (i + 1) / segments;
            const radius1 = baseSize * (1 - t * (1 - taper)) / 2;
            const radius2 = baseSize * (1 - tNext * (1 - taper)) / 2;
            const segHeight = height / segments;
            
            const geo = new THREE.CylinderGeometry(radius1, radius2, segHeight, 8);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = t * height + segHeight / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            
            // Windows every few segments
            if (i % 2 === 0) {
                for (let side = 0; side < 8; side++) {
                    const angle = (side / 8) * Math.PI * 2;
                    const winGeo = new THREE.PlaneGeometry(2, segHeight * 0.8);
                    const win = new THREE.Mesh(winGeo, windowLitMat);
                    win.position.set(
                        Math.cos(angle) * (radius1 + 0.01),
                        mesh.position.y,
                        Math.sin(angle) * (radius1 + 0.01)
                    );
                    win.lookAt(mesh.position.x, mesh.position.y, mesh.position.z);
                    group.add(win);
                }
            }
        }
        
        // Spire
        const spireGeo = new THREE.ConeGeometry(baseSize * taper * 0.3, height * 0.1, 4);
        const spire = new THREE.Mesh(spireGeo, this.materials.roof);
        spire.position.set(0, height + height * 0.05, 0);
        spire.castShadow = true;
        group.add(spire);
        
        return group;
    }

    createDomeBuilding(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const radius = pad * 0.4;
        const height = radius * 1.2;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Base cylinder
        const baseGeo = new THREE.CylinderGeometry(radius, radius, height * 0.3, 16);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = height * 0.15;
        base.castShadow = true;
        group.add(base);
        
        // Dome
        const domeGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, mat);
        dome.position.y = height * 0.3 + radius;
        dome.castShadow = true;
        group.add(dome);
        
        // Windows on base
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const winGeo = new THREE.PlaneGeometry(2.5, 3);
            const win = new THREE.Mesh(winGeo, this.materials.windowLit);
            win.position.set(
                Math.cos(angle) * (radius + 0.01),
                height * 0.15,
                Math.sin(angle) * (radius + 0.01)
            );
            win.lookAt(0, height * 0.15, 0);
            group.add(win);
        }
        
        return group;
    }

    createArch(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const width = pad * 0.8;
        const height = pad * 0.6;
        const depth = 6;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Two pillars
        const pillarGeo = new THREE.BoxGeometry(4, height * 0.7, depth);
        for (let side = -1; side <= 1; side += 2) {
            const pillar = new THREE.Mesh(pillarGeo, mat);
            pillar.position.set(side * width * 0.4, height * 0.35, 0);
            pillar.castShadow = true;
            group.add(pillar);
        }
        
        // Arch top (torus segment)
        const archGeo = new THREE.TorusGeometry(width * 0.4, 2, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, mat);
        arch.position.set(0, height * 0.7 + width * 0.4, 0);
        arch.rotation.x = Math.PI / 2;
        arch.castShadow = true;
        group.add(arch);
        
        return group;
    }

    createStadium(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const radius = pad * 0.45;
        const height = 15;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Bowl shape
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const r1 = radius * (1 - t * 0.3);
            const r2 = radius * (1 - (t + 1/8) * 0.3);
            const h = height / 8;
            
            const geo = new THREE.CylinderGeometry(r1, r2, h, 24, 1, true);
            const mat2 = new THREE.MeshStandardMaterial({ 
                color: mat.color, 
                roughness: mat.roughness, 
                metalness: mat.metalness,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(geo, mat2);
            ring.position.y = t * height + h / 2;
            ring.castShadow = true;
            group.add(ring);
        }
        
        // Field
        const fieldGeo = new THREE.CircleGeometry(radius * 0.7, 16);
        const fieldMat = new THREE.MeshStandardMaterial({ color: 0x228822, roughness: 0.9 });
        const field = new THREE.Mesh(fieldGeo, fieldMat);
        field.position.y = 0.2;
        field.rotation.x = -Math.PI / 2;
        group.add(field);
        
        // Lights
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const light = new THREE.SpotLight(0xffffee, 50, 100, Math.PI / 6, 0.5, 1);
            light.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
            light.target.position.set(Math.cos(angle) * radius * 0.5, 0, Math.sin(angle) * radius * 0.5);
            light.castShadow = true;
            group.add(light);
            group.add(light.target);
        }
        
        return group;
    }

    createLighthouse(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const height = 50;
        const baseRadius = 5;
        const topRadius = 2;
        const mat = this.materials.landmark[0];
        
        // Tower
        const towerGeo = new THREE.CylinderGeometry(baseRadius, topRadius, height, 8);
        const tower = new THREE.Mesh(towerGeo, mat);
        tower.position.y = height / 2;
        tower.castShadow = true;
        group.add(tower);
        
        // Lantern room
        const lanternGeo = new THREE.CylinderGeometry(topRadius * 1.2, topRadius * 1.2, 4, 8);
        const lantern = new THREE.Mesh(lanternGeo, this.materials.roof);
        lantern.position.y = height + 2;
        lantern.castShadow = true;
        group.add(lantern);
        
        // Glass
        const glassGeo = new THREE.CylinderGeometry(topRadius * 1.1, topRadius * 1.1, 3, 8);
        const glass = new THREE.Mesh(glassGeo, this.materials.windowLit);
        glass.position.y = height + 2;
        group.add(glass);
        
        // Light beam (added at runtime)
        group.userData.lighthouse = true;
        group.userData.lightHeight = height + 4;
        
        return group;
    }

    generatePalms() {
        const halfSize = this.roadNetwork.citySize * this.roadNetwork.blockSize / 2;
        const coastZ = halfSize * 0.8; // Ocean is at positive Z
        
        for (let gx = 0; gx < this.roadNetwork.citySize; gx++) {
            const wx = (gx - this.roadNetwork.citySize / 2) * this.roadNetwork.blockSize;
            
            // Random palms near coast
            if (Math.random() < 0.4) {
                const x = wx + MathUtils.random(-this.roadNetwork.blockSize/2, this.roadNetwork.blockSize/2);
                const z = coastZ + MathUtils.random(-10, 30);
                this.createPalm(x, z);
            }
            
            // Some inland palms
            if (Math.random() < 0.1) {
                const x = wx + MathUtils.random(-this.roadNetwork.blockSize/2, this.roadNetwork.blockSize/2);
                const z = MathUtils.random(-halfSize * 0.5, coastZ - 20);
                this.createPalm(x, z);
            }
        }
    }

    createPalm(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        
        const height = MathUtils.random(6, 12);
        const trunkCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(MathUtils.random(-1, 1), height * 0.3, MathUtils.random(-1, 1)),
            new THREE.Vector3(MathUtils.random(-1.5, 1.5), height * 0.7, MathUtils.random(-1.5, 1.5)),
            new THREE.Vector3(MathUtils.random(-2, 2), height, MathUtils.random(-2, 2))
        ]);
        
        // Trunk
        const trunkGeo = new THREE.TubeGeometry(trunkCurve, 8, 0.25, 4, false);
        const trunk = new THREE.Mesh(trunkGeo, this.materials.palmTrunk);
        trunk.castShadow = true;
        group.add(trunk);
        
        // Fronds
        const topPos = trunkCurve.getPoint(1);
        const frondCount = MathUtils.randomInt(5, 8);
        
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const tilt = MathUtils.random(-0.5, 0.5);
            
            const frondGeo = new THREE.PlaneGeometry(0.3, 3);
            const frond = new THREE.Mesh(frondGeo, this.materials.palmFrond);
            
            frond.position.copy(topPos);
            frond.position.y += 0.5;
            frond.rotation.y = angle;
            frond.rotation.x = tilt - Math.PI / 4;
            frond.castShadow = true;
            group.add(frond);
        }
        
        group.userData = { type: 'palm', bounds: new THREE.Box3().setFromObject(group) };
        this.palms.push(group);
        
        return group;
    }

    getAllMeshes() {
        const meshes = [];
        this.buildings.forEach(b => meshes.push(b));
        this.landmarks.forEach(l => meshes.push(l));
        this.palms.forEach(p => meshes.push(p));
        return meshes;
    }

    getCollisionMeshes(roadMeshes = [], groundMesh = null) {
        // Return actual Object3D groups for raycasting
        const meshes = [];
        this.buildings.forEach(b => meshes.push(b));
        this.landmarks.forEach(l => meshes.push(l));
        this.palms.forEach(p => meshes.push(p));
        // Add road meshes
        meshes.push(...roadMeshes);
        // Add ground mesh if provided
        if (groundMesh) meshes.push(groundMesh);
        return meshes;
    }

    getCollisionObjects() {
        // Return Box3 bounds for distance checks only
        const objects = [];
        this.buildings.forEach(b => {
            if (b.userData.bounds) objects.push(b.userData.bounds);
        });
        this.landmarks.forEach(l => {
            if (l.userData.bounds) objects.push(l.userData.bounds);
        });
        this.palms.forEach(p => {
            if (p.userData.bounds) objects.push(p.userData.bounds);
        });
        return objects;
    }

    getBuildingAt(position, radius = 2) {
        for (const b of this.buildings) {
            if (b.userData.bounds) {
                const dist = b.userData.bounds.distanceToPoint(position);
                if (dist < radius) return b;
            }
        }
        return null;
    }
}

window.BuildingGenerator = BuildingGenerator;