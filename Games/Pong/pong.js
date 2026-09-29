// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyDPM42FICNjUAieqVPU-UZRuzyOKu_OXe0",
    authDomain: "quacky-96f2c.firebaseapp.com",
    databaseURL: "https://quacky-96f2c-default-rtdb.firebaseio.com",
    projectId: "quacky-96f2c",
    storageBucket: "quacky-96f2c.firebasestorage.app",
    messagingSenderId: "320934850122",
    appId: "1:320934850122:web:305c11da02b904c90980b3",
    measurementId: "G-H66386Y2DH"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const roomRef = db.ref("pong/rooms/publicRoom");

// --- CANVAS & GAME VARIABLES ---
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");
const statusDisplay = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modeToggleBtn = document.getElementById("mode-toggle-btn");
const resetRoomBtn = document.getElementById("reset-room-btn");

let isOnlineMode = false;
let myRole = null; 
let scoringDelay = false; 
let gameStarted = false; 

// Game Objects
const paddleWidth = 12;
const paddleHeight = 80;
const ballSize = 10;

let ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 0, dy: 0, speed: 5 };
let leftPaddle = { x: 20, y: canvas.height / 2 - paddleHeight / 2, score: 0 };
let rightPaddle = { x: canvas.width - 32, y: canvas.height / 2 - paddleHeight / 2, score: 0 };

// Target positions for smooth interpolation of the opponent's paddle
let targetLeftY = leftPaddle.y;
let targetRightY = rightPaddle.y;

// Keyboard tracking with scroll prevention
let keys = {};
window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", " ", "w", "s", "W", "S"].includes(e.key)) {
        e.preventDefault();
    }
    keys[e.key] = true;
});
window.addEventListener("keyup", (e) => keys[e.key] = false);

// --- EVENT LISTENERS ---
resetBtn.addEventListener("click", resetMatch);
modeToggleBtn.addEventListener("click", toggleGameMode);
resetRoomBtn.addEventListener("click", () => {
    roomRef.remove();
    alert("Pong online room reset!");
    location.reload();
});

// --- MAIN GAME LOOP ---
function update() {
    // Local input handling
    if (!isOnlineMode || myRole === "host") {
        if (keys["w"] || keys["W"]) leftPaddle.y -= 7;
        if (keys["s"] || keys["S"]) leftPaddle.y += 7;
    }
    if (!isOnlineMode || myRole === "client") {
        if (keys["ArrowUp"]) rightPaddle.y -= 7;
        if (keys["ArrowDown"]) rightPaddle.y += 7;
    }

    // Smoothly interpolate ONLY the opponent's paddle position to prevent jitter
    if (isOnlineMode) {
        if (myRole === "host") {
            rightPaddle.y += (targetRightY - rightPaddle.y) * 0.4;
        } else if (myRole === "client") {
            leftPaddle.y += (targetLeftY - leftPaddle.y) * 0.4;
        }
    }

    // Clamp paddles inside canvas
    leftPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, rightPaddle.y));

    if (isOnlineMode && !gameStarted) return;

    // Ball physics (Host calculates physics, or local game calculates physics)
    if ((!isOnlineMode || myRole === "host") && !scoringDelay) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collisions (Top / Bottom)
        if (ball.y <= 0 || ball.y >= canvas.height - ballSize) {
            ball.dy *= -1;
        }

        // Generous lag buffer for paddle collisions so fast hits register accurately
        const lagBuffer = 18; 

        // Left Paddle collision
        if (
            ball.x <= leftPaddle.x + paddleWidth &&
            ball.x >= leftPaddle.x - lagBuffer &&
            ball.y + ballSize >= leftPaddle.y - lagBuffer &&
            ball.y <= leftPaddle.y + paddleHeight + lagBuffer
        ) {
            ball.dx = Math.abs(ball.dx) + 0.2; 
            ball.x = leftPaddle.x + paddleWidth; 
        }

        // Right Paddle collision
        if (
            ball.x + ballSize >= rightPaddle.x &&
            ball.x <= rightPaddle.x + paddleWidth + lagBuffer &&
            ball.y + ballSize >= rightPaddle.y - lagBuffer &&
            ball.y <= rightPaddle.y + paddleHeight + lagBuffer
        ) {
            ball.dx = -(Math.abs(ball.dx) + 0.2);
            ball.x = rightPaddle.x - ballSize;
        }

        // Scoring
        if (ball.x < 0) {
            rightPaddle.score++;
            triggerScorePause();
        } else if (ball.x > canvas.width) {
            leftPaddle.score++;
            triggerScorePause();
        }
    }
}

function triggerScorePause() {
    scoringDelay = true;
    ball.dx = 0;
    ball.dy = 0;

    statusDisplay.textContent = "Point Scored! Serving in 2s...";

    if (isOnlineMode && myRole === "host") {
        roomRef.update({ 
            "leftPaddle/score": leftPaddle.score,
            "rightPaddle/score": rightPaddle.score,
            ball: ball, 
            scoringDelay: true 
        });
    }

    setTimeout(() => {
        resetBall();
        scoringDelay = false;
        if (isOnlineMode) {
            statusDisplay.textContent = `Online Match Live! You are ${myRole}`;
        } else {
            statusDisplay.textContent = "Local 2P: P1 (W/S) | P2 (Up/Down)";
        }
    }, 2000);
}

