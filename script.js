/* =========================================================
   REACTION MASTER V11
   PREMIUM GAME ENGINE
   ========================================================= */

"use strict";

/* =========================================================
   DOM
   ========================================================= */

const gameArea = document.getElementById("game-area");

const startButton = document.getElementById("start-btn");
const playAgain = document.getElementById("play-again");
const resetButton = document.getElementById("reset-btn");

const message = document.getElementById("message");
const subMessage = document.getElementById("sub-message");
const streakMessage = document.getElementById("streak-message");

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
const resultIcon = document.getElementById("result-icon");

const finalScore = document.getElementById("final-score");
const finalRating = document.getElementById("final-rating");
const finalDescription = document.getElementById("final-description");

const finalRank = document.getElementById("final-rank");
const finalAverage = document.getElementById("final-average");
const finalFastest = document.getElementById("final-fastest");
const consistency = document.getElementById("consistency");

const roundBars = document.getElementById("round-bars");

const soundButton = document.getElementById("sound-btn");

const modeButtons = document.querySelectorAll(".mode-btn");
const modeDescription = document.getElementById("mode-description");

const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

/* =========================================================
   MODES
   ========================================================= */

const MODE_CONFIG = {

    classic: {
        label: "CLASSIC",
        rounds: 5,
        minDelay: 1200,
        maxDelay: 4700,
        description:
            "5 balanced rounds. The ultimate reflex test."
    },

    precision: {
        label: "PRECISION",
        rounds: 7,
        minDelay: 1600,
        maxDelay: 5000,
        description:
            "7 rounds where consistency matters."
    },

    speed: {
        label: "SPEED RUN",
        rounds: 10,
        minDelay: 650,
        maxDelay: 2500,
        description:
            "10 rapid-fire rounds. No time to hesitate."
    }

};

/* =========================================================
   DIFFICULTY
   ========================================================= */

const DIFFICULTIES = {

    easy: {
        label: "EASY",
        multiplier: 0.80,
        minDelay: 2200,
        maxDelay: 4000
    },

    normal: {
        label: "NORMAL",
        multiplier: 1,
        minDelay: 1500,
        maxDelay: 3000
    },

    hard: {
        label: "HARD",
        multiplier: 1.25,
        minDelay: 800,
        maxDelay: 1800
    },

    insane: {
        label: "INSANE",
        multiplier: 1.65,
        minDelay: 300,
        maxDelay: 1000
    }

};

/* =========================================================
   GAME STATE
   ========================================================= */

let selectedMode = "classic";

let state = "idle";

let round = 0;
let combo = 0;
let maxCombo = 0;

let times = [];
let scores = [];

let totalXP = 0;
let sessionScore = 0;

let timer = null;
let nextRoundTimer = null;
let startTime = 0;
let signalTime = 0;

let soundEnabled = true;
let audioContext = null;

let inputLocked = false;
let gameStartTimestamp = 0;

let lastDelay = null;

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE = {

    best: "reactionMasterBest",
    history: "reactionMasterHistory",
    xp: "reactionMasterXP",
    level: "reactionMasterLevel",
    daily: "reactionMasterDaily",
    difficulty: "reactionMasterDifficulty",
    achievements: "reactionMasterAchievements"

};

let bestTime =
    Number(localStorage.getItem(STORAGE.best)) || null;

let history = [];

try {

    history = JSON.parse(
        localStorage.getItem(STORAGE.history) || "[]"
    );

    if (!Array.isArray(history)) {
        history = [];
    }

} catch {

    history = [];

}

totalXP =
    Number(localStorage.getItem(STORAGE.xp)) || 0;

let playerLevel =
    Number(localStorage.getItem(STORAGE.level)) || 1;

if (bestTime !== null && bestDisplay) {
    bestDisplay.textContent = bestTime + " ms";
}

/* =========================================================
HELPERS
========================================================= */

function getTotalRounds() {

    return MODE_CONFIG[selectedMode].rounds;

}

function getDifficultyName() {

    return (
        window.reactionDifficulty?.name ||
        localStorage.getItem(STORAGE.difficulty) ||
        "normal"
    );

}

function getDifficulty() {

    return (
        DIFFICULTIES[getDifficultyName()] ||
        DIFFICULTIES.normal
    );

}

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}

function randomBetween(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}

function setText(element, value) {

    if (element) {
        element.textContent = value;
    }

}

function setOptionalText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}

/* =========================================================
   PREMIUM UI HELPERS
   ========================================================= */

function addTemporaryClass(element, className, duration = 500) {

    if (!element) return;

    element.classList.remove(className);

    void element.offsetWidth;

    element.classList.add(className);

    setTimeout(() => {
        element.classList.remove(className);
    }, duration);

}

function flashScreen(className) {

    if (!gameArea) return;

    gameArea.classList.remove(
        "v10-flash",
        "v10-perfect",
        "v10-miss",
        "v11-success",
        "v11-warning"
    );

    void gameArea.offsetWidth;

    if (className) {
        gameArea.classList.add(className);
    }

    setTimeout(() => {

        gameArea.classList.remove(className);

    }, 550);

}

function pulseElement(element) {

    addTemporaryClass(
        element,
        "v10-pulse",
        450
    );

}

