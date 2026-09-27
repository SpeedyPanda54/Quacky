// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDPM42FICNjUAieqVPU-UZRuzyOKu_OXe0",
    authDomain: "quacky-96f2c.firebaseapp.com",
    databaseURL: "https://quacky-96f2c-default-rtdb.firebaseio.com",
    projectId: "quacky-96f2c",
    storageBucket: "quacky-96f2c.firebasestorage.app",
    messagingSenderId: "320934850122",
    appId: "1:320934850122:web:b9b58e8563cdd44f0980b3",
    measurementId: "G-8BQ9NK1SWJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let myPlayerId = 'player_' + Math.random().toString(36).substring(2, 9);
let playersRef = null;
let roomRef = null;
let allPlayers = {}; 
let gameStarted = false;
let countdownInterval = null;
let lastSent = 0; // Throttle timestamp for lag prevention

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Helper to generate bright, random astronaut colors
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Camera State for Smooth Scrolling
let camera = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    worldWidth: 1600,
    worldHeight: 1200
};

// Player Local State (Safe open upper hallway spawn)
let player = {
    x: 500,
    y: 150,
    radius: 15,
    speed: 3,
    color: getRandomColor(),
    name: "",
    role: "Crewmate",
    isRover: false,
    canVote: true
};

// Input Tracking
const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[' '] = keys[' '] || (e.key === ' ');
});
window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') keys[' '] = false;
});

// Upgraded Space Station Map (Rooms, Corridors, and Dividers)
const walls = [
    { x: 0, y: 0, w: 1600, h: 20 },   // Top
    { x: 0, y: 1180, w: 1600, h: 20 }, // Bottom
    { x: 0, y: 0, w: 20, h: 1200 },   // Left
    { x: 1580, y: 0, w: 20, h: 1200 }, // Right
    { x: 20, y: 300, w: 400, h: 20 },
    { x: 400, y: 20, w: 20, h: 300 },
    { x: 1180, y: 20, w: 20, h: 300 },
    { x: 1180, y: 300, w: 400, h: 20 },
    { x: 640, y: 440, w: 320, h: 120 },
    { x: 640, y: 680, w: 320, h: 120 },
    { x: 20, y: 880, w: 400, h: 20 },
    { x: 400, y: 880, w: 20, h: 300 },
    { x: 1180, y: 880, w: 20, h: 300 },
    { x: 1180, y: 880, w: 400, h: 20 }
];

function checkCollision(nx, ny) {
    for (let wall of walls) {
        if (
            nx - player.radius < wall.x + wall.w &&
            nx + player.radius > wall.x &&
            ny - player.radius < wall.y + wall.h &&
            ny + player.radius > wall.y
        ) {
            return true;
        }
    }
    return false;
}

// Saboteur Tag Mechanic (10-second cooldown)
let lastTagTime = 0;
function checkSaboteurTag() {
    if (player.role !== "Saboteur") return;
    if (Date.now() - lastTagTime < 10000) return;

    for (let id in allPlayers) {
        if (id === myPlayerId) continue;
        let p = allPlayers[id];
        if (!p || p.roverMode) continue;

        let dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist < 35) {
            lastTagTime = Date.now();
            playersRef.child(id).update({ roverMode: true });
            
            // Check if saboteur wins immediately via tag elimination count
            roomRef.once("value", (roomSnap) => {
                let rData = roomSnap.val() || {};
                let sabId = rData.saboteurId;
                let activeCrewCount = 0;
                for (let pid in allPlayers) {
                    if (pid !== sabId && !allPlayers[pid].roverMode && pid !== id) {
                        activeCrewCount++;
                    }
                }
                if (activeCrewCount <= 0) {
                    roomRef.update({ gameOver: true, winner: "Saboteur" });
                }
            });
            break;
        }
    }
}

