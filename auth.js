"use strict";

const login = document.getElementById("google-login");
const statusText = document.getElementById("auth-status");
const logout = document.getElementById("logout-btn");
const game = document.getElementById("game");
const authErrors = {
    setup: "Google sign-in is not configured. See the setup instructions.",
    expired: "Your sign-in request expired. Select Sign in with Google to try again.",
    denied: "Google sign-in was canceled or denied.",
    profile: "Google did not provide a verified email for this account.",
    failed: "Google sign-in could not be completed. Try again or check the server configuration."
};

function loadScript(name) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = name + "?auth=1";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadSession() {
    if (location.protocol === "file:") {
        statusText.textContent = "Start the game server and open http://localhost:3000 to sign in.";
        return;
    }

    // Replace an older offline worker before it can cache signed-in requests again.
    if ("serviceWorker" in navigator) {
        try {
            const previous = await navigator.serviceWorker.getRegistration();
            if (previous) await previous.update();
        } catch {
            // The live session endpoint still controls access.
        }
    }

    try {
        const response = await fetch("/auth/session?check=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Session check failed");
        const { configured, user } = await response.json();

        const competition = document.getElementById("competition");
        if (!user) {
            login.hidden = !configured;
            const error = new URLSearchParams(location.search).get("auth");
            statusText.textContent = Object.hasOwn(authErrors, error) ? authErrors[error] :
                configured ? "" : authErrors.setup;
            if (error) history.replaceState(null, "", location.pathname);
            return;
        }

        document.getElementById("account-name").textContent = user.name;
        document.getElementById("account-email").textContent = user.email;
        document.body.classList.remove("eclipse-signin");
        document.getElementById("login-panel").hidden = true;
        document.getElementById("account-panel").hidden = false;
        statusText.textContent = "Loading the game…";
        game.hidden = false;

        for (const file of ["fx.js", "viz.js", "script.js", "competition.js"]) await loadScript(file);
        competition.hidden = false;
        competition.dataset.signedIn = "true";
        document.getElementById("competition-members").hidden = false;
        statusText.textContent = "";
    } catch {
        game.hidden = true;
        statusText.textContent = "Could not load the game or check your sign-in. Make sure the game server is running, then refresh.";
    }
}

login.addEventListener("click", () => {
    statusText.textContent = "Connecting to Google…";
});
window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
});

const exitRunDialog = document.getElementById("exit-run-dialog");
let confirmExit;
let competitionRun = null;
let signingOut = false;

function activeRunWarning() {
    if (competitionRun === "daily") return "Your Daily Challenge attempt is already used. You can try again at 00:00 UTC.";
    if (competitionRun === "duel") return "Leaving ends the duel for both players.";
    if (competitionRun || (typeof isGameActive !== "undefined" && isGameActive)) {
        return "Your progress in this run will be lost.";
    }
    return "";
}

function confirmRunExit(action, warning = activeRunWarning()) {
    if (exitRunDialog.open || confirmExit) return;
    if (!warning) return action();
    confirmExit = action;
    exitRunDialog.returnValue = "stay";
    document.getElementById("exit-run-message").textContent = warning;
    exitRunDialog.showModal();
}

exitRunDialog.addEventListener("close", () => {
    const action = confirmExit;
    confirmExit = undefined;
    if (exitRunDialog.returnValue === "leave") action?.();
});

window.addEventListener("beforeunload", (event) => {
    if (signingOut || !activeRunWarning()) return;
    event.preventDefault();
    event.returnValue = "";
});

logout.addEventListener("click", () => confirmRunExit(async () => {
    logout.disabled = true;
    statusText.textContent = "Signing out…";
    try {
        const response = await fetch("/auth/logout", { method: "POST" });
        if (!response.ok) throw new Error("Logout failed");
        signingOut = true;
        location.replace("/");
    } catch {
        logout.disabled = false;
        statusText.textContent = "Could not sign out. Try again.";
    }
}));

loadSession();
