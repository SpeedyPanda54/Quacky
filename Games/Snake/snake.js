// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPM42FICNjUAieqVPU-UZRuzyOKu_OXe0",
  authDomain: "quacky-96f2c.firebaseapp.com",
  projectId: "quacky-96f2c",
  storageBucket: "quacky-96f2c.firebasestorage.app",
  messagingSenderId: "320934850122",
  appId: "1:320934850122:web:469f17177a414b110980b3",
  measurementId: "G-WY5V5PVC56"
};

// Initialize Firebase & Firestore database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Board setup
const blockSize = 25;
const rows = 20;
const cols = 20;
let board;
let context;

// Snake variables
let snakeX, snakeY, velocityX, velocityY, snakeBody;
let foodX, foodY;
let score = 0;
let gameOver = false;
let gameStarted = false;
let gameInterval;
let tickCounter = 0;

window.onload = function () {
    board = document.getElementById("board");
    board.height = rows * blockSize;
    board.width = cols * blockSize;
    context = board.getContext("2d");

    resetGame();
    document.addEventListener("keydown", changeDirection);

    // Wire up score submission button
    document.getElementById("submit-score-btn").addEventListener("click", saveHighScore);
}

function resetGame() {
    snakeX = blockSize * 5;
    snakeY = blockSize * 5;
    velocityX = 0;
    velocityY = 0;
    snakeBody = [];
    score = 0;
    tickCounter = 0;
    gameOver = false;
    gameStarted = false;
    
    document.getElementById("current-score").innerText = score;
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
    
    // Reset submission form state
    document.getElementById("score-submit-area").style.display = "block";
    document.getElementById("player-name").value = "";

    placeFood();
    renderGame();
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        document.getElementById("start-screen").classList.add("hidden");
        gameInterval = setInterval(update, 100);
    }
}

function update() {
    if (gameOver) return;

    tickCounter++;

    score += 1;
    document.getElementById("current-score").innerText = score;

    if (tickCounter % 10 === 0) {
        if (snakeBody.length === 0) {
            snakeBody.push([snakeX, snakeY]);
        } else {
            let lastSegment = snakeBody[snakeBody.length - 1];
            snakeBody.push([...lastSegment]);
        }
    }

    if (snakeX === foodX && snakeY === foodY) {
        score += 50;
        placeFood();
    }

    for (let i = snakeBody.length - 1; i > 0; i--) {
        snakeBody[i] = snakeBody[i - 1];
    }
    if (snakeBody.length) {
        snakeBody[0] = [snakeX, snakeY];
    }

    snakeX += velocityX * blockSize;
    snakeY += velocityY * blockSize;

    if (snakeX < 0 || snakeX >= cols * blockSize || snakeY < 0 || snakeY >= rows * blockSize) {
        triggerGameOver();
        return;
    }

    for (let i = 0; i < snakeBody.length; i++) {
        if (snakeX === snakeBody[i][0] && snakeY === snakeBody[i][1]) {
            triggerGameOver();
            return;
        }
    }

    renderGame();
}

function renderGame() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r + c) % 2 === 0) {
                context.fillStyle = "#000000";
            } else {
                context.fillStyle = "#88d185";
            }
            context.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
        }
    }

    context.fillStyle = "red";
    context.fillRect(foodX, foodY, blockSize, blockSize);

    context.fillStyle = "#043005";
    context.fillRect(snakeX, snakeY, blockSize, blockSize);
    for (let i = 0; i < snakeBody.length; i++) {
        context.fillRect(snakeBody[i][0], snakeBody[i][1], blockSize, blockSize);
    }
}

function placeFood() {
    foodX = Math.floor(Math.random() * cols) * blockSize;
    foodY = Math.floor(Math.random() * rows) * blockSize;
}

function changeDirection(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === "KeyB") {
        takeSnakeScreenshot();
        return;
    }

    if (gameOver) return;

    if (!gameStarted && (e.code.startsWith("Arrow") || ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code))) {
        startGame();
    }

    if ((e.code === "ArrowUp" || e.code === "KeyW") && velocityY !== 1) {
        velocityX = 0;
        velocityY = -1;
    } else if ((e.code === "ArrowDown" || e.code === "KeyS") && velocityY !== -1) {
        velocityX = 0;
        velocityY = -1 ? 0 : 0; // fixes syntax
        velocityX = 0;
        velocityY = 1;
    } else if ((e.code === "ArrowLeft" || e.code === "KeyA") && velocityX !== 1) {
        velocityX = -1;
        velocityY = 0;
    } else if ((e.code === "ArrowRight" || e.code === "KeyD") && velocityX !== -1) {
        velocityX = 1;
        velocityY = 0;
    }
}

// Fix direction arrow down logic snippet cleanly:
window.addEventListener('keydown', (e) => {
    // handled in changeDirection
});

function takeSnakeScreenshot() {
    let link = document.createElement('a');
    link.download = 'SnakePreview.png';
    link.href = board.toDataURL('image/png');
    link.click();
}

function triggerGameOver() {
    gameOver = true;
    clearInterval(gameInterval);
    document.getElementById("final-score-value").innerText = score;
    document.getElementById("game-over-screen").classList.remove("hidden");
    
    // Fetch and display global high scores when dead
    fetchHighScores();
}

// Firebase: Save High Score
async function saveHighScore() {
    let nameInput = document.getElementById("player-name").value.trim();
    let playerName = nameInput ? nameInput : "ANON";

    try {
        await addDoc(collection(db, "snake_highscores"), {
            name: playerName.toUpperCase(),
            score: score,
            timestamp: new Date()
        });
        
        // Hide submit area after posting so they can't spam click
        document.getElementById("score-submit-area").style.display = "none";
        fetchHighScores();
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Failed to save score. Check console.");
    }
}

// Firebase: Fetch High Scores
async function fetchHighScores() {
    const listEl = document.getElementById("leaderboard-list");
    listEl.innerHTML = "<li>Loading...</li>";

    try {
        const q = query(collection(db, "snake_highscores"), orderBy("score", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        listEl.innerHTML = "";
        if (querySnapshot.empty) {
            listEl.innerHTML = "<li>No high scores yet!</li>";
            return;
        }

        querySnapshot.forEach((doc) => {
            let data = doc.data();
            let li = document.createElement("li");
            li.innerText = `${data.name}: ${data.score}`;
            listEl.appendChild(li);
        });
    } catch (e) {
        console.error("Error getting documents: ", e);
        listEl.innerHTML = "<li>Error loading scores</li>";
    }
}

document.getElementById("restart-button").addEventListener("click", () => {
    resetGame();
});