function animateNumber(element, target, suffix = "") {

    if (!element) return;

    const numericTarget = Number(target);

    if (!Number.isFinite(numericTarget)) {

        element.textContent = target + suffix;
        return;

    }

    const duration = 450;
    const start = performance.now();

    function update(now) {

        const progress =
            clamp(
                (now - start) / duration,
                0,
                1
            );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const value =
            Math.round(
                numericTarget * eased
            );

        element.textContent =
            value + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }

    }

    requestAnimationFrame(update);

}

/* =========================================================
   SOUND ENGINE
   ========================================================= */

function ensureAudio() {

    if (!soundEnabled) return null;

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }

        if (
            audioContext.state === "suspended"
        ) {

            audioContext.resume();

        }

        return audioContext;

    } catch {

        return null;

    }

}

function playTone(
    frequency,
    duration,
    type = "sine",
    volume = 0.04
) {

    const context = ensureAudio();

    if (!context) return;

    try {

        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        oscillator.type = type;

        oscillator.frequency.setValueAtTime(
            frequency,
            context.currentTime
        );

        gain.gain.setValueAtTime(
            volume,
            context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime +
            duration / 1000
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();

        oscillator.stop(
            context.currentTime +
            duration / 1000
        );

    } catch {}

}

function playSuccessSound(reaction) {

    if (reaction < 150) {

        playTone(
            1100,
            90,
            "triangle",
            0.05
        );

        setTimeout(() => {

            playTone(
                1450,
                130,
                "triangle",
                0.045
            );

        }, 80);

        return;

    }

    if (reaction < 220) {

        playTone(
            900,
            100,
            "sine",
            0.045
        );

        return;

    }

    playTone(
        650,
        80,
        "sine",
        0.035
    );

}

/* =========================================================
   XP / LEVEL SYSTEM
   ========================================================= */

function xpRequiredForLevel(level) {

    return Math.round(
        500 *
        Math.pow(1.22, level - 1)
    );

}

function getCurrentLevelXP() {

    let xp = totalXP;
    let level = 1;

    while (
        xp >= xpRequiredForLevel(level)
    ) {

        xp -= xpRequiredForLevel(level);
        level++;

    }

    playerLevel = level;

    localStorage.setItem(
        STORAGE.level,
        String(playerLevel)
    );

    return xp;

}

function awardXP(amount) {

    amount = Math.max(
        0,
        Math.round(amount)
    );

    const oldLevel = playerLevel;

    totalXP += amount;

    localStorage.setItem(
        STORAGE.xp,
        String(totalXP)
    );

    getCurrentLevelXP();

    setOptionalText(
        "v10-total-xp",
        totalXP.toLocaleString() + " XP"
    );

    setOptionalText(
        "v10-level",
        "LEVEL " + playerLevel
    );

    if (playerLevel > oldLevel) {

        showLevelUp(playerLevel);

        playTone(
            1200,
            180,
            "triangle",
            0.06
        );

    }

    return amount;

}

function showLevelUp(level) {

    document
        .querySelectorAll(".v10-level-toast")
        .forEach(element => element.remove());

    const toast =
        document.createElement("div");

    toast.className =
        "v10-level-toast";

    toast.innerHTML =
        "<span>✦</span>" +
        "<div>" +
        "<small>LEVEL UP</small>" +
        "<strong>LEVEL " +
        level +
        "</strong>" +
        "</div>";

    document.body.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2300);

    setTimeout(() => {

        toast.remove();

    }, 2800);

}

/* =========================================================
   SCORE ENGINE
   ========================================================= */

function getReactionTier(reaction) {

    if (reaction < 120) {

        return {
            name: "TRANSCENDENT",
            multiplier: 3.0,
            colorClass: "tier-transcendent"
        };

    }

    if (reaction < 150) {

        return {
            name: "GODLIKE",
            multiplier: 2.6,
            colorClass: "tier-godlike"
        };

    }

    if (reaction < 180) {

        return {
            name: "LIGHTNING",
            multiplier: 2.3,
            colorClass: "tier-lightning"
        };

    }

    if (reaction < 220) {

        return {
            name: "ELITE",
            multiplier: 2.0,
            colorClass: "tier-elite"
        };

    }

    if (reaction < 280) {

        return {
            name: "SHARP",
            multiplier: 1.7,
            colorClass: "tier-sharp"
        };

    }

    if (reaction < 350) {

        return {
            name: "SOLID",
            multiplier: 1.4,
            colorClass: "tier-solid"
        };

    }

    if (reaction < 500) {

        return {
            name: "DECENT",
            multiplier: 1.0,
            colorClass: "tier-decent"
        };

    }

    return {
        name: "SLOW",
        multiplier: 0.6,
        colorClass: "tier-slow"
    };

}

function getComboMultiplier() {

    if (combo >= 10) return 2.5;
    if (combo >= 7) return 2.0;
    if (combo >= 5) return 1.7;
    if (combo >= 3) return 1.4;
    if (combo >= 2) return 1.2;

    return 1;

}

function calculateRoundScore(reaction) {

    const tier =
        getReactionTier(reaction);

    const difficulty =
        getDifficulty();

    const base =
        clamp(
            1000 -
            reaction * 1.55,
            50,
            1000
        );

    const roundBonus =
        Math.round(
            (
                round /
                getTotalRounds()
            ) * 250
        );

    const comboBonus =
        Math.round(
            base *
            (
                getComboMultiplier() - 1
            )
        );

    const difficultyBonus =
        Math.round(
            base *
            (
                difficulty.multiplier - 0.8
            )
        );

    const score =
        Math.max(
            1,
            Math.round(
                base * tier.multiplier +
                roundBonus +
                comboBonus +
                difficultyBonus
            )
        );

    return {
        score,
        tier,
        comboMultiplier:
            getComboMultiplier()
    };

}

