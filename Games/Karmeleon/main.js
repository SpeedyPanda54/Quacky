import * as THREE from 'three';
import { FirstPersonController } from './player.js';
import { createFacilityMap } from './map.js';

// 1. Setup Scene, Camera, and Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, -2); // Room A Spawn

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 2. Generate Facility Map
const facility = createFacilityMap(scene);

// 3. Add Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// 4. Initialize Player Controller
const player = new FirstPersonController(
    camera, 
    renderer.domElement, 
    facility.colliders, 
    facility.visualObjects
);

// 5. Create Cinematic Fade Overlay for Outro
const fadeOverlay = document.createElement('div');
fadeOverlay.style.position = 'fixed';
fadeOverlay.style.top = '0';
fadeOverlay.style.left = '0';
fadeOverlay.style.width = '100vw';
fadeOverlay.style.height = '100vh';
fadeOverlay.style.background = '#000000';
fadeOverlay.style.opacity = '0';
fadeOverlay.style.transition = 'opacity 3.0s ease';
fadeOverlay.style.pointerEvents = 'none';
fadeOverlay.style.zIndex = '99';
document.body.appendChild(fadeOverlay);

// Story & State Tracking
let gameState = "INTRO"; // INTRO -> PLAYING -> ESCAPE -> EXTRACTED -> GAMEOVER
const storyOverlay = document.getElementById('story-overlay');
const storyText = document.getElementById('story-text');

let coreRevealed = false;
let coreSampled = false;
let extractionTimer = 0;

// Intro Story Script
const introDialogue = [
    "LOG ENTRY: Sector 4 'Karmeleon' Infiltration.",
    "The Syndicate has locked down the unstable Karma Core in Sector B.",
    "Use wasd to move while looking around with your mouse. Press shift to sprint, space to jump, and c to crouch.",
    "Your adaptive camouflage suit is online. Match your suit to wall frequencies with e to evade security drones, bypass color gates, and retrieve the core.",
    "Warning: Extraction will trigger an immediate structural lockdown. Good luck."
];
let dialogueIndex = 0;

function showNextIntroLine() {
    if (dialogueIndex < introDialogue.length) {
        storyOverlay.style.display = 'block';
        storyText.innerText = introDialogue[dialogueIndex];
        dialogueIndex++;
        setTimeout(showNextIntroLine, 4000); 
    } else {
        storyOverlay.style.display = 'none';
        gameState = "PLAYING"; // Release player control
    }
}

// Start Intro Sequence on Boot
setTimeout(showNextIntroLine, 500);

