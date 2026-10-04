import * as THREE from 'three';

export function createFacilityMap(scene) {
    const colliders = [];
    const visualObjects = [];
    const colorGates = []; 
    const lockdownBulkheads = [];
    const securityDrones = [];

    function createBox(width, height, depth, x, y, z, colorHex) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        scene.add(mesh);
        colliders.push(mesh);
        visualObjects.push(mesh);
        return mesh;
    }

    // ==========================================
    // 1. ROOM A: SPAWN CHAMBER
    // ==========================================
    createBox(20, 0.5, 20, 0, -0.25, 0, 0x222222); 
    createBox(20, 0.5, 20, 0, 6.25, 0, 0x1a1a1a); 

    createBox(0.5, 6, 20, -10, 3, 0, 0x3b4252); 
    createBox(0.5, 6, 20, 10, 3, 0, 0x3b4252);  
    createBox(8, 6, 0.5, -6, 3, -10, 0x3b4252); 
    createBox(8, 6, 0.5, 6, 3, -10, 0x3b4252);  
    createBox(4, 2, 0.5, 0, 5, -10, 0x3b4252);  

    const extractionTerminal = createBox(2, 1.5, 1, 0, 0.75, -6, 0x4c566a);
    extractionTerminal.name = "Extraction_Terminal";


    // ==========================================
    // 2. THE S-BEND CORRIDOR & COLOR GATES
    // ==========================================
    createBox(0.5, 6, 15, -3, 3, -17.5, 0x2e3440); 
    createBox(0.5, 6, 15, 3, 3, -17.5, 0x2e3440);  

    const blueLandmark = createBox(0.2, 2, 2, -2.8, 3, -15, 0x56a8ff);
    blueLandmark.name = "Landmark_Blue";

    const blueGate = createBox(5.8, 5.5, 0.4, 0, 2.75, -24.8, 0x1e3a5f);
    blueGate.material.transparent = true;
    blueGate.material.opacity = 0.8;
    blueGate.userData = { requiredColor: '56a8ff', isUnlocked: false };
    colorGates.push(blueGate);

    createBox(10, 6, 0.5, 7.5, 3, -23.5, 0x2e3440); 
    createBox(4, 6, 0.5, 1, 3, -26.5, 0x2e3440);

    const yellowLandmark = createBox(2, 2, 0.2, 5, 3, -23.7, 0xebcb8b);
    yellowLandmark.name = "Landmark_Yellow";

    const yellowGate = createBox(3.0, 5.5, 0.4, 12, 2.75, -27.5, 0x6e5c3e);
    yellowGate.material.transparent = true;
    yellowGate.material.opacity = 0.8;
    yellowGate.userData = { requiredColor: 'ebcb8b', isUnlocked: false };
    colorGates.push(yellowGate);

    createBox(0.5, 6, 18.5, 10.5, 3, -37, 0x2e3440); 
    createBox(0.5, 6, 18.5, 13.5, 3, -37, 0x2e3440); 

    const crawlBeam = createBox(3, 1.5, 1, 12, 2.0, -32, 0xbf616a); 
    crawlBeam.name = "Low_Crawl_Beam";


    // ==========================================
    // SECURITY DRONES
    // ==========================================
    const droneGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const droneMat = new THREE.MeshStandardMaterial({ color: 0xbf616a, emissive: 0x550000, roughness: 0.3 });

    // Drone 1: Patrols early hallway corridor
    const drone1 = new THREE.Mesh(droneGeo, droneMat);
    drone1.position.set(0, 2.5, -18);
    drone1.name = "Security_Drone_1";
    drone1.userData = { patrolCenterZ: -18, patrolRange: 3.0, isChasing: false, chaseTimer: 0 };
    scene.add(drone1);
    visualObjects.push(drone1);
    securityDrones.push(drone1);

    // Drone 2: Open corridor space before yellow puzzle
    const drone2 = new THREE.Mesh(droneGeo, droneMat.clone());
    drone2.position.set(6, 2.5, -25.5);
    drone2.name = "Security_Drone_2";
    drone2.userData = { patrolCenterZ: -25.5, patrolRange: 1.5, isChasing: false, chaseTimer: 0 };
    scene.add(drone2);
    visualObjects.push(drone2);
    securityDrones.push(drone2);

    // Drone 3: Patrolling near escape vent in Room B
    const drone3 = new THREE.Mesh(droneGeo, droneMat.clone());
    drone3.position.set(2, 2.5, -53);
    drone3.name = "Security_Drone_3";
    drone3.userData = { patrolCenterZ: -53, patrolRange: 2.0, isChasing: false, chaseTimer: 0 };
    scene.add(drone3);
    visualObjects.push(drone3);
    securityDrones.push(drone3);


    // ==========================================
    // 3. ROOM B & HIDDEN KARMA CORE
    // ==========================================
    createBox(20, 0.5, 20, 12, -0.25, -55, 0x2e3440); 
    createBox(20, 0.5, 20, 12, 6.25, -55, 0x1a1a1a); 

    createBox(0.5, 6, 20, 22, 3, -55, 0x434c5e);  
    createBox(0.5, 6, 10, 2, 3, -50, 0x434c5e);   
    createBox(0.5, 6, 8, 2, 3, -64, 0x434c5e);    

    const escapeVent = createBox(0.6, 2.5, 2.5, 2, 1.25, -56, 0x88c0d0);
    escapeVent.name = "Escape_Vent";

    // Secret Lockdown Door: Centered panel on the left wall of Room B
    const secretLockdownDoor = createBox(0.6, 2.5, 1.2, 2, 1.25, -51, 0x434c5e);
    secretLockdownDoor.name = "Secret_Lockdown_Door";

    createBox(0.5, 6, 15, -2, 3, -50, 0x2e3440); 
    createBox(6, 0.5, 15, 0, -0.25, -50, 0x2e3440); 

    createBox(20, 6, 0.5, 12, 3, -65, 0x434c5e);  

    createBox(8.5, 6, 0.5, 6.25, 3, -46, 0x434c5e); 
    createBox(8.5, 6, 0.5, 17.75, 3, -46, 0x434c5e); 
    createBox(3, 2, 0.5, 12, 5, -46, 0x434c5e);   

    const coreGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({ 
        color: 0xff3333, 
        emissive: 0xff0000, 
        emissiveIntensity: 0.6,
        roughness: 0.2 
    });
    const karmaCore = new THREE.Mesh(coreGeo, coreMat);
    karmaCore.position.set(12, 2.2, -60);
    karmaCore.name = "Karma_Core_Sphere";
    karmaCore.visible = false;
    scene.add(karmaCore);

    createBox(4, 1.2, 1.5, 6, 0.6, -50, 0x4c566a);
    createBox(4, 1.2, 1.5, 18, 0.6, -50, 0x4c566a);

    const bulkheadGeo = new THREE.BoxGeometry(3, 6, 0.5);
    const bulkheadMat = new THREE.MeshStandardMaterial({ color: 0xbf616a, roughness: 0.3 });
    
    const dropWall1 = new THREE.Mesh(bulkheadGeo, bulkheadMat);
    dropWall1.position.set(12, 12.0, -46);
    scene.add(dropWall1);
    lockdownBulkheads.push({ mesh: dropWall1, targetY: 3.0 });

    return {
        colliders,
        visualObjects,
        colorGates,
        karmaCore,
        lockdownBulkheads,
        escapeVent,
        secretLockdownDoor,
        securityDrones
    };
}