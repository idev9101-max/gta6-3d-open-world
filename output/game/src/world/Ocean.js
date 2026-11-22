// Ocean system with waves
class Ocean {
    constructor(citySize = 60, blockSize = 20) {
        this.citySize = citySize;
        this.blockSize = blockSize;
        this.halfSize = citySize * blockSize / 2;
        this.oceanSize = this.halfSize * 3;
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
            color: 0x003366,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            fog: true
        });
        
        // Custom shader for waves would go here
        // For now use standard material with vertex displacement in update
    }

    createMesh() {
        const segments = 120;
        const geometry = new THREE.PlaneGeometry(this.oceanSize * 2, this.oceanSize * 2, segments, segments);
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
        this.mesh.position.y = 0;
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
            y += Math.sin(x * 0.02 + this.time * 0.5) * 0.8;
            y += Math.sin(z * 0.02 + this.time * 0.4) * 0.6;
            y += Math.sin((x + z) * 0.015 + this.time * 0.3) * 0.4;
            
            // Medium waves
            y += Math.sin(x * 0.05 + this.time * 1.2) * 0.3;
            y += Math.sin(z * 0.05 + this.time * 1.0) * 0.25;
            y += Math.sin((x - z) * 0.04 + this.time * 1.5) * 0.2;
            
            // Small ripples
            y += Math.sin(x * 0.2 + this.time * 3) * 0.05;
            y += Math.sin(z * 0.2 + this.time * 2.5) * 0.04;
            
            // Shore break - waves get steeper near beach
            const distToShore = Math.abs(z - this.halfSize * 0.8);
            if (distToShore < 50 && z < this.halfSize * 0.8) {
                const shoreFactor = 1 - distToShore / 50;
                y += Math.sin(x * 0.08 + this.time * 2) * 0.5 * shoreFactor;
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
        y += Math.sin(x * 0.02 + this.time * 0.5) * 0.8;
        y += Math.sin(z * 0.02 + this.time * 0.4) * 0.6;
        y += Math.sin((x + z) * 0.015 + this.time * 0.3) * 0.4;
        y += Math.sin(x * 0.05 + this.time * 1.2) * 0.3;
        y += Math.sin(z * 0.05 + this.time * 1.0) * 0.25;
        return y;
    }

    getMesh() {
        return this.mesh;
    }

    // Create shoreline foam particles
    createFoamParticles(scene, count = 500) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const x = MathUtils.random(-this.halfSize, this.halfSize);
            const z = this.halfSize * 0.8 + MathUtils.random(-15, 5);
            positions[i * 3] = x;
            positions[i * 3 + 1] = 0.3;
            positions[i * 3 + 2] = z;
            sizes[i] = MathUtils.random(0.2, 0.8);
            alphas[i] = MathUtils.random(0.3, 0.8);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.6,
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
            y += Math.sin(x * 0.05 + this.time * 2) * 0.3;
            y += Math.sin(z * 0.05 + this.time * 1.8) * 0.25;
            
            positions.setY(i, 0.3 + y);
            
            // Fade in/out
            const alphaAttr = foam.geometry.attributes.alpha;
            alphaAttr.setX(i, 0.3 + Math.sin(this.time * 3 + i) * 0.3);
        }
        
        positions.needsUpdate = true;
        foam.geometry.attributes.alpha.needsUpdate = true;
    }
}

window.Ocean = Ocean;