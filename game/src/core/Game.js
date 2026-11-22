// SOLMAR NIGHTS: game orchestrator — probe-aware init, entity systems, day/night cycle, save/load.
// Main Game class - orchestrates all systems
const MAX_AUTO_TEST_STEPS = 8;
// Probe (?probe=N) renders this many frames, then stops for capture
const PROBE_AUTO_FRAMES = 5;
const PROBE_DEFAULT_VARIANT = 1;
const PROBE_MAX_VARIANT = 4;

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.cameraController = null;
        
        this.input = new InputManager();
        this.audio = new AudioManager();
        
        this.world = null;
        this.player = null;
        this.missionManager = null;
        this.hud = null;
        this.titleScreen = null;
        this.pauseMenu = null;
        this.missionUI = null;
        this.skySystem = null;
        this.lightingSystem = null;
        this.effects = null;
        this.weaponManager = null;
        
        this.clock = new THREE.Clock();
        this.delta = 0;
        this.time = 0;
        this.frameCount = 0;
        
        this.state = 'loading'; // loading, title, playing, paused, missionIntro, missionComplete, busted
        this.isRunning = false;
        
        this.autoTest = false;
        this.autoTestSequence = [];
        this.autoTestIndex = 0;
        this.autoTestTimer = 0;
        
        this.debugMode = false;
        
        // Scene parameters for ?scene= jump
        this.sceneParam = this.getSceneParam();
        
        this.init();
    }

    getSceneParam() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('autotest')) this.autoTest = true;
        this.quality = params.get('quality') || 'high';
        this.timeScale = parseFloat(params.get('t')) || 1.0;
        this.freezeFrames = parseInt(params.get('freeze')) || 0;
        this.probeMode = params.has('probe');
        this.probeVariant = Math.min(PROBE_MAX_VARIANT, Math.max(PROBE_DEFAULT_VARIANT, parseInt(params.get('probe') || '1', 10)));
        return params.get('scene');
    }

    async init() {
        // Probe mode: minimal static scene for fast screenshot capture
        if (this.probeMode) {
            await this.initProbeMode();
            return;
        }
        
        try {
            this.setupRenderer();
        } catch (e) { console.error('FAIL: setupRenderer', e.stack); throw e; }
        try {
            this.setupScene();
        } catch (e) { console.error('FAIL: setupScene', e.stack); throw e; }
        try {
            this.setupLights();
        } catch (e) { console.error('FAIL: setupLights', e.stack); throw e; }
        try {
            this.setupPostProcessing();
        } catch (e) { console.error('FAIL: setupPostProcessing', e.stack); throw e; }
        
        // Initialize sky system (doesn't need world)
        try {
            this.skySystem = new SkySystem(this);
        } catch (e) { console.error('FAIL: SkySystem constructor', e.stack); throw e; }
        try {
            this.effects = new EffectsManager(this);
        } catch (e) { console.error('FAIL: EffectsManager constructor', e.stack); throw e; }
        try {
            this.weaponManager = new WeaponManager(this);
        } catch (e) { console.error('FAIL: WeaponManager constructor', e.stack); throw e; }
        
        // Initialize player (needed for cameraController)
        try {
            this.player = new Player(this);
            this.player.init();
        } catch (e) { console.error('FAIL: Player init', e.stack); throw e; }
        
        // Initialize camera (needs player)
        try {
            this.cameraController = new CameraController(this.camera, this.player);
        } catch (e) { console.error('FAIL: CameraController constructor', e.stack); throw e; }
        
        // Initialize world (needs cameraController for collision setup)
        try {
            this.world = new World(this);
            await this.world.init();
        } catch (e) { console.error('FAIL: World init', e.stack); throw e; }
        
        // Spawn player at city center road intersection
        try {
            const centerPos = this.world.cityGenerator.getCityCenterRoadPosition();
            this.player.mesh.position.copy(centerPos);
            this.player.position.copy(centerPos);
            // Face player toward city center (buildings are at -x direction)
            this.player.rotation.y = Math.PI;
            this.player.mesh.rotation.y = Math.PI;
        } catch (e) { console.error('FAIL: Player spawn at city center', e.stack); throw e; }
        
        // Snap player to ground after world is initialized
        try {
            this.player.snapToGround();
        } catch (e) { console.error('FAIL: Player snapToGround', e.stack); throw e; }
        
        // Initialize camera to face city center
        try {
            this.cameraController.idealYaw = Math.PI;
            this.cameraController.yaw = Math.PI;
            this.cameraController.refresh();
        } catch (e) { console.error('FAIL: Camera yaw init', e.stack); throw e; }
        
        // Initialize lighting system (needs world.cityGenerator.roadNetwork)
        try {
            this.lightingSystem = new LightingSystem(this);
            this.lightingSystem.init();
        } catch (e) { console.error('FAIL: LightingSystem init', e.stack); throw e; }
        
        // Initialize mission manager
        try {
            this.missionManager = new MissionManager(this);
        } catch (e) { console.error('FAIL: MissionManager constructor', e.stack); throw e; }
        
        // Initialize UI
        try {
            this.hud = new HUD(this);
        } catch (e) { console.error('FAIL: HUD constructor', e.stack); throw e; }
        try {
            this.titleScreen = new TitleScreen(this);
        } catch (e) { console.error('FAIL: TitleScreen constructor', e.stack); throw e; }
        try {
            this.pauseMenu = new PauseMenu(this);
        } catch (e) { console.error('FAIL: PauseMenu constructor', e.stack); throw e; }
        try {
            this.missionUI = new MissionUI(this);
        } catch (e) { console.error('FAIL: MissionUI constructor', e.stack); throw e; }
        
        // Handle autotest or scene jump
        if (this.autoTest) {
            this.state = 'playing';
            this.titleScreen.hide();
            this.setupAutoTest();
        } else if (this.sceneParam) {
            this.state = 'playing';
            this.titleScreen.hide();
            this.jumpToScene(this.sceneParam);
        } else {
            this.state = 'title';
            this.titleScreen.show();
        }
        
        this.isRunning = true;
        this.animate();
    }

    // Probe mode: minimal static scene for fast screenshot capture
    async initProbeMode() {
        console.log('Initializing probe mode...');
        window.__probeStatus = 'init';
        
        // Deterministic probe staging: RoadNetwork.generate and the building
        // cluster draw from Math.random, so seed an LCG per variant to keep
        // every capture of the same probe identical.
        {
            let seed = 0x9e3779b9 + this.probeVariant * 0x85ebca6b;
            Math.random = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 0x100000000;
            };
        }

        try {
            // Full viewport renderer for capture
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: false,
                alpha: false,
                powerPreference: 'low-power'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(1);
            this.renderer.shadowMap.enabled = false;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            window.addEventListener('resize', () => this.onResize());
            
            // Simple scene
            this.setupScene();
            window.__probeStatus = 'scene';
            
            // Probe-specific lighting based on variant (night, street lamps)
            this.setupProbeVariant();
            window.__probeStatus = 'variant-setup';
            
            // Sky
            try {
                this.skySystem = new SkySystem(this);
            } catch (e) { console.error('FAIL: SkySystem constructor', e.stack); throw e; }
            
            // Player for camera reference
            this.player = new Player(this);
            this.player.init();
            window.__probeStatus = 'player';
            
            // Camera
            this.cameraController = new CameraController(this.camera, this.player);
            window.__probeStatus = 'camera';
            
            // Minimal world stub: entity init paths read game.world.*
            // (collision, vehicles, timeOfDay, cityGenerator.roadNetwork)
            this.world = {
                timeOfDay: 0.75,
                cityGenerator: {
                    roadNetwork: null,
                    getCityCenterRoadPosition: () => new THREE.Vector3(0, 0, 0)
                },
                collisionBounds: [], collisionMeshes: [],
                vehicles: [], parkedCars: [], trafficCars: [], pedestrians: [],
                updateLighting: () => {}, spawnPolicePed: () => null
            };

            // Build minimal probe scene (roads, buildings, entities, stub world)
            await this.buildProbeScene();
            window.__probeStatus = 'scene-built';
            
            // Night time
            this.skySystem.timeOfDay = 0.75;
            if (this.skySystem.update) this.skySystem.update(0);
            
            // Camera + player placement for this probe variant
            this.setupProbeCamera();
            this.positionProbePlayer();
            this.cameraController.refresh();
            
            // HUD (wanted stars, mission text, minimap)
            this.hud = new HUD(this);
            window.__probeStatus = 'hud';
            
            // Variant-specific tableau state (wanted stars, objective text)
            this.setupProbeTableau();
            window.__probeStatus = 'tableau';
            
            this.probeFrames = 0;
            this.state = 'playing';
            this.isRunning = true;
            window.__probeStatus = 'ready';
            this.animate();
        } catch (e) {
            console.error('PROBE MODE FAILED:', e.message, e.stack);
            window.__probeStatus = 'error: ' + e.message;
            throw e;
        }
    }
    
    setupProbeVariant() {
        const variant = this.probeVariant;
        
        // Base scene
        this.setupScene();
        
        // Bright night lighting - readable but moody
        const ambient = new THREE.AmbientLight(0x444455, 1.0);
        this.scene.add(ambient);
        this.ambientLight = ambient;

        // Moon light - brighter
        this.sunLight = new THREE.DirectionalLight(0x88aacc, 0.9);
        this.sunLight.position.set(100, 150, 100);
        this.sunLight.castShadow = false;
        this.scene.add(this.sunLight);

        // Hemisphere for sky
        this.hemiLight = new THREE.HemisphereLight(0x334466, 0x223344, 0.7);
        this.scene.add(this.hemiLight);
        
        // Fog - lighter for visibility
        this.scene.fog = new THREE.FogExp2(0x001122, 0.006);
        
        // Variant-specific lights
        if (variant === 1) {
            // Probe 1: Street corner - 4 corner lights + 2 along road
            this.addStreetLights([{x: -20, z: -20}, {x: 20, z: -20}, {x: 20, z: 20}, {x: -20, z: 20}, {x: 0, z: -30}, {x: 0, z: 30}]);
        } else if (variant === 2) {
            // Probe 2: Avenue - lights along road
            for (let i = -3; i <= 3; i++) {
                const z = i * 15;
                this.addPointLight(0, 8, z, 0xfff0d0, 20, 40);
                this.addPointLight(15, 8, z, 0xfff0d0, 15, 30);
                this.addPointLight(-15, 8, z, 0xfff0d0, 15, 30);
            }
        } else if (variant === 3) {
            // Probe 3: Waterfront/plaza - neon signs + water reflection
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const r = 25;
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                const hue = (i / 6) * 360;
                const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.5);
                this.addPointLight(x, 10, z, color.getHex(), 25, 50);
            }
        } else if (variant === 4) {
            // Probe 4: Close-up - storefront lighting
            this.addPointLight(0, 5, 5, 0xffddaa, 30, 20);
            this.addPointLight(3, 4, 8, 0xff8844, 20, 15);
            this.addPointLight(-3, 4, 8, 0x44aaff, 20, 15);
            // Spotlight on storefront
            const spot = new THREE.SpotLight(0xffddaa, 40, 15, Math.PI / 4, 0.5, 1);
            spot.position.set(0, 6, 5);
            spot.target.position.set(0, 1.5, 10);
            spot.castShadow = false;
            this.scene.add(spot);
            this.scene.add(spot.target);
        }
        
        // Light fog
        this.scene.fog = new THREE.FogExp2(0x001122, 0.006);
    }
    
    addPointLight(x, y, z, color, intensity, distance) {
        const light = new THREE.PointLight(color, intensity, distance, 2);
        light.position.set(x, y, z);
        light.castShadow = false;
        this.scene.add(light);
    }
    
    addStreetLights(positions) {
        positions.forEach(pos => {
            this.addPointLight(pos.x, 8, pos.z, 0xfff0d0, 18, 35);
        });
    }

    setupProbeCamera() {
        const variant = this.probeVariant;
        
        if (variant === 1) {
            // Probe 1: Street corner eye-level, looking past the player at the pursuit
            this.cameraController.chaseDistance = 8;
            this.cameraController.chaseHeight = 2.5;
            this.cameraController.lookAheadDistance = 6;
            this.cameraController.lookAtHeight = 1.5;
            this.cameraController.idealYaw = 0;
            this.cameraController.yaw = 0;
        } else if (variant === 2) {
            // Probe 2: Avenue down-road view
            this.cameraController.chaseDistance = 10;
            this.cameraController.chaseHeight = 3.5;
            this.cameraController.lookAheadDistance = 8;
            this.cameraController.lookAtHeight = 1.5;
            this.cameraController.idealYaw = 0;
            this.cameraController.yaw = 0;
        } else if (variant === 3) {
            // Probe 3: Plaza tableau - player faces the marker and police line
            this.cameraController.chaseDistance = 12;
            this.cameraController.chaseHeight = 4;
            this.cameraController.lookAheadDistance = 14;
            this.cameraController.lookAtHeight = 2;
            this.cameraController.idealYaw = 0;
            this.cameraController.yaw = 0;
        } else if (variant === 4) {
            // Probe 4: Close-up storefront
            this.cameraController.chaseDistance = 5;
            this.cameraController.chaseHeight = 2;
            this.cameraController.lookAheadDistance = 3;
            this.cameraController.lookAtHeight = 1.2;
            this.cameraController.idealYaw = Math.PI;
            this.cameraController.yaw = Math.PI;
        }
        
        this.cameraController.refresh();
    }
    
    setupProbeTableau() {
        const variant = this.probeVariant;
        
        this.hud.updateWantedStars();
        
        if (variant === 1) {
            // Probe 1: 3-star wanted level + mission objective on the HUD
            this.player.wantedLevel = 3;
            this.hud.updateWantedStars();
            this.hud.showMissionText('Objective: Evade the police blockade');
        } else if (variant === 2) {
            // Probe 2: driving tableau, mission text on the HUD
            this.player.wantedLevel = 1;
            this.hud.updateWantedStars();
            this.hud.showMissionText('Objective: Lose the police tail');
        } else if (variant === 3) {
            // Probe 3: 2-star wanted level + mission objective on the HUD
            this.player.wantedLevel = 2;
            this.hud.updateWantedStars();
            this.hud.showMissionText('Objective: Reach the mission marker');
        } else if (variant === 4) {
            // Probe 4: storefront, player beside an enterable car
            this.hud.showMissionText('Objective: Find the parked car');
        }

        // Probe screenshots are captured well after the 5s auto-hide window
        // of showMissionText, so pin the objective for the tableau shot.
        if (this.hud.missionTextTimeout) {
            clearTimeout(this.hud.missionTextTimeout);
            this.hud.missionTextTimeout = null;
        }
    }
    
    positionProbePlayer() {
        const variant = this.probeVariant;
        
        if (variant === 1) {
            // Probe 1: Street corner
            const roadPos = new THREE.Vector3(0, 1, 0);
            this.player.position.copy(roadPos);
            this.player.mesh.position.copy(roadPos);
            this.player.rotation.y = Math.PI;
            this.player.mesh.rotation.y = Math.PI;
        } else if (variant === 2) {
            // Probe 2: Avenue - player further down the road
            const roadPos = new THREE.Vector3(0, 1, -30);
            this.player.position.copy(roadPos);
            this.player.mesh.position.copy(roadPos);
            this.player.rotation.y = Math.PI;
            this.player.mesh.rotation.y = Math.PI;
        } else if (variant === 3) {
            // Probe 3: Plaza near the road, marker and police visible ahead
            const roadPos = new THREE.Vector3(0, 1, -8);
            this.player.position.copy(roadPos);
            this.player.mesh.position.copy(roadPos);
            this.player.rotation.y = Math.PI * 0.75;
            this.player.mesh.rotation.y = Math.PI * 0.75;
        } else if (variant === 4) {
            // Probe 4: Close-up storefront
            const roadPos = new THREE.Vector3(0, 1, 8);
            this.player.position.copy(roadPos);
            this.player.mesh.position.copy(roadPos);
            this.player.rotation.y = Math.PI;
            this.player.mesh.rotation.y = Math.PI;
        }
    }

    async buildProbeScene() {
        window.__probeStatus = 'building-scene';
        try {
            // Use BuildingInstancer to create a small cluster of buildings
            // around a single road block
            
            // Import the road network structure. 3x3 blocks put the roads at
            // x/z = -40,0,40 between real block centers so staged entities and
            // the camera on a road line never land inside a building cell.
            const roadNetwork = new RoadNetwork(3, 40);
            roadNetwork.generate();
            if (this.world && this.world.cityGenerator) {
                this.world.cityGenerator.roadNetwork = roadNetwork;
            }
            
            // Add road meshes
            const roadMeshes = roadNetwork.getRoadMeshes();
            roadMeshes.forEach(m => this.scene.add(m));
            window.__probeStatus = 'roads-added';
            
            // Create a small building cluster (20-30 buildings) using BuildingInstancer
            const buildingInstancer = new BuildingInstancer(this);
            buildingInstancer.roadNetwork = roadNetwork;
            
            // Override generate to create only a few buildings near center
            const originalGenerate = buildingInstancer.generate.bind(buildingInstancer);
            buildingInstancer.generate = () => {
                buildingInstancer.roadNetwork = roadNetwork;
                buildingInstancer.buildingData = [];
                
                const blockSize = roadNetwork.blockSize;
                const buildingPad = blockSize * 0.8;
                const buildingInfos = [];
                
                // Create buildings in the generated blocks
                for (let gx = 0; gx < roadNetwork.grid.length; gx++) {
                    for (let gz = 0; gz < roadNetwork.grid[gx].length; gz++) {
                        const block = roadNetwork.grid[gx][gz];
                        if (!block || !block.hasBuilding) continue;
                        if (Math.random() < 0.3) continue;
                        
                        const wx = block.worldX;
                        const wz = block.worldZ;
                        
                        const minSize = blockSize * 0.3;
                        const maxSize = blockSize * 0.7;
                        const width = MathUtils.random(minSize, maxSize);
                        const depth = MathUtils.random(minSize, maxSize);
                        const height = MathUtils.random(10, 30);
                        const floors = Math.floor(height / 3.5);
                        
                        const x = wx + MathUtils.random(-buildingPad/2 + width/2, buildingPad/2 - width/2);
                        const z = wz + MathUtils.random(-buildingPad/2 + depth/2, buildingPad/2 - depth/2);
                        
                        const bodyMatIndex = Math.floor(Math.random() * buildingInstancer.bodyMaterials.length);
                        const roofType = MathUtils.randomInt(0, 3);
                        const hasDetails = Math.random() < 0.2;
                        
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
                
                buildingInstancer.createBuildingBodies(buildingInfos);
                buildingInstancer.createWindows(buildingInfos);
                buildingInstancer.createRoofsAndDetails(buildingInfos);
                
                buildingInstancer.buildingData = buildingInfos.map((info, i) => ({
                    ...info,
                    instanceIndex: i,
                    type: 'building'
                }));
                
                return buildingInstancer.getAllMeshes();
            };
            
            // Create buildings
            const buildingMeshes = buildingInstancer.generate(roadNetwork);
            buildingMeshes.forEach(m => this.scene.add(m));
            window.__probeStatus = 'buildings-added';
            
            // Add variant-specific entities
            await this.spawnProbeEntities();
            window.__probeStatus = 'entities-added';
            
            // Add player
            this.scene.add(this.player.mesh);
            
            window.__probeStatus = 'scene-complete';
            console.log('Probe scene built');
        } catch (e) {
            console.error('buildProbeScene FAILED:', e.message, e.stack);
            window.__probeStatus = 'error: ' + e.message;
            throw e;
        }
    }
    
    async spawnProbeEntities() {
        const variant = this.probeVariant;
        
        switch (variant) {
            case 1:
                // Probe 1: Street chase - player on foot, 2 police cars behind in pursuit
                // Add 2 police cars chasing the player
                {
                    const policeCar1 = new PoliceCar(this, {
                        position: new THREE.Vector3(0, 0.5, -14),
                        rotation: Math.PI
                    });
                    policeCar1.init();
                    policeCar1.mesh.position.set(0, 0.5, -14);
                    policeCar1.mesh.rotation.y = Math.PI;
                    this.scene.add(policeCar1.mesh);

                    const policeCar2 = new PoliceCar(this, {
                        position: new THREE.Vector3(4, 0.5, -26),
                        rotation: Math.PI
                    });
                    policeCar2.init();
                    policeCar2.mesh.position.set(4, 0.5, -26);
                    policeCar2.mesh.rotation.y = Math.PI;
                    this.scene.add(policeCar2.mesh);

                    // Add a couple pedestrians on the sidewalk
                    for (let i = 0; i < 2; i++) {
                        const ped = new Pedestrian(this, {
                            position: new THREE.Vector3(-5.5 + i * 11, 1, 3),
                            rotation: Math.PI
                        });
                        ped.init();
                        this.scene.add(ped.mesh);
                    }

                    // Add a couple parked cars on the road edge
                    const parkedPos = [
                        new THREE.Vector3(5, 0.5, 15),
                        new THREE.Vector3(-5, 0.5, -12),
                    ];
                    for (const pos of parkedPos) {
                        const car = new Car(this, { position: pos, rotation: Math.PI/4, isParked: true });
                        car.init();
                        this.scene.add(car.mesh);
                    }
                }
                break;
                
            case 2:
                // Probe 2: Driving - player in car, traffic cars, police behind
                // Spawn a car for the player to drive
                {
                    const playerCar = new Car(this, {
                        position: new THREE.Vector3(0, 0.5, -10),
                        rotation: Math.PI,
                        isPlayerVehicle: true
                    });
                    playerCar.init();
                    this.scene.add(playerCar.mesh);

                    // Player enters the car
                    this.player.enterVehicle(playerCar);
                    this.player.mesh.visible = false;

                    // Add traffic cars ahead on the same road
                    for (let i = 1; i <= 3; i++) {
                        const trafficCar = new TrafficCar(this, {
                            position: new THREE.Vector3(2.5 * (i % 2 === 0 ? -1 : 1), 0.5, -10 - i * 20),
                            rotation: Math.PI
                        });
                        trafficCar.init();
                        this.scene.add(trafficCar.mesh);
                    }

                    // Police car behind
                    const policeCar = new PoliceCar(this, {
                        position: new THREE.Vector3(0, 0.5, 14),
                        rotation: Math.PI
                    });
                    policeCar.init();
                    this.scene.add(policeCar.mesh);

                    // Add some traffic cars in the opposite lane
                    for (let i = 1; i <= 2; i++) {
                        const trafficCar = new TrafficCar(this, {
                            position: new THREE.Vector3(2.5, 0.5, 30 + i * 25),
                            rotation: 0
                        });
                        trafficCar.init();
                        this.scene.add(trafficCar.mesh);
                    }
                }
                break;
                
            case 3:
                // Probe 3: Combat - player aiming, police approaching, mission marker
                // Add mission marker
                {
                    const markerGeo = new THREE.CylinderGeometry(1, 1, 3, 8);
                    const markerMat = new THREE.MeshBasicMaterial({ 
                        color: 0xffff00, 
                        transparent: true, 
                        opacity: 0.8 
                    });
                    const marker = new THREE.Mesh(markerGeo, markerMat);
                    marker.position.set(6, 1.5, -30);
                    marker.userData = { isMissionMarker: true };
                    this.scene.add(marker);
                    
                    // Add a mission beacon (vertical beam)
                    const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, 50, 8);
                    const beamMat = new THREE.MeshBasicMaterial({ 
                        color: 0xffff00, 
                        transparent: true, 
                        opacity: 0.5,
                        side: THREE.DoubleSide
                    });
                    const beam = new THREE.Mesh(beamGeo, beamMat);
                    beam.position.set(6, 25, -30);
                    this.scene.add(beam);
                    
                    // Add 2 police cars approaching
                    const policeCar1 = new PoliceCar(this, {
                        position: new THREE.Vector3(-6, 0.5, -28),
                        rotation: Math.PI * 0.25
                    });
                    policeCar1.init();
                    this.scene.add(policeCar1.mesh);

                    const policeCar2 = new PoliceCar(this, {
                        position: new THREE.Vector3(6, 0.5, -20),
                        rotation: Math.PI * 0.75
                    });
                    policeCar2.init();
                    this.scene.add(policeCar2.mesh);

                    // Add 2 police on foot
                    for (let i = 0; i < 2; i++) {
                        const ped = new PolicePed(this, {
                            position: new THREE.Vector3(-4 + i * 6, 1, -25),
                            rotation: Math.PI
                        });
                        ped.init();
                        this.scene.add(ped.mesh);
                    }

                    // Add explosion effect (static)
                    this.addExplosionEffect(new THREE.Vector3(-2, 1, -22));
                }
                break;
                
            case 4:
                // Probe 4: Canyon - keep current canyon view with player and car
                // Player near a car on canyon road
                {
                    const car = new Car(this, {
                        position: new THREE.Vector3(4, 0.5, 5),
                        rotation: Math.PI/4,
                        isParked: true
                    });
                    car.init();
                    this.scene.add(car.mesh);

                    // Add a few more parked cars along the road edge
                    const canyonCars = [
                        new THREE.Vector3(-5, 0.5, -12),
                        new THREE.Vector3(5, 0.5, 18),
                        new THREE.Vector3(-5, 0.5, 28),
                    ];
                    for (const pos of canyonCars) {
                        const car = new Car(this, { position: pos, rotation: Math.PI/4, isParked: true });
                        car.init();
                        this.scene.add(car.mesh);
                    }
                }
                break;
        }
        
        window.__probeStatus = 'entities-added';
        console.log('Probe entities spawned for variant:', variant);
    }
    
    addExplosionEffect(position) {
        // Static explosion visual - expanding ring + particles
        const ringGeo = new THREE.RingGeometry(0.5, 3, 16);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0xff6600, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        // Fire particles
        for (let i = 0; i < 20; i++) {
            const geo = new THREE.SphereGeometry(0.2, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5),
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 4;
            particle.position.y += Math.random() * 3;
            particle.position.z += (Math.random() - 0.5) * 4;
            this.scene.add(particle);
        }
    }

    setupRenderer() {
        const isLowQuality = this.quality === 'low';
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: !isLowQuality,
            alpha: false,
            powerPreference: isLowQuality ? 'low-power' : 'high-performance'
        });
        
        // Cap render size for low quality
        if (isLowQuality) {
            this.renderer.setSize(1280, 720);
        } else {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        this.renderer.setPixelRatio(isLowQuality ? 1 : Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = !isLowQuality;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        window.addEventListener('resize', () => this.onResize());
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
        
        this.camera = new THREE.PerspectiveCamera(
            70, window.innerWidth / window.innerHeight, 0.1, 2000
        );
        this.camera.position.set(0, 5, 15);
    }

    setupLights() {
        const isLowQuality = this.quality === 'low';
        
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        this.ambientLight = ambient;
        
        // Directional (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
        this.sunLight.position.set(100, 200, 50);
        this.sunLight.castShadow = !isLowQuality;
        if (!isLowQuality) {
            this.sunLight.shadow.mapSize.width = 2048;
            this.sunLight.shadow.mapSize.height = 2048;
            this.sunLight.shadow.camera.near = 1;
            this.sunLight.shadow.camera.far = 400;
            this.sunLight.shadow.camera.left = -200;
            this.sunLight.shadow.camera.right = 200;
            this.sunLight.shadow.camera.top = 200;
            this.sunLight.shadow.camera.bottom = -200;
            this.sunLight.shadow.bias = -0.0005;
            this.sunLight.shadow.normalBias = 0.02;
        }
        this.scene.add(this.sunLight);
        
        // Hemisphere for sky color
        this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x224422, 0.6);
        this.scene.add(this.hemiLight);
    }

    setupPostProcessing() {
        // Simple post-processing can be added here if needed
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        const isLowQuality = this.quality === 'low';
        if (isLowQuality) {
            this.renderer.setSize(1280, 720);
        } else if (this.probeMode) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        } else {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        if (this.hud) this.hud.onResize();
    }

    setupAutoTest() {
        // Scripted sequence: walk, get in car, drive, shoot
        this.autoTestSequence = [
            { action: 'wait', duration: 1000 },
            { action: 'move', input: { x: 0, z: -1 }, duration: 2000 },
            { action: 'interact', duration: 500 },
            { action: 'wait', duration: 1000 },
            { action: 'drive', input: { accelerate: 1, steer: 0 }, duration: 5000 },
            { action: 'shoot', duration: 1000 },
            { action: 'wait', duration: 2000 }
        ];
        if (this.autoTestSequence.length > MAX_AUTO_TEST_STEPS) {
            this.autoTestSequence.length = MAX_AUTO_TEST_STEPS;
        }
        this.autoTestIndex = 0;
        this.autoTestTimer = 0;
    }

    jumpToScene(scene) {
        switch (scene) {
            case 'city':
                // Spawn player at city center road intersection
                const centerPos = this.world.cityGenerator.getCityCenterRoadPosition();
                this.player.mesh.position.copy(centerPos);
                this.player.position.copy(centerPos);
                // Face player toward city center (buildings are at -x direction)
                this.player.rotation.y = Math.PI;
                this.player.mesh.rotation.y = Math.PI;
                // Position camera for city overview - behind and above player
                this.cameraController.chaseDistance = 8;
                this.cameraController.chaseHeight = 3.5;
                this.cameraController.lookAheadDistance = 4;
                this.cameraController.lookAtHeight = 1.5;
                this.cameraController.idealYaw = Math.PI;
                this.cameraController.yaw = Math.PI;
                this.cameraController.refresh();
                break;
            case 'street':
                // Spawn at a photogenic night street spot
                this.world.timeOfDay = 0.75; // Night
                this.world.updateLighting();
                
                // Find a road intersection near building cluster for photogenic view
                const streetPos = this.world.cityGenerator.getCityCenterRoadPosition();
                this.player.mesh.position.copy(streetPos);
                this.player.position.copy(streetPos);
                this.player.rotation.y = Math.PI; // Face toward city center (-x)
                this.player.mesh.rotation.y = Math.PI;
                
                // Position camera for street-level view
                this.cameraController.chaseDistance = 8;
                this.cameraController.chaseHeight = 3.5;
                this.cameraController.lookAheadDistance = 6;
                this.cameraController.lookAtHeight = 1.5;
                this.cameraController.idealYaw = Math.PI;
                this.cameraController.yaw = Math.PI;
                this.cameraController.refresh();
                
                // Spawn some traffic and peds nearby for life
                this.world.spawnInitialTraffic();
                this.world.spawnInitialPedestrians();
                break;
            case 'driving':
                const car = this.world.getNearestVehicle(this.player.mesh.position, 20);
                if (car) this.player.enterVehicle(car);
                else {
                    // Spawn a car
                    const newCar = this.world.spawnParkedCar(new THREE.Vector3(5, 0.5, 0), 0);
                    if (newCar) this.player.enterVehicle(newCar);
                }
                break;
            case 'police':
                this.player.wantedLevel = 3;
                this.player.wantedTimer = 60;
                this.world.spawnPoliceNearPlayer();
                break;
            case 'mission':
                this.missionManager.startMission(0);
                break;
            case 'night':
                this.world.timeOfDay = 0.75; // Night
                this.world.updateLighting();
                break;
        }
    }

    updateAutoTest(delta) {
        if (!this.autoTest || this.autoTestIndex >= this.autoTestSequence.length) return;
        
        const step = this.autoTestSequence[this.autoTestIndex];
        this.autoTestTimer += delta * 1000;
        
        if (this.autoTestTimer >= step.duration) {
            this.autoTestIndex++;
            this.autoTestTimer = 0;
            return;
        }
        
        // Apply input based on action via InputManager simulation
        switch (step.action) {
            case 'move':
                if (step.input.z < 0) this.input.simulateKey('KeyW', true);
                if (step.input.z > 0) this.input.simulateKey('KeyS', true);
                if (step.input.x < 0) this.input.simulateKey('KeyA', true);
                if (step.input.x > 0) this.input.simulateKey('KeyD', true);
                if (this.autoTestTimer > step.duration - 100) {
                    this.input.simulateKey('KeyW', false);
                    this.input.simulateKey('KeyS', false);
                    this.input.simulateKey('KeyA', false);
                    this.input.simulateKey('KeyD', false);
                }
                break;
            case 'interact':
                if (this.autoTestTimer < 100) this.input.simulateKey('KeyE', true);
                else this.input.simulateKey('KeyE', false);
                break;
            case 'drive':
                if (step.input.accelerate > 0) this.input.simulateKey('KeyW', true);
                else this.input.simulateKey('KeyW', false);
                if (step.input.brake > 0) this.input.simulateKey('KeyS', true);
                else this.input.simulateKey('KeyS', false);
                if (step.input.steer < 0) this.input.simulateKey('KeyA', true);
                else this.input.simulateKey('KeyA', false);
                if (step.input.steer > 0) this.input.simulateKey('KeyD', true);
                else this.input.simulateKey('KeyD', false);
                if (step.input.handbrake) this.input.simulateKey('Space', true);
                else this.input.simulateKey('Space', false);
                break;
            case 'shoot':
                if (this.autoTestTimer < 100) {
                    this.input.simulateKey('Mouse0', true);
                    this.player.shoot();
                } else {
                    this.input.simulateKey('Mouse0', false);
                }
                break;
        }
    }

    update(delta) {
        // Apply time scale for fast-forward
        const scaledDelta = delta * (this.timeScale || 1.0);
        
        this.time += scaledDelta;
        this.frameCount++;
        
        if (this.state === 'playing') {
            // Update systems
            this.input.update();
            this.player.update(scaledDelta);
            this.world.update(scaledDelta);
            this.missionManager.update(scaledDelta);
            this.hud.update(scaledDelta);
            this.cameraController.update(scaledDelta, this.input);
            this.skySystem.update(scaledDelta);
            this.lightingSystem.update(scaledDelta);
            this.effects.update(scaledDelta);
            this.weaponManager.update(scaledDelta);
            this.updateDayNightCycle(scaledDelta);
            
            if (this.autoTest) this.updateAutoTest(scaledDelta);
        } else if (this.state === 'paused') {
            // Only update pause menu
        }
    }

    updateDayNightCycle(delta) {
        // 4 minute cycle = 240 seconds
        const cycleSpeed = 1 / 240;
        this.world.timeOfDay = (this.world.timeOfDay + delta * cycleSpeed) % 1;
        this.world.updateLighting();
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        // Check freeze frames
        if (this.freezeFrames > 0) {
            this.freezeFrames--;
            if (this.freezeFrames === 0) {
                this.isRunning = false;
                return;
            }
        }
        
        this.delta = this.clock.getDelta();
        try {
            this.update(this.delta);
        } catch (e) {
            console.error('Update error:', e.stack);
        }
        try {
            this.render();
        } catch (e) {
            console.error('Render error:', e.stack);
        }
        
        requestAnimationFrame(() => this.animate());
    }

    setState(newState) {
        this.state = newState;
        this.input.setEnabled(newState === 'playing');
        
        if (newState === 'playing') {
            this.audio.resume();
        }
    }

    pause() {
        if (this.state === 'playing') {
            this.setState('paused');
            this.pauseMenu.show();
        }
    }

    resume() {
        if (this.state === 'paused') {
            this.setState('playing');
            this.pauseMenu.hide();
        }
    }

    gameOver(busted = true) {
        this.setState(busted ? 'busted' : 'gameover');
        this.player.reset();
        this.world.reset();
        this.missionManager.reset();
        if (busted) this.missionUI.showBusted();
        else this.missionUI.showGameOver();
    }

    saveGame() {
        const gameState = {
            player: this.player,
            world: this.world,
            missionManager: this.missionManager,
            stats: { playTime: this.time },
            settings: { volume: this.audio.volume }
        };
        return SaveLoad.save(gameState);
    }

    loadGame() {
        const data = SaveLoad.load();
        if (!data) return false;
        
        SaveLoad.deserializePlayer(data.player, this.player, this.world);
        SaveLoad.deserializeWorld(data.world, this.world);
        SaveLoad.deserializeMissions(data.missionManager, this.missionManager);
        
        this.hud.updateFromPlayer();
        return true;
    }

    newGame() {
        this.player.reset();
        this.world.reset();
        this.missionManager.reset();
        this.hud.updateFromPlayer();
        this.setState('playing');
        this.titleScreen.hide();
    }

    quitToTitle() {
        this.setState('title');
        this.titleScreen.show();
        this.player.reset();
        this.world.reset();
        this.missionManager.reset();
    }
}

window.Game = Game;