// Save/Load system using localStorage
const SaveLoad = {
    SAVE_KEY: 'solmar_nights_save',
    SETTINGS_KEY: 'solmar_nights_settings',

    save(gameState) {
        try {
            const data = {
                version: 1,
                timestamp: Date.now(),
                player: gameState.player ? this.serializePlayer(gameState.player) : null,
                world: gameState.world ? this.serializeWorld(gameState.world) : null,
                missions: gameState.missionManager ? this.serializeMissions(gameState.missionManager) : null,
                stats: gameState.stats || {},
                settings: gameState.settings || {}
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    deleteSave() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Settings save failed:', e);
            return false;
        }
    },

    loadSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    serializePlayer(player) {
        return {
            position: player.position ? [player.position.x, player.position.y, player.position.z] : [0, 1, 0],
            rotation: player.rotation ? player.rotation.y : 0,
            health: player.health,
            maxHealth: player.maxHealth,
            armor: player.armor,
            maxArmor: player.maxArmor,
            money: player.money,
            ammo: player.ammo,
            maxAmmo: player.maxAmmo,
            wantedLevel: player.wantedLevel,
            wantedTimer: player.wantedTimer,
            isInVehicle: player.isInVehicle,
            vehicleId: player.vehicle ? player.vehicle.id : null
        };
    },

    serializeWorld(world) {
        return {
            timeOfDay: world.timeOfDay,
            trafficCars: world.trafficCars ? world.trafficCars.map(car => this.serializeCar(car)) : [],
            parkedCars: world.parkedCars ? world.parkedCars.map(car => this.serializeCar(car)) : [],
            pedestrians: world.pedestrians ? world.pedestrians.map(ped => this.serializePed(ped)) : [],
            policeCars: world.policeCars ? world.policeCars.map(car => this.serializeCar(car)) : [],
            policePeds: world.policePeds ? world.policePeds.map(ped => this.serializePed(ped)) : []
        };
    },

    serializeCar(car) {
        return {
            id: car.id,
            position: car.position ? [car.position.x, car.position.y, car.position.z] : [0, 0.5, 0],
            rotation: car.rotation ? car.rotation.y : 0,
            health: car.health,
            maxHealth: car.maxHealth,
            speed: car.speed,
            isPlayerVehicle: car.isPlayerVehicle || false,
            waypointIndex: car.waypointIndex || 0
        };
    },

    serializePed(ped) {
        return {
            id: ped.id,
            position: ped.position ? [ped.position.x, ped.position.y, ped.position.z] : [0, 1, 0],
            rotation: ped.rotation ? ped.rotation.y : 0,
            health: ped.health,
            maxHealth: ped.maxHealth,
            state: ped.state || 'wander',
            waypointIndex: ped.waypointIndex || 0,
            isPolice: ped.isPolice || false
        };
    },

    serializeMissions(missionManager) {
        return {
            currentMissionIndex: missionManager.currentMissionIndex,
            missionProgress: missionManager.missionProgress,
            completedMissions: missionManager.completedMissions || [],
            activeObjectives: missionManager.activeObjectives || []
        };
    },

    deserializePlayer(data, player, world) {
        if (!data || !player) return;
        if (data.position) player.position.set(...data.position);
        if (data.rotation !== undefined) player.rotation.y = data.rotation;
        player.health = data.health || player.maxHealth;
        player.maxHealth = data.maxHealth || player.maxHealth;
        player.armor = data.armor || 0;
        player.maxArmor = data.maxArmor || 100;
        player.money = data.money || 0;
        player.ammo = data.ammo || 12;
        player.maxAmmo = data.maxAmmo || 60;
        player.wantedLevel = data.wantedLevel || 0;
        player.wantedTimer = data.wantedTimer || 0;
        
        if (data.isInVehicle && data.vehicleId !== null) {
            const vehicle = world.getVehicleById(data.vehicleId);
            if (vehicle) player.enterVehicle(vehicle);
        }
    },

    deserializeWorld(data, world) {
        if (!data || !world) return;
        world.timeOfDay = data.timeOfDay || 0;
        
        if (data.trafficCars) {
            data.trafficCars.forEach(carData => {
                const car = world.spawnTrafficCar(carData.position, carData.rotation);
                if (car) {
                    car.id = carData.id;
                    car.health = carData.health;
                    car.maxHealth = carData.maxHealth;
                    car.speed = carData.speed;
                    car.waypointIndex = carData.waypointIndex || 0;
                }
            });
        }
        
        if (data.parkedCars) {
            data.parkedCars.forEach(carData => {
                const car = world.spawnParkedCar(carData.position, carData.rotation);
                if (car) {
                    car.id = carData.id;
                    car.health = carData.health;
                    car.maxHealth = carData.maxHealth;
                }
            });
        }
        
        if (data.pedestrians) {
            data.pedestrians.forEach(pedData => {
                const ped = world.spawnPedestrian(pedData.position, pedData.rotation);
                if (ped) {
                    ped.id = pedData.id;
                    ped.health = pedData.health;
                    ped.maxHealth = pedData.maxHealth;
                    ped.state = pedData.state;
                    ped.waypointIndex = pedData.waypointIndex || 0;
                }
            });
        }
        
        if (data.policeCars) {
            data.policeCars.forEach(carData => {
                const car = world.spawnPoliceCar(carData.position, carData.rotation);
                if (car) {
                    car.id = carData.id;
                    car.health = carData.health;
                    car.maxHealth = carData.maxHealth;
                    car.speed = carData.speed;
                    car.waypointIndex = carData.waypointIndex || 0;
                }
            });
        }
        
        if (data.policePeds) {
            data.policePeds.forEach(pedData => {
                const ped = world.spawnPolicePed(pedData.position, pedData.rotation);
                if (ped) {
                    ped.id = pedData.id;
                    ped.health = pedData.health;
                    ped.maxHealth = pedData.maxHealth;
                    ped.state = pedData.state;
                    ped.waypointIndex = pedData.waypointIndex || 0;
                    ped.isPolice = true;
                }
            });
        }
    },

    deserializeMissions(data, missionManager) {
        if (!data || !missionManager) return;
        missionManager.currentMissionIndex = data.currentMissionIndex || 0;
        missionManager.missionProgress = data.missionProgress || 0;
        missionManager.completedMissions = data.completedMissions || [];
        missionManager.activeObjectives = data.activeObjectives || [];
    }
};

window.SaveLoad = SaveLoad;