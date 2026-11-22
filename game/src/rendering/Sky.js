// Sky system with day/night cycle - procedural sky dome, sun, moon, stars, clouds
const SKY_RADIUS = 500;
const SKY_SEGMENTS = 32;
const SKY_RINGS = 16;
const SKY_VERTEX_RANGE = 1000; // -500 to 500
const VERTEX_Y_OFFSET = 500;
const DAY_PHASE = 1.0;
const DUSK_DAWN_PHASE = 0.5;
const NIGHT_PHASE = 0.0;
const DAY_THRESHOLD = 0.5;
const DUSK_THRESHOLD = 0.0;
const DAY_FACTOR_SCALE = 2;
const V_TOP = 0.6;
const V_HORIZON = 0.1;
const DAY_TOP_COLOR = 0x003366;
const DAY_HORIZON_COLOR = 0x87ceeb;
const DAY_BOTTOM_COLOR = 0xb0e0e6;
const DUSK_TOP_COLOR = 0x001133;
const DUSK_HORIZON_COLOR = 0xff3300;
const DUSK_BOTTOM_COLOR = 0x331122;
const NIGHT_TOP_COLOR = 0x000011;
const NIGHT_HORIZON_COLOR = 0x111133;
const NIGHT_BOTTOM_COLOR = 0x000022;
const SUN_RADIUS = 8;
const SUN_SEGMENTS = 16;
const SUN_RINGS = 16;
const SUN_COLOR = 0xffffee;
const SUN_OPACITY = 1;
const CORONA_RADIUS = 12;
const CORONA_COLOR = 0xffaa00;
const CORONA_OPACITY = 0.15;
const MOON_RADIUS = 6;
const MOON_COLOR = 0xeeeeff;
const MOON_OPACITY = 0.8;
const MOON_GLOW_RADIUS = 10;
const MOON_GLOW_COLOR = 0x8888ff;
const MOON_GLOW_OPACITY = 0.1;
const STAR_COUNT = 2000;
const STAR_RADIUS = 450;
const STAR_SIZE_MIN = 0.5;
const STAR_SIZE_MAX = 2.0;
const STAR_WHITE_CHANCE = 0.6;
const STAR_WARM_CHANCE = 0.8;
const STAR_COOL_CHANCE = 1.0;
const STAR_ALPHA_MIN = 0.3;
const STAR_ALPHA_MAX = 0.8;
const CLOUD_COUNT = 200;
const CLOUD_RADIUS_MIN = 300;
const CLOUD_RADIUS_MAX = 400;
const CLOUD_PHI_FACTOR = 0.5;
const CLOUD_SCALE_MIN = 10;
const CLOUD_SCALE_MAX = 30;
const CLOUD_OPACITY_MIN = 0.1;
const CLOUD_OPACITY_MAX = 0.4;
const CLOUD_SPEED_MIN = 0.0001;
const CLOUD_SPEED_MAX = 0.0003;
const CLOUD_PLANE_SIZE = 1;
const CLOUD_MATERIAL_OPACITY = 0.5;
const SUN_DISTANCE = 300;
const SUN_HEIGHT_THRESHOLD_DAY = 0.2;
const SUN_HEIGHT_THRESHOLD_DUSK = -0.2;
const STAR_OPACITY_FACTOR = 2;
const STAR_VISIBILITY_THRESHOLD = 0.05;
const SUN_VISIBILITY_THRESHOLD = -0.3;
const MOON_VISIBILITY_THRESHOLD = 0.3;
const CORONA_SCALE_BASE = 1;
const CORONA_SCALE_FACTOR = 0.5;
const DAY_INTENSITY = 1.0;
const DUSK_INTENSITY = 0.5;
const NIGHT_INTENSITY = 0.05;
const DAY_SUN_COLOR = 0xffffee;
const DUSK_SUN_COLOR = 0xff4400;
const NIGHT_SUN_COLOR = 0x444466;
const CLOUD_MOVE_X_FACTOR = 0.1;
const CLOUD_MOVE_Z_FACTOR = 0.1;

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
        const geometry = new THREE.SphereGeometry(SKY_RADIUS, SKY_SEGMENTS, SKY_RINGS);
        geometry.scale(-1, 1, 1); // Invert for inside view
        
        // Compute vertex colors for gradient
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        // Initial colors (day)
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const v = MathUtils.clamp((y + VERTEX_Y_OFFSET) / SKY_VERTEX_RANGE, 0, 1); // -500 to 500 -> 0 to 1
            this.setVertexColor(colors, i, v, DAY_PHASE); // day phase
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
        
        if (phase > DAY_THRESHOLD) {
            // Day: top=dark blue, horizon=light blue, bottom=very light blue
            const dayFactor = (phase - DUSK_DAWN_PHASE) * DAY_FACTOR_SCALE;
            const topColor = new THREE.Color(DAY_TOP_COLOR);
            const horizonColor = new THREE.Color(DAY_HORIZON_COLOR);
            const bottomColor = new THREE.Color(DAY_BOTTOM_COLOR);
            
            let color;
            if (v > V_TOP) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - V_TOP) / (1 - V_TOP));
            } else if (v > V_HORIZON) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - V_HORIZON) / (V_TOP - V_HORIZON));
            } else {
                color = bottomColor;
            }
            r = color.r; g = color.g; b = color.b;
        } else if (phase > DUSK_THRESHOLD) {
            // Dawn/dusk: interpolate day <-> night
            const factor = phase * DAY_FACTOR_SCALE;
            const topColor = new THREE.Color().lerpColors(new THREE.Color(DUSK_TOP_COLOR), new THREE.Color(DAY_TOP_COLOR), factor);
            const horizonColor = new THREE.Color().lerpColors(new THREE.Color(DUSK_HORIZON_COLOR), new THREE.Color(DAY_HORIZON_COLOR), factor);
            const bottomColor = new THREE.Color().lerpColors(new THREE.Color(DUSK_BOTTOM_COLOR), new THREE.Color(DAY_BOTTOM_COLOR), factor);
            
            let color;
            if (v > V_TOP) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - V_TOP) / (1 - V_TOP));
            } else if (v > V_HORIZON) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - V_HORIZON) / (V_TOP - V_HORIZON));
            } else {
                color = bottomColor;
            }
            r = color.r; g = color.g; b = color.b;
        } else {
            // Night: top=very dark, horizon=dark blue, bottom=black
            const topColor = new THREE.Color(NIGHT_TOP_COLOR);
            const horizonColor = new THREE.Color(NIGHT_HORIZON_COLOR);
            const bottomColor = new THREE.Color(NIGHT_BOTTOM_COLOR);
            
            let color;
            if (v > V_TOP) {
                color = new THREE.Color().lerpColors(horizonColor, topColor, (v - V_TOP) / (1 - V_TOP));
            } else if (v > V_HORIZON) {
                color = new THREE.Color().lerpColors(bottomColor, horizonColor, (v - V_HORIZON) / (V_TOP - V_HORIZON));
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
            const v = MathUtils.clamp((y + VERTEX_Y_OFFSET) / SKY_VERTEX_RANGE, 0, 1);
            this.setVertexColor(colors, i, v, phase);
        }
        
        this.skyGeometry.attributes.color.needsUpdate = true;
    }

    createSunMoon() {
        // Sun
        const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, SUN_SEGMENTS, SUN_RINGS);
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: SUN_COLOR,
            transparent: true,
            opacity: SUN_OPACITY,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.sunMesh.renderOrder = -999;
        this.game.scene.add(this.sunMesh);
        
        // Sun corona
        const coronaGeo = new THREE.SphereGeometry(CORONA_RADIUS, SUN_SEGMENTS, SUN_RINGS);
        const coronaMat = new THREE.MeshBasicMaterial({ 
            color: CORONA_COLOR,
            transparent: true,
            opacity: CORONA_OPACITY,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.sunCorona = new THREE.Mesh(coronaGeo, coronaMat);
        this.sunCorona.renderOrder = -999;
        this.game.scene.add(this.sunCorona);
        
        // Moon
        const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, SUN_SEGMENTS, SUN_RINGS);
        const moonMat = new THREE.MeshBasicMaterial({ 
            color: MOON_COLOR,
            transparent: true,
            opacity: MOON_OPACITY,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.renderOrder = -999;
        this.game.scene.add(this.moonMesh);
        
        // Moon glow
        const moonGlowGeo = new THREE.SphereGeometry(MOON_GLOW_RADIUS, SUN_SEGMENTS, SUN_RINGS);
        const moonGlowMat = new THREE.MeshBasicMaterial({ 
            color: MOON_GLOW_COLOR,
            transparent: true,
            opacity: MOON_GLOW_OPACITY,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
        this.moonGlow.renderOrder = -999;
        this.game.scene.add(this.moonGlow);
    }

    createStars() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(STAR_COUNT * 3);
        const sizes = new Float32Array(STAR_COUNT);
        const colors = new Float32Array(STAR_COUNT * 3);
        const alphas = new Float32Array(STAR_COUNT);
        
        for (let i = 0; i < STAR_COUNT; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = STAR_RADIUS;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * (STAR_SIZE_MAX - STAR_SIZE_MIN) + STAR_SIZE_MIN;
            
            const temp = Math.random();
            if (temp < STAR_WHITE_CHANCE) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else if (temp < STAR_WARM_CHANCE) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.7;
            } else {
                colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1;
            }
            
            alphas[i] = Math.random() * (STAR_ALPHA_MAX - STAR_ALPHA_MIN) + STAR_ALPHA_MIN;
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
        const positions = new Float32Array(CLOUD_COUNT * 3);
        const scales = new Float32Array(CLOUD_COUNT);
        const opacities = new Float32Array(CLOUD_COUNT);
        const speeds = new Float32Array(CLOUD_COUNT);
        
        for (let i = 0; i < CLOUD_COUNT; i++) {
            const radius = CLOUD_RADIUS_MIN + Math.random() * (CLOUD_RADIUS_MAX - CLOUD_RADIUS_MIN);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1) * CLOUD_PHI_FACTOR;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            scales[i] = Math.random() * (CLOUD_SCALE_MAX - CLOUD_SCALE_MIN) + CLOUD_SCALE_MIN;
            opacities[i] = Math.random() * (CLOUD_OPACITY_MAX - CLOUD_OPACITY_MIN) + CLOUD_OPACITY_MIN;
            speeds[i] = Math.random() * (CLOUD_SPEED_MAX - CLOUD_SPEED_MIN) + CLOUD_SPEED_MIN;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
        
        const cloudGeo = new THREE.PlaneGeometry(CLOUD_PLANE_SIZE, CLOUD_PLANE_SIZE);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: CLOUD_MATERIAL_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, CLOUD_COUNT);
        this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.clouds.renderOrder = -997;
        
        const dummy = new THREE.Object3D();
        for (let i = 0; i < CLOUD_COUNT; i++) {
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
        this.sunMesh.position.set(
            Math.cos(sunAzimuth) * SUN_DISTANCE * Math.cos(angle),
            Math.sin(angle) * SUN_DISTANCE,
            Math.sin(sunAzimuth) * SUN_DISTANCE * Math.cos(angle)
        );
        this.sunCorona.position.copy(this.sunMesh.position);
        this.sunCorona.scale.setScalar(CORONA_SCALE_BASE + Math.max(0, sunHeight) * CORONA_SCALE_FACTOR);
        
        // Update moon position (opposite)
        this.moonMesh.position.set(
            -Math.cos(sunAzimuth) * SUN_DISTANCE * Math.cos(angle),
            -Math.sin(angle) * SUN_DISTANCE,
            -Math.sin(sunAzimuth) * SUN_DISTANCE * Math.cos(angle)
        );
        this.moonGlow.position.copy(this.moonMesh.position);
        
        // Determine phase: 1 = day, 0.5 = dawn/dusk, 0 = night
        let phase;
        if (sunHeight > SUN_HEIGHT_THRESHOLD_DAY) phase = 1;
        else if (sunHeight > SUN_HEIGHT_THRESHOLD_DUSK) phase = 0.5;
        else phase = 0;
        
        // Update sky colors only on phase change
        this.updateSkyColors(phase);
        
        // Sun intensity for lighting
        const sunIntensity = phase === 1 ? DAY_INTENSITY : (phase === 0.5 ? DUSK_INTENSITY : NIGHT_INTENSITY);
        const sunColor = phase === 1 ? DAY_SUN_COLOR : (phase === 0.5 ? DUSK_SUN_COLOR : NIGHT_SUN_COLOR);
        
        // Star visibility
        if (this.stars) {
            const starOpacity = Math.max(0, -Math.sin(angle) * STAR_OPACITY_FACTOR);
            this.stars.material.opacity = starOpacity;
            this.stars.visible = starOpacity > STAR_VISIBILITY_THRESHOLD;
        }
        
        // Sun/moon visibility
        this.sunMesh.visible = sunHeight > SUN_VISIBILITY_THRESHOLD;
        this.sunCorona.visible = sunHeight > SUN_VISIBILITY_THRESHOLD;
        this.moonMesh.visible = sunHeight < MOON_VISIBILITY_THRESHOLD;
        this.moonGlow.visible = sunHeight < MOON_VISIBILITY_THRESHOLD;
        
        // Cloud animation
        if (this.clouds) {
            const positions = this.clouds.instanceMatrix.array;
            const speeds = this.cloudData.speeds;
            const dummy = new THREE.Object3D();
            
            for (let i = 0; i < this.clouds.count; i++) {
                const mat = new THREE.Matrix4().fromArray(positions, i * 16);
                const pos = new THREE.Vector3().setFromMatrixPosition(mat);
                
                pos.x += Math.cos(this.game.time * speeds[i]) * CLOUD_MOVE_X_FACTOR;
                pos.z += Math.sin(this.game.time * speeds[i]) * CLOUD_MOVE_Z_FACTOR;
                
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