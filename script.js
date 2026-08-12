const gameArea = document.getElementById("game-area");
const message = document.getElementById("message");
const subMessage = document.getElementById("sub-message");
const countdown = document.getElementById("countdown");

const startButton = document.getElementById("start-btn");
const playAgain = document.getElementById("play-again");
const resetButton = document.getElementById("reset-btn");

const roundDisplay = document.getElementById("round");
const comboDisplay = document.getElementById("combo");
const bestDisplay = document.getElementById("best-score");

const currentScore = document.getElementById("current-score");
const averageScore = document.getElementById("average-score");
const fastestScore = document.getElementById("fastest-score");

const progressBar = document.getElementById("progress-bar");

const speedMeter = document.getElementById("speed-meter");
const speedLabel = document.getElementById("speed-label");

const resultPanel = document.getElementById("result-panel");
const finalScore = document.getElementById("final-score");
const finalRating = document.getElementById("final-rating");
const finalDescription = document.getElementById("final-description");
const finalRank = document.getElementById("final-rank");
const finalAverage = document.getElementById("final-average");
const finalFastest = document.getElementById("final-fastest");
const consistency = document.getElementById("consistency");
const roundBars = document.getElementById("round-bars");

const totalRounds = 5;

let state = "idle";
let round = 0;
let combo = 0;
let times = [];
let timer = null;
let startTime = 0;

let bestTime = Number(localStorage.getItem("reactionMasterBest")) || null;

if (bestTime) {
    bestDisplay.textContent = bestTime + " ms";
}

function resetValues() {
    round = 0;
    combo = 0;
    times = [];
    clearTimeout(timer);

    state = "idle";

    gameArea.classList.remove("ready");
    gameArea.classList.remove("too-early");

    roundDisplay.textContent = "0 / 5";
    comboDisplay.textContent = "0x";

    currentScore.textContent = "--";
    averageScore.textContent = "--";
    fastestScore.textContent = "--";

    progressBar.style.width = "0%";

    speedMeter.style.width = "0%";
    speedLabel.textContent = "WAITING";

    countdown.textContent = "";
    message.textContent = "READY?";
    subMessage.textContent = "Test your reflexes";

    startButton.style.display = "inline-block";
    resultPanel.classList.remove("show");
}

function startChallenge() {
    resetValues();

    resultPanel.classList.remove("show");

    startButton.style.display = "none";

    beginRound();
}

function beginRound() {
    clearTimeout(timer);

    round++;

    state = "waiting";

    roundDisplay.textContent = round + " / 5";

    gameArea.classList.remove("ready");
    gameArea.classList.remove("too-early");

    message.textContent = "WAIT...";
    subMessage.textContent = "Do not click yet.";

    countdown.textContent = "";

    const progress = ((round - 1) / totalRounds) * 100;

    progressBar.style.width = progress + "%";

    const delay = Math.floor(Math.random() * 3000) + 2000;

    timer = setTimeout(() => {

        state = "ready";

        gameArea.classList.add("ready");

        message.textContent = "CLICK!";
        subMessage.textContent = "NOW!";

        speedLabel.textContent = "REACT!";

        startTime = performance.now();

    }, delay);
}

function handleClick() {

    if (state === "ready") {
        finishRound();
        return;
    }

    if (state === "waiting") {
        tooEarly();
    }
}

function finishRound() {

    const reaction = Math.round(performance.now() - startTime);

    times.push(reaction);

    currentScore.textContent = reaction + " ms";

    const average = Math.round(
        times.reduce((a, b) => a + b, 0) / times.length
    );

    const fastest = Math.min(...times);

    averageScore.textContent = average + " ms";
    fastestScore.textContent = fastest + " ms";

    combo++;

    comboDisplay.textContent = combo + "x";

    updateSpeed(reaction);

    if (!bestTime || reaction < bestTime) {

        bestTime = reaction;

        localStorage.setItem(
            "reactionMasterBest",
            bestTime
        );

        bestDisplay.textContent = bestTime + " ms";
    }

    gameArea.classList.remove("ready");

    progressBar.style.width =
        (round / totalRounds) * 100 + "%";

    state = "between";

    const reactionMessage = getReactionMessage(reaction);

    message.textContent = reactionMessage.title;

    subMessage.textContent =
        reaction + " ms • " + reactionMessage.description;

    if (round >= totalRounds) {

        setTimeout(showResults, 900);

    } else {

        setTimeout(beginRound, 1000);
    }
}

function tooEarly() {

    clearTimeout(timer);

    state = "too-early";

    combo = 0;

    comboDisplay.textContent = "0x";

    gameArea.classList.add("too-early");

    message.textContent = "TOO EARLY!";

    subMessage.textContent =
        "Wait for the green signal.";

    speedLabel.textContent = "FALSE START";

    setTimeout(() => {

        if (state !== "too-early") {
            return;
        }

        state = "idle";

        gameArea.classList.remove("too-early");

        message.textContent = "READY?";

        subMessage.textContent =
            "Press START to try again.";

        startButton.style.display = "inline-block";

    }, 1200);
}

