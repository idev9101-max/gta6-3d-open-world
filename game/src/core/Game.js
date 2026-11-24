// SOLMAR NIGHTS - main game class. Three.js setup, entity management,
// wanted system, main loop, probe-mode staged scenes.

var Game = function () {
    // DOM
    this.canvas = document.getElementById('game-canvas');
    this.uiOverlay = document.getElementById('ui-overlay');

    // Three.js
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Subsystems
    this.input = null;
    this.audio = null;
    this.cam = null;
    this.world = null;
    this.player = null;
    this.hud = null;
    this.minimap = null;
    this.weapons = null;
    this.effects = null;
    this.missions = null;
    this.missionManager = null;
    this.titleScreen = null;
    this.pauseMenu = null;
    this.howToPlay = null;
    this.missionUI = null;

    // State
    this.running = false;
    this.paused = false;
    this.inMenu = true;
    this.probe = null; // {n:1..4, seed} or null
    this.probeReady = false;
    this.probeTimer = 0;

    // Wanted system
    this.wantedLevel = 0;
    this.wantedDecayTimer = 0;
    this.wantedDecayDelay = 6; // seconds before stars decay
    this.wantedMax = 5;

    // Time / weather
    this.timeOfDay = 22; // hour 0-23, night
    this.daySpeed = 0.0005;

    // Save data
    this.saveData = null;

    // Temp vectors
    this._v3 = new THREE.Vector3();
    this._q = new THREE.Quaternion();

    this._bind();
};

Game.prototype._bind = function () {
    this._onResize = this._onResize.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this.animate = this.animate.bind(this);
};

// Detect probe mode from location.search
Game.prototype._detectProbe = function () {
    var m = location.search.match(/[?&]probe=([1-4])/);
    if (m) {
        this.probe = { n: parseInt(m[1], 10), seed: 0x12345678 };
        return true;
    }
    return false;
};

Game.prototype.init = function () {
    this._detectProbe();
    this.saveData = SaveLoad.load();

    // Audio context must start on user interaction; init lazily on first click too
    this.audio = new Audio();
    this.audio.init();

    this.input = new Input(this.canvas);
    this.input.init();

    this.cam = new Camera();

    this._setupThree();
    this._setupScene();
    this._setupWorld();
    this._setupPlayer();
    this._setupUI();

    if (this.probe) {
        this._buildProbeScene();
        this.inMenu = false;
        this.running = true;
        this.paused = false;
    } else {
        this.titleScreen.show();
    }

    window.addEventListener('resize', this._onResize);
    this._onResize();
    this.running = true;
    this.animate();
};

Game.prototype._setupThree = function () {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.015);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
};

Game.prototype._setupScene = function () {
    // Ambient / moon lighting handled by Lighting.js applied to scene below
    // Sky dome
    this.sky = new Sky();
    this.sky.build(this.scene);

    // Lighting
    this.lighting = new Lighting();
    this.lighting.build(this.scene);

    // Ocean
    this.ocean = new Ocean();
    this.ocean.build(this.scene);

    // Grid floor hint (ocean covers most; grid drawn in shallow harbor)
    var grid = new THREE.GridHelper(400, 40, 0x112244, 0x080c18);
    grid.position.y = 0.01;
    this.scene.add(grid);
};

Game.prototype._setupWorld = function () {
    this.world = new World(this);
    this.world.init();
};

Game.prototype._setupPlayer = function () {
    this.player = new Player(this);
    this.player.init();
};

Game.prototype._setupUI = function () {
    this.hud = new HUD(this);
    this.minimap = new Minimap(this);
    this.weapons = new Weapons(this);
    this.effects = new Effects(this);
    this.missions = new Missions(this);
    this.missionManager = new MissionManager(this);
    this.titleScreen = new TitleScreen(this);
    this.pauseMenu = new PauseMenu(this);
    this.howToPlay = new HowToPlay(this);
    this.missionUI = new MissionUI(this);

    this.hud.init();
    this.minimap.init();
    this.titleScreen.init();
    this.pauseMenu.init();
    this.howToPlay.init();
    this.missionUI.init();
};

Game.prototype._onResize = function () {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
};

Game.prototype._onKeyDown = function (e) {
    if (e.code === 'KeyM' && this.input.wasPressed('KeyM')) {
        this.minimap.toggle();
    }
};

