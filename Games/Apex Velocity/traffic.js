import * as THREE from 'three';

export class TrafficManager {
    constructor(scene) {
        this.scene = scene;
        this.cars = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.0; 

        // Left lanes: move forward with player. Right lanes: head-on (opposite direction).
        this.leftLanes = [-12, -8, -4];
        this.rightLanes = [4, 8, 12];
    }

    createTrafficCar(zPos) {
        const group = new THREE.Group();

        // Identical style to player car
        const bodyGeo = new THREE.BoxGeometry(2.0, 0.6, 4.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        const glassGeo = new THREE.BoxGeometry(1.4, 0.4, 2.0);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 0.8, -0.2);
        group.add(glass);

        const spawnOnLeft = Math.random() < 0.5;
        let laneX, speed, facingRotation;

        if (spawnOnLeft) {
            laneX = this.leftLanes[Math.floor(Math.random() * this.leftLanes.length)];
            speed = 15.0 + Math.random() * 10.0; // Moves forward
            facingRotation = 0; 
        } else {
            laneX = this.rightLanes[Math.floor(Math.random() * this.rightLanes.length)];
            speed = -(20.0 + Math.random() * 15.0); // Head-on
            facingRotation = Math.PI; 
        }

        group.position.set(laneX, 0, zPos);
        group.rotation.y = facingRotation;

        this.scene.add(group);
        this.cars.push({ mesh: group, speed: speed, width: 2.0, length: 4.5 });
    }

    update(delta, playerCar) {
        if (playerCar.isGameOver) return;

        // If God Mode is active, obliterate all traffic and stop spawning!
        if (playerCar.isGodMode) {
            if (this.cars.length > 0) {
                this.cars.forEach(traffic => this.scene.remove(traffic.mesh));
                this.cars = [];
            }
            return;
        }

        this.spawnTimer += delta;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            const spawnZ = playerCar.mesh.position.z - 300 - Math.random() * 100;
            this.createTrafficCar(spawnZ);
        }

        for (let i = this.cars.length - 1; i >= 0; i--) {
            const traffic = this.cars[i];

            traffic.mesh.position.z += traffic.speed * delta * 6;

            const distanceToPlayer = traffic.mesh.position.z - playerCar.mesh.position.z;
            if (distanceToPlayer > 80 || distanceToPlayer < -400) {
                this.scene.remove(traffic.mesh);
                this.cars.splice(i, 1);
                continue;
            }

            // AABB Collision Check
            if (this.checkCollision(playerCar, traffic)) {
                playerCar.addDamage(33.33); // 3 major crashes to total a car
                traffic.speed += 15.0;
            }
        }
    }

    checkCollision(player, traffic) {
        const pPos = player.mesh.position;
        const tPos = traffic.mesh.position;

        const pWidth = 2.0, pLength = 4.5;
        const tWidth = traffic.width, tLength = traffic.length;

        const xOverlap = Math.abs(pPos.x - tPos.x) < (pWidth / 2 + tWidth / 2);
        const zOverlap = Math.abs(pPos.z - tPos.z) < (pLength / 2 + tLength / 2);

        return xOverlap && zOverlap;
    }
}