function updateSpeed(time) {

    let percentage = 0;

    if (time <= 120) {
        percentage = 100;
    } else if (time >= 600) {
        percentage = 5;
    } else {
        percentage =
            100 - ((time - 120) / 480) * 95;
    }

    speedMeter.style.width = percentage + "%";

    if (time < 150) {
        speedLabel.textContent = "GODLIKE";
    } else if (time < 180) {
        speedLabel.textContent = "LIGHTNING";
    } else if (time < 220) {
        speedLabel.textContent = "ELITE";
    } else if (time < 280) {
        speedLabel.textContent = "SHARP";
    } else if (time < 350) {
        speedLabel.textContent = "SOLID";
    } else if (time < 500) {
        speedLabel.textContent = "DECENT";
    } else {
        speedLabel.textContent = "SLOW";
    }
}

function getReactionMessage(time) {

    if (time < 150) {
        return {
            title: "GODLIKE!",
            description: "Your reflexes are ridiculous."
        };
    }

    if (time < 180) {
        return {
            title: "LIGHTNING!",
            description: "That was insanely fast."
        };
    }

    if (time < 220) {
        return {
            title: "ELITE!",
            description: "Competitive-level reflexes."
        };
    }

    if (time < 280) {
        return {
            title: "SHARP!",
            description: "Excellent reaction speed."
        };
    }

    if (time < 350) {
        return {
            title: "SOLID!",
            description: "Nice reflexes."
        };
    }

    if (time < 500) {
        return {
            title: "DECENT!",
            description: "You can push that speed higher."
        };
    }

    return {
        title: "TOO SLOW!",
        description: "Time to train those reflexes."
    };
}

function getRank(average) {

    if (average < 180) return "S";
    if (average < 220) return "A";
    if (average < 280) return "B";
    if (average < 350) return "C";
    if (average < 500) return "D";

    return "F";
}

function getFinalMessage(average) {

    if (average < 180) {
        return {
            title: "REACTION GOD",
            description: "Your reflexes are seriously elite.",
            icon: "⚡"
        };
    }

    if (average < 220) {
        return {
            title: "REFLEX MONSTER",
            description: "That is competitive-level speed.",
            icon: "🔥"
        };
    }

    if (average < 280) {
        return {
            title: "ELITE REFLEXES",
            description: "You are seriously quick.",
            icon: "🚀"
        };
    }

    if (average < 350) {
        return {
            title: "SHARP REFLEXES",
            description: "A very solid performance.",
            icon: "💎"
        };
    }

    if (average < 500) {
        return {
            title: "GOOD START",
            description: "Keep practicing and push your score down.",
            icon: "🎯"
        };
    }

    return {
        title: "REFLEX TRAINING NEEDED",
        description: "Run another challenge and beat this score.",
        icon: "🐢"
    };
}

function calculateConsistency() {

    if (times.length < 2) {
        return 100;
    }

    const avg =
        times.reduce((a, b) => a + b, 0) / times.length;

    const variance =
        times.reduce(
            (sum, time) => sum + Math.pow(time - avg, 2),
            0
        ) / times.length;

    const deviation = Math.sqrt(variance);

    const score =
        Math.max(0, Math.round(100 - deviation / 3));

    return Math.min(100, score);
}

function showResults() {

    state = "finished";

    const average = Math.round(
        times.reduce((a, b) => a + b, 0) / times.length
    );

    const fastest = Math.min(...times);

    const rank = getRank(average);

    const result = getFinalMessage(average);

    const consistencyScore = calculateConsistency();

    finalScore.textContent = average + " ms";

    finalRating.textContent = result.title;

    finalDescription.textContent = result.description;

    finalRank.textContent = rank;

    finalAverage.textContent = average + " ms";

    finalFastest.textContent = fastest + " ms";

    consistency.textContent =
        consistencyScore + "%";

    document.getElementById("result-icon").textContent =
        result.icon;

    roundBars.innerHTML = "";

    const maxTime = Math.max(...times);

    times.forEach((time, index) => {

        const bar = document.createElement("div");

        bar.className = "round-bar";

        const height =
            Math.max(15, (time / maxTime) * 90);

        bar.style.height = height + "px";

        bar.style.animationDelay =
            index * 0.1 + "s";

        const label = document.createElement("span");

        label.textContent =
            "R" + (index + 1);

        bar.appendChild(label);

        roundBars.appendChild(bar);
    });

    resultPanel.classList.add("show");

    resultPanel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function resetGame() {
    resetValues();
}

gameArea.addEventListener("click", handleClick);

startButton.addEventListener("click", function(event) {
    event.stopPropagation();
    startChallenge();
});

playAgain.addEventListener("click", function(event) {
    event.stopPropagation();
    startChallenge();
});

resetButton.addEventListener("click", function(event) {
    event.stopPropagation();
    resetGame();
});

document.addEventListener("keydown", function(event) {

    if (event.code !== "Space") {
        return;
    }

    event.preventDefault();

    if (state === "idle") {
        startChallenge();
        return;
    }

    if (state === "ready") {
        finishRound();
    }

});

resetValues();