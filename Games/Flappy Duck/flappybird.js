// Game Board Constants
let board;
let context;
let gameContainer; // Reference to the game container div

// Initial game dimensions (can be overridden by window size in setBoardSize)
let boardWidth = 360; // Will be adjusted
let boardHeight = 640; // Will be adjusted

// Bird Properties
let birdWidth = 34;
let birdHeight = 24;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

// Bird Animation
let birdImg2; // Second image for the flapping animation
let animationFrame = 0; // To toggle between bird images
let animationSpeed = 5; // How often to switch frames (e.g., every 5 game updates)

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight
}

// Pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;
let boardBgImg; // Variable for the background image

// Physics (default values, will change with difficulty)
let velocityX = -2; // Pipes moving left speed
let velocityY = 0; // Bird jump speed
let gravity = 0.4;

// Game State Management
const GAME_STATE = {
    START: 'start',
    COUNTDOWN: 'countdown', // State for pre-game countdown
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};
let currentGameState = GAME_STATE.START; // Initial state

let score = 0;
let currentHighScore = 0;

// Difficulty Configuration
const difficultyConfigs = {
    "Beginner": {
        pipeSpeed: -1.5,
        openingSpaceRatio: 0.35, // Larger opening (e.g., 35% of board height)
        gravity: 0.3,
        jumpStrength: -5,
        pipeInterval: 2000 // Slower pipes
    },
    "Advanced": {
        pipeSpeed: -2,
        openingSpaceRatio: 0.25, // Medium opening
        gravity: 0.4,
        jumpStrength: -6,
        pipeInterval: 1500 // Normal pipes
    },
    "Expert": {
        pipeSpeed: -2.5,
        openingSpaceRatio: 0.18, // Smaller opening
        gravity: 0.5,
        jumpStrength: -7,
        pipeInterval: 1200 // Faster pipes
    }
};
let currentDifficulty = "Advanced"; // Default starting difficulty

// --- References to HTML UI Elements ---
let scoreDisplayElement;
let currentScoreElement;
let startScreen;
let gameOverScreen;
let difficultyButtons;
let highScoreDifficultyElement;
let highScoreValueElement;
let finalScoreValueElement;
let finalHighScoreDifficultyElement;
let finalHighScoreValueElement;
let restartButton;
let countdownDisplayElement; // Countdown display element
// --- END UI REFERENCES ---

// Global variable for the pipe generation interval ID - Declared only once
let pipeGenerationIntervalId;

// Countdown variables
let countdownValue = 3;
let countdownIntervalId;

// --- Game loop and Initialization ---
window.onload = function() {
    board = document.getElementById("board");
    context = board.getContext("2d");
    gameContainer = document.getElementById("game-container");

    // --- Get references to UI elements ---
    scoreDisplayElement = document.getElementById("score-display");
    currentScoreElement = document.getElementById("current-score");
    startScreen = document.getElementById("start-screen");
    gameOverScreen = document.getElementById("game-over-screen");
    difficultyButtons = document.querySelectorAll(".difficulty-button");
    highScoreDifficultyElement = document.getElementById("high-score-difficulty");
    highScoreValueElement = document.getElementById("high-score-value");
    finalScoreValueElement = document.getElementById("final-score-value");
    finalHighScoreDifficultyElement = document.getElementById("final-high-score-difficulty");
    finalHighScoreValueElement = document.getElementById("final-high-score-value");
    restartButton = document.getElementById("restart-button");
    countdownDisplayElement = document.getElementById("countdown-display");
    // --- END UI REFERENCES ---

    setBoardSize();
    window.addEventListener('resize', setBoardSize);

    // Load images
    birdImg = new Image();
    birdImg.src = "./flappybird.png";

    birdImg2 = new Image(); // Load the second bird image for animation
    birdImg2.src = "./flappybird(2).png";

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";
    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";
    boardBgImg = new Image();
    boardBgImg.src = "./flappybirdbg.png";

    // Add event listeners for game interaction (Spacebar, mouse click on canvas, touch on canvas)
    document.addEventListener("keydown", handleInput); // Keydown for Spacebar (global)
    board.addEventListener("mousedown", handleInput);   // Mousedown only on the canvas
    board.addEventListener("touchstart", handleInput); // Touchstart only on the canvas

    // --- Add specific event listeners for UI buttons ---
    difficultyButtons.forEach(button => {
        button.addEventListener("click", setDifficulty); // Call setDifficulty directly
    });
    restartButton.addEventListener("click", handleRestartButtonClick); // Call dedicated restart handler
    // --- END UI LISTENERS ---

    loadHighScoreForCurrentDifficulty();
    updateUIScore();
    updateUIHighScore();

    requestAnimationFrame(update); // Start the main game loop
}

