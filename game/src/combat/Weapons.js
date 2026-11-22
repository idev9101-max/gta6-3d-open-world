// SOLMAR NIGHTS: weapon definitions and hit-scan combat system.
// Weapon definitions and combat system
const Weapons = {
    pistol: {
        name: 'Pistol',
        damage: 25,
        range: 80,
        fireRate: 0.15,
        reloadTime: 1.5,
        maxAmmo: 12,
        reserveAmmo: 60,
        spread: 0.02,
        recoil: 0.3,
        muzzleVelocity: 200,
        tracerColor: 0xffff00,
        sound: 'gunshot'
    },
    
    smg: {
        name: 'SMG',
        damage: 18,
        range: 60,
        fireRate: 0.08,
        reloadTime: 2,
        maxAmmo: 30,
        reserveAmmo: 120,
        spread: 0.05,
        recoil: 0.2,
        muzzleVelocity: 180,
        tracerColor: 0xffaa00,
        sound: 'gunshot'
    },
    
    rifle: {
        name: 'Rifle',
        damage: 45,
        range: 150,
        fireRate: 0.3,
        reloadTime: 2.5,
        maxAmmo: 20,
        reserveAmmo: 60,
        spread: 0.005,
        recoil: 0.8,
        muzzleVelocity: 300,
        tracerColor: 0xff8800,
        sound: 'gunshot'
    },
    
    shotgun: {
        name: 'Shotgun',
        damage: 12, // per pellet
        pellets: 8,
        range: 25,
        fireRate: 0.8,
        reloadTime: 3,
        maxAmmo: 6,
        reserveAmmo: 32,
        spread: 0.15,
        recoil: 1.2,
        muzzleVelocity: 150,
        tracerColor: 0xff6600,
        sound: 'gunshot'
    }
};

const WEAPON_NAMES = Object.keys(Weapons);

class WeaponManager {
    constructor(game) {
        this.game = game;
        this.currentWeapon = 'pistol';
        this.weapons = {};
        
        // Initialize weapon states
        for (const key of WEAPON_NAMES) {
            const w = Weapons[key];
            this.weapons[key] = {
                ...w,
                ammo: w.maxAmmo,
                reserveAmmo: w.reserveAmmo,
                lastFired: 0,
                isReloading: false,
                reloadTimer: 0
            };
        }
    }

    getCurrent() {
        return this.weapons[this.currentWeapon];
    }

    getCurrentName() {
        return this.currentWeapon;
    }

    getAmmo() {
        const w = this.getCurrent();
        return { current: w.ammo, reserve: w.reserveAmmo };
    }

    canFire() {
        const w = this.getCurrent();
        return w.ammo > 0 && !w.isReloading && w.lastFired <= 0;
    }

    fire(origin, direction) {
        const w = this.getCurrent();
        if (!this.canFire()) return false;
        
        w.ammo--;
        w.lastFired = w.fireRate;
        this.game.player.shootCooldown = w.fireRate;
        this.game.player.ammo = w.ammo;
        this.game.player.maxAmmo = w.reserveAmmo;
        this.game.hud.updateAmmo();
        
        // Fire projectiles
        if (this.currentWeapon === 'shotgun') {
            for (let i = 0; i < w.pellets; i++) {
                const spreadDir = direction.clone();
                const spread = w.spread;
                spreadDir.x += (Math.random() - 0.5) * spread;
                spreadDir.y += (Math.random() - 0.5) * spread;
                spreadDir.z += (Math.random() - 0.5) * spread;
                spreadDir.normalize();
                this.traceShot(origin, spreadDir, w);
            }
        } else {
            const spreadDir = direction.clone();
            const spread = w.spread;
            spreadDir.x += (Math.random() - 0.5) * spread;
            spreadDir.y += (Math.random() - 0.5) * spread;
            spreadDir.z += (Math.random() - 0.5) * spread;
            spreadDir.normalize();
            this.traceShot(origin, spreadDir, w);
        }
        
        // Effects
        this.game.effects.createMuzzleFlash(origin, direction);
        this.game.effects.createTracer(origin, direction, w.tracerColor);
        this.game.audio.playGunshot(origin);
        this.game.cameraController.shake(w.recoil * 0.1);
        
        return true;
    }