function update() {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy -= player.speed;
    if (keys['s'] || keys['arrowdown']) dy += player.speed;
    if (keys['a'] || keys['arrowleft']) dx -= player.speed;
    if (keys['d'] || keys['arrowright']) dx += player.speed;

    if (keys[' ']) {
        checkSaboteurTag();
    }

    let moved = false;
    if (!checkCollision(player.x + dx, player.y)) {
        player.x += dx;
        moved = true;
    }
    if (!checkCollision(player.x, player.y + dy)) {
        player.y += dy;
        moved = true;
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    camera.x = Math.max(0, Math.min(camera.x, camera.worldWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, camera.worldHeight - canvas.height));

    let now = Date.now();
    if (moved && playersRef && (now - lastSent > 70)) {
        lastSent = now;
        playersRef.child(myPlayerId).update({
            x: player.x,
            y: player.y
        });
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, camera.worldWidth, camera.worldHeight);

    ctx.fillStyle = "#374151";
    for (let wall of walls) {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }

    for (let id in allPlayers) {
        if (id === myPlayerId) continue;
        let p = allPlayers[id];
        if (!p) continue; // Safety check

        if (p.roverMode) {
            if (player.role === "Saboteur" || id === myPlayerId) {
                ctx.fillStyle = "#9ca3af";
                ctx.fillRect(p.x - 12, p.y - 8, 24, 16);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(p.x - 4, p.y - 4, 8, 8);

                ctx.fillStyle = "#ffffff";
                ctx.font = "12px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText((p.name || "Astronaut") + " (Rover)", p.x, p.y - 18);
            }
            continue;
        }

        ctx.fillStyle = p.color || "#4da6ff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name || "Astronaut", p.x, p.y - 22);
    }

    if (player.isRover) {
        ctx.fillStyle = "#9ca3af";
        ctx.fillRect(player.x - 12, player.y - 8, 24, 16);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(player.x - 4, player.y - 4, 8, 8);

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(player.name + " (Rover)", player.x, player.y - 18);
    } else {
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(player.name, player.x, player.y - 22);
    }

    let gradient = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 180);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.82)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function launchGame() {
    if (gameStarted) return;
    gameStarted = true;

    if (countdownInterval) clearInterval(countdownInterval);

    const waitingRoomScreen = document.getElementById("waiting-room-screen");
    const gameScreen = document.getElementById("game-screen");

    waitingRoomScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameLoop();
}

