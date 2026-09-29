import * as THREE from 'three';

export function createFacilityMap(scene) {
    const colliders = [];

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.4 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.8 });
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x004433, roughness: 0.2 });
    const exitMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x440000, roughness: 0.2 });

    // Helper to build walls/floors easily
    function createBox(width, height, depth, x, y, z, material, isCollider = true) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        
        if (isCollider) {
            colliders.push(mesh);
        }
        return mesh;
    }

    // --- 1. GLOBAL FLOORS & CEILINGS ---
    // Large main floor for the facility
    createBox(60, 0.5, 60, 0, -0.25, 0, floorMaterial);
    // Ceiling
    createBox(60, 0.5, 60, 0, 8.25, 0, ceilingMaterial, false);

    // --- 2. FACILITY PERIMETER WALLS ---
    // Outer boundary walls (Metroid-style maze enclosure)
    createBox(60, 8, 1, 0, 4, -30, wallMaterial); // North
    createBox(60, 8, 1, 0, 4, 30, wallMaterial);  // South
    createBox(1, 8, 60, -30, 4, 0, wallMaterial); // West
    createBox(1, 8, 60, 30, 4, 0, wallMaterial);  // East

    // --- 3. METROID-STYLE CORRIDORS & ROOMS ---
    
    // --- Room A: Entrance Lobby (Start) ---
    // South-West corner room
    createBox(1, 8, 12, -18, 4, 24, wallMaterial); // Right wall of lobby
    createBox(12, 8, 1, -24, 4, 18, wallMaterial); // Top wall of lobby

    // --- Corridor 1: Main Entryway Hall ---
    createBox(1, 8, 16, -10, 4, 22, wallMaterial);
    createBox(1, 8, 16, -2, 4, 22, wallMaterial);
    // Dead-end branch going left off Corridor 1 (A decoy hallway with a dead end)
    createBox(10, 8, 1, -15, 4, 14, wallMaterial); // Back wall of dead end
    createBox(1, 8, 6, -20, 4, 17, wallMaterial);  // Side wall of dead end

    // --- Room B: Central Security Hub ---
    // A large room in the middle with pillars
    createBox(16, 8, 1, 10, 4, 12, wallMaterial);  // North wall of hub
    createBox(1, 8, 16, 2, 4, 20, wallMaterial);   // West wall of hub
    // Hub Pillars (Cover / Obstacles)
    createBox(2, 6, 2, 8, 3, 18, wallMaterial);
    createBox(2, 6, 2, 16, 3, 18, wallMaterial);

    // --- Corridor 2: Upper Security Maze & Dead Ends ---
    createBox(1, 8, 18, 18, 4, 3, wallMaterial);   // Long dividing wall
    createBox(12, 8, 1, 24, 4, -6, wallMaterial);  // Dead end room branch right
    createBox(1, 8, 10, 12, 4, -5, wallMaterial);  // Corridor branch

    // --- Room C: The Main Computer Room (Destination) ---
    // North-East large server room
    createBox(20, 8, 1, 15, 4, -14, wallMaterial); // North wall
    createBox(1, 8, 10, 5, 4, -9, wallMaterial);   // West wall of server room
    
    // Server Racks (Obstacles to sneak around)
    createBox(2, 5, 6, 10, 2.5, -8, wallMaterial);
    createBox(2, 5, 6, 16, 2.5, -8, wallMaterial);
    createBox(2, 5, 6, 22, 2.5, -8, wallMaterial);

    // --- The Hackable Terminal (Objective) ---
    const terminal = createBox(2, 1.5, 1, 16, 0.75, -12, terminalMaterial, true);
    terminal.name = "HACK_TERMINAL"; // Tag it so we can detect it later!

    // --- Exit / Extraction Point (For Win State later) ---
    const extractionZone = createBox(4, 0.1, 4, -24, 0.01, 26, exitMaterial, false);
    extractionZone.name = "EXTRACTION_ZONE";

    return { colliders, terminal, extractionZone };
}