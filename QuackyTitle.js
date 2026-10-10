
function injectQuackyHeader() {
    // Create header container
    const headerContainer = document.createElement("div");
    headerContainer.style.textAlign = "center";
    headerContainer.style.padding = "20px";
    headerContainer.style.background = "#111827";
    headerContainer.style.borderBottom = "4px solid #374151";
    headerContainer.style.marginBottom = "20px";
    headerContainer.style.width = "100%";
    headerContainer.style.boxSizing = "border-box";

    // Create clickable Quacky Title Button that redirects home
    const homeBtn = document.createElement("button");
    homeBtn.innerText = "🚀 GOOSEGAMES";
    homeBtn.style.fontSize = "2.5em";
    homeBtn.style.fontWeight = "bold";
    homeBtn.style.color = "#ffffff";
    homeBtn.style.background = "transparent";
    homeBtn.style.border = "none";
    homeBtn.style.cursor = "pointer";
    homeBtn.style.textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
    homeBtn.style.transition = "color 0.2s ease";

    homeBtn.onmouseover = () => { homeBtn.style.color = "#38bdf8"; };
    homeBtn.onmouseout = () => { homeBtn.style.color = "#ffffff"; };

    // Redirect handler (cleans up Firebase data if needed, then goes to index.html)
    homeBtn.addEventListener("click", () => {
        if (typeof playersRef !== 'undefined' && typeof myPlayerId !== 'undefined' && playersRef && myPlayerId) {
            playersRef.child(myPlayerId).remove();
        }
        window.location.href = "/Goosegames/index.html";
    });

    headerContainer.appendChild(homeBtn);

    // Insert at the very top of the body
    document.body.insertBefore(headerContainer, document.body.firstChild);
}

// Automatically inject on page load
window.addEventListener("DOMContentLoaded", injectQuackyHeader);