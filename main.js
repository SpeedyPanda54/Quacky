// ==========================================
// QUACKY ARCADE: Game Directory
// ==========================================
const games = [
    {
        title: "Flappy Duck",
        description: "Flapp through the pipes and avoid obstacles in this fun and challenging game!",
        image: "Previews/FlappyDuckPreview.png",
        link: "Games/Flappy Duck/index.html",
        isComingSoon: false
    },
    {
        title: "Snake",
        description: "A brand new secret game is currently hatching...",
        image: "",
        link: "#",
        isComingSoon: true
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