// --- EMERGENCY MEETING, VOTING & WIN CONDITIONS ---
function setupMeetingListeners() {
    const meetingScreen = document.getElementById("meeting-screen");
    const votingList = document.getElementById("voting-list");
    const meetingStatus = document.getElementById("meeting-status");
    const callMeetingBtn = document.getElementById("call-meeting-btn");
    const gameOverScreen = document.getElementById("game-over-screen");
    const gameOverTitle = document.getElementById("game-over-title");
    const gameOverMessage = document.getElementById("game-over-message");
    const restartBtn = document.getElementById("restart-btn");

    callMeetingBtn.addEventListener("click", () => {
        if (!player.canVote) {
            alert("Rovers cannot call emergency meetings!");
            return;
        }
        if (!roomRef) {
            alert("Room reference not initialized yet!");
            return;
        }
        roomRef.update({ meetingActive: true });
    });

    restartBtn.addEventListener("click", () => {
        if (playersRef && myPlayerId) {
            playersRef.child(myPlayerId).remove();
        }
        
        roomRef.update({
            gameOver: null,
            winner: null,
            meetingActive: null,
            votes: null,
            saboteurId: null,
            startTime: null
        }).then(() => {
            location.reload();
        });
    });

    // Listen for global game state changes (meetings & game over)
    roomRef.on("value", (snap) => {
        let rData = snap.val() || {};

        if (rData.gameOver) {
            meetingScreen.classList.add("hidden");
            gameOverScreen.classList.remove("hidden");
            if (rData.winner === "Crewmates") {
                gameOverTitle.innerText = "🛡️ CREWMATES WIN! 🛡️";
                gameOverMessage.innerText = "You successfully found and banished the Saboteur!";
                gameOverTitle.style.color = "#4da6ff";
            } else {
                gameOverTitle.innerText = "⚠️ SABOTEUR WINS! ⚠️";
                gameOverMessage.innerText = "The Saboteur successfully converted everyone into rovers!";
                gameOverTitle.style.color = "#ff4d4d";
            }
            return;
        }

        if (rData.meetingActive) {
            meetingScreen.classList.remove("hidden");
            votingList.innerHTML = "";

            if (!player.canVote) {
                meetingStatus.innerText = "You are a Rover! You cannot vote in this meeting.";
            } else {
                meetingStatus.innerText = "Tap a remaining player to cast your vote:";
                
                for (let id in allPlayers) {
                    if (id === myPlayerId) continue;
                    let p = allPlayers[id];
                    if (!p || p.roverMode) continue;

                    let voteBtn = document.createElement("button");
                    voteBtn.innerText = p.name || "Astronaut";
                    voteBtn.style.padding = "10px";
                    voteBtn.style.background = "#374151";
                    voteBtn.style.color = "white";
                    voteBtn.style.border = "none";
                    voteBtn.style.borderRadius = "4px";
                    voteBtn.style.cursor = "pointer";
                    voteBtn.style.fontWeight = "bold";

                    voteBtn.addEventListener("click", () => {
                        roomRef.child(`votes/${myPlayerId}`).set(id);
                        meetingStatus.innerText = `You voted for ${p.name}. Waiting for others...`;
                    });

                    votingList.appendChild(voteBtn);
                }
            }
        } else {
            meetingScreen.classList.add("hidden");
        }
    });

    // Vote Tallying & Win Checking
    roomRef.child("votes").on("value", (voteSnap) => {
        let votes = voteSnap.val() || {};
        
        let eligibleVoters = 0;
        for (let id in allPlayers) {
            let p = allPlayers[id];
            if (p && !p.roverMode) {
                eligibleVoters++;
            }
        }

        let voteCount = Object.keys(votes).length;

        if (eligibleVoters > 0 && voteCount >= eligibleVoters) {
            let tally = {};
            for (let voterId in votes) {
                let target = votes[voterId];
                tally[target] = (tally[target] || 0) + 1;
            }

            let maxVotes = 0;
            let targetToRover = null;
            for (let target in tally) {
                if (tally[target] > maxVotes) {
                    maxVotes = tally[target];
                    targetToRover = target;
                }
            }

            roomRef.once("value", (roomSnap) => {
                let rData = roomSnap.val() || {};
                let sabId = rData.saboteurId;

                if (targetToRover === sabId) {
                    roomRef.update({ gameOver: true, winner: "Crewmates" });
                } else {
                    if (targetToRover) {
                        playersRef.child(targetToRover).update({ roverMode: true });
                    }

                    setTimeout(() => {
                        let activeCrewCount = 0;
                        for (let pid in allPlayers) {
                            let p = allPlayers[pid];
                            if (pid !== sabId && p && !p.roverMode && pid !== targetToRover) {
                                activeCrewCount++;
                            }
                        }

                        if (activeCrewCount <= 0) {
                            roomRef.update({ gameOver: true, winner: "Saboteur" });
                        } else {
                            player.x = 500;
                            player.y = 150;
                            roomRef.update({ meetingActive: false, votes: null });
                        }
                    }, 1200);
                }
            });
        }
    });
}

