// SOLMAR NIGHTS - city generator: roads + building placement with seeded RNG.

var CityGenerator = function (game) {
    this.game = game;
    this.rng = new MathUtils.SeededRNG(0xABCDEF01);
    this.roadNetwork = null;
    this.buildings = [];
    this.cityHalf = 180;
};

CityGenerator.prototype.generate = function (roads) {
    this.roadNetwork = roads;
    var bs = roads.blockSize;
    var n = roads.blocks;
    var half = roads.half;

    // Place one building per block, inset from roads
    var inset = 6;
    for (var bi = 0; bi < n; bi++) {
        for (var bj = 0; bj < n; bj++) {
            var bx = -half + bi * bs + bs / 2;
            var bz = -half + bj * bs + bs / 2;
            var w = rngRange(this.rng, bs * 0.5, bs * 0.8);
            var d = rngRange(this.rng, bs * 0.5, bs * 0.8);
            var h = rngRange(this.rng, 10, 34);
            var type = BuildingType.STORE;
            if (this.rng.bool(0.3)) type = BuildingType.APARTMENT;
            else if (this.rng.bool(0.2)) type = BuildingType.OFFICE;
            else if (this.rng.bool(0.1)) type = BuildingType.CLUB;
            var color = Building.randomColor(this.rng);
            // neon club/store gets neon accent handled by Building mesh color variation
            var building = new Building(type, bx, bz, w, d, h, color);
            this.buildings.push(building);
        }
    }

    return this.buildings;
};

function rngRange(rng, min, max) { return min + rng.next() * (max - min); }
