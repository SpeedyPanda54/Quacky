import * as THREE from 'three';

export class CarController {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        // Build player supercar mesh
        const bodyGeo = new THREE.BoxGeometry(2.0, 0.6, 4.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        const glassGeo = new THREE.BoxGeometry(1.4, 0.4, 2.0);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 0.8, -0.2);
        this.mesh.add(glass);

        scene.add(this.mesh);

        // Driving physics state (50 CPS normal, 150 CPS Nitro, upgradable to 1000 via cheat)
        this.speed = 0.0;
        this.maxSpeed = 50.0;     
        this.nitroMaxSpeed = 150.0; 
        this.acceleration = 0.5;
        this.nitroAcceleration = 1.2;
        this.friction = 0.2;

        this.tireFrictionCoefficient = 0.85;
        this.gravity = 9.81;
        this.brakingDeceleration = this.tireFrictionCoefficient * this.gravity * 3; 

        // Mouse steering & Drift variables
        this.steeringAngle = 0.0;
        this.targetSteering = 0.0;
        this.maxSteering = 0.025; 
        this.mouseDeltaX = 0;

        // Distance, Damage & God Mode tracking
        this.totalClipsTraveled = 0;
        this.damagePercent = 0;
        this.maxDamage = 100;
        this.isGameOver = false;
        this.isGodMode = false;

        // Input tracking
        this.controls = { forward: false, backward: false, brake: false, drift: false, nitro: false };
        this.initInput();

