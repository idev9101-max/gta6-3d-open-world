// Sky system with day/night cycle - no custom shaders
class SkySystem {
    constructor(game) {
        this.game = game;
        this.skyMesh = null;
        this.sunMesh = null;
        this.moonMesh = null;
        this.stars = null;
        this.clouds = null;
        this.timeOfDay = 0.25;
        this.lastPhase = -1;
        
        this.createSky();
        this.createSunMoon();
        this.createStars();
        this.createClouds();
    }

    createSky() {
        // Sky dome - inverted sphere
        const geometry = new THREE.SphereGeometry(500, 32, 16);
        geometry.scale(-1, 1, 1); // Invert for inside view
        
        // Compute vertex colors for gradient
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        // Initial colors (day)
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const v = MathUtils.clamp((y + 500) / 1000, 0, 1); // -500 to 500 -> 0 to 1
            this.setVertexColor(colors, i, v, 1.0); // day phase
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Use MeshBasicMaterial with vertex colors
        this.skyMaterial = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        
        this.skyMesh = new THREE.Mesh(geometry, this.skyMaterial);
        this.skyMesh.renderOrder = -1000;
        this.game.scene.add(this.skyMesh);
        
        // Store reference for updates
        this.skyGeometry = geometry;
        this.skyColors = colors;
    }