/* =========================================================
   RESET
   ========================================================= */

function resetValues() {

    clearTimeout(timer);
    clearTimeout(nextRoundTimer);

    state = "idle";

    round = 0;
    combo = 0;
    maxCombo = 0;

    times = [];
    scores = [];

    sessionScore = 0;

    inputLocked = false;

    startTime = 0;
    signalTime = 0;

    lastDelay = null;

    if (gameArea) {

        gameArea.classList.remove(
            "ready",
            "too-early",
            "v10-flash",
            "v10-perfect",
            "v10-miss",
            "v11-success",
            "v11-warning"
        );

    }

    setText(
        roundDisplay,
        "0 / " + getTotalRounds()
    );

    setText(
        comboDisplay,
        "0x"
    );

    setText(
        currentScore,
        "--"
    );

    setText(
        averageScore,
        "--"
    );

    setText(
        fastestScore,
        "--"
    );

    if (progressBar) {

        progressBar.style.width = "0%";

    }

    if (speedMeter) {

        speedMeter.style.width = "0%";

    }

    setText(
        speedLabel,
        "WAITING"
    );

    setText(
        message,
        "READY?"
    );

    setText(
        subMessage,
        "Test your reflexes"
    );

    setText(
        streakMessage,
        ""
    );

    if (startButton) {

        startButton.style.display =
            "inline-flex";

    }

    if (resultPanel) {

        resultPanel.classList.remove("show");

    }

}

/* =========================================================
   START
   ========================================================= */

function startChallenge() {

    if (
        state !== "idle" &&
        state !== "finished"
    ) {

        return;

    }

    resetValues();

    state = "starting";

    gameStartTimestamp =
        performance.now();

    if (startButton) {

        startButton.style.display =
            "none";

    }

    if (resultPanel) {

        resultPanel.classList.remove("show");

    }

    playTone(
        520,
        70,
        "sine"
    );

    setText(
        message,
        "GET READY"
    );

    setText(
        subMessage,
        "Focus..."
    );

    setText(
        streakMessage,
        ""
    );

    addTemporaryClass(
        gameArea,
        "v11-starting",
        600
    );

    setTimeout(
        beginRound,
        550
    );

}

/* =========================================================
   BEGIN ROUND
   ========================================================= */

function beginRound() {

    if (
        state === "finished" ||
        state === "too-early"
    ) {

        return;

    }

    clearTimeout(timer);

    inputLocked = false;

    round++;

    state = "waiting";

    setText(
        roundDisplay,
        round +
        " / " +
        getTotalRounds()
    );

    if (gameArea) {

        gameArea.classList.remove(
            "ready",
            "too-early"
        );

    }

    setText(
        message,
        "WAIT..."
    );

    setText(
        subMessage,
        "Don't click yet."
    );

    if (combo >= 3) {

        setText(
            streakMessage,
            combo +
            "x COMBO"
        );

    } else {

        setText(
            streakMessage,
            "Stay focused."
        );

    }

    const config =
        MODE_CONFIG[selectedMode];

    const difficulty =
        getDifficulty();

    const progress =
        (round - 1) /
        config.rounds;

    let minDelay =
        difficulty.minDelay;

    let maxDelay =
        difficulty.maxDelay;

    minDelay =
        Math.round(
            minDelay *
            (
                1 -
                progress * 0.18
            )
        );

    maxDelay =
        Math.round(
            maxDelay *
            (
                1 -
                progress * 0.12
            )
        );

    if (selectedMode === "classic") {

        minDelay =
            Math.max(
                minDelay,
                config.minDelay * 0.65
            );

        maxDelay =
            Math.min(
                maxDelay,
                config.maxDelay
            );

    }

    if (selectedMode === "precision") {

        minDelay =
            Math.max(
                minDelay,
                1300
            );

        maxDelay =
            Math.max(
                minDelay + 400,
                maxDelay
            );

    }

    if (selectedMode === "speed") {

        minDelay =
            Math.min(
                minDelay,
                850
            );

        maxDelay =
            Math.min(
                maxDelay,
                2600
            );

    }

    /*
       Prevent overly similar timings.
    */

    let delay;

    let attempts = 0;

    do {

        delay =
            randomBetween(
                Math.round(minDelay),
                Math.round(maxDelay)
            );

        attempts++;

    } while (
        lastDelay !== null &&
        Math.abs(delay - lastDelay) < 180 &&
        attempts < 10
    );

    lastDelay = delay;

    /*
       Small unpredictable variation.
    */

    delay +=
        randomBetween(-65, 65);

    delay =
        Math.max(
            250,
            delay
        );

    timer =
        setTimeout(
            signalReady,
            delay
        );

}

/* =========================================================
   SIGNAL READY
   ========================================================= */

