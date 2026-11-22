// SOLMAR NIGHTS - minimap: 2D canvas top-down view with player arrow, markers, police blips.

var Minimap = function (game) {
    this.game = game;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.enabled = true;
    this.size = 180;
    this.range = 200;
};

Minimap.prototype.init = function () {
    var self = this;
    document.getElementById('minimap-container').addEventListener('click', function () {
        self.toggle();
    });
};

Minimap.prototype.toggle = function () {
    this.enabled = !this.enabled;
    this.canvas.style.display = this.enabled ? 'block' : 'none';
};

Minimap.prototype.update = function (dt) {
    if (!this.enabled || !this.canvas) return;
    var ctx = this.ctx;
    var cx = this.size / 2, cy = this.size / 2;
    var scale = this.size / (this.range * 2);

    ctx.clearRect(0, 0, this.size, this.size);

    // background
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, this.size, this.size);
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.size, this.size);

    // roads as faint lines
    ctx.strokeStyle = '#002200';
    ctx.lineWidth = 1;
    var roads = this.game.world.roads;
    if (roads) {
        for (var i = 0; i < roads.segments.length; i++) {
            var s = roads.segments[i];
            var x0 = cx + s.start.x * scale;
            var y0 = cy - s.start.y * scale;
            var x1 = cx + s.end.x * scale;
            var y1 = cy - s.end.y * scale;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
    }

    // mission marker
    var mm = this.game.missionManager.markerMesh;
    if (mm && this.game.missionManager.active) {
        var mx = cx + mm.position.x * scale;
        var my = cy - mm.position.z * scale;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // police blips
    var world = this.game.world;
    ctx.fillStyle = '#ff0000';
    for (var i = 0; i < world.vehicles.length; i++) {
        var v = world.vehicles[i];
        if (v instanceof PoliceCar || (v.mesh && v.mesh.userData && v.mesh.userData.police)) {
            var px = cx + v.position.x * scale;
            var py = cy - v.position.z * scale;
            ctx.fillRect(px - 2, py - 2, 4, 4);
        }
    }
    for (var i = 0; i < world.pedestrians.length; i++) {
        var ped = world.pedestrians[i];
        if (ped.mesh && ped.mesh.userData && ped.mesh.userData.police) {
            var px = cx + ped.position.x * scale;
            var py = cy - ped.position.z * scale;
            ctx.fillRect(px - 2, py - 2, 4, 4);
        }
    }

    // player arrow
    var p = this.game.player;
    var px = cx + p.position.x * scale;
    var py = cy - p.position.z * scale;
    var angle = new THREE.Euler().setFromQuaternion(p.quaternion, 'YXZ').y;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};
