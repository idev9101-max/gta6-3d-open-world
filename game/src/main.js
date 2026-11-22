// SOLMAR NIGHTS - entry point. Bootstraps the Game once the DOM and Three.js are ready.

var main = {
    game: null,

    boot: function () {
        var canvas = document.getElementById('game-canvas');
        if (!canvas) {
            setTimeout(main.boot, 50);
            return;
        }
        main.game = new Game();
        main.game.init();

        // Start audio context on first interaction
        var startAudio = function () {
            if (main.game.audio && main.game.audio.ctx) {
                main.game.audio.ctx.resume();
            }
        };
        document.addEventListener('mousedown', startAudio, { once: true });
        document.addEventListener('touchstart', startAudio, { once: true });

        // Pause on Escape
        document.addEventListener('keydown', function (e) {
            if (e.code === 'Escape') main.game.pause();
        });

        // Combat input: LMB fire, R reload, 1/2 weapon switch
        document.addEventListener('mousedown', function (e) {
            if (main.game.inMenu && !main.game.probe) return;
            if (main.game.paused) return;
            if (e.button !== 0) return;
            if (document.pointerLockElement !== main.game.canvas) return;
            var game = main.game;
            if (game.player.inVehicle) return;
            var cam = game.camera;
            var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
            dir.y = 0;
            dir.normalize();
            var origin = game.player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
            var hit = game.weapons.fire(origin, dir);
            if (hit && hit.position) game.effects.spawnImpact(hit.position.x, hit.position.y, hit.position.z, 0xffffff, 0);
        });

        document.addEventListener('keydown', function (e) {
            if (main.game.inMenu && !main.game.probe) return;
            if (e.code === 'KeyR') main.game.weapons.reload();
            if (e.code === 'Digit1') main.game.weapons.switch('pistol');
            if (e.code === 'Digit2') main.game.weapons.switch('smg');
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main.boot);
} else {
    main.boot();
}