// Function to set board size dynamically based on its parent container
function setBoardSize() {
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;

    const aspectRatio = 360 / 640; // Original game aspect ratio (width / height)
    let newWidth, newHeight;

    if (containerWidth / containerHeight < aspectRatio) {
        newWidth = containerWidth;
        newHeight = newWidth / aspectRatio;
    } else {
        newHeight = containerHeight;
        newWidth = newHeight * aspectRatio;
    }

    boardWidth = newWidth;
    boardHeight = newHeight;

    board.width = boardWidth;
    board.height = boardHeight;

    // Adjust bird and pipe positions/sizes relative to new board size
    bird.x = boardWidth / 8;
    bird.y = boardHeight / 2;

    // Scale bird and pipe dimensions proportionally to the new board size
    bird.width = newWidth * (34 / 360);
    bird.height = newHeight * (24 / 640);

    pipeWidth = newWidth * (64 / 360);
    pipeX = boardWidth;
}

// Main game loop
function update() {
    requestAnimationFrame(update);

    context.clearRect(0, 0, board.width, board.height); // Clear board first

    // Always draw the background image first if it's loaded
    if (boardBgImg.complete && board.width > 0 && board.height > 0) {
        context.drawImage(boardBgImg, 0, 0, board.width, board.height);
    }

    // --- Bird Animation Logic ---
    let currentBirdImage;
    if (birdImg.complete && birdImg2.complete) {
        // Increment frame counter
        animationFrame++;
        if (animationFrame >= animationSpeed * 2) { // Reset after two cycles (e.g., 10 frames total if speed is 5)
            animationFrame = 0;
        }

        // Determine which image to draw based on animationFrame
        if (animationFrame < animationSpeed) {
            currentBirdImage = birdImg; // First half of the cycle, draw first image
        } else {
            currentBirdImage = birdImg2; // Second half of the cycle, draw second image
        }
    } else {
        currentBirdImage = birdImg; // Fallback if images aren't loaded yet (draw default birdImg)
    }
    // --- END Bird Animation Logic ---


    // Manage UI visibility based on game state
    if (currentGameState === GAME_STATE.START) {
        showScreen(startScreen);
        hideScreen(gameOverScreen);
        hideScreen(scoreDisplayElement);
        hideScreen(countdownDisplayElement);

        // Use currentBirdImage for drawing
        if (currentBirdImage) {
            context.drawImage(currentBirdImage, bird.x, bird.y, bird.width, bird.height);
        }
    } else if (currentGameState === GAME_STATE.COUNTDOWN) {
        hideScreen(startScreen);
        hideScreen(gameOverScreen);
        showScreen(scoreDisplayElement);
        showScreen(countdownDisplayElement);

        // Use currentBirdImage for drawing
        if (currentBirdImage) {
            context.drawImage(currentBirdImage, bird.x, bird.y, bird.width, bird.height);
        }
        for (let i = 0; i < pipeArray.length; i++) {
            let pipe = pipeArray[i];
            if (pipe.img.complete) {
                context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
            }
        }

    } else if (currentGameState === GAME_STATE.PLAYING) {
        hideScreen(startScreen);
        hideScreen(gameOverScreen);
        showScreen(scoreDisplayElement);
        hideScreen(countdownDisplayElement);

        velocityY += gravity;
        bird.y = Math.max(bird.y + velocityY, 0);

        // Use currentBirdImage for drawing
        if (currentBirdImage) {
            context.drawImage(currentBirdImage, bird.x, bird.y, bird.width, bird.height);
        }

        if (bird.y + bird.height > board.height) {
            currentGameState = GAME_STATE.GAME_OVER;
        }

        for (let i = 0; i < pipeArray.length; i++) {
            let pipe = pipeArray[i];
            pipe.x += velocityX;
            if (pipe.img.complete) {
                context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
            }

            if (!pipe.passed && bird.x > pipe.x + pipe.width) {
                score += 0.5;
                pipe.passed = true;
                updateUIScore();
            }

            if (detectCollision(bird, pipe)) {
                currentGameState = GAME_STATE.GAME_OVER;
            }
        }

        while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
            pipeArray.shift();
        }

    } else if (currentGameState === GAME_STATE.GAME_OVER) {
        showScreen(gameOverScreen);
        hideScreen(startScreen);
        hideScreen(scoreDisplayElement);
        hideScreen(countdownDisplayElement);

        saveHighScoreForCurrentDifficulty();
        updateUIHighScore();
        // For game over screen, keep the bird in its default pose (no flapping)
        if (birdImg.complete) {
            context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
        }
    }
}

