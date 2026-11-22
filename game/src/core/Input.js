// SOLMAR NIGHTS - input: pointer lock mouse look + keyboard state

var Input = function (canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false };
    this.pointerLocked = false;
    this.enabled = true;

    var self = this;

    this._onKeyDown = function (e) {
        if (!self.enabled) return;
        if (self.keys[e.code] === true) return;
        self.keys[e.code] = true;
        self.justPressed[e.code] = true;
        if (e.code === 'Escape' && self.pointerLocked) {
            self.unlock();
        }
        if (e.code === 'KeyE' || e.code === 'Space') {
            e.preventDefault();
        }
    };

    this._onKeyUp = function (e) {
        if (!self.enabled) return;
        self.keys[e.code] = false;
        self.justReleased[e.code] = true;
    };

    this._onMouseMove = function (e) {
        if (!self.enabled) return;
        self.mouse.x = e.clientX;
        self.mouse.y = e.clientY;
        if (self.pointerLocked) {
            self.mouse.dx = e.movementX;
            self.mouse.dy = e.movementY;
        }
    };

    this._onClick = function () {
        if (!self.enabled || !self.pointerLocked) {
            self.lock();
        }
    };

    this._onPointerChange = function () {
        self.pointerLocked = document.pointerLockElement === self.canvas;
        self.mouse.locked = self.pointerLocked;
    };

    this._onBlur = function () {
        // clear keys when window loses focus so the player does not stick
        for (var k in self.keys) self.keys[k] = false;
    };
};

Input.prototype.init = function () {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onPointerChange);
    window.addEventListener('blur', this._onBlur);
};

Input.prototype.destroy = function () {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onPointerChange);
    window.removeEventListener('blur', this._onBlur);
};

Input.prototype.lock = function () {
    if (!this.enabled) return;
    if (!this.pointerLocked) {
        this.canvas.requestPointerLock();
    }
};

Input.prototype.unlock = function () {
    if (this.pointerLocked) {
        document.exitPointerLock();
    }
};

Input.prototype.update = function () {
    // consume just-pressed / just-released flags
    for (var k in this.justPressed) this.justPressed[k] = false;
    for (var k in this.justReleased) this.justReleased[k] = false;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
};

Input.prototype.isDown = function (code) {
    return !!this.keys[code];
};

Input.prototype.wasPressed = function (code) {
    return !!this.justPressed[code];
};

Input.prototype.wasReleased = function (code) {
    return !!this.justReleased[code];
};

// Common movement vectors
Input.prototype.getMoveVector = function () {
    var x = 0, z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    var len = Math.sqrt(x * x + z * z);
    if (len > 0) { x /= len; z /= len; }
    return { x: x, z: z };
};

Input.prototype.isRunning = function () {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
};