// ---------------- Wanted system ----------------

Game.prototype.addWanted = function (amount) {
    if (this.probe) return;
    if (this.wantedLevel >= this.wantedMax) return;
    var next = Math.min(this.wantedMax, this.wantedLevel + amount);
    if (next > this.wantedLevel) {
        this.wantedLevel = next;
        this.wantedDecayTimer = this.wantedDecayDelay;
        this.audio.sirenStart();
        this.hud.updateWanted(this.wantedLevel);
        if (this.wantedLevel >= 3) this.missionManager.reportCrime();
    }
};

Game.prototype.reduceWanted = function (dt) {
    if (this.wantedLevel <= 0) return;
    this.wantedDecayTimer -= dt;
    if (this.wantedDecayTimer <= 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.wantedDecayTimer = this.wantedDecayDelay;
        this.hud.updateWanted(this.wantedLevel);
        if (this.wantedLevel === 0) this.audio.sirenStop();
    }
};

Game.prototype.setWanted = function (level) {
    this.wantedLevel = MathUtils.clamp(level, 0, this.wantedMax);
    this.wantedDecayTimer = this.wantedLevel > 0 ? this.wantedDecayDelay : 0;
    this.hud.updateWanted(this.wantedLevel);
    if (this.wantedLevel > 0) this.audio.sirenStart(); else this.audio.sirenStop();
};

// ---------------- Probe mode ----------------

Game.prototype._buildProbeScene = function () {
    var rng = new MathUtils.SeededRNG(this.probe.seed);
    this.world.probeMode = true;
    // ensure stubs exist
    this.world.collisionBounds = this.world.collisionBounds || [];
    this.world.roadNetwork = this.world.roadNetwork || { segments: [], intersections: [] };
    this.world.vehicles = this.world.vehicles || [];
    this.world.pedestrians = this.world.pedestrians || [];
    this.world.timeOfDay = this.timeOfDay;

    // Showcase lighting: probe captures freeze a posed scene, so light it like
    // a lit street at dusk instead of the ambient midnight defaults.
    if (this.lighting) {
        this.lighting.hemi.color.setHex(0x445588);
        this.lighting.hemi.groundColor.setHex(0x1a1420);
        this.lighting.hemi.intensity = 1.15;
        this.lighting.dir.color.setHex(0xffcc99);
        this.lighting.dir.intensity = 1.5;
    }
    // A soft ambient lift keeps the asphalt and unlit surfaces readable in the
    // frozen frame instead of crushing them to black.
    var ambient = new THREE.AmbientLight(0x2a3550, 0.85);
    this.scene.add(ambient);

    // Hide the generated city: probe scenes stage their own skyline so the
    // framed corridor stays clear of random buildings. Its collision boxes
    // are cleared too so the camera boom is not blocked by invisible walls.
    if (this.world.group) this.world.group.visible = false;
    if (this.world.instMesh) this.world.instMesh.visible = false;
    this.world.collisionBounds.length = 0;

    var n = this.probe.n;
    if (n === 1) this._probe1(rng);
    else if (n === 2) this._probe2(rng);
    else if (n === 3) this._probe3(rng);
    else if (n === 4) this._probe4(rng);

    // Cancel any auto-hide timeouts so mission text stays visible
    if (this.missionManager) this.missionManager.cancelAutoHide();

    this.hud.updateWanted(this.wantedLevel);
    this.hud.updateMissionText('PROBE MODE ' + n);
    this.missionManager.showMissionText('Probe shot ' + n, true);
};

Game.prototype._placeNeonBuildings = function (rng, count, cx, cz, spread) {
    for (var i = 0; i < count; i++) {
        var bx = cx + rng.range(-spread, spread);
        var bz = cz + rng.range(-spread, spread);
        var h = rng.range(12, 32);
        var color = MathUtils.randomNeonColor(rng);
        this.world.addProbeBuilding(bx, bz, h, color);
    }
};

