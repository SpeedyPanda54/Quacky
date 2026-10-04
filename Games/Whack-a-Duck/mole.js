// --- FIREBASE CONFIGURATION ---
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Copyright-Free Vector Duck Target (Embedded Data URI)
const duckSvgUri = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <ellipse cx="100" cy="120" rx="60" ry="45" fill="#FFD700"/>
  <circle cx="100" cy="65" r="40" fill="#FFD700"/>
  <circle cx="115" cy="55" r="6" fill="#000000"/>
  <circle cx="117" cy="53" r="2" fill="#FFFFFF"/>
  <polygon points="135,65 170,70 135,80" fill="#FF8C00"/>
  <ellipse cx="80" cy="120" rx="25" ry="18" fill="#F4C430"/>
</svg>
`);

// Copyright-Free Vector Guard Dog Obstacle (Embedded Data URI)
const dogSvgUri = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <!-- Body -->
  <ellipse cx="100" cy="125" rx="50" ry="40" fill="#A0522D"/>
  <!-- Head -->
  <circle cx="100" cy="70" r="35" fill="#A0522D"/>
  <!-- Ears -->
  <polygon points="70,50 60,30 85,45" fill="#8B4513"/>
  <polygon points="130,50 140,30 115,45" fill="#8B4513"/>
  <!-- Snout -->
  <ellipse cx="100" cy="80" rx="18" ry="12" fill="#DEB887"/>
  <!-- Nose -->
  <ellipse cx="100" cy="75" rx="7" ry="5" fill="#000000"/>
  <!-- Eyes -->
  <circle cx="85" cy="60" r="5" fill="#000000"/>
  <circle cx="115" cy="60" r="5" fill="#000000"/>
  <!-- Collar -->
  <path d="M 75 95 Q 100 110 125 95" stroke="#FF0000" stroke-width="8" fill="none"/>
</svg>
`);

// Global Game State Variables
let score = 0;
let gameOver = false;
let gameSpeed = "Medium"; 
let currentHighScore = 0;

// Arrays to hold active targets and obstacles
let activeMoles = [];
let activePlants = [];

// Main interval ID for spawning
let mainSpawnIntervalId;

// Configuration for each speed difficulty
const speedConfigs = {
    "Slow": {
        moleInterval: 700,  
        plantInterval: 800, 
        maxMoles: 4,        
        maxPlants: 2,       
        despawnTime: 2000,  
        boardSize: 16       
    },
    "Medium": {
        moleInterval: 400,
        plantInterval: 500,
        maxMoles: 3,
        maxPlants: 1,
        despawnTime: 1500,
        boardSize: 9
    },
    "Fast": {
        moleInterval: 150,
        plantInterval: 200,
        maxMoles: 1,
        maxPlants: 1,
        despawnTime: 1000,
        boardSize: 4
    }
};

// HTML Element References
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("high-score");
const board = document.getElementById("board"); 
const resetButton = document.getElementById("Reset");
const speedButtons = document.querySelectorAll(".Speed");

window.onload = function() {
    setGame(); 
    
    speedButtons.forEach(button => {
        button.addEventListener("click", function() {
            setGameSpeed(this.id); 
        });
    });
}

// Loads High Scores from Firebase in real-time (with client-side sorting to prevent index errors)
function loadHighScoreForCurrentSpeed() {
    const scoresRef = db.ref(`whackAMole/highscores/${gameSpeed}`);
    const leaderboardList = document.getElementById("leaderboard-list");

    scoresRef.on("value", (snapshot) => {
        let scores = [];
        snapshot.forEach((childSnap) => {
            scores.push(childSnap.val());
        });

        // Sort highest score first in JavaScript (bypasses Firebase .indexOn requirement)
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5); // Keep top 5

        if (scores.length === 0) {
            currentHighScore = 0;
            highScoreDisplay.innerText = "0";
            if (leaderboardList) {
                leaderboardList.innerHTML = `<li style="padding: 4px 0; color: #9ca3af; text-align: center;">No scores yet! Be the first.</li>`;
            }
            return;
        }

        currentHighScore = scores[0].score;
        highScoreDisplay.innerText = currentHighScore.toString();

        if (leaderboardList) {
            leaderboardList.innerHTML = "";
            scores.forEach((entry, index) => {
                let li = document.createElement("li");
                li.style.padding = "6px 0";
                li.style.borderBottom = "1px solid #374151";
                li.innerHTML = `<strong>#${index + 1} ${entry.name}</strong>: <span style="float: right; color: #4ade80;">${entry.score} pts</span>`;
                leaderboardList.appendChild(li);
            });
        }
    });
}