function signalReady() {

    if (state !== "waiting") {

        return;

    }

    state = "ready";

    inputLocked = false;

    signalTime =
        performance.now();

    startTime =
        signalTime;

    if (gameArea) {

        gameArea.classList.add("ready");

    }

    setText(
        message,
        "CLICK!"
    );

    setText(
        subMessage,
        "NOW!"
    );

    if (combo >= 3) {

        setText(
            streakMessage,
            combo +
            "x COMBO — FIRE!"
        );

    } else {

        setText(
            streakMessage,
            "React instantly."
        );

    }

    setText(
        speedLabel,
        "REACT!"
    );

    playTone(
        880,
        100,
        "square",
        0.05
    );

}

/* =========================================================
   CLICK HANDLER
   ========================================================= */

function handleGameClick() {

    if (inputLocked) return;

    if (state === "ready") {

        inputLocked = true;

        finishRound();

        return;

    }

    if (state === "waiting") {

        inputLocked = true;

        tooEarly();

        return;

    }

}

/* =========================================================
   FINISH ROUND
   ========================================================= */

function finishRound() {

    if (state !== "ready") return;

    const reaction =
        Math.round(
            performance.now() -
            startTime
        );

    const safeReaction =
        clamp(
            reaction,
            1,
            9999
        );

    times.push(
        safeReaction
    );

    combo++;

    maxCombo =
        Math.max(
            maxCombo,
            combo
        );

    const roundResult =
        calculateRoundScore(
            safeReaction
        );

    scores.push(
        roundResult.score
    );

    sessionScore +=
        roundResult.score;

    const earnedXP =
        awardXP(
            Math.round(
                roundResult.score / 8
            )
        );

    animateNumber(
        currentScore,
        safeReaction,
        " ms"
    );

    const average =
        Math.round(
            times.reduce(
                (total, value) =>
                    total + value,
                0
            ) /
            times.length
        );

    const fastest =
        Math.min(...times);

    setText(
        averageScore,
        average + " ms"
    );

    setText(
        fastestScore,
        fastest + " ms"
    );

    setText(
        comboDisplay,
        combo + "x"
    );

    updateSpeed(
        safeReaction
    );

    const tier =
        roundResult.tier;

    let newPersonalBest = false;

    if (
        bestTime === null ||
        safeReaction < bestTime
    ) {

        bestTime =
            safeReaction;

        newPersonalBest = true;

        localStorage.setItem(
            STORAGE.best,
            String(bestTime)
        );

        setText(
            bestDisplay,
            bestTime + " ms"
        );

    }

    if (gameArea) {

        gameArea.classList.remove(
            "ready"
        );

    }

    if (safeReaction < 180) {

        flashScreen("v10-perfect");

    } else {

        flashScreen("v11-success");

    }

    pulseElement(
        comboDisplay
    );

    setText(
        message,
        tier.name + "!"
    );

    setText(
        subMessage,
        safeReaction +
        " ms  •  +" +
        roundResult.score +
        " SCORE"
    );

    if (newPersonalBest) {

        setText(
            streakMessage,
            "🏆 NEW PERSONAL BEST"
        );

        playTone(
            1080,
            150,
            "triangle",
            0.06
        );

    } else if (combo >= 5) {

        setText(
            streakMessage,
            combo +
            "x COMBO  •  +" +
            earnedXP +
            " XP"
        );

        playSuccessSound(
            safeReaction
        );

    } else {

        setText(
            streakMessage,
            "Nice reaction  •  +" +
            earnedXP +
            " XP"
        );

        playSuccessSound(
            safeReaction
        );

    }

    if (progressBar) {

        progressBar.style.width =
            (
                (
                    round /
                    getTotalRounds()
                ) *
                100
            ) +
            "%";

    }

    state = "between";

    if (
        round >=
        getTotalRounds()
    ) {

        nextRoundTimer =
            setTimeout(
                showResults,
                950
            );

    } else {

        nextRoundTimer =
            setTimeout(
                beginRound,
                850
            );

    }

}

/* =========================================================
   TOO EARLY
   ========================================================= */

function tooEarly() {

    clearTimeout(timer);

    state = "too-early";

    combo = 0;

    setText(
        comboDisplay,
        "0x"
    );

    if (gameArea) {

        gameArea.classList.add(
            "too-early"
        );

    }

    setText(
        message,
        "TOO EARLY!"
    );

    setText(
        subMessage,
        "False start detected."
    );

    setText(
        streakMessage,
        "Combo reset • stay patient."
    );

    setText(
        speedLabel,
        "FALSE START"
    );

    flashScreen(
        "v10-miss"
    );

    playTone(
        180,
        180,
        "sawtooth",
        0.05
    );

    sessionScore =
        Math.max(
            0,
            sessionScore - 150
        );

    setTimeout(
        () => {

            if (
                state !== "too-early"
            ) {

                return;

            }

            state = "idle";

            inputLocked = false;

            if (gameArea) {

                gameArea.classList.remove(
                    "too-early"
                );

            }

            setText(
                message,
                "READY?"
            );

            setText(
                subMessage,
                "Press START to try again."
            );

            setText(
                streakMessage,
                ""
            );

            setText(
                speedLabel,
                "WAITING"
            );

            if (startButton) {

                startButton.style.display =
                    "inline-flex";

            }

        },
        1200
    );

}

/* =========================================================
   SPEED METER
   ========================================================= */

