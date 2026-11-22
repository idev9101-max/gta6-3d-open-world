// Minimap radar system - draws top-down view of world with entity blips
const MINIMAP_CANVAS_ID = 'minimap-canvas';
const DEFAULT_SIZE = 180;
const EXPANDED_SIZE = 300;
const BG_COLOR = '#001100';
const BORDER_COLOR = '#ff6600';
const BORDER_WIDTH = 2;
const MINIMAP_ROAD_COLOR = '#444444';
const ROAD_LINE_WIDTH_BASE = 3;
const ROAD_LINE_WIDTH_FACTOR = 20;
const OCEAN_COLOR = '#003366';
const OCEAN_Z_FACTOR = 0.8;
const PLAYER_COLOR = '#00ff88';
const PLAYER_ARROW_SIZE = 8;
const PLAYER_ARROW_WIDTH = 5;
const PLAYER_ARROW_TIP = 2;
const PLAYER_OUTLINE_COLOR = '#000';
const PLAYER_OUTLINE_WIDTH = 1;
const VEHICLE_COLOR = '#ffffff';
const POLICE_VEHICLE_COLOR = '#0088ff';
const PLAYER_VEHICLE_COLOR = '#00ff88';
const VEHICLE_BLIP_SIZE = 3;
const PEDESTRIAN_COLOR = '#88ff88';
const POLICE_PED_COLOR = '#0088ff';
const PEDESTRIAN_BLIP_SIZE = 2;
const POLICE_CAR_COLOR = '#ff4444';
const POLICE_CAR_BLIP_SIZE = 4;
const POLICE_PED_BLIP_SIZE = 3;
const MISSION_MARKER_COLOR = 'rgba(255, 170, 0, ';
const MISSION_MARKER_BASE_ALPHA = 0.5;
const MISSION_MARKER_PULSE_ALPHA = 0.5;
const MISSION_MARKER_PULSE_SPEED = 5;
const MISSION_MARKER_BASE_SIZE = 6;
const MISSION_MARKER_PULSE_SIZE = 4;
const NORTH_INDICATOR_X_OFFSET = 20;
const NORTH_INDICATOR_Y_OFFSET = 20;
const NORTH_INDICATOR_FONT = 'bold 10px monospace';
const NORTH_INDICATOR_COLOR = '#ff6600';
const OFFSCREEN_INDICATOR_DIST = 10;
const OFFSCREEN_INDICATOR_HEIGHT = 6;
const OFFSCREEN_INDICATOR_WIDTH = 8;
const LINE_IN_BOUNDS_MARGIN = 10;