// Backdrop skyline for probe captures: a far wall of buildings behind the
// staged action plus flanking rows left and right of a clear street corridor,
// so buildings frame the shot instead of swallowing the staged entities.
Game.prototype._placeBackdrop = function (rng, farZ, sideZMax, countFar, countSide) {
    var i, bx, bz;
    for (i = 0; i < (countFar || 14); i++) {
        bx = rng.range(-38, 38);
        bz = farZ + rng.range(0, 14);
        this.world.addProbeBuilding(bx, bz, rng.range(16, 36), MathUtils.randomNeonColor(rng));
    }
    for (i = 0; i < (countSide || 10); i++) {
        var side = i % 2 === 0 ? -1 : 1;
        bx = side * rng.range(24, 44);
        bz = rng.range(10, sideZMax);
        this.world.addProbeBuilding(bx, bz, rng.range(12, 30), MathUtils.randomNeonColor(rng));
    }
};

Game.prototype._probe1 = function (rng) {
    // Cover shot: player on foot at an intersection, 5-star wanted, police converging from ahead.
    this.setWanted(5);
    this.player.spawn(0, 1, 20, 0);
    this.player.setOnFoot(true);

    var cars = [];
    var c1 = this.world.spawnProbePoliceCar(-11, 1, 30, Math.PI);
    c1.targetPlayer = this.player; c1.setSpeed(14);
    var c2 = this.world.spawnProbePoliceCar(4, 1, 44, Math.PI);
    c2.targetPlayer = this.player; c2.setSpeed(14);
    var c3 = this.world.spawnProbePoliceCar(-4, 1, 22, Math.PI);
    c3.targetPlayer = this.player; c3.setSpeed(14);
    cars.push(c1.position.clone(), c2.position.clone(), c3.position.clone());

    var peds = [[9, 1, 17], [-13, 1, 28], [0, 1, 38], [-7, 1, 44], [14, 1, 32]];
    for (var i = 0; i < peds.length; i++) {
        var q = peds[i];
        this.world.spawnProbePedestrian(q[0], q[1], q[2], 0);
    }

    this._probeFxTargets = cars;

    this.cam.inVehicle = false;
    this.cam.distance = 9;
    this.cam.height = 4.5;
    this.cam.verticalAngle = -0.55;
    this.cam.update(0, this.player.mesh.position, this.player.mesh.quaternion, null, this.world.collisionBounds);
    this.camera.position.copy(this.cam.position);
    this.camera.lookAt(this.cam.lookAtTarget);

    this._placeBackdrop(rng, 62, 46, 16, 12);

    this.missionManager.showMissionText('Evade the police', true);
};

Game.prototype._probe2 = function (rng) {
    // Driving view: player in a car down a lit avenue with traffic ahead.
    this.player.spawn(0, 1, 0, 0);
    this.player.setOnFoot(false);
    var car = this.world.spawnProbePlayerCar(0, 1, 0, 0);
    this.player.enterVehicle(car);
    this.car = car;
    car.setSpeed(7);

    var traffic = [];
    var spots = [[-7, 1, 26, 0], [-1, 1, 40, 0], [6, 1, 28, 0], [-4, 1, 48, 0], [1, 1, 56, 0], [8, 1, 44, 0]];
    for (var i = 0; i < spots.length; i++) {
        var s = spots[i];
        var tc = this.world.spawnProbeTrafficCar(s[0], s[1], s[2], s[3]);
        if (tc) { tc.setSpeed(7); traffic.push(tc.position.clone()); }
    }

    var police = this.world.spawnProbePoliceCar(10, 1, 22, 0);
    if (police) police.setSpeed(0);

    this._placeBackdrop(rng, 76, 62, 14, 12);

    this._probeFxTargets = traffic;

    this.cam.inVehicle = true;
    this.cam.update(0, this.player.mesh.position, this.player.mesh.quaternion, null, this.world.collisionBounds);
    var f = car.getForward();
    var pos = car.position.clone().add(new THREE.Vector3(0, 5, 0)).add(f.clone().multiplyScalar(-9));
    var look = car.position.clone().add(new THREE.Vector3(0, 1.2, 0)).add(f.clone().multiplyScalar(34));
    this.camera.position.copy(pos);
    this.camera.lookAt(look);

    this.missionManager.showMissionText('Reach the drop-off', true);
};