function updateSpeed(time) {

    let percentage;

    if (time <= 120) {

        percentage = 100;

    } else if (time >= 600) {

        percentage = 5;

    } else {

        percentage =
            100 -
            (
                (
                    time - 120
                ) /
                480
            ) *
            95;

    }

    if (speedMeter) {

        speedMeter.style.width =
            clamp(
                percentage,
                5,
                100
            ) +
            "%";

    }

    if (!speedLabel) return;

    if (time < 120) {

        speedLabel.textContent =
            "TRANSCENDENT";

    } else if (time < 150) {

        speedLabel.textContent =
            "GODLIKE";

    } else if (time < 180) {

        speedLabel.textContent =
            "LIGHTNING";

    } else if (time < 220) {

        speedLabel.textContent =
            "ELITE";

    } else if (time < 280) {

        speedLabel.textContent =
            "SHARP";

    } else if (time < 350) {

        speedLabel.textContent =
            "SOLID";

    } else if (time < 500) {

        speedLabel.textContent =
            "DECENT";

    } else {

        speedLabel.textContent =
            "SLOW";

    }

}

/* =========================================================
   RANK
   ========================================================= */

function getRank(average) {

    if (average < 180) return "S";
    if (average < 220) return "A";
    if (average < 280) return "B";
    if (average < 350) return "C";
    if (average < 500) return "D";

    return "F";

}

/* =========================================================
   FINAL MESSAGE
   ========================================================= */

function getFinalMessage(average) {

    if (average < 150) {

        return {
            title: "REACTION GOD",
            description:
                "Absolutely elite reflexes. That performance is exceptional.",
            icon: "⚡"
        };

    }

    if (average < 180) {

        return {
            title: "REFLEX MONSTER",
            description:
                "Your reaction speed is seriously competitive.",
            icon: "🔥"
        };

    }

    if (average < 220) {

        return {
            title: "ELITE REFLEXES",
            description:
                "Excellent reactions with strong competitive potential.",
            icon: "🚀"
        };

    }

    if (average < 280) {

        return {
            title: "SHARP REFLEXES",
            description:
                "A very strong performance. Keep pushing.",
            icon: "💎"
        };

    }

    if (average < 350) {

        return {
            title: "SOLID PERFORMANCE",
            description:
                "Good reflexes. Consistency will take you higher.",
            icon: "🎯"
        };

    }

    if (average < 500) {

        return {
            title: "GOOD START",
            description:
                "You have a solid base. Keep training your reactions.",
            icon: "⚙️"
        };

    }

    return {
        title: "REFLEX TRAINING NEEDED",
        description:
            "Keep practicing and try to beat your previous run.",
        icon: "🐢"
    };

}

/* =========================================================
   CONSISTENCY
   ========================================================= */

function calculateConsistency() {

    if (times.length < 2) {
        return 100;
    }

    const average =
        times.reduce(
            (total, value) =>
                total + value,
            0
        ) /
        times.length;

    const variance =
        times.reduce(
            (total, value) =>
                total +
                Math.pow(
                    value - average,
                    2
                ),
            0
        ) /
        times.length;

    const deviation =
        Math.sqrt(variance);

    return clamp(
        Math.round(
            100 -
            deviation / 3
        ),
        0,
        100
    );

}

/* =========================================================
   PERFORMANCE SCORE
   ========================================================= */

function calculatePerformanceScore(
    average,
    consistencyScore,
    rank
) {

    const rankBonus = {

        S: 100,
        A: 90,
        B: 78,
        C: 65,
        D: 50,
        F: 30

    };

    const speedScore =
        clamp(
            100 -
            (
                (
                    average - 120
                ) /
                4.5
            ),
            0,
            100
        );

    return clamp(
        Math.round(
            speedScore * 0.65 +
            consistencyScore * 0.25 +
            rankBonus[rank] * 0.10
        ),
        0,
        100
    );

}

/* =========================================================
   ROUND GRAPH
   ========================================================= */

function buildRoundBars() {

    if (!roundBars || !times.length) {
        return;
    }

    roundBars.innerHTML = "";

    const maxTime =
        Math.max(...times);

    times.forEach(
        (time, index) => {

            const bar =
                document.createElement("div");

            bar.className =
                "round-bar";

            const height =
                Math.max(
                    15,
                    (
                        time /
                        maxTime
                    ) * 90
                );

            bar.style.height =
                height + "px";

            bar.style.animationDelay =
                (
                    index * 0.08
                ) + "s";

            const label =
                document.createElement("span");

            label.textContent =
                "R" +
                (index + 1);

            const value =
                document.createElement("small");

            value.textContent =
                time + "ms";

            bar.appendChild(label);
            bar.appendChild(value);

            roundBars.appendChild(bar);

        }
    );

}

/* =========================================================
   DAILY STATISTICS
   ========================================================= */

function getTodayKey() {

    const date = new Date();

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            date.getDate()
        ).padStart(2, "0")
    );

}

function updateDailyStats(
    average,
    score
) {

    let daily = null;

    try {

        daily =
            JSON.parse(
                localStorage.getItem(
                    STORAGE.daily
                ) || "null"
            );

    } catch {

        daily = null;

    }

    const today =
        getTodayKey();

    if (
        !daily ||
        daily.date !== today
    ) {

        daily = {

            date: today,
            runs: 0,
            best: null,
            score: 0

        };

    }

    daily.runs++;
    daily.score += score;

    if (
        daily.best === null ||
        average < daily.best
    ) {

        daily.best = average;

    }

    localStorage.setItem(
        STORAGE.daily,
        JSON.stringify(daily)
    );

}

/* =========================================================
   SAVE HISTORY
   ========================================================= */