// 6. Game Loop & Clock
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Handle player movement only when active
    if (gameState === "PLAYING" || gameState === "ESCAPE") {
        player.update(delta);
    } 
    // Handle Cinematic Outro Pan & Fade
    else if (gameState === "EXTRACTED") {
        extractionTimer += delta;

        // Smoothly pan camera upward toward ceiling lights
        camera.rotation.x += (Math.PI / 4 - camera.rotation.x) * delta * 2.0;
        // Gently lift camera position
        camera.position.y += delta * 0.5;

        // Fade to black after panning starts
        if (extractionTimer > 1.5) {
            fadeOverlay.style.opacity = '1';
        }
    }

    // Security Drones Logic (Chase, Camouflage Check, Give-up Timer, and Patrol)
    if (facility.securityDrones && gameState !== "EXTRACTED" && gameState !== "GAMEOVER") {
        const playerHex = player.currentColor.getHexString().toLowerCase();
        
        // Camouflage Check: If player color matches corridor wall color ('2e3440'), drones are fooled!
        const isCamouflaged = (playerHex === '2e3440');

        // Aggression Multiplier: Twice as aggressive during the ESCAPE lockdown!
        const isAggressive = (gameState === "ESCAPE");
        const detectionRange = isAggressive ? 8.0 : 4.0;       // Double detection radius
        const chaseSpeedMultiplier = isAggressive ? 3.0 : 1.5; // Double chase speed

        facility.securityDrones.forEach(drone => {
            // Keep Room A safe: Drones cannot enter or chase past z = -10
            if (drone.position.z > -10) {
                return;
            }

            const pdx = camera.position.x - drone.position.x;
            const pdz = camera.position.z - drone.position.z;
            const distToDrone = Math.sqrt(pdx * pdx + pdz * pdz);

            // Catch Check: Game Over if drone physically touches player (< 1.2 units)
            if (distToDrone < 1.2) {
                gameState = "GAMEOVER";
                triggerGameOver();
                return;
            }

            // Only trigger chase if player is NOT camouflaged and within detection range
            if (!isCamouflaged && distToDrone < detectionRange) {
                drone.userData.isChasing = true;
                drone.userData.chaseTimer = 0; // Reset timer while actively tracking player
            }

            if (drone.userData.isChasing) {
                // If player blends into the wall mid-chase, the drone loses sight and gives up instantly!
                if (isCamouflaged) {
                    drone.userData.isChasing = false;
                    drone.userData.chaseTimer = 0;
                } else {
                    // Track player using scaled chase speed
                    drone.position.x += pdx * delta * chaseSpeedMultiplier;
                    drone.position.z += pdz * delta * chaseSpeedMultiplier;

                    // Increment chase timeout clock
                    drone.userData.chaseTimer += delta;

                    // If player evades capture for 5 seconds, give up and return to patrol
                    if (drone.userData.chaseTimer > 5.0) {
                        drone.userData.isChasing = false;
                        drone.userData.chaseTimer = 0;
                    }
                }
            } else {
                // Return to normal patrol movement
                const time = Date.now() * 0.002;
                const targetZ = drone.userData.patrolCenterZ + Math.sin(time) * drone.userData.patrolRange;
                drone.position.z += (targetZ - drone.position.z) * delta * 2.0;
                drone.position.x += ((drone.position.x > 6 ? 12 : 0) - drone.position.x) * delta * 2.0;
            }
        });
    }

    // Reveal Karma Core when player enters Room B (z < -46)
    if (!coreRevealed && camera.position.z < -46) {
        coreRevealed = true;
        if (facility.karmaCore) {
            facility.karmaCore.visible = true;
            facility.visualObjects.push(facility.karmaCore);
            facility.colliders.push(facility.karmaCore);
        }
    }

    // Floating animation for Karma Core once revealed
    if (coreRevealed && facility.karmaCore && !coreSampled) {
        facility.karmaCore.position.y = 2.2 + Math.sin(Date.now() * 0.003) * 0.15;
    }

    const playerHex = player.currentColor.getHexString();

    // Check Color Gates for Unlocking (Way In)
    facility.colorGates.forEach(gate => {
        if (!gate.userData.isUnlocked && playerHex === gate.userData.requiredColor) {
            gate.userData.isUnlocked = true;
            gate.material.opacity = 0.1;
            gate.material.wireframe = true;
            
            const index = facility.colliders.indexOf(gate);
            if (index > -1) { facility.colliders.splice(index, 1); }
        }
    });

    // Check if player sampled Karma Core (Red: ff3333) - only when revealed!
    if (coreRevealed && !coreSampled && playerHex.toLowerCase() === 'ff3333') {
        coreSampled = true;
        gameState = "ESCAPE";
        triggerFacilityLockdown();
    }

    // Animate lockdown bulkheads dropping down from the ceiling
    if (gameState === "ESCAPE" && facility.lockdownBulkheads) {
        facility.lockdownBulkheads.forEach(item => {
            if (item.mesh.position.y > item.targetY) {
                item.mesh.position.y -= delta * 8;
                if (item.mesh.position.y <= item.targetY) {
                    item.mesh.position.y = item.targetY;
                    if (!facility.colliders.includes(item.mesh)) {
                        facility.colliders.push(item.mesh);
                    }
                }
            }
        });

        // Check for Win Condition: Touching the Extraction Terminal block in Room A (x: 0, z: -6)
        const dx = camera.position.x - 0;
        const dz = camera.position.z - (-6);
        const distToTerminal = Math.sqrt(dx * dx + dz * dz);

        if (distToTerminal < 2.0) {
            gameState = "EXTRACTED";
            triggerExtractionCutscene();
        }
    }

    renderer.render(scene, camera);
}

function triggerFacilityLockdown() {
    console.log("FACILITY LOCKDOWN INITIATED! SECRET ESCAPE DOOR & VENT OPENED!");
    
    ambientLight.color.setHex(0xff3333);
    ambientLight.intensity = 0.6;
    dirLight.color.setHex(0xff0000);

    // Blow open the escape vent
    if (facility.escapeVent) {
        const index = facility.colliders.indexOf(facility.escapeVent);
        if (index > -1) {
            facility.colliders.splice(index, 1);
        }
        facility.escapeVent.material.color.setHex(0x23272e);
        facility.escapeVent.material.wireframe = true;
        facility.escapeVent.material.opacity = 0.2;
    }

    // Blow open the Secret Lockdown Door on the left wall of Room B!
    if (facility.secretLockdownDoor) {
        const index = facility.colliders.indexOf(facility.secretLockdownDoor);
        if (index > -1) {
            facility.colliders.splice(index, 1); // Remove collision so player can walk through
        }
        facility.secretLockdownDoor.material.color.setHex(0x56a8ff); // Glowing blue breach indicator
        facility.secretLockdownDoor.material.wireframe = true;
        facility.secretLockdownDoor.material.opacity = 0.3;
        facility.secretLockdownDoor.material.transparent = true;
    }

    // Display lockdown alert text
    storyOverlay.style.display = 'block';
    storyText.style.color = '#ff3333';
    storyText.innerText = "CRITICAL ALERT: FACILITY LOCKDOWN. ESCAPE VIA THE MAINTENANCE VENT!";
    setTimeout(() => { storyOverlay.style.display = 'none'; }, 5000);
}

function triggerGameOver() {
    storyOverlay.style.display = 'block';
    storyText.style.color = '#ff3333';
    storyText.innerText = "CAUGHT BY SECURITY DRONE! MISSION FAILED. RESTARTING IN 5 SECONDS...";
    console.log("GAME OVER");

    setTimeout(() => {
        location.reload();
    }, 5000);
}

function triggerExtractionCutscene() {
    storyOverlay.style.display = 'block';
    storyText.style.color = '#56a8ff';
    storyText.innerText = "EXTRACTION SUCCESSFUL. UPLOADING KARMA CORE DATA... MISSION COMPLETE. NEXT MISSION DISPATCHED SOON.";
    console.log("MISSION ACCOMPLISHED!");
}

animate();

// 7. Handle Window Resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});