    traceShot(origin, direction, weapon) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, weapon.range);
        const intersects = raycaster.intersectObjects(this.game.scene.children, true);
        
        for (const hit of intersects) {
            if (hit.distance > weapon.range) break;
            
            let target = hit.object;
            while (target.parent && !target.userData.entity) {
                target = target.parent;
            }
            
            if (target.userData.entity) {
                const entity = target.userData.entity;
                if (entity.takeDamage && entity !== this.game.player) {
                    entity.takeDamage(weapon.damage, hit.point, this.game.player);
                    this.game.effects.createHitEffect(hit.point, hit.face.normal, weapon.damage);
                    this.game.effects.showDamageNumber(hit.point, weapon.damage);
                    
                    // Headshot bonus
                    if (hit.object === entity.bodyParts?.head) {
                        entity.takeDamage(weapon.damage * 2, hit.point, this.game.player);
                        this.game.effects.showDamageNumber(hit.point.clone().add(new THREE.Vector3(0, 0.5, 0)), weapon.damage * 2, true);
                    }
                    return;
                }
            } else if (target.userData.type === 'building' || target.userData.type === 'road' || target.userData.type === 'car') {
                this.game.effects.createBulletHole(hit.point, hit.face.normal);
                if (target.userData.entity?.takeDamage) {
                    target.userData.entity.takeDamage(weapon.damage * 0.5, hit.point);
                }
                return;
            }
        }
    }

    startReload() {
        const w = this.getCurrent();
        if (w.isReloading || w.ammo >= w.maxAmmo || w.reserveAmmo <= 0) return false;
        
        w.isReloading = true;
        w.reloadTimer = w.reloadTime;
        this.game.player.isReloading = true;
        this.game.player.reloadTime = w.reloadTime;
        return true;
    }

    update(delta) {
        for (const w of Object.values(this.weapons)) {
            if (w.lastFired > 0) w.lastFired -= delta;
            
            if (w.isReloading) {
                w.reloadTimer -= delta;
                if (w.reloadTimer <= 0) {
                    const needed = w.maxAmmo - w.ammo;
                    const taken = Math.min(needed, w.reserveAmmo);
                    w.ammo += taken;
                    w.reserveAmmo -= taken;
                    w.isReloading = false;
                    
                    if (w === this.getCurrent()) {
                        this.game.player.ammo = w.ammo;
                        this.game.player.maxAmmo = w.reserveAmmo;
                        this.game.player.isReloading = false;
                        this.game.player.reloadTime = 0;
                        this.game.hud.updateAmmo();
                    }
                }
            }
        }
    }

    switchWeapon(name) {
        if (this.weapons[name]) {
            this.currentWeapon = name;
            const w = this.weapons[name];
            this.game.player.ammo = w.ammo;
            this.game.player.maxAmmo = w.reserveAmmo;
            this.game.player.isReloading = w.isReloading;
            this.game.player.reloadTime = w.reloadTimer;
            this.game.hud.updateAmmo();
            this.game.audio.playPickup(this.game.player.position);
        }
    }

    addAmmo(weaponName, amount) {
        if (this.weapons[weaponName]) {
            this.weapons[weaponName].reserveAmmo += amount;
            if (weaponName === this.currentWeapon) {
                this.game.player.maxAmmo = this.weapons[weaponName].reserveAmmo;
                this.game.hud.updateAmmo();
            }
        }
    }

    giveWeapon(name) {
        if (this.weapons[name]) {
            this.weapons[name].reserveAmmo = Math.max(this.weapons[name].reserveAmmo, this.weapons[name].maxAmmo * 2);
        }
    }
}

window.Weapons = Weapons;
window.WeaponManager = WeaponManager;