function saveHistory(
    average,
    fastest,
    rank
) {

    const now = new Date();

    const performance =
        calculatePerformanceScore(
            average,
            calculateConsistency(),
            rank
        );

    const record = {

        date:
            now.toLocaleString(
                [],
                {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        timestamp:
            Date.now(),

        mode:
            MODE_CONFIG[
                selectedMode
            ].label,

        difficulty:
            getDifficultyName(),

        average,
        fastest,
        rank,

        score:
            sessionScore,

        performance,

        maxCombo,

        rounds:
            times.length

    };

    history.unshift(record);

    if (history.length > 50) {

        history =
            history.slice(0, 50);

    }

    localStorage.setItem(
        STORAGE.history,
        JSON.stringify(history)
    );

    updateDailyStats(
        average,
        sessionScore
    );

    renderHistory();

}

/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory() {

    if (!historyList) return;

    historyList.innerHTML = "";

    if (!history.length) {

        const empty =
            document.createElement("span");

        empty.className =
            "history-empty";

        empty.textContent =
            "No completed runs yet.";

        historyList.appendChild(empty);

        return;

    }

    history.forEach(
        (run, index) => {

            const row =
                document.createElement("div");

            row.className =
                "history-row";

            const number =
                document.createElement("span");

            number.className =
                "history-number";

            number.textContent =
                index + 1;

            const mode =
                document.createElement("span");

            mode.className =
                "history-mode";

            mode.textContent =
                run.mode ||
                "CLASSIC";

            const average =
                document.createElement("strong");

            average.textContent =
                run.average +
                " ms";

            const rank =
                document.createElement("span");

            rank.className =
                "history-rank";

            rank.textContent =
                run.rank;

            const date =
                document.createElement("small");

            date.textContent =
                run.date;

            row.append(
                number,
                mode,
                average,
                rank,
                date
            );

            historyList.appendChild(row);

        }
    );

}

/* =========================================================
   SHOW RESULTS
   ========================================================= */

function showResults() {

    if (
        state === "finished"
    ) {

        return;

    }

    state = "finished";

    inputLocked = true;

    if (!times.length) {

        resetValues();
        return;

    }

    const average =
        Math.round(
            times.reduce(
                (total, value) =>
                    total + value,
                0
            ) /
            times.length
        );

    const fastest =
        Math.min(...times);

    const rank =
        getRank(average);

    const result =
        getFinalMessage(average);

    const consistencyScore =
        calculateConsistency();

    const performance =
        calculatePerformanceScore(
            average,
            consistencyScore,
            rank
        );

    setText(
        finalScore,
        average + " ms"
    );

    setText(
        finalRating,
        result.title
    );

    setText(
        finalDescription,
        result.description
    );

    setText(
        finalRank,
        rank
    );

    setText(
        finalAverage,
        average + " ms"
    );

    setText(
        finalFastest,
        fastest + " ms"
    );

    setText(
        consistency,
        consistencyScore + "%"
    );

    setText(
        resultIcon,
        result.icon
    );

    buildRoundBars();

    saveHistory(
        average,
        fastest,
        rank
    );

    if (resultPanel) {

        resultPanel.classList.add("show");

    }

    setOptionalText(
        "v10-session-score",
        sessionScore.toLocaleString()
    );

    setOptionalText(
        "v10-performance",
        performance + "%"
    );

    setOptionalText(
        "v10-max-combo",
        maxCombo + "x"
    );

    setOptionalText(
        "v10-xp",
        "+" +
        Math.round(
            sessionScore / 8
        ) +
        " XP"
    );

    setOptionalText(
        "v10-level",
        "LEVEL " +
        playerLevel
    );

    checkAchievements();
    updateV10Dashboard();

    /*
       Premium result celebration.
    */

    if (rank === "S") {

        flashScreen(
            "v10-perfect"
        );

        playTone(
            1100,
            180,
            "triangle",
            0.06
        );

        setTimeout(() => {

            playTone(
                1400,
                220,
                "triangle",
                0.05
            );

        }, 180);

    } else {

        playTone(
            760,
            180,
            "triangle"
        );

    }

    if (resultPanel) {

        setTimeout(() => {

            resultPanel.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }, 150);

    }

}

/* =========================================================
   MODE SELECTION
   ========================================================= */

function selectMode(mode) {

    if (!MODE_CONFIG[mode]) {
        return;
    }

    if (state !== "idle") {
        return;
    }

    selectedMode = mode;

    modeButtons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.mode === mode
        );

    });

    if (modeDescription) {

        modeDescription.textContent =
            MODE_CONFIG[
                mode
            ].description;

    }

    setText(
        roundDisplay,
        "0 / " +
        MODE_CONFIG[
            mode
        ].rounds
    );

    if (progressBar) {

        progressBar.style.width = "0%";

    }

}

/* =========================================================
   CLEAR HISTORY
   ========================================================= */

function clearHistory() {

    const confirmed =
        window.confirm(
            "Clear all Reaction Master history?"
        );

    if (!confirmed) {
        return;
    }

    history = [];

    localStorage.removeItem(
        STORAGE.history
    );

    renderHistory();
    updateV10Dashboard();

}

/* =========================================================
   SOUND BUTTON
   ========================================================= */

