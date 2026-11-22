// Mission definitions and marker system
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
const MARKER_CYLINDER_RADIUS = 2;
const MARKER_CYLINDER_HEIGHT = 0.2;
const MARKER_ARROW_RADIUS = 1;
const MARKER_ARROW_HEIGHT = 3;
const MARKER_ARROW_Y = 2;
const MARKER_LIGHT_INTENSITY = 20;
const MARKER_LIGHT_DISTANCE = 30;
const MARKER_LIGHT_DECAY = 2;
const MARKER_LIGHT_Y = 5;
const MARKER_ARROW_BOUNCE_SPEED = 3;
const MARKER_ARROW_BOUNCE_AMPLITUDE = 0.3;
const MARKER_ARROW_ROT_SPEED = 1;
const MARKER_LIGHT_PULSE_SPEED = 4;
const MARKER_LIGHT_PULSE_AMPLITUDE = 5;
const DEFAULT_MARKER_RADIUS = 5;

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
        const cylGeo = new THREE.CylinderGeometry(MARKER_CYLINDER_RADIUS, MARKER_CYLINDER_RADIUS, MARKER_CYLINDER_HEIGHT, 16);
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
        const arrowGeo = new THREE.ConeGeometry(MARKER_ARROW_RADIUS, MARKER_ARROW_HEIGHT, 4);
        const arrowMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00, 
            emissive: 0xffaa00,
            emissiveIntensity: 1
        });
        this.arrow = new THREE.Mesh(arrowGeo, arrowMat);
        this.arrow.position.y = MARKER_ARROW_Y;
        group.add(this.arrow);
        
        // Beacon light
        const light = new THREE.PointLight(0xffaa00, MARKER_LIGHT_INTENSITY, MARKER_LIGHT_DISTANCE, MARKER_LIGHT_DECAY);
        light.position.y = MARKER_LIGHT_Y;
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
        this.arrow.position.y = MARKER_ARROW_Y + Math.sin(this.game.time * MARKER_ARROW_BOUNCE_SPEED) * MARKER_ARROW_BOUNCE_AMPLITUDE;
        this.arrow.rotation.y += delta * MARKER_ARROW_ROT_SPEED;
        
        // Pulse light
        this.beaconLight.intensity = MARKER_LIGHT_INTENSITY - MARKER_LIGHT_PULSE_AMPLITUDE + Math.sin(this.game.time * MARKER_LIGHT_PULSE_SPEED) * MARKER_LIGHT_PULSE_AMPLITUDE;
        
        // Check distance
        const dist = this.game.player.position.distanceTo(this.mesh.position);
        if (dist < (this.mission.objectives[this.objectiveIndex].radius || DEFAULT_MARKER_RADIUS)) {
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