    setVertexColor(colors, index, v, phase) {
        // v = 0 (bottom) to 1 (top)
        // phase = 1 (day), 0.5 (dawn/dusk), 0 (night)
        let r, g, b;
        
        if (phase > 0.5) {
            // Day: top=dark blue, horizon=light blue, bottom=very light blue
            const dayFactor = (phase - 0.5) * 2;
            const topColor = new THREE.Color(0x003366);
            const horizonColor = new THREE.Color(0x87ceeb);
            const bottomColor = new THREE.Color(0xb0e0e6);
            
            let color;
            if (v > 0.6) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - 0.6) / 0.4);
            } else if (v > 0.1) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - 0.1) / 0.5);
            } else {
                color = bottomColor;
            }
            r = color.r; g = color.g; b = color.b;
        } else if (phase > 0) {
            // Dawn/dusk: interpolate day <-> night
            const factor = phase * 2;
            const topColor = new THREE.Color().lerpColors(new THREE.Color(0x001133), new THREE.Color(0x003366), factor);
            const horizonColor = new THREE.Color().lerpColors(new THREE.Color(0xff3300), new THREE.Color(0x87ceeb), factor);
            const bottomColor = new THREE.Color().lerpColors(new THREE.Color(0x331122), new THREE.Color(0xb0e0e6), factor);
            
            let color;
            if (v > 0.6) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - 0.6) / 0.4);
            } else if (v > 0.1) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - 0.1) / 0.5);
            } else {
                color = bottomColor;
            }
            r = color.r; g = color.g; b = color.b;
        } else {
            // Night: top=very dark, horizon=dark blue, bottom=black
            const topColor = new THREE.Color(0x000011);
            const horizonColor = new THREE.Color(0x111133);
            const bottomColor = new THREE.Color(0x000022);
            
            let color;
            if (v > 0.6) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - 0.6) / 0.4);
            } else if (v > 0.1) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - 0.1) / 0.5);
            } else {
                color = bottomColor;
            }
            r = color.r; g = color.g; b = color.b;
        }
        
        colors[index * 3] = r;
        colors[index * 3 + 1] = g;
        colors[index * 3 + 2] = b;
    }

    updateSkyColors(phase) {
        if (phase === this.lastPhase) return;
        this.lastPhase = phase;
        
        const positions = this.skyGeometry.attributes.position;
        const colors = this.skyColors;
        
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const v = MathUtils.clamp((y + 500) / 1000, 0, 1);
            this.setVertexColor(colors, i, v, phase);
        }
        
        this.skyGeometry.attributes.color.needsUpdate = true;
    }

    createSunMoon() {
        // Sun
        const sunGeo = new THREE.SphereGeometry(8, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffee,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunMesh.renderOrder = -999;
        this.game.scene.add(this.sunMesh);
        
        // Sun corona
        const coronaGeo = new THREE.SphereGeometry(12, 16, 16);
        const coronaMat = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.sunCorona = new THREE.Mesh(coronaGeo, coronaMat);
        this.sunCorona.renderOrder = -999;
        this.game.scene.add(this.sunCorona);
        
        // Moon
        const moonGeo = new THREE.SphereGeometry(6, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({ 
            color: 0xeeeeff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.renderOrder = -999;
        this.game.scene.add(this.moonMesh);
        
        // Moon glow
        const moonGlowGeo = new THREE.SphereGeometry(10, 16, 16);
        const moonGlowMat = new THREE.MeshBasicMaterial({ 
            color: 0x8888ff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
        this.moonGlow.renderOrder = -999;
        this.game.scene.add(this.moonGlow);
    }

    createStars() {
        const geometry = new THREE.BufferGeometry();
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        const alphas = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 450;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * 1.5 + 0.5;
            
            const temp = Math.random();
            if (temp < 0.6) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else if (temp < 0.8) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.7;
            } else {
                colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1;
            }
            
            alphas[i] = Math.random() * 0.5 + 0.3;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.stars = new THREE.Points(geometry, material);
        this.stars.renderOrder = -998;
        this.game.scene.add(this.stars);
    }

    createClouds() {
        const geometry = new THREE.BufferGeometry();
        const count = 200;
        const positions = new Float32Array(count * 3);
        const scales = new Float32Array(count);
        const opacities = new Float32Array(count);
        const speeds = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const radius = 300 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1) * 0.5;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            scales[i] = Math.random() * 20 + 10;
            opacities[i] = Math.random() * 0.3 + 0.1;
            speeds[i] = Math.random() * 0.0002 + 0.0001;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
        
        const cloudGeo = new THREE.PlaneGeometry(1, 1);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, count);
        this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.clouds.renderOrder = -997;
        
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            dummy.scale.set(scales[i], scales[i] * 0.5, scales[i]);
            dummy.lookAt(0, 0, 0);
            dummy.rotation.x = -Math.PI / 2;
            dummy.updateMatrix();
            this.clouds.setMatrixAt(i, dummy.matrix);
        }
        
        this.clouds.instanceMatrix.needsUpdate = true;
        this.game.scene.add(this.clouds);
        
        this.cloudData = { positions, scales, opacities, speeds };
    }

    update(delta) {
        this.timeOfDay = this.game.world.timeOfDay || 0.25;
        const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(angle);
        const sunAzimuth = this.timeOfDay * Math.PI * 2;
        
        // Update sun position
        const sunDist = 300;
        this.sunMesh.position.set(
            Math.cos(sunAzimuth) * sunDist * Math.cos(angle),
            Math.sin(angle) * sunDist,
            Math.sin(sunAzimuth) * sunDist * Math.cos(angle)
        );
        this.sunCorona.position.copy(this.sunMesh.position);
        this.sunCorona.scale.setScalar(1 + Math.max(0, sunHeight) * 0.5);
        
        // Update moon position (opposite)
        this.moonMesh.position.set(
            -Math.cos(sunAzimuth) * sunDist * Math.cos(angle),
            -Math.sin(angle) * sunDist,
            -Math.sin(sunAzimuth) * sunDist * Math.cos(angle)
        );
        this.moonGlow.position.copy(this.moonMesh.position);
        
        // Determine phase: 1 = day, 0.5 = dawn/dusk, 0 = night
        let phase;
        if (sunHeight > 0.2) phase = 1;
        else if (sunHeight > -0.2) phase = 0.5;
        else phase = 0;
        
        // Update sky colors only on phase change
        this.updateSkyColors(phase);
        
        // Sun intensity for lighting
        const sunIntensity = phase === 1 ? 1.0 : (phase === 0.5 ? 0.5 : 0.05);
        const sunColor = phase === 1 ? 0xffffee : (phase === 0.5 ? 0xff4400 : 0x444466);
        
        // Star visibility
        if (this.stars) {
            const starOpacity = Math.max(0, -Math.sin(angle) * 2);
            this.stars.material.opacity = starOpacity;
            this.stars.visible = starOpacity > 0.05;
        }
        
        // Sun/moon visibility
        this.sunMesh.visible = sunHeight > -0.3;
        this.sunCorona.visible = sunHeight > -0.3;
        this.moonMesh.visible = sunHeight < 0.3;
        this.moonGlow.visible = sunHeight < 0.3;
        
        // Cloud animation
        if (this.clouds) {
            const positions = this.clouds.instanceMatrix.array;
            const speeds = this.cloudData.speeds;
            const dummy = new THREE.Object3D();
            
            for (let i = 0; i < this.clouds.count; i++) {
                const mat = new THREE.Matrix4().fromArray(positions, i * 16);
                const pos = new THREE.Vector3().setFromMatrixPosition(mat);
                
                pos.x += Math.cos(this.game.time * speeds[i]) * 0.1;
                pos.z += Math.sin(this.game.time * speeds[i]) * 0.1;
                
                dummy.position.copy(pos);
                dummy.lookAt(0, pos.y, 0);
                dummy.rotation.x = -Math.PI / 2;
                dummy.updateMatrix();
                this.clouds.setMatrixAt(i, dummy.matrix);
            }
            this.clouds.instanceMatrix.needsUpdate = true;
        }
    }

    getSunDirection() {
        const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
        const sunAzimuth = this.timeOfDay * Math.PI * 2;
        return new THREE.Vector3(
            Math.cos(sunAzimuth) * Math.cos(angle),
            Math.sin(angle),
            Math.sin(sunAzimuth) * Math.cos(angle)
        ).normalize();
    }

    getSunIntensity() {
        const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
        return Math.max(0, Math.sin(angle));
    }
}

window.SkySystem = SkySystem;