function toggleSound() {

    soundEnabled =
        !soundEnabled;

    if (soundButton) {

        soundButton.textContent =
            soundEnabled
                ? "🔊 SOUND"
                : "🔇 MUTED";

    }

    if (soundEnabled) {

        playTone(
            700,
            70,
            "sine"
        );

    }

}

/* =========================================================
   BUTTON EVENTS
   ========================================================= */

if (startButton) {

    startButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            startChallenge();

        }
    );

}

if (playAgain) {

    playAgain.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            startChallenge();

        }
    );

}

if (resetButton) {

    resetButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            resetValues();

        }
    );

}

if (soundButton) {

    soundButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toggleSound();

        }
    );

}

modeButtons.forEach(button => {

    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            selectMode(
                button.dataset.mode
            );

        }
    );

});

if (clearHistoryButton) {

    clearHistoryButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            clearHistory();

        }
    );

}

/* =========================================================
   GAME AREA
   ========================================================= */

if (gameArea) {

    gameArea.addEventListener(
        "click",
        handleGameClick
    );

}

/* =========================================================
   KEYBOARD
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.code === "Space"
        ) {

            event.preventDefault();

            if (
                state === "idle"
            ) {

                startChallenge();
                return;

            }

            if (
                state === "ready"
            ) {

                handleGameClick();
                return;

            }

        }

        if (
            event.code === "Enter" &&
            state === "idle"
        ) {

            startChallenge();

        }

    }
);

/* =========================================================
   MOBILE TOUCH
   ========================================================= */

if (gameArea) {

    gameArea.addEventListener(
        "touchstart",
        event => {

            if (
                state === "ready" ||
                state === "waiting"
            ) {

                event.preventDefault();

            }

            handleGameClick();

        },
        {
            passive: false
        }
    );

}

/* =========================================================
   PERFORMANCE DASHBOARD
   ========================================================= */

function updateV10Dashboard() {

    const scores =
        history
            .map(run =>
                Number(run.average)
            )
            .filter(
                value =>
                    Number.isFinite(value)
            );

    const bestElement =
        document.getElementById(
            "v9-best"
        );

    const averageElement =
        document.getElementById(
            "v9-average"
        );

    const consistencyElement =
        document.getElementById(
            "v9-consistency"
        );

    const runsElement =
        document.getElementById(
            "v9-runs"
        );

    setOptionalText(
        "v10-level",
        "LEVEL " +
        playerLevel
    );

    setOptionalText(
        "v10-total-xp",
        totalXP.toLocaleString() +
        " XP"
    );

    if (!scores.length) {

        setText(
            bestElement,
            "--"
        );

        setText(
            averageElement,
            "--"
        );

        setText(
            consistencyElement,
            "--"
        );

        setText(
            runsElement,
            "0"
        );

        return;

    }

    const best =
        Math.min(...scores);

    const average =
        scores.reduce(
            (sum, score) =>
                sum + score,
            0
        ) /
        scores.length;

    const variance =
        scores.reduce(
            (sum, score) =>
                sum +
                Math.pow(
                    score - average,
                    2
                ),
            0
        ) /
        scores.length;

    const deviation =
        Math.sqrt(variance);

    const consistencyValue =
        clamp(
            Math.round(
                100 -
                (
                    deviation /
                    average *
                    100
                )
            ),
            0,
            100
        );

    setText(
        bestElement,
        Math.round(best) +
        " ms"
    );

    setText(
        averageElement,
        Math.round(average) +
        " ms"
    );

    setText(
        consistencyElement,
        consistencyValue +
        "%"
    );

    setText(
        runsElement,
        history.length
    );

    const trend =
        document.getElementById(
            "v9-trend"
        );

    if (
        trend &&
        scores.length >= 2
    ) {

        if (
            scores[0] < scores[1]
        ) {

            trend.textContent =
                "IMPROVING ↑";

        } else if (
            scores[0] > scores[1]
        ) {

            trend.textContent =
                "SLOWING ↓";

        } else {

            trend.textContent =
                "STABLE →";

        }

    }

}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

const achievementCards =
    document.querySelectorAll(
        ".achievement-card"
    );

const achievementCount =
    document.getElementById(
        "achievement-count"
    );

let unlockedAchievements = [];

try {

    unlockedAchievements =
        JSON.parse(
            localStorage.getItem(
                STORAGE.achievements
            ) || "[]"
        );

    if (
        !Array.isArray(
            unlockedAchievements
        )
    ) {

        unlockedAchievements = [];

    }

} catch {

    unlockedAchievements = [];

}

function updateAchievementCount() {

    if (achievementCount) {

        achievementCount.textContent =
            unlockedAchievements.length +
            " / 8";

    }

}

function showAchievementToast(name) {

    document
        .querySelectorAll(".achievement-toast")
        .forEach(element => element.remove());

    const toast =
        document.createElement("div");

    toast.className =
        "achievement-toast";

    toast.innerHTML =
        "<span>🏆</span>" +
        "<div>" +
        "<small>ACHIEVEMENT UNLOCKED</small>" +
        "<strong>" +
        name +
        "</strong>" +
        "</div>";

    document.body.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

    setTimeout(() => {

        toast.remove();

    }, 3500);

}

