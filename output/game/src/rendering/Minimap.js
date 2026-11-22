// Minimap radar system
class Minimap {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.size = 180;
        this.zoom = 1;
        this.baseZoom = 1;
        this.expanded = false;
        this.expandedSize = 300;
        this.normalSize = 180;
        
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
        ctx.fillStyle = '#001100';
        ctx.fillRect(0, 0, size, size);
        
        // Border
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
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
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = Math.max(1, 3 * scale * 20);
        
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
        const maxDist = center + 10;
        return (x1 > -maxDist && x1 < maxDist && y1 > -maxDist && y1 < maxDist) ||
               (x2 > -maxDist && x2 < maxDist && y2 > -maxDist && y2 < maxDist);
    }

    drawOcean(ctx, playerPos, scale, center) {
        const roadNet = this.game.world.cityGenerator.roadNetwork;
        const oceanZ = (roadNet.citySize * roadNet.blockSize / 2) * 0.8;
        const y = (oceanZ - playerPos.z) * scale + center;
        
        if (y > -center && y < center * 3) {
            ctx.fillStyle = '#003366';
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
                ctx.fillStyle = car.isPlayerVehicle ? '#00ff88' : '#ffffff';
                if (car.constructor.name === 'PoliceCar') ctx.fillStyle = '#0088ff';
                this.drawBlip(ctx, center + dx, center + dy, 3);
            }
        });
        
        // Pedestrians
        this.game.world.pedestrians.forEach(ped => {
            if (ped.health <= 0) return;
            
            const dx = (ped.mesh.position.x - playerPos.x) * scale;
            const dy = (ped.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = ped.isPolice ? '#0088ff' : '#88ff88';
                this.drawBlip(ctx, center + dx, center + dy, 2);
            }
        });
        
        // Police
        this.game.world.policeCars.forEach(car => {
            const dx = (car.mesh.position.x - playerPos.x) * scale;
            const dy = (car.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = '#ff4444';
                this.drawBlip(ctx, center + dx, center + dy, 4);
            }
        });
        
        this.game.world.policePeds.forEach(ped => {
            const dx = (ped.mesh.position.x - playerPos.x) * scale;
            const dy = (ped.mesh.position.z - playerPos.z) * scale;
            
            if (Math.abs(dx) < center && Math.abs(dy) < center) {
                ctx.fillStyle = '#ff4444';
                this.drawBlip(ctx, center + dx, center + dy, 3);
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
                    const pulse = (Math.sin(this.game.time * 5) + 1) / 2;
                    ctx.fillStyle = `rgba(255, 170, 0, ${0.5 + pulse * 0.5})`;
                    this.drawBlip(ctx, center + dx, center + dy, 6 + pulse * 4);
                    
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
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }

    drawNorthIndicator(ctx, size) {
        const x = size - 20;
        const y = 20;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-this.game.cameraController.yaw);
        
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, 4);
        
        ctx.restore();
    }

    drawMissionMarker(ctx, playerPos, scale, center) {
        // Already handled in drawBlips
    }

    drawOffscreenIndicator(ctx, centerX, centerY, dx, dy, color) {
        const angle = Math.atan2(dy, dx);
        const indicatorDist = centerX - 10;
        const x = centerX + Math.cos(angle) * indicatorDist;
        const y = centerY + Math.sin(angle) * indicatorDist;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    onResize() {
        // Canvas size handled by toggleSize
    }
}

window.Minimap = Minimap;