Game.prototype._probe3 = function (rng) {
    // Plaza combat: pedestrians at varied distances ahead, impacts and muzzle flash.
    this.player.spawn(0, 1, 16, 0);
    this.player.setOnFoot(true);
    this.setWanted(2);

    var peds = [[-6, 1, 24], [4, 1, 30], [-3, 1, 38], [6, 1, 27], [-7, 1, 44], [2, 1, 50]];
    var targets = [];
    for (var i = 0; i < peds.length; i++) {
        var q = peds[i];
        this.world.spawnProbePedestrian(q[0], q[1], q[2], 0);
        targets.push(new THREE.Vector3(q[0], q[1], q[2]));
    }

    this._placeBackdrop(rng, 66, 54, 16, 12);

    this._probeFxTargets = targets;

    this.cam.inVehicle = false;
    this.cam.distance = 7.5;
    this.cam.height = 4;
    this.cam.verticalAngle = -0.4;
    this.cam.update(0, this.player.mesh.position, this.player.mesh.quaternion, null, this.world.collisionBounds);
    this.camera.position.copy(this.cam.position);
    this.camera.lookAt(this.cam.lookAtTarget);

    this.missionManager.showMissionText('Plaza disturbance', true);
};

Game.prototype._probe4 = function (rng) {
    // Street canyon vista: parked curb cars, traffic, pedestrians, dense tall buildings.
    this.player.spawn(0, 1, 16, 0);
    this.player.setOnFoot(true);
    this.setWanted(1);

    var parked = [[-7.5, 1, 28, 0], [-7.5, 1, 38, 0], [7.5, 1, 30, 0], [7.5, 1, 42, 0]];
    var targets = [];
    for (var i = 0; i < parked.length; i++) {
        var q = parked[i];
        this.world.spawnProbeParkedCar(q[0], q[1], q[2], q[3]);
        targets.push(new THREE.Vector3(q[0], q[1], q[2]));
    }
    var spots = [[-2, 1, 48, 0], [4, 1, 58, 0]];
    for (var i = 0; i < spots.length; i++) {
        var s = spots[i];
        var tc = this.world.spawnProbeTrafficCar(s[0], s[1], s[2], s[3]);
        if (tc) { tc.setSpeed(6); targets.push(tc.position.clone()); }
    }
    var peds = [[-9, 1, 33], [9, 1, 29], [-9, 1, 41], [9, 1, 37]];
    for (var i = 0; i < peds.length; i++) {
        var q = peds[i];
        this.world.spawnProbePedestrian(q[0], q[1], q[2], 0);
    }

    this._placeBackdrop(rng, 78, 66, 14, 12);

    this._probeFxTargets = targets;

    this.cam.inVehicle = false;
    this.cam.distance = 8;
    this.cam.height = 4.2;
    this.cam.verticalAngle = -0.5;
    this.cam.update(0, this.player.mesh.position, this.player.mesh.quaternion, null, this.world.collisionBounds);
    this.camera.position.copy(this.cam.position);
    this.camera.lookAt(this.cam.lookAtTarget);

    this.missionManager.showMissionText('Storefront canyon', true);
};

Game.prototype._probeFx = function (dt) {
    if (!this.probe) return;
    this._fxFrame = (this._fxFrame || 0) + 1;
    var p = this.player.mesh.position;
    var origin = new THREE.Vector3(p.x, p.y + 1.5, p.z);
    var targets = this._probeFxTargets;
    var dir = new THREE.Vector3(0, 0, 1);
    if (targets && targets.length) {
        var t = targets[0];
        dir.subVectors(t, origin).normalize();
    }
    this.effects.spawnTracer(origin.x, origin.y, origin.z, dir, 44, 0xff3333);
    if (this._fxFrame % 4 === 0) {
        this.effects.spawnMuzzleFlash(origin.x, origin.y, origin.z);
    }
    if (targets && targets.length && this._fxFrame % 10 === 0) {
        var ti = targets[((this._fxFrame / 10) | 0) % targets.length];
        var tx = ti.x + (Math.random() - 0.5) * 4;
        var ty = ti.y + 0.5 + Math.random() * 2;
        var tz = ti.z + (Math.random() - 0.5) * 4;
        this.effects.spawnImpact(tx, ty, tz, 0xffaa00, 0);
    }
};

// ---------------- Live world population ----------------