function unlockAchievement(id) {

    if (
        unlockedAchievements.includes(id)
    ) {

        return;

    }

    unlockedAchievements.push(id);

    localStorage.setItem(
        STORAGE.achievements,
        JSON.stringify(
            unlockedAchievements
        )
    );

    const card =
        document.querySelector(
            '[data-achievement="' +
            id +
            '"]'
        );

    if (card) {

        card.classList.add(
            "unlocked",
            "just-unlocked"
        );

        const title =
            card.querySelector("strong");

        if (title) {

            showAchievementToast(
                title.textContent
            );

        }

        setTimeout(() => {

            card.classList.remove(
                "just-unlocked"
            );

        }, 900);

    }

    playTone(
        950,
        120,
        "triangle",
        0.05
    );

    updateAchievementCount();

}

function renderAchievements() {

    achievementCards.forEach(card => {

        if (
            unlockedAchievements.includes(
                card.dataset.achievement
            )
        ) {

            card.classList.add(
                "unlocked"
            );

        }

    });

    updateAchievementCount();

}

function checkAchievements() {

    const data = history;

    const best =
        Number(
            localStorage.getItem(
                STORAGE.best
            )
        );

    if (data.length >= 1) {

        unlockAchievement("first");

    }

    if (
        Number.isFinite(best) &&
        best < 200
    ) {

        unlockAchievement("fast");

    }

    if (
        Number.isFinite(best) &&
        best < 150
    ) {

        unlockAchievement("lightning");

    }

    if (
        data.some(
            run =>
                Number(run.average) < 220
        )
    ) {

        unlockAchievement("perfect");

    }

    if (data.length >= 10) {

        unlockAchievement("runs");

    }

    if (
        data.some(
            run =>
                Number(run.average) < 180
        )
    ) {

        unlockAchievement("elite");

    }

    if (data.length >= 25) {

        unlockAchievement("legend");

    }

    if (maxCombo >= 5) {

        unlockAchievement("combo");

    }

}

/* =========================================================
   DIFFICULTY UI
   ========================================================= */

(function initDifficulty() {

    const buttons =
        document.querySelectorAll(
            ".difficulty-btn"
        );

    const label =
        document.getElementById(
            "difficulty-label"
        );

    const description =
        document.getElementById(
            "difficulty-description"
        );

    let current =
        localStorage.getItem(
            STORAGE.difficulty
        ) ||
        "normal";

    function getDifficultyDescription(name) {

        const descriptions = {

            easy:
                "Relaxed timing for warm-ups.",

            normal:
                "Balanced timing for competitive play.",

            hard:
                "Faster and less predictable.",

            insane:
                "Maximum challenge. No hesitation."

        };

        return (
            descriptions[name] ||
            descriptions.normal
        );

    }

    function applyDifficulty(name) {

        if (!DIFFICULTIES[name]) {

            name = "normal";

        }

        current = name;

        setText(
            label,
            DIFFICULTIES[name].label
        );

        setText(
            description,
            getDifficultyDescription(name)
        );

        buttons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.difficulty === name
            );

        });

        localStorage.setItem(
            STORAGE.difficulty,
            name
        );

        window.reactionDifficulty = {
            name
        };

    }

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                if (
                    state !== "idle"
                ) {

                    return;

                }

                applyDifficulty(
                    button.dataset.difficulty
                );

            }
        );

    });

    applyDifficulty(current);

})();

/* =========================================================
   PREMIUM UI MICRO-INTERACTIONS
   ========================================================= */

document.addEventListener(
    "pointermove",
    event => {

        /*
           Very subtle cursor glow for premium desktop UI.
           Only activates when the page already has the
           premium CSS variables.
        */

        document.documentElement.style.setProperty(
            "--mouse-x",
            event.clientX + "px"
        );

        document.documentElement.style.setProperty(
            "--mouse-y",
            event.clientY + "px"
        );

    }
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

getCurrentLevelXP();

selectMode("classic");

renderHistory();

renderAchievements();

updateV10Dashboard();

resetValues();

/* =========================================================
   GLOBAL V11 API
   ========================================================= */

window.ReactionMasterV11 = {

    getState() {

        return {

            state,
            round,
            combo,
            maxCombo,

            times: [...times],

            scores: [...scores],

            sessionScore,

            level: playerLevel,

            xp: totalXP,

            mode: selectedMode,

            difficulty:
                getDifficultyName()

        };

    },

    start:
        startChallenge,

    reset:
        resetValues,

    getRank:
        getRank,

    getTier:
        getReactionTier,

    getPerformance() {

        if (!times.length) {
            return null;
        }

        const average =
            Math.round(
                times.reduce(
                    (sum, value) =>
                        sum + value,
                    0
                ) /
                times.length
            );

        const rank =
            getRank(average);

        return {

            average,

            fastest:
                Math.min(...times),

            rank,

            consistency:
                calculateConsistency(),

            performance:
                calculatePerformanceScore(
                    average,
                    calculateConsistency(),
                    rank
                )

        };

    }

};
/* =========================================================
   PREMIUM THEME SYSTEM
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const themeButtons =
        document.querySelectorAll(".theme-choice");

    const savedTheme =
        localStorage.getItem("reaction-master-theme") ||
        "obsidian";

    applyTheme(savedTheme);

    themeButtons.forEach(button => {

        button.addEventListener("click", () => {

            const theme =
                button.dataset.theme;

            applyTheme(theme);

            localStorage.setItem(
                "reaction-master-theme",
                theme
            );

        });

    });


    function applyTheme(theme) {

        document.body.dataset.theme = theme;

        themeButtons.forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.theme === theme
            );

        });

    }

});