// Handles jump inputs (Spacebar, mouse click ON CANVAS, touch ON CANVAS)
function handleInput(e) {
    // IMPORTANT: Prevent default spacebar behavior *first* for continuous play
    if (e.code === "Space") {
        e.preventDefault();
    }

    // If the event target is NOT the canvas for mouse/touch events, ignore it for a jump.
    if ((e.type === "mousedown" || e.type === "touchstart") && e.target !== board) {
        return; // Ignore clicks/touches not directly on the canvas
    }

    // Only respond to Space, mouse click, or touch (jump inputs)
    const isJumpInput = (e.code === "Space" || e.type === "mousedown" || e.type === "touchstart");

    if (!isJumpInput) {
        return;
    }

    // Game state transitions based on jump input
    if (currentGameState === GAME_STATE.START) {
        currentGameState = GAME_STATE.COUNTDOWN;
        resetGame();
        startCountdown();
    } else if (currentGameState === GAME_STATE.PLAYING) {
        velocityY = difficultyConfigs[currentDifficulty].jumpStrength;
    }
    // No GAME_OVER transition here. Restart is handled by handleRestartButtonClick.
}

// Handles the "Play Again" button click
function handleRestartButtonClick() {
    if (currentGameState === GAME_STATE.GAME_OVER) {
        currentGameState = GAME_STATE.COUNTDOWN;
        resetGame(); // Reset for a new game
        startCountdown(); // Start countdown for restart
    }
    this.blur(); // Remove focus from the button after click to prevent accidental re-clicks
}

// Function to reset all game elements to their initial state
function resetGame() {
    bird.y = boardHeight / 2; // Reset bird position
    pipeArray = []; // Clear all pipes
    score = 0; // Reset score
    updateUIScore(); // Update HTML score display to 0
    velocityY = 0; // Reset bird velocity

    // Apply current difficulty settings (physics)
    const config = difficultyConfigs[currentDifficulty];
    velocityX = config.pipeSpeed;
    gravity = config.gravity;

    // Clear any previous game intervals (pipes and countdown)
    if (pipeGenerationIntervalId) clearInterval(pipeGenerationIntervalId);
    if (countdownIntervalId) clearInterval(countdownIntervalId);

    // Reset countdown specific variables
    countdownValue = 3;
    countdownDisplayElement.innerText = countdownValue; // Update display
    hideScreen(countdownDisplayElement); // Ensure it's hidden until needed
}

