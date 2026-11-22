// Dynamic lighting system with shadows
class LightingSystem {
    constructor(game) {
        this.game = game;
        this.streetLights = [];
        this.carHeadlights = new Map();
        this.maxStreetLights = 8;
        this.lightUpdateInterval = 0;
    }

    init() {
        this.createStreetLights();
    }

    createStreetLights() {
        const roadNetwork = this.game.world.cityGenerator.roadNetwork;
        const intersections = roadNetwork.getIntersections();
        
        // Place street lights at intersections
        intersections.forEach((intersection, i) => {
            if (i >= this.maxStreetLights) return;
            if (Math.random() < 0.7) { // 70% chance per intersection
                this.createStreetLight(intersection.x, intersection.z);
            }
        });
        
        // Additional lights along major roads
        for (let gx = 0; gx < roadNetwork.citySize; gx += 3) {
            for (let gz = 0; gz < roadNetwork.citySize; gz += 3) {
                if (this.streetLights.length >= this.maxStreetLights) break;
                if (Math.random() < 0.3) {
                    const wx = (gx - roadNetwork.citySize/2) * roadNetwork.blockSize;
                    const wz = (gz - roadNetwork.citySize/2) * roadNetwork.blockSize;
                    this.createStreetLight(wx, wz);
                }
            }
        }
    }

    createStreetLight(x, z) {
        const height = 8;
        const group = new THREE.Group();
        
        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, height, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.5 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = height / 2;
        pole.castShadow = true;
        group.add(pole);
        
        // Arm
        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 6);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(1.5, height - 1, 0);
        arm.rotation.z = -Math.PI / 2;
        arm.castShadow = true;
        group.add(arm);
        
        // Light fixture
        const fixtureGeo = new THREE.BoxGeometry(0.6, 0.15, 0.3);
        const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7 });
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        fixture.position.set(3, height - 1, 0);
        fixture.castShadow = true;
        group.add(fixture);
        
        // Light source (emissive)
        const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ 
            color: 0xfff0d0,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(3, height - 1, 0);
        group.add(bulb);
        
        // Point light - NO SHADOWS to avoid texture unit limit
        const light = new THREE.PointLight(0xfff0d0, 0, 30, 2);
        light.position.set(3, height - 1.2, 0);
        light.castShadow = false; // Disable shadows to stay within texture unit limit
        group.add(light);
        
        // Ground pool (projected light)
        const poolGeo = new THREE.CircleGeometry(10, 16);
        const poolMat = new THREE.MeshBasicMaterial({ 
            color: 0xfff0d0,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.y = 0.1;
        group.add(pool);
        
        group.position.set(x, 0, z);
        group.userData = { light, bulb, pool, isOn: false };
        
        this.game.scene.add(group);
        this.streetLights.push(group);
    }

    update(delta) {
        const isNight = this.game.world.timeOfDay > 0.7 || this.game.world.timeOfDay < 0.05;
        const sunIntensity = this.game.sunLight.intensity;
        
        // Update street lights
        this.lightUpdateInterval += delta;
        if (this.lightUpdateInterval > 0.1) {
            this.lightUpdateInterval = 0;
            
            for (const sl of this.streetLights) {
                const ud = sl.userData;
                const shouldBeOn = isNight || sunIntensity < 0.3;
                
                if (shouldBeOn && !ud.isOn) {
                    ud.isOn = true;
                    ud.light.intensity = 15;
                    ud.bulb.material.opacity = 1;
                    ud.pool.material.opacity = 0.15;
                } else if (!shouldBeOn && ud.isOn) {
                    ud.isOn = false;
                    ud.light.intensity = 0;
                    ud.bulb.material.opacity = 0.1;
                    ud.pool.material.opacity = 0;
                }
                
                // Flicker occasionally at night
                if (ud.isOn && Math.random() < 0.001) {
                    ud.light.intensity = 15 * (0.5 + Math.random() * 0.5);
                    setTimeout(() => { if (ud.isOn) ud.light.intensity = 15; }, 50);
                }
            }
        }
        
        // Update car headlights
        this.updateCarHeadlights();
    }

    updateCarHeadlights() {
        // Remove old headlights
        for (const [car, lights] of this.carHeadlights) {
            if (!car.mesh || !car.mesh.parent || car.health <= 0) {
                lights.forEach(l => {
                    this.game.scene.remove(l.light);
                    this.game.scene.remove(l.target);
                });
                this.carHeadlights.delete(car);
            }
        }
        
        // Add/update headlights for nearby cars
        const playerPos = this.game.player.position;
        const cars = [...this.game.world.vehicles];
        
        cars.forEach(car => {
            if (car.mesh.position.distanceTo(playerPos) > 80) return;
            
            let lights = this.carHeadlights.get(car);
            const isNight = this.game.world.timeOfDay > 0.7 || this.game.world.timeOfDay < 0.05;
            const headlightsOn = isNight || car.isPlayerVehicle;
            
            if (!lights && headlightsOn) {
                lights = this.createCarHeadlights(car);
                this.carHeadlights.set(car, lights);
            } else if (lights && !headlightsOn) {
                lights.forEach(l => {
                    l.light.intensity = 0;
                });
            }
            
            if (lights) {
                lights.forEach(l => {
                    l.light.intensity = headlightsOn ? 30 : 0;
                    // Update light position and target
                    l.light.position.copy(l.offset).applyEuler(car.mesh.rotation).add(car.mesh.position);
                    l.target.position.copy(l.targetOffset).applyEuler(car.mesh.rotation).add(car.mesh.position);
                });
            }
        });
    }

    createCarHeadlights(car) {
        const lights = [];
        const length = 4.5;
        const width = 2.0;
        const height = 1.3;
        
        for (const side of [-1, 1]) {
            // Headlight
            const offset = new THREE.Vector3(side * width * 0.45, height * 0.3, length * 0.5);
            const targetOffset = new THREE.Vector3(side * width * 0.45, 0, length * 0.5 + 50);
            
            const light = new THREE.SpotLight(0xffffee, 0, 60, Math.PI / 5, 0.3, 1);
            light.castShadow = false; // Disable shadows to stay within texture unit limit
            
            this.game.scene.add(light);
            this.game.scene.add(light.target);
            
            lights.push({ light, offset, targetOffset, target: light.target });
        }
        
        return lights;
    }

    // Building window lights (called from World)
    updateBuildingLights(night) {
        // This would iterate through building windows
        // For performance, windows are handled via material emissiveIntensity
    }

    dispose() {
        this.streetLights.forEach(sl => {
            this.game.scene.remove(sl);
            sl.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
        });
        this.streetLights = [];
        
        this.carHeadlights.forEach(lights => {
            lights.forEach(l => {
                this.game.scene.remove(l.light);
                this.game.scene.remove(l.target);
            });
        });
        this.carHeadlights.clear();
    }
}

window.LightingSystem = LightingSystem;