class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById(MINIMAP_CANVAS_ID);
        this.ctx = this.canvas.getContext('2d');
        this.size = DEFAULT_SIZE;
        this.zoom = 1;
        this.baseZoom = 1;
        this.expanded = false;
        this.expandedSize = EXPANDED_SIZE;
        this.normalSize = DEFAULT_SIZE;
        
        this.playerIcon = null;
        this.blips = [];
        
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.ctx.imageSmoothingEnabled = false;
    }

    toggleSize() {
        this.expanded = !this.expanded;
        this.size = this.expanded ? this.expandedSize : this.normalSize;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.width = this.size + 'px';
        this.canvas.style.height = this.size + 'px';
    }

    update(delta) {
        if (!this.game.player || !this.game.player.mesh) return;
        
        const ctx = this.ctx;
        const size = this.size;
        const halfSize = size / 2;
        const playerPos = this.game.player.mesh.position;
        const playerRot = this.game.player.mesh.rotation.y;
        
        // Clear
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, size, size);
        
        // Border
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = BORDER_WIDTH;
        ctx.strokeRect(1, 1, size - 2, size - 2);
        
        // World bounds
        const worldSize = this.game.world.cityGenerator.roadNetwork.citySize * this.game.world.cityGenerator.roadNetwork.blockSize;
        const scale = (halfSize - 10) / (worldSize * this.zoom);
        
        // Draw roads
        this.drawRoads(ctx, playerPos, scale, halfSize);
        
        // Draw ocean
        this.drawOcean(ctx, playerPos, scale, halfSize);
        
        // Draw blips
        this.drawBlips(ctx, playerPos, scale, halfSize, playerRot);
        
        // Draw player
        this.drawPlayer(ctx, halfSize, playerRot);
        
        // North indicator
        this.drawNorthIndicator(ctx, size);
        
        // Mission marker
        this.drawMissionMarker(ctx, playerPos, scale, halfSize);
    }

    drawRoads(ctx, playerPos, scale, center) {
        const roads = this.game.world.cityGenerator.roadNetwork.roads;
        ctx.strokeStyle = MINIMAP_ROAD_COLOR;
        ctx.lineWidth = Math.max(1, ROAD_LINE_WIDTH_BASE * scale * ROAD_LINE_WIDTH_FACTOR);
        
        ctx.beginPath();
        roads.forEach(road => {
            const startX = (road.start.x - playerPos.x) * scale + center;
            const startY = (road.start.z - playerPos.z) * scale + center;
            const endX = (road.end.x - playerPos.x) * scale + center;
            const endY = (road.end.z - playerPos.z) * scale + center;
            
            // Cull off-screen
            if (this.lineInBounds(startX, startY, endX, endY, center)) {
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
            }
        });
        ctx.stroke();
    }

    lineInBounds(x1, y1, x2, y2, center) {
        const maxDist = center + LINE_IN_BOUNDS_MARGIN;
        return (x1 > -maxDist && x1 < maxDist && y1 > -maxDist && y1 < maxDist) ||
               (x2 > -maxDist && x2 < maxDist && y2 > -maxDist && y2 < maxDist);
    }

    drawOcean(ctx, playerPos, scale, center) {
        const roadNet = this.game.world.cityGenerator.roadNetwork;
        const oceanZ = (roadNet.citySize * roadNet.blockSize / 2) * OCEAN_Z_FACTOR;
        const y = (oceanZ - playerPos.z) * scale + center;
        
        if (y > -center && y < center * 3) {
            ctx.fillStyle = OCEAN_COLOR;
            ctx.fillRect(0, y, this.size, this.size - y);
        }
    }

    drawBlips(ctx, playerPos, scale, center, playerRot) {
        // Vehicles
        this.game.world.vehicles.forEach(car => {
            if (car === this.game.player.vehicle) return;
            if (car.health <= 0) return;
            
            const dx = (car.mesh.position.x - playerPos.x) * scale;
            const dy = (car.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = car.isPlayerVehicle ? PLAYER_VEHICLE_COLOR : VEHICLE_COLOR;
                if (car.constructor.name === 'PoliceCar') ctx.fillStyle = POLICE_VEHICLE_COLOR;
                this.drawBlip(ctx, center + dx, center + dy, VEHICLE_BLIP_SIZE);
            }
        });
        
        // Pedestrians
        this.game.world.pedestrians.forEach(ped => {
            if (ped.health <= 0) return;
            
            const dx = (ped.mesh.position.x - playerPos.x) * scale;
            const dy = (ped.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = ped.isPolice ? POLICE_PED_COLOR : PEDESTRIAN_COLOR;
                this.drawBlip(ctx, center + dx, center + dy, PEDESTRIAN_BLIP_SIZE);
            }
        });
        
        // Police cars
        this.game.world.policeCars.forEach(car => {
            const dx = (car.mesh.position.x - playerPos.x) * scale;
            const dy = (car.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = POLICE_CAR_COLOR;
                this.drawBlip(ctx, center + dx, center + dy, POLICE_CAR_BLIP_SIZE);
            }
        });
        
        // Police peds
        this.game.world.policePeds.forEach(ped => {
            const dx = (ped.mesh.position.x - playerPos.x) * scale;
            const dy = (ped.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = POLICE_CAR_COLOR;
                this.drawBlip(ctx, center + dx, center + dy, POLICE_PED_BLIP_SIZE);
            }
        });
        
        // Mission objective
        if (this.game.missionManager.isInMission) {
            const obj = this.game.missionManager.currentMission?.objectives[this.game.missionManager.currentObjectiveIndex];
            if (obj && obj.position) {
                const dx = (obj.position.x - playerPos.x) * scale;
                const dy = (obj.position.z - playerPos.z) * scale;
                
                if (Math.abs(dx) < center && Math.abs(dy) < center) {
                    // Pulsing marker
                    const pulse = (Math.sin(this.game.time * MISSION_MARKER_PULSE_SPEED) + 1) / 2;
                    ctx.fillStyle = MISSION_MARKER_COLOR + (MISSION_MARKER_BASE_ALPHA + pulse * MISSION_MARKER_PULSE_ALPHA) + ')';
                    this.drawBlip(ctx, center + dx, center + dy, MISSION_MARKER_BASE_SIZE + pulse * MISSION_MARKER_PULSE_SIZE);
                    
                    // Direction indicator if off-screen
                    if (Math.abs(dx) >= center || Math.abs(dy) >= center) {
                        this.drawOffscreenIndicator(ctx, center, center, dx, dy, '#ffaa00');
                    }
                } else {
                    // Off-screen indicator
                    this.drawOffscreenIndicator(ctx, center, center, dx, dy, '#ffaa00');
                }
            }
        }
    }

    drawBlip(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPlayer(ctx, center, rotation) {
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-rotation);
        
        // Player arrow
        ctx.fillStyle = PLAYER_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, -PLAYER_ARROW_SIZE);
        ctx.lineTo(PLAYER_ARROW_WIDTH, PLAYER_ARROW_TIP);
        ctx.lineTo(0, PLAYER_ARROW_TIP);
        ctx.lineTo(-PLAYER_ARROW_WIDTH, PLAYER_ARROW_TIP);
        ctx.closePath();
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = PLAYER_OUTLINE_COLOR;
        ctx.lineWidth = PLAYER_OUTLINE_WIDTH;
        ctx.stroke();
        
        ctx.restore();
    }

    drawNorthIndicator(ctx, size) {
        const x = size - NORTH_INDICATOR_X_OFFSET;
        const y = NORTH_INDICATOR_Y_OFFSET;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-this.game.cameraController.yaw);
        
        ctx.fillStyle = NORTH_INDICATOR_COLOR;
        ctx.font = NORTH_INDICATOR_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, 4);
        
        ctx.restore();
    }

    drawMissionMarker(ctx, playerPos, scale, center) {
        // Already handled in drawBlips
    }

    drawOffscreenIndicator(ctx, centerX, centerY, dx, dy, color) {
        const angle = Math.atan2(dy, dx);
        const indicatorDist = centerX - OFFSCREEN_INDICATOR_DIST;
        const x = centerX + Math.cos(angle) * indicatorDist;
        const y = centerY + Math.sin(angle) * indicatorDist;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -OFFSCREEN_INDICATOR_HEIGHT);
        ctx.lineTo(OFFSCREEN_INDICATOR_WIDTH, 0);
        ctx.lineTo(0, OFFSCREEN_INDICATOR_HEIGHT);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    onResize() {
        // Canvas size handled by toggleSize
    }
}

window.Minimap = Minimap;