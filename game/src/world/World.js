// SOLMAR NIGHTS - world: roads, buildings, ocean, entities, update loop.

var World = function (game) {
    this.game = game;
    this.roads = null;
    this.buildings = null;
    this.cityGenerator = null;
    this.buildingInstancer = null;
    this.ocean = null;
    this.vehicles = [];
    this.pedestrians = [];
    this.collisionBounds = [];
    this.probeMode = false;
    this.group = new THREE.Group();
    this.probeBuildings = [];
    this.probePoliceCar = null;
    this.probePlayerCar = null;
    this.probeTraffic = [];
    this.probePeds = [];
    this.probeParked = [];
};

World.prototype.init = function () {
    var scene = this.game.scene;

    // Roads
    this.roads = new Roads();
    this.roads.generate();
    scene.add(this.roads.group);

    // City generator + buildings (instanced)
    this.cityGenerator = new CityGenerator(this.game);
    this.buildings = this.cityGenerator.generate(this.roads);

    this.buildingInstancer = new BuildingInstancer();
    var instMesh = this.buildingInstancer.build(this.buildings.length * 3); // room for parts
    scene.add(instMesh);
    this.instMesh = instMesh;
    var self = this;
    this.buildings.forEach(function (b) {
        var mesh = b.makeMesh();
        self.group.add(mesh);
        // also register collision bound
        self.collisionBounds.push({
            min: new THREE.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
            max: new THREE.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2)
        });
    });
    scene.add(this.group);

    // Road bounds for car collision / camera boom
    this.roads.segments.forEach(function (s) {
        var halfW = 5, halfL = 20;
        // coarse bounds
        self.collisionBounds.push({
            min: new THREE.Vector3(Math.min(s.start.x, s.end.x) - halfW, 0, Math.min(s.start.y, s.end.y) - halfW),
            max: new THREE.Vector3(Math.max(s.start.x, s.end.x) + halfW, 1, Math.max(s.start.y, s.end.y) + halfW)
        });
    });
};

World.prototype.update = function (dt) {
    this.roads.updateLights(dt);

    for (var i = this.vehicles.length - 1; i >= 0; i--) {
        var v = this.vehicles[i];
        v.update(dt);
        if (v._dead) {
            v.remove();
            this.vehicles.splice(i, 1);
        }
    }
    for (var i = this.pedestrians.length - 1; i >= 0; i--) {
        var p = this.pedestrians[i];
        p.update(dt);
        if (p._dead) {
            p.remove();
            this.pedestrians.splice(i, 1);
        }
    }

    // Probe helper updates
    for (var i = this.probeTraffic.length - 1; i >= 0; i--) {
        var t = this.probeTraffic[i];
        if (t.update) t.update(dt);
    }
    for (var i = this.probePeds.length - 1; i >= 0; i--) {
        var p = this.probePeds[i];
        if (p.update) p.update(dt);
    }
};

World.prototype.addVehicle = function (vehicle) {
    this.vehicles.push(vehicle);
    // Sync the transform at spawn so probe captures and the first rendered
    // frame show the mesh where it was placed, not at the origin.
    vehicle.mesh.position.copy(vehicle.position);
    vehicle.mesh.quaternion.copy(vehicle.quaternion);
    this.game.scene.add(vehicle.mesh);
};

World.prototype.addPedestrian = function (ped) {
    this.pedestrians.push(ped);
    ped.mesh.position.copy(ped.position);
    ped.mesh.quaternion.copy(ped.quaternion);
    this.game.scene.add(ped.mesh);
};

World.prototype.removeVehicle = function (vehicle) {
    var idx = this.vehicles.indexOf(vehicle);
    if (idx !== -1) {
        vehicle.remove();
        this.vehicles.splice(idx, 1);
    }
};

World.prototype.removePedestrian = function (ped) {
    var idx = this.pedestrians.indexOf(ped);
    if (idx !== -1) {
        ped.remove();
        this.pedestrians.splice(idx, 1);
    }
};

// ---- Probe helpers ----

World.prototype.addProbeBuilding = function (x, z, h, color) {
    var bx = x + (Math.random() - 0.5) * 6;
    var bz = z + (Math.random() - 0.5) * 6;
    var w = 10 + Math.random() * 10;
    var d = 10 + Math.random() * 10;
    var col = color instanceof THREE.Color ? color : new THREE.Color(color || 0x111111);
    var b = new Building(BuildingType.STORE, bx, bz, w, d, h, col);
    var mesh = b.makeMesh();
    this.sceneAdd(mesh);
    this.probeBuildings.push(b);
    this.collisionBounds.push({
        min: new THREE.Vector3(bx - w / 2, 0, bz - d / 2),
        max: new THREE.Vector3(bx + w / 2, h, bz + d / 2)
    });
    return b;
};

World.prototype.sceneAdd = function (obj) {
    if (this.game && this.game.scene) this.game.scene.add(obj);
};

World.prototype.spawnProbePoliceCar = function (x, y, z, rot) {
    var car = new PoliceCar(this.game);
    car.init(x, y, z, rot);
    this.addVehicle(car);
    this.probePoliceCar = car;
    return car;
};

World.prototype.spawnProbePlayerCar = function (x, y, z, rot) {
    var car = new Car(this.game);
    car.init(x, y, z, rot);
    this.addVehicle(car);
    this.probePlayerCar = car;
    return car;
};

World.prototype.spawnProbeTrafficCar = function (x, y, z, rot) {
    var car = new TrafficCar(this.game);
    car.init(x, y, z, rot);
    car.setSpeed(0);
    this.addVehicle(car);
    this.probeTraffic.push(car);
    return car;
};

World.prototype.spawnProbePedestrian = function (x, y, z, rot) {
    var ped = new Pedestrian(this.game);
    ped.init(x, y, z, rot);
    this.addPedestrian(ped);
    this.probePeds.push(ped);
    return ped;
};

World.prototype.spawnProbeParkedCar = function (x, y, z, rot) {
    var car = new Car(this.game);
    car.init(x, y, z, rot);
    car.setSpeed(0);
    car.parked = true;
    this.addVehicle(car);
    this.probeParked.push(car);
    return car;
};
