// SOLMAR NIGHTS: ocean with waves, shore break and foam particles.
// Ocean system with waves
const OCEAN_SIZE_MULT = 3;
const OCEAN_SEGMENTS = 120;
const OCEAN_WATER_COLOR = 0x003366;
const OCEAN_ROUGHNESS = 0.1;
const OCEAN_METALNESS = 0.3;
const OCEAN_OPACITY = 0.85;
const OCEAN_Y = 0;
const SWELL_FREQ_X = 0.02;
const SWELL_FREQ_Z = 0.02;
const SWELL_FREQ_XZ = 0.015;
const SWELL_SPEED_X = 0.5;
const SWELL_SPEED_Z = 0.4;
const SWELL_SPEED_XZ = 0.3;
const SWELL_AMP_X = 0.8;
const SWELL_AMP_Z = 0.6;
const SWELL_AMP_XZ = 0.4;
const WAVE_FREQ_X = 0.05;
const WAVE_FREQ_Z = 0.05;
const WAVE_FREQ_XZ = 0.04;
const WAVE_SPEED_X = 1.2;
const WAVE_SPEED_Z = 1.0;
const WAVE_SPEED_XZ = 1.5;
const WAVE_AMP_X = 0.3;
const WAVE_AMP_Z = 0.25;
const WAVE_AMP_XZ = 0.2;
const RIPPLE_FREQ_X = 0.2;
const RIPPLE_FREQ_Z = 0.2;
const RIPPLE_SPEED_X = 3;
const RIPPLE_SPEED_Z = 2.5;
const RIPPLE_AMP_X = 0.05;
const RIPPLE_AMP_Z = 0.04;
const SHORE_Z_FACTOR = 0.8;
const SHORE_DIST = 50;
const SHORE_FREQ = 0.08;
const SHORE_SPEED = 2;
const SHORE_AMP = 0.5;
const FOAM_COUNT = 500;
const FOAM_Y = 0.3;
const FOAM_Z_OFFSET = 0.8;
const FOAM_Z_RANGE_MIN = -15;
const FOAM_Z_RANGE_MAX = 5;
const FOAM_SIZE_MIN = 0.2;
const FOAM_SIZE_MAX = 0.8;
const FOAM_ALPHA_MIN = 0.3;
const FOAM_ALPHA_MAX = 0.8;
const FOAM_COLOR = 0xffffff;
const FOAM_OPACITY = 0.6;
const FOAM_WAVE_FREQ_X = 0.05;
const FOAM_WAVE_FREQ_Z = 0.05;
const FOAM_WAVE_SPEED_X = 2;
const FOAM_WAVE_SPEED_Z = 1.8;
const FOAM_WAVE_AMP_X = 0.3;
const FOAM_WAVE_AMP_Z = 0.25;
const FOAM_ALPHA_SPEED = 3;
const FOAM_ALPHA_BASE = 0.3;
const FOAM_ALPHA_AMP = 0.3;

class Ocean {
    constructor(citySize = 60, blockSize = 20) {
        this.citySize = citySize;
        this.blockSize = blockSize;
        this.halfSize = citySize * blockSize / 2;
        this.oceanSize = this.halfSize * OCEAN_SIZE_MULT;
        this.mesh = null;
        this.material = null;
        this.time = 0;
        this.waveData = null;
    }

    init() {
        this.createMaterial();
        this.createMesh();
        return this;
    }

    createMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            color: OCEAN_WATER_COLOR,
            roughness: OCEAN_ROUGHNESS,
            metalness: OCEAN_METALNESS,
            transparent: true,
            opacity: OCEAN_OPACITY,
            side: THREE.DoubleSide,
            fog: true
        });
        
        // Custom shader for waves would go here
        // For now use standard material with vertex displacement in update
    }

    createMesh() {
        const geometry = new THREE.PlaneGeometry(this.oceanSize * 2, this.oceanSize * 2, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
        geometry.rotateX(-Math.PI / 2);
        
        // Store original positions for wave animation
        const positions = geometry.attributes.position;
        this.waveData = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
            this.waveData[i * 3] = positions.getX(i);
            this.waveData[i * 3 + 1] = positions.getY(i);
            this.waveData[i * 3 + 2] = positions.getZ(i);
        }
        
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.y = OCEAN_Y;
        this.mesh.receiveShadow = true;
        this.mesh.frustumCulled = false; // Large mesh
        
        return this.mesh;
    }

    update(delta) {
        this.time += delta;
        
        if (!this.waveData || !this.mesh) return;
        
        const positions = this.mesh.geometry.attributes.position;
        const count = positions.count;
        
        // Animate waves
        for (let i = 0; i < count; i++) {
            const x = this.waveData[i * 3];
            const z = this.waveData[i * 3 + 2];
            
            // Multiple wave layers
            let y = 0;
            
            // Large swell
            y += Math.sin(x * SWELL_FREQ_X + this.time * SWELL_SPEED_X) * SWELL_AMP_X;
            y += Math.sin(z * SWELL_FREQ_Z + this.time * SWELL_SPEED_Z) * SWELL_AMP_Z;
            y += Math.sin((x + z) * SWELL_FREQ_XZ + this.time * SWELL_SPEED_XZ) * SWELL_AMP_XZ;
            
            // Medium waves
            y += Math.sin(x * WAVE_FREQ_X + this.time * WAVE_SPEED_X) * WAVE_AMP_X;
            y += Math.sin(z * WAVE_FREQ_Z + this.time * WAVE_SPEED_Z) * WAVE_AMP_Z;
            y += Math.sin((x - z) * WAVE_FREQ_XZ + this.time * WAVE_SPEED_XZ) * WAVE_AMP_XZ;
            
            // Small ripples
            y += Math.sin(x * RIPPLE_FREQ_X + this.time * RIPPLE_SPEED_X) * RIPPLE_AMP_X;
            y += Math.sin(z * RIPPLE_FREQ_Z + this.time * RIPPLE_SPEED_Z) * RIPPLE_AMP_Z;
            
            // Shore break - waves get steeper near beach
            const distToShore = Math.abs(z - this.halfSize * SHORE_Z_FACTOR);
            if (distToShore < SHORE_DIST && z < this.halfSize * SHORE_Z_FACTOR) {
                const shoreFactor = 1 - distToShore / SHORE_DIST;
                y += Math.sin(x * SHORE_FREQ + this.time * SHORE_SPEED) * SHORE_AMP * shoreFactor;
            }
            
            positions.setY(i, y);
        }
        
        positions.needsUpdate = true;
        this.mesh.geometry.computeVertexNormals();
        
        // Update material for time of day
        this.updateMaterial();
    }

    updateMaterial() {
        // Will be updated by World's day/night cycle
    }

    getHeightAt(x, z) {
        if (!this.waveData) return 0;
        
        // Simple approximation - in practice would sample the mesh
        let y = 0;
        y += Math.sin(x * SWELL_FREQ_X + this.time * SWELL_SPEED_X) * SWELL_AMP_X;
        y += Math.sin(z * SWELL_FREQ_Z + this.time * SWELL_SPEED_Z) * SWELL_AMP_Z;
        y += Math.sin((x + z) * SWELL_FREQ_XZ + this.time * SWELL_SPEED_XZ) * SWELL_AMP_XZ;
        y += Math.sin(x * WAVE_FREQ_X + this.time * WAVE_SPEED_X) * WAVE_AMP_X;
        y += Math.sin(z * WAVE_FREQ_Z + this.time * WAVE_SPEED_Z) * WAVE_AMP_Z;
        return y;
    }

    getMesh() {
        return this.mesh;
    }

// Create shoreline foam particles
    createFoamParticles(scene, count = FOAM_COUNT) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const x = MathUtils.random(-this.halfSize, this.halfSize);
            const z = this.halfSize * FOAM_Z_OFFSET + MathUtils.random(FOAM_Z_RANGE_MIN, FOAM_Z_RANGE_MAX);
            positions[i * 3] = x;
            positions[i * 3 + 1] = FOAM_Y;
            positions[i * 3 + 2] = z;
            sizes[i] = MathUtils.random(FOAM_SIZE_MIN, FOAM_SIZE_MAX);
            alphas[i] = MathUtils.random(FOAM_ALPHA_MIN, FOAM_ALPHA_MAX);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const material = new THREE.PointsMaterial({
            color: FOAM_COLOR,
            size: 1,
            transparent: true,
            opacity: FOAM_OPACITY,
            sizeAttenuation: true,
            depthWrite: false
        });
        
        const foam = new THREE.Points(geometry, material);
        foam.userData = { type: 'foam', basePositions: positions.slice() };
        scene.add(foam);
        
        return foam;
    }
    
    updateFoam(foam, delta) {
        const positions = foam.geometry.attributes.position;
        const basePositions = foam.userData.basePositions;
        const count = positions.count;
        
        for (let i = 0; i < count; i++) {
            const x = basePositions[i * 3];
            const z = basePositions[i * 3 + 2];
            
            // Move with waves
            let y = 0;
            y += Math.sin(x * FOAM_WAVE_FREQ_X + this.time * FOAM_WAVE_SPEED_X) * FOAM_WAVE_AMP_X;
            y += Math.sin(z * FOAM_WAVE_FREQ_Z + this.time * FOAM_WAVE_SPEED_Z) * FOAM_WAVE_AMP_Z;
            
            positions.setY(i, FOAM_Y + y);
            
            // Fade in/out
            const alphaAttr = foam.geometry.attributes.alpha;
            alphaAttr.setX(i, FOAM_ALPHA_BASE + Math.sin(this.time * FOAM_ALPHA_SPEED + i) * FOAM_ALPHA_AMP);
        }
        
        positions.needsUpdate = true;
        foam.geometry.attributes.alpha.needsUpdate = true;
    }
}

window.Ocean = Ocean;