Game.prototype._spawnLiveEntities = function () {
    // Ambient traffic on roads
    var roads = this.world.roads;
    var segs = roads.segments;
    var count = 0;
    for (var i = 0; i < segs.length && count < 14; i++) {
        var s = segs[i];
        if (Math.random() > 0.5) continue;
        var mx = (s.start.x + s.end.x) / 2;
        var mz = (s.start.y + s.end.y) / 2;
        var car = new TrafficCar(this.game);
        car.init(mx, 1, mz, Math.atan2(s.end.x - s.start.x, s.end.y - s.start.y));
        car.setSpeed(9);
        this.world.addVehicle(car);
        count++;
    }
    // Pedestrians on sidewalks (near block centers)
    var bs = roads.blockSize, half = roads.half, n = roads.blocks;
    for (var bi = 0; bi < n && count < 40; bi++) {
        for (var bj = 0; bj < n && count < 40; bj++) {
            if (Math.random() > 0.4) continue;
            var bx = -half + bi * bs + bs / 2 + (Math.random() - 0.5) * 20;
            var bz = -half + bj * bs + bs / 2 + (Math.random() - 0.5) * 20;
            var ped = new Pedestrian(this.game);
            ped.init(bx, 1, bz, Math.random() * Math.PI * 2);
            this.world.addPedestrian(ped);
            count++;
        }
    }
};

// ---------------- Collision & crime detection ----------------

Game.prototype.handleCollisions = function (dt) {
    var game = this;
    var p = this.player;
    var world = this.world;

    if (p.inVehicle && p.vehicle) {
        var v = p.vehicle;
        var vfwd = v.getForward();

        // Vehicle vs pedestrians
        for (var i = 0; i < world.pedestrians.length; i++) {
            var ped = world.pedestrians[i];
            if (!ped.alive) continue;
            var d = MathUtils.dist3d(v.position.x, 0, v.position.z, ped.position.x, 0, ped.position.z);
            if (d < 1.8) {
                ped.hit();
                this.addWanted(1);
                this.audio.thump(1);
                v.speed *= 0.6;
            }
        }

        // Vehicle vs other vehicles (ramming)
        for (var i = 0; i < world.vehicles.length; i++) {
            var other = world.vehicles[i];
            if (other === v || other.dead) continue;
            var d = MathUtils.dist3d(v.position.x, 0, v.position.z, other.position.x, 0, other.position.z);
            if (d < 2.2) {
                this.addWanted(0.5);
                this.audio.thump(0.8);
                // knock back
                var knock = new THREE.Vector3().subVectors(v.position, other.position).normalize();
                other.position.add(knock.multiplyScalar(6));
                other.speed *= 0.7;
                v.speed *= 0.8;
                if (other instanceof PoliceCar) {
                    // police ram back harder
                    v.position.add(knock.clone().multiplyScalar(-4));
                }
            }
        }

        // Vehicle vs buildings (soft stop)
        var bb = new THREE.Box3().setFromObject(v.body);
        for (var i = 0; i < world.collisionBounds.length; i++) {
            var b = world.collisionBounds[i];
            if (bb.min.x < b.max.x && bb.max.x > b.min.x &&
                bb.min.z < b.max.z && bb.max.z > b.min.z &&
                bb.min.y < b.max.y && bb.max.y > b.min.y) {
                v.position.add(vfwd.clone().multiplyScalar(-v.speed * dt * 2));
                v.speed *= 0.4;
                this.audio.thump(0.6);
                this.addWanted(0.25);
            }
        }
    } else {
        // On foot: check weapon hits handled in Weapons; check police proximity
        for (var i = 0; i < world.pedestrians.length; i++) {
            var ped = world.pedestrians[i];
            if (ped.mesh && ped.mesh.userData && ped.mesh.userData.police && ped.alive) {
                var d = MathUtils.dist3d(p.position.x, 0, p.position.z, ped.position.x, 0, ped.position.z);
                if (d < 1.5) {
                    this.gameOverBusted();
                }
            }
        }
        for (var i = 0; i < world.vehicles.length; i++) {
            var veh = world.vehicles[i];
            if (veh instanceof PoliceCar) {
                var d = MathUtils.dist3d(p.position.x, 0, p.position.z, veh.position.x, 0, veh.position.z);
                if (d < 2.0) this.gameOverBusted();
            }
        }
    }
};

// ---------------- Wanted decay (escape by staying out of sight) ----------------

