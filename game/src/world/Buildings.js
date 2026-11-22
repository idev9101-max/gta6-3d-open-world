// Building generation with varied architecture
const BUILDING_COLORS_OLD = [
    0x888888, 0x777777, 0x999999, 0xaaaaaa, 0x666666,
    0xbb9977, 0x998877, 0x776655, 0x887766, 0x99aaaa
];
const WINDOW_COLOR = 0x4488ff;
const WINDOW_EMISSIVE = 0x4488ff;
const WINDOW_EMISSIVE_INTENSITY = 0.8;
const WINDOW_ROUGHNESS = 0.1;
const WINDOW_METALNESS = 0.9;
const WINDOW_OPACITY = 0.8;
const WINDOW_LIT_COLOR = 0xffffaa;
const WINDOW_LIT_EMISSIVE = 0xffffaa;
const WINDOW_LIT_EMISSIVE_INTENSITY = 1.5;
const WINDOW_LIT_OPACITY = 0.9;
const ROOF_COLOR = 0x332211;
const ROOF_ROUGHNESS = 0.8;
const ROOF_METALNESS = 0.1;
const LANDMARK_MATERIALS = [
    { color: 0xccaa88, roughness: 0.6, metalness: 0.2 },
    { color: 0x88ccaa, roughness: 0.5, metalness: 0.3 },
    { color: 0xaa88cc, roughness: 0.5, metalness: 0.3 },
    { color: 0xcc8888, roughness: 0.5, metalness: 0.2 }
];
const PALM_TRUNK_COLOR = 0x8B6914;
const PALM_TRUNK_ROUGHNESS = 0.8;
const PALM_TRUNK_METALNESS = 0.1;
const PALM_FROND_COLOR = 0x228822;
const PALM_FROND_ROUGHNESS = 0.7;
const PALM_FROND_METALNESS = 0.1;
const MIN_SIZE_FACTOR = 0.25;
const MAX_SIZE_FACTOR = 0.9;
const HEIGHT_MIN = 8;
const HEIGHT_MAX = 40;
const FLOOR_HEIGHT = 3.5;
const PARK_CHANCE = 0.15;
const LANDMARK_CHANCE = 0.03;
const WINDOW_SIZE = 1.2;
const WINDOW_SPACING = 2.5;
const SILL_HEIGHT = 1;
const WINDOW_LIT_CHANCE = 0.7;
const DETAIL_CHANCE = 0.3;
const DETAIL_COUNT_MIN = 1;
const DETAIL_COUNT_MAX = 4;
const PARAPET_HEIGHT = 1;
const AC_COUNT = 3;
const AC_WIDTH = 2;
const AC_HEIGHT = 1;
const AC_DEPTH = 1.5;
const AC_X_FACTOR = 1/3;
const AC_Y = 1.5;
const AC_Z_FACTOR = 1/3;
const PITCHED_ROOF_HEIGHT_FACTOR = 0.15;
const DOME_RADIUS_FACTOR = 0.4;
const HELIPAD_RADIUS_FACTOR = 0.3;
const HELIPAD_HEIGHT = 0.5;
const HELIPAD_COLOR = 0x444444;
const HELIPAD_ROUGHNESS = 0.8;
const H_MARKER_SIZE = 3;
const H_MARKER_OPACITY = 0.8;
const H_MARKER_Y_OFFSET = 0.51;
const TOWER_BASE_FACTOR = 0.6;
const TOWER_HEIGHT_MIN = 80;
const TOWER_HEIGHT_MAX = 150;
const TOWER_TAPER = 0.3;
const TOWER_SEGMENTS = 20;
const TOWER_SIDES = 8;
const TOWER_WINDOW_SEGMENT_INTERVAL = 2;
const TOWER_WINDOW_WIDTH = 2;
const TOWER_WINDOW_HEIGHT_FACTOR = 0.8;
const TOWER_SPIRE_RADIUS_FACTOR = 0.3;
const TOWER_SPIRE_HEIGHT_FACTOR = 0.1;
const DOME_BUILDING_RADIUS_FACTOR = 0.4;
const DOME_BUILDING_HEIGHT_FACTOR = 1.2;
const DOME_BASE_HEIGHT_FACTOR = 0.3;
const DOME_BASE_SIDES = 16;
const DOME_WINDOW_COUNT = 16;
const DOME_WINDOW_WIDTH = 2.5;
const DOME_WINDOW_HEIGHT = 3;
const ARCH_WIDTH_FACTOR = 0.8;
const ARCH_HEIGHT_FACTOR = 0.6;
const ARCH_DEPTH = 6;
const ARCH_PILLAR_WIDTH = 4;
const ARCH_PILLAR_HEIGHT_FACTOR = 0.7;
const ARCH_TORUS_RADIUS_FACTOR = 0.4;
const ARCH_TORUS_TUBE = 2;
const ARCH_TORUS_RADIAL_SEG = 8;
const ARCH_TORUS_TUBULAR_SEG = 16;
const ARCH_TORUS_ARC = Math.PI;
const STADIUM_RADIUS_FACTOR = 0.45;
const STADIUM_HEIGHT = 15;
const STADIUM_RINGS = 8;
const STADIUM_RING_SIDES = 24;
const STADIUM_FIELD_RADIUS_FACTOR = 0.7;
const STADIUM_FIELD_COLOR = 0x228822;
const STADIUM_FIELD_ROUGHNESS = 0.9;
const STADIUM_LIGHT_COUNT = 4;
const STADIUM_LIGHT_INTENSITY = 50;
const STADIUM_LIGHT_DISTANCE = 100;
const STADIUM_LIGHT_ANGLE = Math.PI / 6;
const STADIUM_LIGHT_PENUMBRA = 0.5;
const STADIUM_LIGHT_DECAY = 1;
const STADIUM_LIGHT_HEIGHT = 15;
const STADIUM_LIGHT_TARGET_HEIGHT = 0;
const STADIUM_LIGHT_TARGET_RADIUS_FACTOR = 0.5;
const LIGHTHOUSE_HEIGHT = 50;
const LIGHTHOUSE_BASE_RADIUS = 5;
const LIGHTHOUSE_TOP_RADIUS = 2;
const LIGHTHOUSE_TOWER_SIDES = 8;
const LIGHTHOUSE_LANTERN_HEIGHT = 4;
const LIGHTHOUSE_LANTERN_RADIUS_FACTOR = 1.2;
const LIGHTHOUSE_GLASS_HEIGHT = 3;
const LIGHTHOUSE_GLASS_RADIUS_FACTOR = 1.1;
const LIGHTHOUSE_LIGHT_HEIGHT = 4;
const PALM_HEIGHT_MIN = 6;
const PALM_HEIGHT_MAX = 12;
const PALM_TRUNK_RADIUS = 0.25;
const PALM_TRUNK_RADIAL_SEG = 4;
const PALM_FROND_COUNT_MIN = 5;
const PALM_FROND_COUNT_MAX = 8;
const PALM_FROND_WIDTH = 0.3;
const PALM_FROND_HEIGHT = 3;
const PALM_FROND_TILT_RANGE = 0.5;
const PALM_FROND_BASE_ROT = -Math.PI / 4;
const COASTAL_PALM_CHANCE = 0.4;
const COASTAL_Z_FACTOR = 0.8;
const COASTAL_Z_MIN = -10;
const COASTAL_Z_MAX = 30;
const INLAND_PALM_CHANCE = 0.1;
const INLAND_Z_MIN_FACTOR = -0.5;
const INLAND_Z_MAX_OFFSET = -20;

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
        this.materials = {
            building: BUILDING_COLORS_OLD.map(c => new THREE.MeshStandardMaterial({
                color: c,
                roughness: 0.7,
                metalness: 0.1
            })),
            window: new THREE.MeshStandardMaterial({
                color: WINDOW_COLOR,
                emissive: WINDOW_EMISSIVE,
                emissiveIntensity: WINDOW_EMISSIVE_INTENSITY,
                roughness: WINDOW_ROUGHNESS,
                metalness: WINDOW_METALNESS,
                transparent: true,
                opacity: WINDOW_OPACITY
            }),
            windowLit: new THREE.MeshStandardMaterial({
                color: WINDOW_LIT_COLOR,
                emissive: WINDOW_LIT_EMISSIVE,
                emissiveIntensity: WINDOW_LIT_EMISSIVE_INTENSITY,
                roughness: WINDOW_ROUGHNESS,
                metalness: WINDOW_METALNESS,
                transparent: true,
                opacity: WINDOW_LIT_OPACITY
            }),
            roof: new THREE.MeshStandardMaterial({
                color: ROOF_COLOR,
                roughness: ROOF_ROUGHNESS,
                metalness: ROOF_METALNESS
            }),
            landmark: LANDMARK_MATERIALS.map(m => new THREE.MeshStandardMaterial(m)),
            palmTrunk: new THREE.MeshStandardMaterial({ 
                color: PALM_TRUNK_COLOR, 
                roughness: PALM_TRUNK_ROUGHNESS, 
                metalness: PALM_TRUNK_METALNESS 
            }),
            palmFrond: new THREE.MeshStandardMaterial({ 
                color: PALM_FROND_COLOR, 
                roughness: PALM_FROND_ROUGHNESS, 
                metalness: PALM_FROND_METALNESS,
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
        const minSize = blockSize * MIN_SIZE_FACTOR;
        const maxSize = pad * MAX_SIZE_FACTOR;
        
        // Random footprint
        const width = MathUtils.random(minSize, maxSize);
        const depth = MathUtils.random(minSize, maxSize);
        const height = MathUtils.random(HEIGHT_MIN, HEIGHT_MAX);
        const floors = Math.floor(height / FLOOR_HEIGHT);
        
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
        if (Math.random() < DETAIL_CHANCE) this.addDetail(building, width, depth, height, mat);
        
        this.buildings.push(building);
        return building;
    }

    addWindows(building, width, depth, height, floors, windowMat, windowLitMat) {
        // Create window geometry
        const windowGeo = new THREE.PlaneGeometry(WINDOW_SIZE, WINDOW_SIZE);
        
        for (let floor = 0; floor < floors; floor++) {
            const y = SILL_HEIGHT + floor * (height / floors);
            
            // Windows on all 4 sides
            const sides = [
                { axis: 'z', pos: depth/2 + 0.01, rot: 0, count: Math.floor(width / WINDOW_SPACING) },
                { axis: 'z', pos: -depth/2 - 0.01, rot: Math.PI, count: Math.floor(width / WINDOW_SPACING) },
                { axis: 'x', pos: width/2 + 0.01, rot: -Math.PI/2, count: Math.floor(depth / WINDOW_SPACING) },
                { axis: 'x', pos: -width/2 - 0.01, rot: Math.PI/2, count: Math.floor(depth / WINDOW_SPACING) }
            ];
            
            for (const side of sides) {
                for (let i = 0; i < side.count; i++) {
                    const offset = (i - (side.count - 1) / 2) * WINDOW_SPACING;
                    const windowMesh = new THREE.Mesh(
                        windowGeo, 
                        Math.random() < WINDOW_LIT_CHANCE ? windowLitMat : windowMat
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
                const parapetGeo = new THREE.BoxGeometry(width + 0.5, PARAPET_HEIGHT, depth + 0.5);
                const parapet = new THREE.Mesh(parapetGeo, roofMat);
                parapet.position.set(0, height + 0.5, 0);
                parapet.castShadow = true;
                building.add(parapet);
                
                // AC units
                for (let i = 0; i < AC_COUNT; i++) {
                    const acGeo = new THREE.BoxGeometry(AC_WIDTH, AC_HEIGHT, AC_DEPTH);
                    const ac = new THREE.Mesh(acGeo, this.materials.building[0]);
                    ac.position.set(
                        MathUtils.random(-width * AC_X_FACTOR, width * AC_X_FACTOR),
                        height + AC_Y,
                        MathUtils.random(-depth * AC_Z_FACTOR, depth * AC_Z_FACTOR)
                    );
                    ac.castShadow = true;
                    building.add(ac);
                }
                break;
                
            case 1: // Pitched roof
                const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height * PITCHED_ROOF_HEIGHT_FACTOR, 4);
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.set(0, height + height * PITCHED_ROOF_HEIGHT_FACTOR / 2, 0);
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                building.add(roof);
                break;
                
            case 2: // Dome
                const domeGeo = new THREE.SphereGeometry(Math.max(width, depth) * DOME_RADIUS_FACTOR, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const dome = new THREE.Mesh(domeGeo, roofMat);
                dome.position.set(0, height, 0);
                dome.castShadow = true;
                building.add(dome);
                break;
                
            case 3: // Helipad
                const padGeo = new THREE.CylinderGeometry(Math.max(width, depth) * HELIPAD_RADIUS_FACTOR, Math.max(width, depth) * HELIPAD_RADIUS_FACTOR, HELIPAD_HEIGHT, 8);
                const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: HELIPAD_COLOR, roughness: HELIPAD_ROUGHNESS }));
                pad.position.set(0, height + HELIPAD_HEIGHT / 2, 0);
                pad.castShadow = true;
                building.add(pad);
                
                // H marker
                const hGeo = new THREE.PlaneGeometry(H_MARKER_SIZE, H_MARKER_SIZE);
                const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: H_MARKER_OPACITY });
                const hMesh = new THREE.Mesh(hGeo, hMat);
                hMesh.position.set(0, height + H_MARKER_Y_OFFSET, 0);
                hMesh.rotation.x = -Math.PI / 2;
                building.add(hMesh);
                break;
        }
    }

    addDetail(building, width, depth, height, mat) {
        // Balconies, awnings, etc.
        const detailCount = MathUtils.randomInt(DETAIL_COUNT_MIN, DETAIL_COUNT_MAX);
        for (let i = 0; i < detailCount; i++) {
            const floor = MathUtils.randomInt(1, Math.floor(height / FLOOR_HEIGHT) - 1);
            const y = floor * FLOOR_HEIGHT + 1;
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
        const type = MathUtils.randomInt(0, LANDMARK_MATERIALS.length);
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
        
        const baseSize = pad * TOWER_BASE_FACTOR;
        const height = MathUtils.random(TOWER_HEIGHT_MIN, TOWER_HEIGHT_MAX);
        const taper = TOWER_TAPER;
        const segments = TOWER_SEGMENTS;
        const mat = MathUtils.choice(this.materials.landmark);
        const windowLitMat = this.materials.windowLit;
        
        // Tapered tower using cylinder segments
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const tNext = (i + 1) / segments;
            const radius1 = baseSize * (1 - t * (1 - taper)) / 2;
            const radius2 = baseSize * (1 - tNext * (1 - taper)) / 2;
            const segHeight = height / segments;
            
            const geo = new THREE.CylinderGeometry(radius1, radius2, segHeight, TOWER_SIDES);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = t * height + segHeight / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            
            // Windows every few segments
            if (i % TOWER_WINDOW_SEGMENT_INTERVAL === 0) {
                for (let side = 0; side < TOWER_SIDES; side++) {
                    const angle = (side / TOWER_SIDES) * Math.PI * 2;
                    const winGeo = new THREE.PlaneGeometry(TOWER_WINDOW_WIDTH, segHeight * TOWER_WINDOW_HEIGHT_FACTOR);
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
        const spireGeo = new THREE.ConeGeometry(baseSize * taper * TOWER_SPIRE_RADIUS_FACTOR, height * TOWER_SPIRE_HEIGHT_FACTOR, 4);
        const spire = new THREE.Mesh(spireGeo, this.materials.roof);
        spire.position.set(0, height + height * TOWER_SPIRE_HEIGHT_FACTOR / 2, 0);
        spire.castShadow = true;
        group.add(spire);
        
        return group;
    }

    createDomeBuilding(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const radius = pad * DOME_BUILDING_RADIUS_FACTOR;
        const height = radius * DOME_BUILDING_HEIGHT_FACTOR;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Base cylinder
        const baseGeo = new THREE.CylinderGeometry(radius, radius, height * DOME_BASE_HEIGHT_FACTOR, DOME_BASE_SIDES);
        const base = new THREE.Mesh(baseGeo, mat);
        base.position.y = height * DOME_BASE_HEIGHT_FACTOR / 2;
        base.castShadow = true;
        group.add(base);
        
        // Dome
        const domeGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, mat);
        dome.position.y = height * DOME_BASE_HEIGHT_FACTOR + radius;
        dome.castShadow = true;
        group.add(dome);
        
        // Windows on base
        for (let i = 0; i < DOME_WINDOW_COUNT; i++) {
            const angle = (i / DOME_WINDOW_COUNT) * Math.PI * 2;
            const winGeo = new THREE.PlaneGeometry(DOME_WINDOW_WIDTH, DOME_WINDOW_HEIGHT);
            const win = new THREE.Mesh(winGeo, this.materials.windowLit);
            win.position.set(
                Math.cos(angle) * (radius + 0.01),
                height * DOME_BASE_HEIGHT_FACTOR / 2,
                Math.sin(angle) * (radius + 0.01)
            );
            win.lookAt(0, height * DOME_BASE_HEIGHT_FACTOR / 2, 0);
            group.add(win);
        }
        
        return group;
    }

    createArch(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const width = pad * ARCH_WIDTH_FACTOR;
        const height = pad * ARCH_HEIGHT_FACTOR;
        const depth = ARCH_DEPTH;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Two pillars
        const pillarGeo = new THREE.BoxGeometry(ARCH_PILLAR_WIDTH, height * ARCH_PILLAR_HEIGHT_FACTOR, depth);
        for (let side = -1; side <= 1; side += 2) {
            const pillar = new THREE.Mesh(pillarGeo, mat);
            pillar.position.set(side * width * 0.4, height * ARCH_PILLAR_HEIGHT_FACTOR / 2, 0);
            pillar.castShadow = true;
            group.add(pillar);
        }
        
        // Arch top (torus segment)
        const archGeo = new THREE.TorusGeometry(width * ARCH_TORUS_RADIUS_FACTOR, ARCH_TORUS_TUBE, ARCH_TORUS_RADIAL_SEG, ARCH_TORUS_TUBULAR_SEG, ARCH_TORUS_ARC);
        const arch = new THREE.Mesh(archGeo, mat);
        arch.position.set(0, height * ARCH_PILLAR_HEIGHT_FACTOR + width * ARCH_TORUS_RADIUS_FACTOR, 0);
        arch.rotation.x = Math.PI / 2;
        arch.castShadow = true;
        group.add(arch);
        
        return group;
    }

    createStadium(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const radius = pad * STADIUM_RADIUS_FACTOR;
        const height = STADIUM_HEIGHT;
        const mat = MathUtils.choice(this.materials.landmark);
        
        // Bowl shape
        for (let i = 0; i < STADIUM_RINGS; i++) {
            const t = i / STADIUM_RINGS;
            const r1 = radius * (1 - t * 0.3);
            const r2 = radius * (1 - (t + 1/STADIUM_RINGS) * 0.3);
            const h = height / STADIUM_RINGS;
            
            const geo = new THREE.CylinderGeometry(r1, r2, h, STADIUM_RING_SIDES, 1, true);
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
        const fieldGeo = new THREE.CircleGeometry(radius * STADIUM_FIELD_RADIUS_FACTOR, 16);
        const fieldMat = new THREE.MeshStandardMaterial({ color: STADIUM_FIELD_COLOR, roughness: STADIUM_FIELD_ROUGHNESS });
        const field = new THREE.Mesh(fieldGeo, fieldMat);
        field.position.y = 0.2;
        field.rotation.x = -Math.PI / 2;
        group.add(field);
        
        // Lights
        for (let i = 0; i < STADIUM_LIGHT_COUNT; i++) {
            const angle = (i / STADIUM_LIGHT_COUNT) * Math.PI * 2;
            const light = new THREE.SpotLight(0xffffee, STADIUM_LIGHT_INTENSITY, STADIUM_LIGHT_DISTANCE, STADIUM_LIGHT_ANGLE, STADIUM_LIGHT_PENUMBRA, STADIUM_LIGHT_DECAY);
            light.position.set(Math.cos(angle) * radius, STADIUM_LIGHT_HEIGHT, Math.sin(angle) * radius);
            light.target.position.set(Math.cos(angle) * radius * STADIUM_LIGHT_TARGET_RADIUS_FACTOR, STADIUM_LIGHT_TARGET_HEIGHT, Math.sin(angle) * radius * STADIUM_LIGHT_TARGET_RADIUS_FACTOR);
            light.castShadow = true;
            group.add(light);
            group.add(light.target);
        }
        
        return group;
    }

    createLighthouse(wx, wz, pad) {
        const group = new THREE.Group();
        group.position.set(wx, 0, wz);
        
        const height = LIGHTHOUSE_HEIGHT;
        const baseRadius = LIGHTHOUSE_BASE_RADIUS;
        const topRadius = LIGHTHOUSE_TOP_RADIUS;
        const mat = this.materials.landmark[0];
        
        // Tower
        const towerGeo = new THREE.CylinderGeometry(baseRadius, topRadius, height, LIGHTHOUSE_TOWER_SIDES);
        const tower = new THREE.Mesh(towerGeo, mat);
        tower.position.y = height / 2;
        tower.castShadow = true;
        group.add(tower);
        
        // Lantern room
        const lanternGeo = new THREE.CylinderGeometry(topRadius * LIGHTHOUSE_LANTERN_RADIUS_FACTOR, topRadius * LIGHTHOUSE_LANTERN_RADIUS_FACTOR, LIGHTHOUSE_LANTERN_HEIGHT, 8);
        const lantern = new THREE.Mesh(lanternGeo, this.materials.roof);
        lantern.position.y = height + LIGHTHOUSE_LANTERN_HEIGHT / 2;
        lantern.castShadow = true;
        group.add(lantern);
        
        // Glass
        const glassGeo = new THREE.CylinderGeometry(topRadius * LIGHTHOUSE_GLASS_RADIUS_FACTOR, topRadius * LIGHTHOUSE_GLASS_RADIUS_FACTOR, LIGHTHOUSE_GLASS_HEIGHT, 8);
        const glass = new THREE.Mesh(glassGeo, this.materials.windowLit);
        glass.position.y = height + LIGHTHOUSE_LANTERN_HEIGHT / 2;
        group.add(glass);
        
        // Light beam (added at runtime)
        group.userData.lighthouse = true;
        group.userData.lightHeight = height + LIGHTHOUSE_LIGHT_HEIGHT;
        
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