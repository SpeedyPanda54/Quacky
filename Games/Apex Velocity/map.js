import * as THREE from 'three';

export class HighwayMap {
    constructor(scene) {
        this.scene = scene;
        this.segmentLength = 3000; // Increased length to handle high-speed nitro seamlessly
        this.highwaySegments = [];

        // Common Materials
        this.buildingMat = new THREE.MeshStandardMaterial({ color: 0x05050f, roughness: 0.2, metalness: 0.9 });
        this.cyanEdgeMat = new THREE.LineBasicMaterial({ color: 0x00ffff });
        this.pinkEdgeMat = new THREE.LineBasicMaterial({ color: 0xff00ff });

        // Spawn initial chain of highway segments
        for (let i = 0; i < 5; i++) {
            this.highwaySegments.push(this.createHighwaySegment(-i * this.segmentLength));
        }
    }

    createHighwaySegment(zPos) {
        const group = new THREE.Group();
        const halfLen = this.segmentLength / 2;

        // 1. Road Surface
        const roadGeo = new THREE.PlaneGeometry(32, this.segmentLength);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.4, metalness: 0.8 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.receiveShadow = true;
        group.add(road);

        // 2. Glowing Center Lane Dividers
        const lineGeo = new THREE.BoxGeometry(0.3, 0.04, 4);
        const lineMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0.8 });
        for (let i = -halfLen + 10; i < halfLen; i += 15) {
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, 0.02, i);
            group.add(line);
        }

        // 3. Side Neon Barriers
        const barrierGeo = new THREE.BoxGeometry(0.8, 1.5, this.segmentLength);
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 0.8 });
        
        const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        leftBarrier.position.set(-16, 0.75, 0);
        group.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat.clone());
        rightBarrier.material.color.setHex(0x00ffff);
        rightBarrier.material.emissive.setHex(0x00ffff);
        rightBarrier.position.set(16, 0.75, 0);
        group.add(rightBarrier);

        // 4. Year 3026 City Skyscrapers spanning the segment
        for (let zOffset = -halfLen + 30; zOffset <= halfLen - 30; zOffset += 45) {
            this.createSkyscraper(group, -35, zOffset, this.cyanEdgeMat);
            this.createSkyscraper(group, 35, zOffset, this.pinkEdgeMat);
        }

        // 5. Overhead Cyber-Tunnels / Arches spanning the segment
        for (let archZ = -halfLen + 40; archZ <= halfLen - 40; archZ += 60) {
            const archGroup = new THREE.Group();
            
            const pillarGeo = new THREE.BoxGeometry(1.5, 25, 1.5);
            const archMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x00ffff, emissiveIntensity: 0.4 });
            
            const leftPillar = new THREE.Mesh(pillarGeo, archMat);
            leftPillar.position.set(-16, 12.5, 0);
            archGroup.add(leftPillar);

            const rightPillar = new THREE.Mesh(pillarGeo, archMat.clone());
            rightPillar.material.emissive.setHex(0xff0055);
            rightPillar.position.set(16, 12.5, 0);
            archGroup.add(rightPillar);

            const topBarGeo = new THREE.BoxGeometry(34, 1.5, 1.5);
            const topBar = new THREE.Mesh(topBarGeo, archMat.clone());
            topBar.position.set(0, 24, 0);
            archGroup.add(topBar);

            archGroup.position.z = archZ;
            group.add(archGroup);
        }

        group.position.z = zPos;
        this.scene.add(group);
        return group;
    }

    createSkyscraper(parentGroup, xPos, zPos, edgeMaterial) {
        const width = 12 + Math.random() * 8;
        const height = 40 + Math.random() * 60;
        const depth = 12 + Math.random() * 8;

        const buildingGeo = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(buildingGeo, this.buildingMat);
        
        building.position.set(xPos + (xPos > 0 ? width/2 : -width/2), height / 2, zPos);
        building.castShadow = true;
        building.receiveShadow = true;
        parentGroup.add(building);

        const edgesGeo = new THREE.EdgesGeometry(buildingGeo);
        const wireframe = new THREE.LineSegments(edgesGeo, edgeMaterial);
        wireframe.position.copy(building.position);
        parentGroup.add(wireframe);
    }

    update(carZ) {
        this.highwaySegments.forEach(seg => {
            // Recycle segment once it's far enough behind the player
            if (seg.position.z - carZ > this.segmentLength) {
                let minZ = Math.min(...this.highwaySegments.map(s => s.position.z));
                seg.position.z = minZ - this.segmentLength;
            }
        });
    }
}