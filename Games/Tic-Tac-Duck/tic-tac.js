// --- FIREBASE INITIALIZATION ---
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
const roomRef = db.ref("ticTacDuck/rooms/publicRoom");

// --- GAME STATE ---
const cells = document.querySelectorAll(".cell");
const statusDisplay = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const modeToggleBtn = document.getElementById("mode-toggle-btn");
const resetRoomBtn = document.getElementById("reset-room-btn");

let options = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "🦆"; 
let isRunning = true;
let isOnlineMode = false;
let mySymbol = null; 

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], 
    [0, 3, 6], [1, 4, 7], [2, 5, 8], 
    [0, 4, 8], [2, 4, 6]            
];

initializeGame();

function initializeGame() {
    cells.forEach(cell => cell.addEventListener("click", cellClicked));
    resetBtn.addEventListener("click", restartGame);
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener("click", toggleGameMode);
    }
    if (resetRoomBtn) {
        resetRoomBtn.addEventListener("click", () => {
            roomRef.remove();
            alert("Online room has been completely reset! You can now join fresh.");
            location.reload();
        });
    }
    statusDisplay.textContent = `Player ${currentPlayer}'s Turn (Local 2P)`;
}

// Toggle between Local 2P and Online Mode
function toggleGameMode() {
    isOnlineMode = !isOnlineMode;
    
    if (isOnlineMode) {
        modeToggleBtn.textContent = "Switch to Local 2P";
        modeToggleBtn.style.backgroundColor = "#ef4444"; 
        statusDisplay.textContent = "Connecting to Online Room...";
        
        roomRef.once("value", (snapshot) => {
            const roomData = snapshot.val();
            
            if (!roomData || (!roomData.host && !roomData.client)) {
                mySymbol = "🦆";
                roomRef.set({
                    host: true,
                    client: false,
                    options: ["", "", "", "", "", "", "", "", ""],
                    currentPlayer: "🦆",
                    isRunning: true,
                    statusMessage: "Player 🦆's Turn (Online)"
                });
                roomRef.child("host").onDisconnect().set(false);
            } else if (roomData.host === false || roomData.host === null) {
                mySymbol = "🦆";
                roomRef.update({ host: true });
                roomRef.child("host").onDisconnect().set(false);
            } else if (roomData.client === false || roomData.client === null || !roomData.client) {
                mySymbol = "🐥";
                roomRef.update({ client: true });
                roomRef.child("client").onDisconnect().set(false);
            } else {
                mySymbol = "Spectator";
                alert("Room is full! Click 'Reset Online Room' if the previous game is stuck.");
            }
            
            statusDisplay.textContent = `You are playing as ${mySymbol}. Player 🦆's Turn`;
        });

        roomRef.on("value", (snapshot) => {
            const roomData = snapshot.val();
            if (roomData && isOnlineMode) {
                options = roomData.options || options;
                currentPlayer = roomData.currentPlayer || currentPlayer;
                isRunning = roomData.isRunning !== undefined ? roomData.isRunning : isRunning;
                
                updateBoardUI();
                
                if (!isRunning) {
                    statusDisplay.textContent = roomData.statusMessage;
                } else if (mySymbol) {
                    statusDisplay.textContent = `You are ${mySymbol} | Player ${currentPlayer}'s Turn`;
                }
            }
        });

    } else {
        roomRef.off();
        roomRef.remove();
        mySymbol = null;
        modeToggleBtn.textContent = "Switch to Online Mode";
        modeToggleBtn.style.backgroundColor = "#3b82f6"; 
        restartGame();
    }
}

function cellClicked() {
    const cellIndex = this.getAttribute("data-index");

    if (options[cellIndex] !== "" || !isRunning) {
        return;
    }

    if (isOnlineMode) {
        if (mySymbol !== currentPlayer) {
            alert("Not your turn or not your assigned symbol!");
            return;
        }
    }

    options[cellIndex] = currentPlayer;
    
    let roundWon = false;
    for (let i = 0; i < winConditions.length; i++) {
        const condition = winConditions[i];
        const cellA = options[condition[0]];
        const cellB = options[condition[1]];
        const cellC = options[condition[2]];

        if (cellA === "" || cellB === "" || cellC === "") continue;
        if (cellA === cellB && cellB === cellC) {
            roundWon = true;
            break;
        }
    }

    let statusMsg = "";
    if (roundWon) {
        isRunning = false;
        statusMsg = `Player ${currentPlayer} Wins! 🎉`;
    } else if (!options.includes("")) {
        isRunning = false;
        statusMsg = `Draw! 🤝`;
    } else {
        currentPlayer = (currentPlayer === "🦆") ? "🐥" : "🦆";
        statusMsg = isOnlineMode ? `Player ${currentPlayer}'s Turn` : `Player ${currentPlayer}'s Turn (Local 2P)`;
    }

    updateBoardUI();
    statusDisplay.textContent = statusMsg;

    if (isOnlineMode) {
        roomRef.update({
            options: options,
            currentPlayer: currentPlayer,
            isRunning: isRunning,
            statusMessage: statusMsg
        });
    }
}

function updateBoardUI() {
    cells.forEach((cell, index) => {
        cell.textContent = options[index];
    });
}

function restartGame() {
    currentPlayer = "🦆";
    options = ["", "", "", "", "", "", "", "", ""];
    isRunning = true;
    updateBoardUI();
    
    if (isOnlineMode) {
        roomRef.update({
            options: options,
            currentPlayer: currentPlayer,
            isRunning: isRunning,
            statusMessage: `Player ${currentPlayer}'s Turn`
        });
    } else {
        statusDisplay.textContent = `Player ${currentPlayer}'s Turn (Local 2P)`;
    }
}