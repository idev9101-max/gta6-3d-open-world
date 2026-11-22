// Mission definitions
const Missions = [
    {
        id: 'intro',
        name: 'Welcome to Solmar',
        description: 'Get familiar with the city. Steal a car and drive to the marker.',
        objectives: [
            { type: 'enter_vehicle', text: 'Steal a vehicle (press E near car)' },
            { type: 'drive', position: new THREE.Vector3(-200, 0, -200), radius: 10, text: 'Drive to the meetup point' }
        ],
        reward: 500,
        unlocks: 'mission_1'
    },
    {
        id: 'mission_1',
        name: 'First Job',
        description: 'Eliminate the rival gang members at the warehouse.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(150, 0, 100), radius: 15, text: 'Drive to the warehouse district' },
            { type: 'kill', count: 5, targetType: 'gang', text: 'Eliminate 5 gang members' },
            { type: 'escape', text: 'Lose the police' }
        ],
        reward: 2000,
        unlocks: 'mission_2'
    },
    {
        id: 'mission_2',
        name: 'The Pickup',
        description: 'Retrieve the package from the docks and deliver it.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(400, 0, 350), radius: 10, text: 'Go to the docks' },
            { type: 'pickup', position: new THREE.Vector3(400, 0, 350), text: 'Pick up the package' },
            { type: 'drive', position: new THREE.Vector3(-300, 0, -300), radius: 10, text: 'Deliver to the drop point' },
            { type: 'timed', duration: 180, text: 'Deliver within 3 minutes' }
        ],
        reward: 3000,
        unlocks: 'mission_3'
    },
    {
        id: 'mission_3',
        name: 'Tail the Snitch',
        description: 'Follow the informant without being spotted.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(0, 0, 200), radius: 10, text: 'Find the informant near city hall' },
            { type: 'tail', targetId: 'informant', maxDistance: 30, minDistance: 10, duration: 120, text: 'Follow the informant (stay between 10-30m)' },
            { type: 'kill', count: 1, targetType: 'informant', text: 'Eliminate the informant' }
        ],
        reward: 4000,
        unlocks: 'mission_4'
    },
    {
        id: 'mission_4',
        name: 'Destruction Derby',
        description: 'Destroy rival vehicles in the arena.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(-400, 0, 0), radius: 15, text: 'Go to the industrial zone' },
            { type: 'destroy', count: 6, targetType: 'vehicle', text: 'Destroy 6 enemy vehicles' },
            { type: 'survive', duration: 60, text: 'Survive for 1 minute' }
        ],
        reward: 5000,
        unlocks: 'mission_5'
    },
    {
        id: 'mission_5',
        name: 'The Heist',
        description: 'Rob the bank and escape with the loot.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(50, 0, 50), radius: 10, text: 'Drive to the central bank' },
            { type: 'enter', position: new THREE.Vector3(50, 0, 50), text: 'Enter the bank' },
            { type: 'wait', duration: 10, text: 'Wait for the vault to open' },
            { type: 'pickup', position: new THREE.Vector3(50, 0, 50), text: 'Grab the money' },
            { type: 'escape', wantedLevel: 4, text: 'Escape with 4-star wanted level' }
        ],
        reward: 10000,
        unlocks: 'mission_6'
    },
    {
        id: 'mission_6',
        name: 'Final Showdown',
        description: 'Take down the crime boss at his mansion.',
        objectives: [
            { type: 'drive', position: new THREE.Vector3(-500, 0, -400), radius: 20, text: 'Go to the mansion on the hill' },
            { type: 'kill', count: 10, targetType: 'bodyguard', text: 'Eliminate 10 bodyguards' },
            { type: 'kill', count: 1, targetType: 'boss', text: 'Kill the crime boss' },
            { type: 'escape', text: 'Escape the mansion' }
        ],
        reward: 25000,
        unlocks: 'ending'
    }
];

// Mission markers/beacons
class MissionMarker {
    constructor(game, mission, objectiveIndex) {
        this.game = game;
        this.mission = mission;
        this.objectiveIndex = objectiveIndex;
        this.mesh = null;
        this.beacon = null;
        this.createMarker();
    }

    createMarker() {
        const obj = this.mission.objectives[this.objectiveIndex];
        if (!obj.position) return;
        
        // World marker
        const group = new THREE.Group();
        
        // Cylinder base
        const cylGeo = new THREE.CylinderGeometry(2, 2, 0.2, 16);
        const cylMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00, 
            transparent: true, 
            opacity: 0.5,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5
        });
        const cylinder = new THREE.Mesh(cylGeo, cylMat);
        cylinder.position.y = 0.1;
        group.add(cylinder);
        
        // Arrow pointing up
        const arrowGeo = new THREE.ConeGeometry(1, 3, 4);
        const arrowMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00, 
            emissive: 0xffaa00,
            emissiveIntensity: 1
        });
        this.arrow = new THREE.Mesh(arrowGeo, arrowMat);
        this.arrow.position.y = 2;
        group.add(this.arrow);
        
        // Beacon light
        const light = new THREE.PointLight(0xffaa00, 20, 30, 2);
        light.position.y = 5;
        group.add(light);
        this.beaconLight = light;
        
        group.position.copy(obj.position);
        group.position.y = 0;
        
        this.mesh = group;
        this.game.scene.add(group);
    }

    update(delta) {
        if (!this.mesh) return;
        
        // Animate arrow
        this.arrow.position.y = 2 + Math.sin(this.game.time * 3) * 0.3;
        this.arrow.rotation.y += delta;
        
        // Pulse light
        this.beaconLight.intensity = 15 + Math.sin(this.game.time * 4) * 5;
        
        // Check distance
        const dist = this.game.player.position.distanceTo(this.mesh.position);
        if (dist < (this.mission.objectives[this.objectiveIndex].radius || 5)) {
            this.complete();
        }
    }

    complete() {
        if (this.mesh) {
            this.game.scene.remove(this.mesh);
            this.mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            this.mesh = null;
        }
        this.game.missionManager.nextObjective();
    }

    dispose() {
        this.complete();
    }
}

window.Missions = Missions;
window.MissionMarker = MissionMarker;