function draw() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center net
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); 

    // Draw Paddles
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(leftPaddle.x, leftPaddle.y, paddleWidth, paddleHeight);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, paddleWidth, paddleHeight);

    // Draw Ball
    ctx.fillStyle = "#ff007f";
    ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

    // Draw Scores safely (fallback to 0 if undefined)
    ctx.font = "36px 'Courier New'";
    ctx.fillStyle = "#00ffcc";
    ctx.fillText(leftPaddle.score || 0, canvas.width / 4, 50);
    ctx.fillText(rightPaddle.score || 0, (canvas.width / 4) * 3, 50);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * 3;
}

function resetMatch() {
    leftPaddle.score = 0;
    rightPaddle.score = 0;
    scoringDelay = false;
    resetBall();
    
    if (isOnlineMode) {
        statusDisplay.textContent = `Online Match Live! You are ${myRole}`;
    } else {
        statusDisplay.textContent = "Local 2P: P1 (W/S) | P2 (Up/Down)";
    }

    if (isOnlineMode && myRole === "host") {
        roomRef.update({ 
            "leftPaddle/score": 0,
            "rightPaddle/score": 0,
            ball, 
            scoringDelay: false 
        });
    }
}

// --- ONLINE MODE TOGGLE ---
function toggleGameMode() {
    isOnlineMode = !isOnlineMode;

    if (isOnlineMode) {
        modeToggleBtn.textContent = "Switch to Local 2P";
        modeToggleBtn.style.backgroundColor = "#ef4444";
        statusDisplay.textContent = "Connecting to Online Room...";
        gameStarted = false;

        roomRef.once("value", (snapshot) => {
            const roomData = snapshot.val();

            if (!roomData || (!roomData.host && !roomData.client)) {
                myRole = "host";
                leftPaddle.score = 0;
                rightPaddle.score = 0;
                roomRef.set({
                    host: true,
                    client: false,
                    gameStarted: false,
                    scoringDelay: false,
                    ball, leftPaddle, rightPaddle
                });
                roomRef.child("host").onDisconnect().set(false);
                statusDisplay.textContent = "Hosting room... Waiting for Player 2 to join!";
            } else if (!roomData.host) {
                myRole = "host";
                roomRef.update({ host: true });
                roomRef.child("host").onDisconnect().set(false);
                statusDisplay.textContent = "Hosting room... Waiting for Player 2 to join!";
            } else if (!roomData.client) {
                myRole = "client";
                gameStarted = true; 
                roomRef.update({ client: true, gameStarted: true });
                roomRef.child("client").onDisconnect().set(false);
                statusDisplay.textContent = "Joined match! Match is live!";
                resetBall(); 
            } else {
                myRole = "spectator";
                statusDisplay.textContent = "Room is full! Viewing as Spectator.";
            }
        });

        // Listen to state updates from Firebase
        roomRef.on("value", (snapshot) => {
            const data = snapshot.val();
            if (data && isOnlineMode) {
                gameStarted = data.gameStarted || false;
                scoringDelay = data.scoringDelay || false;
                
                if (data.leftPaddle) {
                    if (data.leftPaddle.score !== undefined) leftPaddle.score = data.leftPaddle.score;
                    if (myRole === "client") targetLeftY = data.leftPaddle.y;
                }
                if (data.rightPaddle) {
                    if (data.rightPaddle.score !== undefined) rightPaddle.score = data.rightPaddle.score;
                    if (myRole === "host") targetRightY = data.rightPaddle.y;
                }

                if (data.ball) {
                    if (myRole === "client") {
                        ball = data.ball;
                    } else if (myRole === "host" && gameStarted && ball.dx === 0 && ball.dy === 0 && !scoringDelay) {
                        resetBall();
                        roomRef.update({ ball });
                    }
                }

                if (!gameStarted) {
                    statusDisplay.textContent = "Waiting for Player 2 to join...";
                } else if (myRole !== "spectator" && statusDisplay.textContent.includes("Waiting")) {
                    statusDisplay.textContent = `Online Match Live! You are ${myRole}`;
                }
            }
        });

        // THROTTLED NETWORK SYNC
        setInterval(() => {
            if (!isOnlineMode || !gameStarted) return;
            if (myRole === "host") {
                roomRef.update({
                    "leftPaddle/x": leftPaddle.x,
                    "leftPaddle/y": leftPaddle.y,
                    ball: ball,
                    scoringDelay: scoringDelay
                });
            } else if (myRole === "client") {
                roomRef.update({
                    "rightPaddle/x": rightPaddle.x,
                    "rightPaddle/y": rightPaddle.y
                });
            }
        }, 30);

    } else {
        roomRef.off();
        roomRef.remove();
        myRole = null;
        gameStarted = false;
        modeToggleBtn.textContent = "Switch to Online Mode";
        modeToggleBtn.style.backgroundColor = "#3b82f6";
        statusDisplay.textContent = "Local 2P: P1 (W/S) | P2 (Up/Down)";
        resetMatch();
    }
}

// Start the game loop
gameLoop();