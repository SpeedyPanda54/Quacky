// ==========================================
// QUACKY ARCADE: Game Directory
// ==========================================
const games = [
    {
        title: "Flappy Duck",
        description: "Flap through the pipes and avoid obstacles in this fun and challenging game!",
        image: "Previews/FlappyDuckPreview.png",
        link: "Games/Flappy Duck/index.html",
        isComingSoon: false
    },
    {
        title: "Snake",
        description: "Run along the screen as long as you can without bumping into your growing body!",
        image: "Previews/SnakePreview.png",
        link: "Games/Snake/index.html",
        isComingSoon: false
    },
    {
        title: "Out of Place in Outer Space",
        description: "Explore the spaceship while trying to avoid the Saboteur while voting them out!",
        image: "Previews/OutOfPlaceInSpacePreview.png",
        link: "Games/Out of Place in Space/index.html",
        isComingSoon: false
    },
    {
        title: "Whack-a-Duck",
        description: "Whack the ducks as they pop up from their holes in this fast-paced game!",
        image: "Previews/WhackADuckPreview.png",
        link: "Games/Whack-a-Duck/index.html",
        isComingSoon: false
    },
    {
        title: "Tic-Tac-Duck",
        description: "Play Tic-Tac-Toe with an online twist! Can you outsmart your opponent?",
        image: "Previews/TicTacDuckPreview.png",
        link: "Games/Tic-Tac-Duck/index.html",
        isComingSoon: false
    },
    {
        title: "Pong",
        description: "Classic Pong game with a Quacky twist! Bounce the ball and score points!",
        image: "Previews/PongPreview.png",
        link: "Games/Pong/index.html",
        isComingSoon: false
    },
    {
        title: "Karmeleon",
        description: "Save the world from the evil Syndicate by extracting the mysterious and unstable Karma Core from their secret facility! But be careful, the Syndicate has locked down the facility and is hunting you down!",
        image: "Previews/KarmeleonPreview.png",
        link: "Games/Karmeleon/index.html",
        isComingSoon: false
    },
    {
        title: "Apex Velocity",
        description: "Drive through the chaotic streets of 3026 in your CyberCar!",
        image: "Previews/ApexVelocityPreview.png",
        link: "Games/Apex Velocity/index.html",
        isComingSoon: false
    }
    
];

function renderGames() {
    const gridContainer = document.getElementById("gameGrid");
    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    games.forEach(game => {
        if (game.isComingSoon) {
            gridContainer.innerHTML += `
                <div class="col-10 col-sm-8 col-md-6 col-lg-4">
                    <div class="card h-100 border-0 shadow-sm rounded-4 comingSoon opacity-75">
                        <div class="gameImageWrapper rounded-top-4 d-flex align-items-center justify-content-center">
                            <span class="placeholderText">🥚 Hatching Soon</span>
                        </div>
                        <div class="card-body p-4 d-flex flex-column">
                            <h2 class="card-title h4 fw-bold text-dark">${game.title}</h2>
                            <p class="card-text text-muted">${game.description}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            gridContainer.innerHTML += `
                <div class="col-10 col-sm-8 col-md-6 col-lg-4">
                    <a href="${game.link}" class="card h-100 border-4 border-white shadow-sm rounded-4 text-decoration-none gameCardHover">
                        <div class="gameImageWrapper rounded-top-4 overflow-hidden">
                            <img src="${game.image}" class="w-100 h-100 object-fit-contain" alt="${game.title} Preview">
                        </div>
                        <div class="card-body p-4 d-flex flex-column">
                            <h2 class="card-title h4 fw-bold text-dark">${game.title}</h2>
                            <p class="card-text text-muted">${game.description}</p>
                        </div>
                    </a>
                </div>
            `;
        }
    });
}

document.addEventListener("DOMContentLoaded", renderGames);