// Function to start the pipe generation (called after countdown)
function startPipeGeneration() {
    if (pipeGenerationIntervalId) clearInterval(pipeGenerationIntervalId); // Clear old interval if exists
    const config = difficultyConfigs[currentDifficulty];
    pipeGenerationIntervalId = setInterval(placePipes, config.pipeInterval);
}

// Countdown logic
function startCountdown() {
    countdownDisplayElement.innerText = countdownValue;
    showScreen(countdownDisplayElement); // Make sure it's visible

    countdownIntervalId = setInterval(() => {
        countdownValue--;
        countdownDisplayElement.innerText = countdownValue;

        if (countdownValue <= 0) {
            clearInterval(countdownIntervalId);
            hideScreen(countdownDisplayElement);
            currentGameState = GAME_STATE.PLAYING; // Transition to playing after countdown
            startPipeGeneration(); // Start pipes moving
        }
    }, 1000); // Update every second
}

// Function to place a new set of pipes
function placePipes() {
    // Only place pipes if the game is in the PLAYING state
    if (currentGameState !== GAME_STATE.PLAYING) {
        return;
    }

    const config = difficultyConfigs[currentDifficulty];
    let openingSpace = board.height * config.openingSpaceRatio;

    // Calculate pipe Y position to ensure valid opening
    const minTopPipeY = -pipeHeight + (board.height * 0.2);
    const maxTopPipeY = -(pipeHeight - (board.height * 0.8) + openingSpace);

    let randomPipeY = Math.random() * (maxTopPipeY - minTopPipeY) + minTopPipeY;

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(bottomPipe);
}

// Collision detection logic (Axis-Aligned Bounding Box - AABB)
function detectCollision(a, b) {
    return a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x && //a's top right corner passes b's top left corner
           a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;   //a's bottom left corner passes b's top left corner
}

// --- High Score Logic ---
function loadHighScoreForCurrentDifficulty() {
    const key = `flappyBirdHighScore_${currentDifficulty}`;
    const savedHighScore = localStorage.getItem(key);
    if (savedHighScore) {
        currentHighScore = parseInt(savedHighScore, 10);
    } else {
        currentHighScore = 0;
    }
}

function saveHighScoreForCurrentDifficulty() {
    if (score > currentHighScore) {
        currentHighScore = Math.floor(score);
        const key = `flappyBirdHighScore_${currentDifficulty}`;
        localStorage.setItem(key, currentHighScore.toString());
    }
}
// --- END HIGH SCORE LOGIC ---

// --- UI Update Functions ---
function updateUIScore() {
    currentScoreElement.innerText = Math.floor(score);
}

function updateUIHighScore() {
    // Update high score on start screen
    highScoreDifficultyElement.innerText = currentDifficulty;
    highScoreValueElement.innerText = currentHighScore.toString();

    // Update high score on game over screen
    finalScoreValueElement.innerText = Math.floor(score);
    finalHighScoreDifficultyElement.innerText = currentDifficulty;
    finalHighScoreValueElement.innerText = currentHighScore.toString();
}

// Helper to show an HTML element by removing 'hidden' class
function showScreen(element) {
    element.classList.remove("hidden");
}

// Helper to hide an HTML element by adding 'hidden' class
function hideScreen(element) {
    element.classList.add("hidden");
}

// --- Difficulty Selection ---
function setDifficulty(event) {
    difficultyButtons.forEach(button => {
        button.classList.remove("active");
    });

    event.target.classList.add("active");

    currentDifficulty = event.target.id.replace('difficulty-', '');

    loadHighScoreForCurrentDifficulty();
    updateUIHighScore();

    // If the game is not playing, reset to start state to show new high score
    if (currentGameState !== GAME_STATE.PLAYING) {
        currentGameState = GAME_STATE.START;
        resetGame(); // Apply new physics settings immediately and clear previous state
    }

    event.target.blur(); // Remove focus from the button after click
}
// --- END UI FUNCTIONS ---