// Saves/Submits score to Firebase on Game Over with Enter-key support
function saveHighScoreForCurrentSpeed() {
    if (score <= 0) return;

    const modal = document.getElementById("game-over-modal");
    const finalScoreDisplay = document.getElementById("final-score-display");
    const nameInput = document.getElementById("player-name-input");
    const submitBtn = document.getElementById("submit-score-btn");

    if (!modal) {
        const scoresRef = db.ref(`whackAMole/highscores/${gameSpeed}`);
        scoresRef.push({
            name: "Anonymous Hunter",
            score: score,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        return;
    }

    finalScoreDisplay.innerText = score.toString();
    modal.style.display = "block";
    nameInput.value = "";
    nameInput.focus();

    // Remove old listeners to prevent stacking duplicates on multiple games
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    const submitAction = () => {
        let playerName = nameInput.value.trim();
        if (!playerName) {
            playerName = "Anonymous Hunter";
        }

        const scoresRef = db.ref(`whackAMole/highscores/${gameSpeed}`);
        scoresRef.push({
            name: playerName,
            score: score,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        modal.style.display = "none";
    };

    newSubmitBtn.addEventListener("click", submitAction);

    // Allow submitting by pressing Enter on the input field
    nameInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            submitAction();
        }
    };
}

// Main game setup and reset
function setGame() {
    if (mainSpawnIntervalId) clearInterval(mainSpawnIntervalId);
    activeMoles.forEach(mole => clearTimeout(mole.timeoutId)); 
    activePlants.forEach(plant => clearTimeout(plant.timeoutId)); 
    activeMoles = []; 
    activePlants = []; 
    
    board.innerHTML = ""; 
    score = 0;
    scoreDisplay.innerText = score.toString();
    gameOver = false;

    const config = speedConfigs[gameSpeed];
    let boardClass;

    if (gameSpeed === "Slow") {
        boardClass = "board-16-tiles";
    } else if (gameSpeed === "Medium") {
        boardClass = "board-9-tiles";
    } else if (gameSpeed === "Fast") {
        boardClass = "board-4-tiles";
    } else { 
        boardClass = "board-9-tiles";
    }

    board.className = ''; 
    board.classList.add(boardClass); 

    for (let i = 0; i < config.boardSize; i++) {
        let tile = document.createElement("div");
        tile.id = i.toString();
        tile.addEventListener("click", selectTile);
        board.appendChild(tile);
    }

    loadHighScoreForCurrentSpeed();
    startMainSpawnInterval(); 
}

// Spawning interval handler
function startMainSpawnInterval() {
    const config = speedConfigs[gameSpeed];
    const checkInterval = Math.min(config.moleInterval, config.plantInterval) / 2;
    mainSpawnIntervalId = setInterval(trySpawnEntities, checkInterval);
}

function trySpawnEntities() {
    if (gameOver) {
        clearInterval(mainSpawnIntervalId);
        return;
    }

    const config = speedConfigs[gameSpeed];
    const totalIntervals = config.moleInterval + config.plantInterval;
    const moleChance = config.plantInterval / totalIntervals; 
    
    if (Math.random() < moleChance) { 
        if (activeMoles.length < config.maxMoles) {
            spawnEntity('mole');
        } else if (activePlants.length < config.maxPlants) { 
            spawnEntity('plant');
        }
    } else { 
        if (activePlants.length < config.maxPlants) {
            spawnEntity('plant');
        } else if (activeMoles.length < config.maxMoles) { 
            spawnEntity('mole');
        }
    }
}

// Random empty tile picker
function getRandomEmptyTile() {
    const config = speedConfigs[gameSpeed];
    let tile;
    let attempts = 0;
    const maxAttempts = config.boardSize * 2; 

    do {
        const num = Math.floor(Math.random() * config.boardSize);
        tile = document.getElementById(num.toString());
        attempts++;
        if (attempts > maxAttempts) {
            return null; 
        }
    } while (tile.firstChild); 

    const isAlreadyActive = activeMoles.some(m => m.tile === tile) || activePlants.some(p => p.tile === tile);
    if (isAlreadyActive) {
        return getRandomEmptyTile(); 
    }

    return tile;
}

// Centralized Spawner
function spawnEntity(type) {
    const config = speedConfigs[gameSpeed];
    const tile = getRandomEmptyTile(); 

    if (!tile) return; 

    const img = document.createElement("img");
    let entityArray;
    let despawnDelay;

    if (type === 'mole') {
        img.src = duckSvgUri; // Custom Duck Target
        entityArray = activeMoles;
        despawnDelay = config.despawnTime; 
    } else { 
        img.src = dogSvgUri; // Custom Guard Dog Obstacle
        entityArray = activePlants;
        despawnDelay = config.despawnTime; 
    }

    tile.appendChild(img); 

    const timeoutId = setTimeout(() => {
        removeEntity(tile.id, type); 
    }, despawnDelay);

    entityArray.push({ tile: tile, timeoutId: timeoutId });
}

// Despawn / Entity Removal
function removeEntity(tileId, type) {
    const tile = document.getElementById(tileId);
    if (!tile) return; 

    if (tile.firstChild) {
        tile.innerHTML = ""; 
    }

    let entityArray = (type === 'mole') ? activeMoles : activePlants;

    const index = entityArray.findIndex(e => e.tile.id === tileId);
    if (index !== -1) {
        clearTimeout(entityArray[index].timeoutId); 
        entityArray.splice(index, 1); 
    }
}

// Tile Click Listener
function selectTile() {
    if (gameOver) {
        return; 
    }

    const clickedTile = this; 

    // Hit target (Duck) -> Win points
    const moleIndex = activeMoles.findIndex(m => m.tile === clickedTile);
    if (moleIndex !== -1) { 
        score += 1000;
        scoreDisplay.innerText = score.toString();
        
        if (score > currentHighScore) {
            currentHighScore = score;
            highScoreDisplay.innerText = currentHighScore.toString();
        }
        
        removeEntity(clickedTile.id, 'mole'); 
        return; 
    }

    // Hit obstacle (Guard Dog) -> Game Over
    const plantIndex = activePlants.findIndex(p => p.tile === clickedTile);
    if (plantIndex !== -1) { 
        scoreDisplay.innerText = "GAME OVER! Score: " + score.toString() + " | Click \"Restart Game\"";
        gameOver = true;
        
        if (mainSpawnIntervalId) clearInterval(mainSpawnIntervalId); 
        activeMoles.forEach(mole => clearTimeout(mole.timeoutId)); 
        activePlants.forEach(plant => clearTimeout(plant.timeoutId)); 
        activeMoles = []; 
        activePlants = []; 

        saveHighScoreForCurrentSpeed(); 
    }
}

// Speed toggle handler
function setGameSpeed(speedId) {
    gameSpeed = speedId; 
    setGame(); 
}