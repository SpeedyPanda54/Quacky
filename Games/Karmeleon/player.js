import * as THREE from 'three';

export class FirstPersonController {
    constructor(camera, domElement, colliders = [], visualObjects = []) {
        this.camera = camera;
        this.domElement = domElement;
        this.colliders = colliders;
        // Fallback to colliders if no separate visual objects array is given
        this.visualObjects = visualObjects.length > 0 ? visualObjects : colliders;

        this.moveState = {
            forward: false, backward: false, left: false, right: false, shift: false
        };
        
        this.normalSpeed = 5.0; 
        this.sprintSpeed = 10.0; 
        this.crouchSpeed = 2.5;

        this.normalHeight = 1.6;
        this.crouchHeight = 0.8;
        this.isCrouching = false;
        this.playerHeight = this.normalHeight;
        
        this.gravity = 25.0; 
        this.jumpForce = 8.0;          
        this.secondJumpForce = 10.5;   
        this.velocityY = 0.0;
        this.isGrounded = true; 
        this.playerRadius = 0.4;
        
        this.maxJumps = 2;
        this.jumpCount = 0;

        this.isFlipping = false;
        this.flipProgress = 0.0;
        this.flipDuration = 0.6; 
        this.flipAngleExtra = 0.0;

        this.raycaster = new THREE.Raycaster();
        this.defaultColor = new THREE.Color(0x333333);
        this.currentColor = this.defaultColor.clone();

        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.initEvents();
    }

