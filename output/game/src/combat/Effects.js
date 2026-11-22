// Visual effects system
class EffectsManager {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.decals = [];
        this.damageNumbers = [];
        this.maxParticles = 500;
        this.maxDecals = 100;
        this.maxDamageNumbers = 20;
        
        // Particle geometries
        this.initParticleGeometries();
    }

    initParticleGeometries() {
        // Shared geometries for performance
        this.particleGeo = new THREE.BufferGeometry();
        const count = 100;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);
        const velocities = new Float32Array(count * 3);
        
        this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        this.particleGeo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    }

    update(delta) {
        this.updateParticles(delta);
        this.updateDecals(delta);
        this.updateDamageNumbers(delta);
    }

    // Muzzle flash
    createMuzzleFlash(position, direction) {
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 6, 6),
            new THREE.MeshBasicMaterial({ 
                color: 0xffff88, 
                transparent: true, 
                opacity: 0.9,
                blending: THREE.AdditiveBlending
            })
        );
        flash.position.copy(position).addScaledVector(direction, 0.5);
        flash.scale.set(1, 0.5, 1);
        this.game.scene.add(flash);
        
        // Light flash
        const light = new THREE.PointLight(0xffff88, 20, 5, 2);
        light.position.copy(flash.position);
        this.game.scene.add(light);
        
        const startTime = this.game.time;
        const animate = () => {
            const elapsed = this.game.time - startTime;
            if (elapsed > 0.05) {
                this.game.scene.remove(flash);
                this.game.scene.remove(light);
                flash.geometry.dispose();
                flash.material.dispose();
                light.dispose();
                return;
            }
            flash.material.opacity = 1 - elapsed / 0.05;
            flash.scale.multiplyScalar(1.2);
            light.intensity = 20 * (1 - elapsed / 0.05);
            requestAnimationFrame(animate);
        };
        animate();
    }

    // Tracer round
    createTracer(origin, direction, color = 0xffff00) {
        const end = origin.clone().addScaledVector(direction, 100);
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([origin.x, origin.y, origin.z, end.x, end.y, end.z]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const tracer = new THREE.Line(geometry, material);
        this.game.scene.add(tracer);
        
        setTimeout(() => {
            this.game.scene.remove(tracer);
            geometry.dispose();
            material.dispose();
        }, 50);
    }

    // Bullet hole decal
    createBulletHole(position, normal) {
        if (this.decals.length >= this.maxDecals) {
            const old = this.decals.shift();
            this.game.scene.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }
        
        const size = 0.05 + Math.random() * 0.05;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x111111, 
            transparent: true, 
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });
        
        const decal = new THREE.Mesh(geometry, material);
        decal.position.copy(position).addScaledVector(normal, 0.01);
        decal.lookAt(position.clone().add(normal));
        decal.rotation.z = Math.random() * Math.PI * 2;
        
        this.game.scene.add(decal);
        this.decals.push(decal);
        
        // Fade out
        setTimeout(() => {
            const idx = this.decals.indexOf(decal);
            if (idx !== -1) {
                this.decals.splice(idx, 1);
                this.game.scene.remove(decal);
                geometry.dispose();
                material.dispose();
            }
        }, 30000);
    }

    // Hit effect (sparks, blood, etc.)
    createHitEffect(position, normal, damage = 0) {
        const isFlesh = damage > 0;
        const particleCount = isFlesh ? 15 : 8;
        
        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ 
                color: isFlesh ? 0xff3333 : 0xffff88,
                transparent: true,
                opacity: 0.8,
                blending: isFlesh ? THREE.NormalBlending : THREE.AdditiveBlending
            });
            const particle = new THREE.Mesh(geo, mat);
            
            particle.position.copy(position);
            const vel = normal.clone().multiplyScalar(0.5).add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ));
            
            this.game.scene.add(particle);
            
            const startTime = this.game.time;
            const animate = () => {
                const elapsed = this.game.time - startTime;
                if (elapsed > 0.5) {
                    this.game.scene.remove(particle);
                    geo.dispose();
                    mat.dispose();
                    return;
                }
                particle.position.addScaledVector(vel, 0.016);
                vel.y -= 0.05; // gravity
                particle.material.opacity = 0.8 * (1 - elapsed / 0.5);
                particle.scale.multiplyScalar(0.98);
                requestAnimationFrame(animate);
            };
            animate();
        }
        
        // Impact flash
        const flash = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.5),
            new THREE.MeshBasicMaterial({ 
                color: isFlesh ? 0xff6666 : 0xffffff,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            })
        );
        flash.position.copy(position).addScaledVector(normal, 0.02);
        flash.lookAt(position.clone().add(normal));
        this.game.scene.add(flash);
        
        setTimeout(() => {
            this.game.scene.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }, 50);
    }

    // Blood spray
    createBloodSpray(position) {
        for (let i = 0; i < 12; i++) {
            const geo = new THREE.SphereGeometry(0.04, 3, 3);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x880000,
                transparent: true,
                opacity: 0.8
            });
            const drop = new THREE.Mesh(geo, mat);
            
            drop.position.copy(position);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 3
            );
            
            this.game.scene.add(drop);
            
            const startTime = this.game.time;
            const animate = () => {
                const elapsed = this.game.time - startTime;
                if (elapsed > 1.5) {
                    this.game.scene.remove(drop);
                    geo.dispose();
                    mat.dispose();
                    return;
                }
                drop.position.addScaledVector(vel, 0.016);
                vel.y -= 0.1;
                vel.multiplyScalar(0.99);
                drop.material.opacity = 0.8 * (1 - elapsed / 1.5);
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    // Explosion
    createExplosion(position) {
        // Shockwave ring
        const ringGeo = new THREE.RingGeometry(0.5, 1, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            transparent: true, 
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.game.scene.add(ring);
        
        // Fireball
        const fireGeo = new THREE.SphereGeometry(2, 16, 16);
        const fireMat = new THREE.MeshBasicMaterial({ 
            color: 0xff6600, 
            transparent: true, 
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const fireball = new THREE.Mesh(fireGeo, fireMat);
        fireball.position.copy(position);
        this.game.scene.add(fireball);
        
        // Smoke cloud
        const smokeGeo = new THREE.SphereGeometry(5, 16, 16);
        const smokeMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            transparent: true, 
            opacity: 0.6,
            roughness: 1
        });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.position.copy(position);
        this.game.scene.add(smoke);
        
        // Debris
        for (let i = 0; i < 20; i++) {
            const debrisGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const debrisMat = new THREE.MeshStandardMaterial({ 
                color: MathUtils.choice([0x444444, 0x664422, 0x886644]),
                roughness: 0.8
            });
            const debris = new THREE.Mesh(debrisGeo, debrisMat);
            debris.position.copy(position);
            debris.position.y += 1;
            
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 15
            );
            
            this.game.scene.add(debris);
            
            const startTime = this.game.time;
            const animate = () => {
                const elapsed = this.game.time - startTime;
                if (elapsed > 3) {
                    this.game.scene.remove(debris);
                    debrisGeo.dispose();
                    debrisMat.dispose();
                    return;
                }
                debris.position.addScaledVector(vel, 0.016);
                vel.y -= 0.2;
                debris.rotation.x += 0.1;
                debris.rotation.y += 0.1;
                requestAnimationFrame(animate);
            };
            animate();
        }
        
        // Animate effects
        const startTime = this.game.time;
        const animate = () => {
            const elapsed = this.game.time - startTime;
            if (elapsed > 1) {
                this.game.scene.remove(ring);
                this.game.scene.remove(fireball);
                this.game.scene.remove(smoke);
                ringGeo.dispose(); ringMat.dispose();
                fireGeo.dispose(); fireMat.dispose();
                smokeGeo.dispose(); smokeMat.dispose();
                return;
            }
            const factor = 1 - elapsed;
            ring.scale.set(10 * factor, 10 * factor, 1);
            ring.material.opacity = 0.8 * factor;
            fireball.scale.set(factor, factor, factor);
            fireball.material.opacity = 0.9 * factor;
            smoke.scale.set(1 + elapsed * 2, 1 + elapsed, 1 + elapsed * 2);
            smoke.material.opacity = 0.6 * factor;
            requestAnimationFrame(animate);
        };
        animate();
    }

    // Damage numbers
    showDamageNumber(position, damage, isCrit = false) {
        if (this.damageNumbers.length >= this.maxDamageNumbers) return;
        
        const div = document.createElement('div');
        div.className = 'damage-number' + (isCrit ? ' crit' : '');
        div.textContent = Math.round(damage);
        div.style.color = isCrit ? '#ffcc00' : '#ff4444';
        div.style.fontSize = isCrit ? '2rem' : '1.5rem';
        div.style.textShadow = '0 0 4px #000';
        
        // Convert 3D position to screen
        const vector = position.clone().project(this.game.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.position = 'fixed';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '30';
        
        document.getElementById('damage-numbers').appendChild(div);
        
        this.damageNumbers.push({ element: div, startTime: this.game.time, position: position.clone() });
        
        setTimeout(() => {
            const idx = this.damageNumbers.findIndex(d => d.element === div);
            if (idx !== -1) this.damageNumbers.splice(idx, 1);
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 1000);
    }

    updateDamageNumbers(delta) {
        for (const dn of this.damageNumbers) {
            const vector = dn.position.clone().project(this.game.camera);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            dn.element.style.left = x + 'px';
            dn.element.style.top = (y - (this.game.time - dn.startTime) * 50) + 'px';
        }
    }

    // Pickup effect
    createPickup(position, type, amount) {
        const colors = { money: 0x00ff88, ammo: 0xffaa00, health: 0xff3333, armor: 0x0088ff };
        const icons = { money: '$', ammo: '🔫', health: '❤', armor: '🛡' };
        
        const div = document.createElement('div');
        div.className = 'damage-number';
        div.textContent = '+' + amount + ' ' + (icons[type] || '');
        div.style.color = '#' + colors[type].toString(16).padStart(6, '0');
        div.style.fontSize = '1.5rem';
        div.style.textShadow = '0 0 4px #000';
        
        const vector = position.clone().project(this.game.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.position = 'fixed';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '30';
        
        document.getElementById('damage-numbers').appendChild(div);
        
        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 1500);
    }

    // Screen shake
    shakeCamera(intensity, duration = 0.3) {
        this.game.cameraController.shake(intensity);
    }

    updateParticles(delta) {
        // Custom particle systems would be updated here
    }

    updateDecals(delta) {
        // Decals are static, just cleanup handled by timeout
    }

    dispose() {
        // Cleanup all effects
        this.decals.forEach(d => {
            this.game.scene.remove(d);
            d.geometry.dispose();
            d.material.dispose();
        });
        this.decals = [];
    }
}

window.EffectsManager = EffectsManager;