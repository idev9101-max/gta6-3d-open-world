// SOLMAR NIGHTS: keyboard, mouse and gamepad input with simulated keys for autotest.
// Input handling system
const GAME_KEY_CODES = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 
    'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyR', 'Escape', 'KeyM'
]);

class InputManager {
    constructor() {
        this.keys = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        this.mouse = { x: 0, y: 0, down: false, rightDown: false };
        this.mouseDelta = { x: 0, y: 0 };
        this.gamepadIndex = -1;
        this.enabled = true;
        
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            const code = e.code;
            if (!this.keys.has(code)) {
                this.keysPressed.add(code);
            }
            this.keys.add(code);
            
            // Prevent default for game keys
            if (GAME_KEY_CODES.has(code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.enabled) return;
            const code = e.code;
            this.keys.delete(code);
            this.keysReleased.add(code);
        });

        window.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            if (e.button === 0) this.mouse.down = true;
            if (e.button === 2) this.mouse.rightDown = true;
            this.keysPressed.add('Mouse0');
            e.preventDefault();
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.enabled) return;
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.rightDown = false;
            this.keysReleased.add('Mouse0');
        });

        window.addEventListener('mousemove', (e) => {
            this.mouseDelta.x = e.movementX;
            this.mouseDelta.y = e.movementY;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            console.log('Gamepad connected:', e.gamepad.id);
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (e.gamepad.index === this.gamepadIndex) this.gamepadIndex = -1;
        });

        // Handle blur/focus
        window.addEventListener('blur', () => this.reset());
    }

    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        
        // Update gamepad state
        if (this.gamepadIndex >= 0) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) this.updateGamepad(gp);
        }
    }

    updateGamepad(gp) {
        // Deadzone for sticks
        const deadzone = 0.15;
        const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
        const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
        const rx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
        const ry = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;
        
        this.gamepad = {
            leftStick: { x: lx, y: ly },
            rightStick: { x: rx, y: ry },
            leftTrigger: gp.buttons[6]?.value || 0,
            rightTrigger: gp.buttons[7]?.value || 0,
            buttons: gp.buttons.map(b => b.pressed)
        };
    }

    isDown(code) {
        return this.enabled && this.keys.has(code);
    }

    isPressed(code) {
        return this.enabled && this.keysPressed.has(code);
    }

    isReleased(code) {
        return this.enabled && this.keysReleased.has(code);
    }

    getMouseDelta() {
        return { ...this.mouseDelta };
    }

    getMousePosition() {
        return { ...this.mouse };
    }

    isMouseDown() {
        return this.enabled && this.mouse.down;
    }

    isRightMouseDown() {
        return this.enabled && this.mouse.rightDown;
    }

    getMovementVector() {
        if (!this.enabled) return { x: 0, z: 0 };
        
        let x = 0, z = 0;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
        
        // Gamepad left stick
        if (this.gamepad && this.gamepad.leftStick) {
            x += this.gamepad.leftStick.x;
            z += this.gamepad.leftStick.y;
        }
        
        const len = Math.hypot(x, z);
        if (len > 1) { x /= len; z /= len; }
        return { x, z };
    }

    isRunning() {
        return this.enabled && (this.isDown('ShiftLeft') || this.isDown('ShiftRight') || 
            (this.gamepad && this.gamepad.leftTrigger > 0.5));
    }

    isJumpPressed() {
        return this.enabled && (this.isPressed('Space') || 
            (this.gamepad && this.gamepad.buttons[0])); // A button
    }

    isInteractPressed() {
        return this.enabled && (this.isPressed('KeyE') || 
            (this.gamepad && this.gamepad.buttons[1])); // B button
    }

    isAttackDown() {
        return this.enabled && (this.isMouseDown() || 
            (this.gamepad && this.gamepad.rightTrigger > 0.5));
    }

    isReloadPressed() {
        return this.enabled && (this.isPressed('KeyR') || 
            (this.gamepad && this.gamepad.buttons[2])); // X button
    }

    isPausePressed() {
        return this.enabled && (this.isPressed('Escape') || 
            (this.gamepad && this.gamepad.buttons[9])); // Start button
    }

    isMapTogglePressed() {
        return this.enabled && this.isPressed('KeyM');
    }

    getVehicleInput() {
        if (!this.enabled) return { accelerate: 0, brake: 0, steer: 0, handbrake: false };
        
        let accelerate = 0, brake = 0, steer = 0, handbrake = false;
        
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) accelerate = 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) brake = 1;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) steer -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) steer += 1;
        if (this.isDown('Space')) handbrake = true;
        
        // Gamepad
        if (this.gamepad) {
            const rt = this.gamepad.rightTrigger;
            const lt = this.gamepad.leftTrigger;
            if (rt > 0.1) accelerate = rt;
            if (lt > 0.1) brake = lt;
            steer += this.gamepad.leftStick.x;
            handbrake = this.gamepad.buttons[0]; // A button for handbrake
        }
        
        return { accelerate, brake, steer: MathUtils.clamp(steer, -1, 1), handbrake };
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.reset();
    }

    reset() {
        this.keys.clear();
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mouse.down = false;
        this.mouse.rightDown = false;
        this.mouseDelta = { x: 0, y: 0 };
    }

    // For autotest scripted input
    simulateKey(code, pressed) {
        if (pressed) {
            this.keys.add(code);
            this.keysPressed.add(code);
        } else {
            this.keys.delete(code);
            this.keysReleased.add(code);
        }
    }
}

window.InputManager = InputManager;