    initEvents() {
        // Click canvas to activate mouse look pointer lock
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Right-click to clear/reset color
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== this.domElement) return;
            if (e.button === 2) { 
                this.resetColor();
            }
        });

        // Mouse look movement
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement !== this.domElement) return;
            const sensitivity = 0.002;
            this.euler.y -= event.movementX * sensitivity;
            this.euler.x -= event.movementY * sensitivity;
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            this.updateCameraRotation();
        });

        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.moveState.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.moveState.backward = true; break;
                case 'KeyA': case 'ArrowLeft': this.moveState.left = true; break;
                case 'KeyD': case 'ArrowRight': this.moveState.right = true; break;
                case 'ShiftLeft': case 'ShiftRight': this.moveState.shift = true; break;
                case 'KeyC':
                    this.isCrouching = !this.isCrouching;
                    this.playerHeight = this.isCrouching ? this.crouchHeight : this.normalHeight;
                    break;
                case 'Space':
                    if (this.isGrounded) {
                        this.velocityY = this.jumpForce;
                        this.isGrounded = false;
                        this.jumpCount = 1;
                    } else if (this.jumpCount < this.maxJumps) {
                        this.velocityY = this.secondJumpForce; 
                        this.jumpCount++;
                        this.isFlipping = true;
                        this.flipProgress = 0.0;
                    }
                    break;
                case 'KeyE':
                    this.trySampleColor();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.moveState.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.moveState.backward = false; break;
                case 'KeyA': case 'ArrowLeft': this.moveState.left = false; break;
                case 'KeyD': case 'ArrowRight': this.moveState.right = false; break;
                case 'ShiftLeft': case 'ShiftRight': this.moveState.shift = false; break;
            }
        });
    }

    updateCameraRotation() {
        const tempEuler = this.euler.clone();
        tempEuler.x += this.flipAngleExtra;
        this.camera.quaternion.setFromEuler(tempEuler);
    }

    trySampleColor() {
        // Force world matrix update so raycaster matches crosshair instantly
        this.camera.updateMatrixWorld(true);

        const centerScreen = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(centerScreen, this.camera);
        this.raycaster.far = 50;

        // Intersect against visual meshes recursively
        const intersects = this.raycaster.intersectObjects(this.visualObjects, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const obj = hit.object;

            let targetColor = null;
            if (obj.material) {
                if (obj.material.color) {
                    targetColor = obj.material.color;
                } else if (Array.isArray(obj.material) && obj.material[0] && obj.material[0].color) {
                    targetColor = obj.material[0].color;
                }
            }

            if (targetColor) {
                this.currentColor.copy(targetColor);
                this.updateHUD();
            }
        }
    }

    resetColor() {
        this.currentColor.copy(this.defaultColor);
        this.updateHUD();
    }

    updateHUD() {
        const hudElement = document.getElementById('color-hud');
        const screenOverlay = document.getElementById('color-overlay');
        const hexStr = `#${this.currentColor.getHexString()}`;

        if (hudElement) {
            hudElement.style.backgroundColor = hexStr;
            hudElement.style.borderColor = '#ffffff';
        }

        if (screenOverlay) {
            screenOverlay.style.boxShadow = `inset 0 0 80px ${hexStr}`;
            screenOverlay.style.opacity = (this.currentColor.equals(this.defaultColor)) ? '0' : '0.8';
        }
    }

    checkCollisionAt(position) {
        const playerBox = new THREE.Box3();
        playerBox.min.set(
            position.x - this.playerRadius,
            position.y - this.playerHeight,
            position.z - this.playerRadius
        );
        playerBox.max.set(
            position.x + this.playerRadius,
            position.y + 0.2,
            position.z + this.playerRadius
        );

        for (const obstacle of this.colliders) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            const isStandingOnTop = Math.abs((position.y - this.playerHeight) - obstacleBox.max.y) < 0.1 &&
                playerBox.max.x > obstacleBox.min.x && playerBox.min.x < obstacleBox.max.x &&
                playerBox.max.z > obstacleBox.min.z && playerBox.min.z < obstacleBox.max.z;

            if (isStandingOnTop) continue;

            if (playerBox.intersectsBox(obstacleBox)) {
                return true;
            }
        }
        return false;
    }

    update(delta) {
        if (this.isFlipping) {
            this.flipProgress += delta / this.flipDuration;
            if (this.flipProgress >= 1.0) {
                this.flipProgress = 1.0;
                this.isFlipping = false;
                this.flipAngleExtra = 0.0;
            } else {
                this.flipAngleExtra = this.flipProgress * Math.PI * 2;
            }
            this.updateCameraRotation();
        }

        let currentSpeed = this.normalSpeed;
        if (this.isCrouching) {
            currentSpeed = this.crouchSpeed; 
        } else if (this.moveState.shift) {
            currentSpeed = this.sprintSpeed;
        }

        const dir = new THREE.Vector3();
        if (this.moveState.forward) dir.z -= 1;
        if (this.moveState.backward) dir.z += 1;
        if (this.moveState.left) dir.x -= 1;
        if (this.moveState.right) dir.x += 1;
        dir.normalize();

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.euler.y);
        dir.applyQuaternion(quaternion);

        const moveVector = dir.clone().multiplyScalar(currentSpeed * delta);

        const nextPos = this.camera.position.clone();
        nextPos.x += moveVector.x;
        if (!this.checkCollisionAt(nextPos)) {
            this.camera.position.x = nextPos.x;
        }

        nextPos.copy(this.camera.position);
        nextPos.z += moveVector.z;
        if (!this.checkCollisionAt(nextPos)) {
            this.camera.position.z = nextPos.z;
        }

        if (!this.isGrounded) {
            this.velocityY -= this.gravity * delta;
        }

        const nextPosY = this.camera.position.clone();
        nextPosY.y += this.velocityY * delta;

        let landed = false;
        let supportingSurfaceY = this.playerHeight;

        const playerBox = new THREE.Box3();
        playerBox.min.set(
            nextPosY.x - this.playerRadius,
            nextPosY.y - this.playerHeight,
            nextPosY.z - this.playerRadius
        );
        playerBox.max.set(
            nextPosY.x + this.playerRadius,
            nextPosY.y + 0.2,
            nextPosY.z + this.playerRadius
        );

        for (const obstacle of this.colliders) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            
            const horizontalOverlap = 
                playerBox.max.x > obstacleBox.min.x && playerBox.min.x < obstacleBox.max.x &&
                playerBox.max.z > obstacleBox.min.z && playerBox.min.z < obstacleBox.max.z;

            if (horizontalOverlap && this.velocityY <= 0) {
                const boxTop = obstacleBox.max.y;
                const prevFeetY = this.camera.position.y - this.playerHeight;
                const currFeetY = nextPosY.y - this.playerHeight;

                if (prevFeetY >= boxTop - 0.4 && currFeetY <= boxTop + 0.2) {
                    supportingSurfaceY = Math.max(supportingSurfaceY, boxTop + this.playerHeight);
                    landed = true;
                }
            }
        }

        if (nextPosY.y <= this.playerHeight) {
            nextPosY.y = this.playerHeight;
            landed = true;
        } else if (landed) {
            nextPosY.y = supportingSurfaceY;
        }

        this.camera.position.copy(nextPosY);

        if (landed) {
            this.velocityY = 0;
            this.isGrounded = true;
            this.jumpCount = 0;
        } else {
            this.isGrounded = false;
        }
    }
}