Game.prototype.updateWantedDecay = function (dt) {
    if (this.wantedLevel <= 0) return;
    // If player is far from any police, decay faster
    var nearPolice = false;
    var p = this.player;
    var world = this.world;
    for (var i = 0; i < world.pedestrians.length; i++) {
        var ped = world.pedestrians[i];
        if (ped.mesh && ped.mesh.userData && ped.mesh.userData.police && ped.alive) {
            if (MathUtils.dist3d(p.position.x, 0, p.position.z, ped.position.x, 0, ped.position.z) < 40) nearPolice = true;
        }
    }
    for (var i = 0; i < world.vehicles.length; i++) {
        if (world.vehicles[i] instanceof PoliceCar) {
            if (MathUtils.dist3d(p.position.x, 0, p.position.z, world.vehicles[i].position.x, 0, world.vehicles[i].position.z) < 60) nearPolice = true;
        }
    }
    var rate = nearPolice ? 0.5 : 1.5;
    this.wantedDecayTimer -= dt * rate;
    if (this.wantedDecayTimer <= 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.wantedDecayTimer = this.wantedDecayDelay;
        this.hud.updateWanted(this.wantedLevel);
        if (this.wantedLevel === 0) this.audio.sirenStop();
    }
};

// ---------------- Render step ----------------

Game.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
};

// ---------------- Main loop ----------------


Game.prototype.update = function (dt) {
    if (this.paused || this.inMenu && !this.probe) return;

    this.input.update();

    if (this.probe) {
        this.probeTimer += dt;
        // Gentle camera drift for screenshot stability
        var target = this.player ? this.player.mesh.position : new THREE.Vector3();
        this.cam.update(dt, target, this.player ? this.player.mesh.quaternion : new THREE.Quaternion(), null, this.world.collisionBounds);
        this.camera.position.copy(this.cam.position);
        this.camera.lookAt(this.cam.lookAtTarget);
        this.effects.update(dt);
        this._probeFx(dt);
        this.hud.update(dt);
        this.minimap.update(dt);
        this.renderer.render(this.scene, this.camera);
        if (!this.probeReady) {
            this.probeReady = true;
            window.__probeReady = true;
        }
        return;
    }

    this.audio.update(dt);

    if (this.titleScreen.visible) {
        this.titleScreen.update(dt);
        this.renderer.render(this.scene, this.camera);
        return;
    }

    if (this.pauseMenu.visible) {
        this.pauseMenu.update(dt);
        this.renderer.render(this.scene, this.camera);
        return;
    }

    if (this.missionUI.visible) {
        this.missionUI.update(dt);
        this.renderer.render(this.scene, this.camera);
        return;
    }

    this.timeOfDay += this.daySpeed * dt * 60;
    if (this.timeOfDay >= 24) this.timeOfDay -= 24;
    if (this.lighting) this.lighting.updateTime(this.timeOfDay);
    if (this.sky) this.sky.updateTime(this.timeOfDay);

    this.world.update(dt);
    this.player.update(dt);
    this.handleCollisions(dt);
    this.weapons.update(dt);
    this.effects.update(dt);
    this.missionManager.update(dt);
    this.updateWantedDecay(dt);

    this.cam.update(dt, this.player.mesh.position, this.player.mesh.quaternion,
        this.player.aimDir, this.world.collisionBounds);
    this.camera.position.copy(this.cam.position);
    this.camera.lookAt(this.cam.lookAtTarget);

    this.hud.update(dt);
    this.minimap.update(dt);

    this.renderer.render(this.scene, this.camera);
};

Game.prototype.animate = function () {
    if (!this.running) return;
    var dt = Math.min(this.clock.getDelta(), 0.1);
    this.update(dt);
    requestAnimationFrame(this.animate);
};

// ---------------- Misc ----------------

Game.prototype.startGame = function () {
    this.inMenu = false;
    this.paused = false;
    this.titleScreen.hide();
    this.player.respawn();
    this.wantedLevel = 0;
    this.hud.updateWanted(0);
    this.missionManager.startMission(0);
    this.audio.engineStop();
    this._spawnLiveEntities();
};

Game.prototype.pause = function () {
    if (this.inMenu) return;
    this.paused = !this.paused;
    this.pauseMenu.setVisible(this.paused);
    if (this.paused) this.audio.engineStop();
};

Game.prototype.gameOverBusted = function () {
    this.paused = true;
    var el = document.getElementById('busted-screen');
    if (el) el.classList.remove('hidden');
};