// --- LOBBY, HOME HEADER & WAITING ROOM FLOW ---
window.addEventListener("DOMContentLoaded", () => {
    const homeTitleBtn = document.getElementById("home-title-btn");
    const joinBtn = document.getElementById("join-btn");
    const nameInput = document.getElementById("player-name-input");
    const lobbyScreen = document.getElementById("lobby-screen");
    const waitingRoomScreen = document.getElementById("waiting-room-screen");
    const roleAnnouncement = document.getElementById("role-announcement");
    const playerCountDisplay = document.getElementById("player-count-display");
    const timerDisplay = document.getElementById("timer-display");

    // Persistent Home Button Header Handler
    if (homeTitleBtn) {
        homeTitleBtn.addEventListener("click", () => {
            if (playersRef && myPlayerId) {
                playersRef.child(myPlayerId).remove();
            }
            if (roomRef) {
                roomRef.update({
                    gameOver: null,
                    winner: null,
                    meetingActive: null,
                    votes: null,
                    saboteurId: null,
                    startTime: null
                });
            }
            window.location.href = "/index.html";
        });
    }

    joinBtn.addEventListener("click", () => {
        const nameVal = nameInput.value.trim();
        
        if (!nameVal) {
            alert("Please enter your astronaut name first!");
            return;
        }

        player.name = nameVal;

        roomRef = db.ref("rooms/lobby_1");
        playersRef = db.ref("rooms/lobby_1/players");

        roomRef.once("value", (snapshot) => {
            let roomData = snapshot.val() || {};
            let existingPlayers = roomData.players || {};

            let currentSaboteur = roomData.saboteurId;
            let isSaboteurActive = currentSaboteur && existingPlayers[currentSaboteur];

            if (!currentSaboteur || !isSaboteurActive) {
                roomRef.update({ saboteurId: myPlayerId });
                roomRef.child("saboteurId").onDisconnect().remove();

                player.role = "Saboteur";
                roleAnnouncement.innerHTML = "⚠️ SECRET ROLE: You are the **Saboteur**! Sabotage the ship without getting caught.";
                roleAnnouncement.style.color = "#ff4d4d";
            } else {
                player.role = "Crewmate";
                roleAnnouncement.innerHTML = "🛡️ SECRET ROLE: You are a **Crewmate**. Repair the ship and find the saboteur!";
                roleAnnouncement.style.color = "#4da6ff";
            }

            playersRef.child(myPlayerId).set({
                name: player.name,
                x: player.x,
                y: player.y,
                color: player.color,
                role: player.role,
                roverMode: false
            });

            playersRef.child(myPlayerId).onDisconnect().remove();

            playersRef.on("value", (snap) => {
                allPlayers = snap.val() || {};
                
                if (allPlayers[myPlayerId] && allPlayers[myPlayerId].roverMode && !player.isRover) {
                    player.isRover = true;
                    player.canVote = false;
                }

                let count = Object.keys(allPlayers).length;
                if (playerCountDisplay) {
                    playerCountDisplay.innerText = `Players in lobby: ${count} / 4`;
                }

                roomRef.once("value", (roomSnap) => {
                    let rData = roomSnap.val() || {};
                    if (count >= 4 && !rData.startTime) {
                        let launchTime = Date.now() + 60000; 
                        roomRef.update({ startTime: launchTime });
                        roomRef.child("startTime").onDisconnect().remove();
                    }
                });
            });

            roomRef.on("value", (roomSnap) => {
                let rData = roomSnap.val() || {};
                if (rData.startTime) {
                    if (!countdownInterval) {
                        countdownInterval = setInterval(() => {
                            let timeLeft = Math.max(0, Math.floor((rData.startTime - Date.now()) / 1000));
                            if (timerDisplay) {
                                timerDisplay.innerText = `Launching in: ${timeLeft}s`;
                            }

                            if (timeLeft <= 0) {
                                clearInterval(countdownInterval);
                                launchGame();
                            }
                        }, 1000);
                    }
                } else {
                    if (timerDisplay) {
                        timerDisplay.innerText = "Waiting for 4 players to start countdown...";
                    }
                }
            });

            setupMeetingListeners();

            lobbyScreen.classList.add("hidden");
            waitingRoomScreen.classList.remove("hidden");
        });
    });
});