        // Camera Management
        this.cameraMode = 0; 
        this.cameraModesNames = ["Full View", "Driver Cockpit", "Headlights Bumper"];
    }

    initInput() {
        const instructions = document.getElementById('instructions');
        const endRunBtn = document.getElementById('end-run-btn');
        if (endRunBtn) {
            endRunBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent pointer lock toggle
                if (!this.isGameOver) {
                    this.triggerGameOver();
                }
            });
        }
        document.body.addEventListener('click', () => {
            if (!this.isGameOver) document.body.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                instructions.style.display = 'none';
            } else if (!this.isGameOver) {
                instructions.style.display = 'block';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.mouseDeltaX = e.movementX;
            }
        });

        // Secret Cheat Code Listener ("godmode")
        let typedKeyBuffer = '';
        window.addEventListener('keydown', (e) => {
            // Secret Cheat Code Listener ("godmode")
            if (e.key.length === 1) {
                typedKeyBuffer += e.key.toLowerCase();
                if (typedKeyBuffer.length > 20) typedKeyBuffer = typedKeyBuffer.slice(-20);
                
                if (typedKeyBuffer.includes('godmode')) {
                    this.isGodMode = true;
                    this.nitroMaxSpeed = 1000.0; // 1000 CPS Nitro!
                    this.damagePercent = 0;
                    
                    const bar = document.getElementById('collision-bar');
                    if (bar) bar.style.width = '0%';
                    const integrityText = document.getElementById('integrity-text');
                    if (integrityText) integrityText.innerText = 'GOD MODE';
                    
                    console.log('⚡ GOD MODE ACTIVATED: 1000 CPS NITRO & INVINCIBLE ⚡');
                }
            }

            // Emergency Abort via Backspace
            if (e.code === 'Backspace') {
                e.preventDefault(); // Prevent browser back navigation
                if (!this.isGameOver) {
                    this.triggerGameOver();
                }
                return;
            }

            if (this.isGameOver) return;
            switch(e.code) {
                case 'KeyW': case 'ArrowUp': this.controls.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.controls.backward = true; break;
                case 'Space': this.controls.brake = true; break;
                case 'ShiftLeft': case 'ShiftRight': this.controls.drift = true; break;
                case 'KeyF': this.controls.nitro = true; break;
                case 'KeyC': 
                    this.cameraMode = (this.cameraMode + 1) % 3;
                    document.getElementById('cam-display').innerText = this.cameraModesNames[this.cameraMode];
                    break;
            }
        });
        window.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'KeyW': case 'ArrowUp': this.controls.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.controls.backward = false; break;
                case 'Space': this.controls.brake = false; break;
                case 'ShiftLeft': case 'ShiftRight': this.controls.drift = false; break;
                case 'KeyF': this.controls.nitro = false; break;
            }
        });
    }

    addDamage(amount) {
        if (this.isGameOver || this.isGodMode) return; // Immune in God Mode

        this.damagePercent = Math.min(100, this.damagePercent + amount);
        
        const bar = document.getElementById('collision-bar');
        if (bar) bar.style.width = this.damagePercent + '%';

        const integrityText = document.getElementById('integrity-text');
        if (integrityText) {
            const remaining = Math.max(0, 100 - Math.round(this.damagePercent));
            integrityText.innerText = remaining + '%';
        }

        if (this.damagePercent >= 100) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        this.speed = 0;

        const kcpsDistance = this.totalClipsTraveled / 1000;

        let bestKCPS = parseFloat(localStorage.getItem('apex_velocity_best_kcps')) || 0;
        if (kcpsDistance > bestKCPS) {
            bestKCPS = kcpsDistance;
            localStorage.setItem('apex_velocity_best_kcps', bestKCPS.toFixed(3));
        }

        document.getElementById('final-distance').innerText = kcpsDistance.toFixed(3);
        document.getElementById('best-distance').innerText = bestKCPS.toFixed(3);
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('instructions').style.display = 'none';

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    update(delta) {
        if (this.isGameOver) return;

        const currentTopSpeed = this.controls.nitro ? this.nitroMaxSpeed : this.maxSpeed;
        const currentAccel = this.controls.nitro ? this.nitroAcceleration * (this.isGodMode ? 3 : 1) : this.acceleration;

        if (this.controls.brake) {
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.brakingDeceleration * delta);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.brakingDeceleration * delta);
            }
        } else if (this.controls.forward || this.controls.nitro) {
            this.speed = Math.min(this.speed + currentAccel, currentTopSpeed);
        } else if (this.controls.backward) {
            this.speed = Math.max(this.speed - currentAccel * 0.6, -this.maxSpeed * 0.4);
        } else {
            if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction);
            if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction);
        }

        if (Math.abs(this.speed) > 0.05) {
            const steerDirection = this.speed > 0 ? 1 : -1;
            this.targetSteering = -this.mouseDeltaX * 0.0015 * steerDirection;
            
            const limit = this.controls.drift ? this.maxSteering * 1.5 : this.maxSteering;
            this.targetSteering = Math.max(-limit, Math.min(limit, this.targetSteering));
        } else {
            this.targetSteering = 0;
        }

        this.mouseDeltaX = 0;

        this.steeringAngle += (this.targetSteering - this.steeringAngle) * 0.2;
        this.mesh.rotation.y += this.steeringAngle;

        // Accumulate distance clips and scale world motion
        const frameClipsTraveled = this.speed * delta;
        this.totalClipsTraveled += frameClipsTraveled;
        
        const moveVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.addScaledVector(moveVector, frameClipsTraveled * 6); 

        // Jagged spike barrier collision check & continuous grinding damage
        const carHalfWidth = 1.0;
        const leftWallLimit = -15.6;
        const rightWallLimit = 15.6;
        let isGrindingSpikes = false;

        if (this.mesh.position.x - carHalfWidth <= leftWallLimit) {
            this.mesh.position.x = leftWallLimit + carHalfWidth;
            isGrindingSpikes = true;
            this.speed *= 0.95; 
        } else if (this.mesh.position.x + carHalfWidth >= rightWallLimit) {
            this.mesh.position.x = rightWallLimit - carHalfWidth;
            isGrindingSpikes = true;
            this.speed *= 0.95; 
        }

        // 0.01% per millisecond = 10% damage per second grinding the spikes
        if (isGrindingSpikes) {
            this.addDamage(delta * 10);
        }

        this.mesh.position.x = Math.max(-14, Math.min(14, this.mesh.position.x));

        const kcpsDistance = this.totalClipsTraveled / 1000;

        document.getElementById('speed-display').innerText = Math.round(Math.abs(this.speed));
        document.getElementById('distance-display').innerText = kcpsDistance.toFixed(3);
    }

    updateCamera(camera) {
        const carPos = this.mesh.position;
        const carRot = this.mesh.rotation.y;

        const zoomOffset = this.controls.nitro ? 7.5 : 6.0;
        const heightOffset = this.controls.nitro ? 2.8 : 2.5;

        if (this.cameraMode === 0) {
            const targetCamPos = new THREE.Vector3(
                carPos.x - Math.sin(carRot) * -zoomOffset,
                carPos.y + heightOffset,
                carPos.z - Math.cos(carRot) * -zoomOffset
            );
            camera.position.lerp(targetCamPos, 0.2);
            const lookTarget = carPos.clone().add(new THREE.Vector3(0, 1, -2));
            camera.lookAt(lookTarget);

        } else if (this.cameraMode === 1) {
            camera.position.set(carPos.x, carPos.y + 0.9, carPos.z - 0.2);
            const lookTarget = carPos.clone().add(new THREE.Vector3(0, 0.8, -10).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot));
            camera.lookAt(lookTarget);

        } else if (this.cameraMode === 2) {
            camera.position.set(carPos.x, carPos.y + 0.3, carPos.z - 2.2);
            const lookTarget = carPos.clone().add(new THREE.Vector3(0, 0.3, -15).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot));
            camera.lookAt(lookTarget);
        }
    }
}