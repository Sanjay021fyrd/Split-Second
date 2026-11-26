"use strict";

/* =========================================================
   Split Second - game logic
   Modes: Classic, Lights Out, Go / No-Go, 2-Player Duel
   Effects live in fx.js, result visuals in viz.js.
   ========================================================= */

/* ---------- Config ---------- */

const DEFAULT_ROUNDS = 3;
const ROUND_CHOICES = [3, 5];
const MIN_DELAY = 2000;        // random wait before the signal (ms)
const MAX_DELAY = 5000;
const RESPONSE_MS = 3000;     // maximum time to press after GO
const ANTICIPATION_MS = 100;   // faster than this is a guess, not a reaction
const STREAK_LIMIT_MS = 300;
const DECOY_CHANCE = 0.4;
const MAX_DECOYS_PER_ROUND = 2;
const DECOY_SHOW_MS = 1100;
const HIT_STOP_MS = 110;       // the freeze-frame when you press
const BETWEEN_MS = 1400;
const FALSE_START_MS = 1300;
const LIGHT_STEP_MS = 650;     // Lights Out: time between each red light
const LIGHT_COUNT = 5;
const XP_PER_LEVEL = 250;

const STORAGE_KEY = "splitSecond.v1";
const LEGACY_BEST_KEY = "reactionMasterBest";

const MODES = {
    classic: {
        short: "Classic",
        intro: "Click, tap or press Space when the screen turns green.",
        start: "START CHALLENGE",
        controls: "CLICK / TAP / SPACE",
        label: "CHALLENGE COMPLETE"
    },
    lights: {
        short: "Lights Out",
        intro: "Five red lights. When they all go OUT - go!",
        start: "START RACE",
        controls: "CLICK / TAP / SPACE",
        label: "LIGHTS OUT COMPLETE"
    },
    gonogo: {
        short: "Go/No-Go",
        intro: "Green means GO. Red means STOP. Don't click!",
        start: "START CHALLENGE",
        controls: "CLICK / TAP / SPACE",
        label: "GO / NO-GO COMPLETE"
    },
    duel: {
        short: "Duel",
        intro: "Two players, one screen. Win more rounds than your opponent.",
        start: "START DUEL",
        controls: "P1: Q or tap left  ·  P2: P or tap right",
        label: "DUEL COMPLETE"
    }
};

const DEFAULT_THEME = "avocado";
const THEMES = {
    avocado: {
        name: "Avocado Grove", ambient: "motes", wait: "WAIT...", go: "CLICK!", goSub: "NOW!", impact: "ring",
        style: { bg: "#eef4d9", panel: "#f8fbe9", text: "#263819", muted: "#435632", dim: "#475933",
            accent: "#3b601f", "accent-2": "#59691f", "accent-soft": "#365219", "area-1": "#f2f7d8", "area-2": "#c8dc8d",
            font: '"Segoe UI", Arial, sans-serif', "title-font": 'Georgia, serif',
            "theme-backdrop": "radial-gradient(ellipse at bottom, #b4d476, transparent 65%)" }
    },
    samurai: {
        name: "Samurai", ambient: "petals", wait: "STEADY...", go: "DRAW!", goSub: "STRIKE!", impact: "slash",
        style: { bg: "#12060a", panel: "#220c12", text: "#fff5f6", muted: "#c4a3ab", dim: "#b9949e",
            accent: "#e11d48", "accent-2": "#b86504", "accent-soft": "#fda4af", "area-1": "#2c1119", "area-2": "#12060a",
            font: 'Georgia, "Times New Roman", serif', "title-case": "uppercase", "title-track": "3px" }
    },
    space: {
        name: "Deep Space", ambient: "stars", wait: "STANDBY...", go: "LAUNCH!", goSub: "ENGAGE!", impact: "ring",
        style: { bg: "#02030d", panel: "#10122a", text: "#f8fafc", muted: "#aeb7d1", dim: "#a1acc8",
            accent: "#7650d1", "accent-2": "#08788f", "accent-soft": "#c4b5fd", "area-1": "#0f1536", "area-2": "#04061a",
            font: '"Trebuchet MS", "Segoe UI", sans-serif', "title-case": "uppercase", "title-track": "2px" }
    },
    gta: {
        name: "GTA 6 Theme", ambient: "motes", wait: "HOLD...", go: "CLICK!", goSub: "NOW!", impact: "ring",
        style: { bg: "#39134c", panel: "#291333", text: "#fff6f3", muted: "#f6bfcd", dim: "#e5b0ca",
            accent: "#ad2266", "accent-2": "#a8431f", "accent-soft": "#ffb4bc", "area-1": "#63194e", "area-2": "#321747",
            font: '"Arial Black", "Segoe UI", sans-serif',
            "theme-backdrop": "linear-gradient(180deg, #572878, #e64987 53%, #ff9d59 75%, #39134c)",
            "theme-art": 'url("coastal.svg")' }
    },
    egyptian: {
        name: "Egyptian Theme", ambient: "motes", wait: "STEADY...", go: "CLICK!", goSub: "NOW!", impact: "ring",
        style: { bg: "#362312", panel: "#fff0cb", text: "#382617", muted: "#59422b", dim: "#61472d",
            accent: "#76521e", "accent-2": "#176059", "accent-soft": "#654419", "area-1": "#fff1cc", "area-2": "#e1bc76",
            font: 'Georgia, serif', "title-case": "uppercase", "title-track": "1px",
            "theme-backdrop": "linear-gradient(180deg, #293a40, #8b6843 55%, #d5a355 78%, #362312)",
            "theme-art": 'url("ruins.svg")' }
    }
};

/* One table drives the speed meter, round messages, rank and final title,
   so the labels can never disagree with each other. */
const TIERS = [
    { max: 180, label: "GODLIKE", line: "Your reflexes are ridiculous.", color: "#fbbf24",
      rank: "S", title: "REACTION GOD", desc: "Your reflexes are seriously elite.", icon: "⚡" },
    { max: 220, label: "LIGHTNING", line: "That was insanely fast.", color: "#34d399",
      rank: "A", title: "REFLEX MONSTER", desc: "That is competitive-level speed.", icon: "🔥" },
    { max: 270, label: "SHARP", line: "Better than most people.", color: "#38bdf8",
      rank: "B", title: "SHARP REFLEXES", desc: "You are quicker than the average player.", icon: "🚀" },
    { max: 330, label: "SOLID", line: "Nice, steady reflexes.", color: "#818cf8",
      rank: "C", title: "SOLID REFLEXES", desc: "A very solid performance.", icon: "💎" },
    { max: 450, label: "DECENT", line: "You can push that speed higher.", color: "#fb923c",
      rank: "D", title: "GOOD START", desc: "Keep practising and push your score down.", icon: "🎯" },
    { max: Infinity, label: "SLOW", line: "Time to train those reflexes.", color: "#f87171",
      rank: "F", title: "REFLEX TRAINING NEEDED", desc: "Run another challenge and beat this score.", icon: "🐢" }
];

/* ---------- DOM ---------- */

const $ = (id) => document.getElementById(id);

const gameArea = $("game-area");
const message = $("message");
const subMessage = $("sub-message");
const signalIcon = $("signal-icon");
const duelSides = $("duel-sides");
const lightsEl = $("lights");
const lightEls = Array.from(lightsEl.querySelectorAll(".light"));

const startButton = $("start-btn");
const playAgain = $("play-again");
const resetButton = $("reset-btn");
const shareButton = $("share-btn");
const saveButton = $("save-btn");
const soundButton = $("sound-btn");
const modeButtons = document.querySelectorAll(".mode-btn");
const themeSelect = $("theme-select");
const roundSelect = $("round-select");
const controlsHint = $("controls-hint");

const hud1Label = $("hud1-label");
const hud2Label = $("hud2-label");
const hud3Label = $("hud3-label");
const roundDisplay = $("round");
const comboDisplay = $("combo");
const bestDisplay = $("best-score");

const currentScore = $("current-score");
const averageScore = $("average-score");
const fastestScore = $("fastest-score");

const progressBar = $("progress-bar");
const speedMeter = $("speed-meter");
const speedLabel = $("speed-label");

const levelLabel = $("level");
const xpFill = $("xp-fill");
const xpText = $("xp-text");

const resultPanel = $("result-panel");
const resultIcon = $("result-icon");
const resultLabel = $("result-label");
const finalScore = $("final-score");
const finalRating = $("final-rating");
const finalDescription = $("final-description");
const recordBadge = $("record-badge");
const rankBox = $("rank-box");
const finalRank = $("final-rank");
const vizEl = $("viz");
const resultGrid = $("result-grid");
const barsTitle = $("bars-title");
const roundBars = $("round-bars");
const recent = $("recent");
const recentList = $("recent-list");
const toastEl = $("toast");
const bannerEl = $("banner");
const srLive = $("sr-live");

const reducedMotion = Fx.reduced;

/* ---------- Saved data (safe if localStorage is blocked) ---------- */

function loadStore() {
    const store = { bestSingle: null, bestAvg: {}, history: [], muted: false, mode: "classic", theme: DEFAULT_THEME, rounds: DEFAULT_ROUNDS, xp: 0 };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === "object") {
                Object.assign(store, saved);
            }
        } else {
            // Carry over the best time saved by the old version of the game.
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (legacy > 0) {
                store.bestSingle = legacy;
            }
        }
    } catch (error) {
        // Storage unavailable or corrupted: just play without saving.
    }

    if (!store.bestAvg || typeof store.bestAvg !== "object") store.bestAvg = {};
    if (!Array.isArray(store.history)) store.history = [];
    if (!MODES[store.mode]) store.mode = "classic";
    if (store.theme === "uncharted") store.theme = "egyptian";
    if (!Object.hasOwn(THEMES, store.theme)) store.theme = DEFAULT_THEME;
    if (!ROUND_CHOICES.includes(store.rounds)) store.rounds = DEFAULT_ROUNDS;
    store.xp = Number.isFinite(store.xp) && store.xp > 0 ? Math.floor(store.xp) : 0;
    store.muted = Boolean(store.muted);

    return store;
}

function saveStore() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        // Ignore: the game still works without saving.
    }
}

const store = loadStore();

/* ---------- Game state ---------- */

const PLAY_STATES = ["waiting", "signal", "ready", "decoy", "between", "false-start", "suspended"];

let mode = store.mode;
let isGameActive = false;
let roundLimit = store.rounds;
let theme = store.theme;
let state = "idle";   // idle | waiting | signal | ready | decoy | between | false-start | suspended | finished
let round = 0;
let streak = 0;
let times = [];
let attempts = [];
let misses = 0;
let falseStarts = 0;
let decoysDodged = 0;
let decoysThisRound = 0;
let duel = { p1: 0, p2: 0, rounds: [] };
let startTime = 0;
let runStartBest = null;
let lastResult = null;
let pendingLevel = 0;
let suspended = false;

// Every delayed action goes through schedule(), so there is only ever ONE
// pending timer and Reset can always cancel it.
let pending = null;
let rafId = 0;
let countRaf = 0;
let toastTimer = 0;
let bannerTimer = 0;
let stampTimer = 0;

function schedule(fn, ms) {
    clearTimeout(pending);
    pending = setTimeout(() => {
        pending = null;
        fn();
    }, ms);
}

function cancelAll() {
    clearTimeout(pending);
    clearTimeout(stampTimer);
    pending = null;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(countRaf);
    rafId = 0;
    countRaf = 0;
}

/* ---------- Small helpers ---------- */

const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const T = () => THEMES[theme];

function tierFor(ms) {
    return TIERS.find((tier) => ms < tier.max) || TIERS[TIERS.length - 1];
}

function erf(x) {
    const sign = Math.sign(x);
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - poly * Math.exp(-ax * ax));
}

// Rough estimate only: typical online reaction tests centre near 270 ms.
function percentFaster(ms) {
    const z = (270 - ms) / (45 * Math.SQRT2);
    return clamp(Math.round(50 * (1 + erf(z))), 1, 99);
}

function consistencyScore(list) {
    if (list.length < 2) return 100;

    const avg = mean(list);
    const variance = list.reduce((sum, value) => sum + (value - avg) ** 2, 0) / list.length;
    const cv = Math.sqrt(variance) / avg;   // spread relative to the average speed

    return clamp(Math.round(100 - cv * 250), 0, 100);
}

// Event timestamps share performance.now()'s clock in modern browsers.
function eventTime(event) {
    const t = event && event.timeStamp;
    return t && t < 1e11 ? t : performance.now();
}

function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function announce(text) {
    srLive.textContent = "";
    setTimeout(() => { srLive.textContent = text; }, 50);
}

/* ---------- Sound and haptics (WebAudio, no files needed) ---------- */

let audioCtx = null;

function ensureAudio() {
    if (store.muted) return;

    try {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
    } catch (error) {
        audioCtx = null;
    }
}

function tone(freq, start, duration, type = "sine", volume = 0.1) {
    if (!audioCtx || store.muted) return;

    const t = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
}

// A short rising chime for a hit, a soft descending knock for a mistake.
function playPressSound(success) {
    ensureAudio();
    if (success) {
        tone(740, 0, 0.055, "triangle", 0.09);
        tone(1110, 0.035, 0.095, "sine", 0.11);
    } else {
        tone(260, 0, 0.065, "triangle", 0.10);
        tone(145, 0.045, 0.10, "sine", 0.10);
    }
}

function vibrate(pattern) {
    // Browsers only allow vibration after the user has interacted with the page.
    const activated = !navigator.userActivation || navigator.userActivation.hasBeenActive;

    if (!store.muted && navigator.vibrate && activated) {
        navigator.vibrate(pattern);
    }
}

function renderSoundButton() {
    soundButton.textContent = store.muted ? "🔇" : "🔊";
    soundButton.setAttribute("aria-pressed", String(!store.muted));
    soundButton.setAttribute("aria-label", store.muted ? "Sound off" : "Sound on");
}

/* ---------- XP, levels and themes ---------- */

const levelOf = (xp) => 1 + Math.floor(xp / XP_PER_LEVEL);

function renderXp() {
    const into = store.xp % XP_PER_LEVEL;

    levelLabel.textContent = "LV " + levelOf(store.xp);
    xpFill.style.width = (into / XP_PER_LEVEL) * 100 + "%";
    xpText.textContent = into + " / " + XP_PER_LEVEL + " XP";

}

function awardXp(amount) {
    const before = levelOf(store.xp);

    store.xp += Math.max(0, Math.round(amount));
    saveStore();
    renderXp();

    const after = levelOf(store.xp);
    if (after > before) pendingLevel = after;
}

function setGameActive(active) {
    isGameActive = active;
    themeSelect.disabled = active;
    roundSelect.disabled = active;
}

function applyTheme(id) {
    if (isGameActive || !Object.hasOwn(THEMES, id)) return;

    const root = document.documentElement;
    const previous = THEMES[theme];
    Object.keys(previous.style).forEach((key) => root.style.removeProperty("--" + key));

    theme = id;
    store.theme = id;
    saveStore();

    const config = THEMES[id];
    for (const [key, value] of Object.entries(config.style)) {
        root.style.setProperty("--" + key, value);
    }
    for (const [name, color] of [["accent-rgb", config.style.accent], ["accent2-rgb", config.style["accent-2"]]]) {
        root.style.setProperty("--" + name, color.slice(1).match(/../g).map((part) => parseInt(part, 16)).join(", "));
    }

    root.dataset.theme = id;
    themeSelect.value = id;
    $("meta-theme").setAttribute("content", config.style.bg);
    Fx.ambient.setTheme(config.ambient);
}

function setRoundLimit(value) {
    if (isGameActive || !ROUND_CHOICES.includes(value)) return;
    store.rounds = value;
    roundLimit = value;
    roundSelect.value = String(value);
    saveStore();
    if (state === "idle") renderHud();
}

function showBanner(title, sub) {
    $("banner-title").textContent = title;
    $("banner-sub").textContent = sub;
    bannerEl.setAttribute("aria-hidden", "false");
    bannerEl.classList.remove("show");
    void bannerEl.offsetWidth;
    bannerEl.classList.add("show");

    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
        bannerEl.classList.remove("show");
        bannerEl.setAttribute("aria-hidden", "true");
    }, 3600);
}

function announceLevelUp() {
    if (!pendingLevel) return;

    const level = pendingLevel;
    pendingLevel = 0;

    showBanner("LEVEL UP · LV " + level, "Keep going!");
    Fx.burst(40);
}

/* ---------- Rendering helpers ---------- */

function setMessage(title, sub) {
    message.classList.remove("slam");
    message.style.removeProperty("--tc");
    message.textContent = title;
    subMessage.textContent = sub || "";
}

// className: ready | too-early | decoy | waiting | (none)
function setArea(className) {
    gameArea.classList.remove("ready", "too-early", "decoy", "waiting");
    if (className) gameArea.classList.add(className);
}

function setIcon(symbol) {
    signalIcon.textContent = symbol || "";
}

function countUp(element, target, suffix, duration = 700) {
    if (reducedMotion) {
        element.textContent = target + suffix;
        return;
    }

    const t0 = performance.now();

    const step = (now) => {
        const k = Math.min(1, (now - t0) / duration);
        element.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) countRaf = requestAnimationFrame(step);
    };

    countRaf = requestAnimationFrame(step);
}

function renderHud() {
    if (mode === "duel") {
        hud1Label.textContent = "ROUND";
        Fx.setText(roundDisplay, round + " / " + roundLimit);
        hud2Label.textContent = "P1 · Q";
        Fx.setText(comboDisplay, String(duel.p1));
        hud3Label.textContent = "P2 · P";
        Fx.setText(bestDisplay, String(duel.p2));
        return;
    }

    hud1Label.textContent = "ROUND";
    Fx.setText(roundDisplay, Math.min(round, roundLimit) + " / " + roundLimit);
    hud2Label.textContent = "STREAK";
    Fx.setText(comboDisplay, streak + "x");
    hud3Label.textContent = "BEST";
    Fx.setText(bestDisplay, store.bestSingle ? store.bestSingle + " ms" : "--");
}

function renderStats() {
    if (!times.length) {
        Fx.setText(currentScore, "--");
        Fx.setText(averageScore, "--");
        Fx.setText(fastestScore, "--");
        return;
    }

    Fx.setText(currentScore, times[times.length - 1] + " ms");
    Fx.setText(averageScore, Math.round(mean(times)) + " ms");
    Fx.setText(fastestScore, Math.min(...times) + " ms");
}

function updateSpeed(time, tier) {
    let percentage;

    if (time <= 150) {
        percentage = 100;
    } else if (time >= 600) {
        percentage = 5;
    } else {
        percentage = 100 - ((time - 150) / 450) * 95;
    }

    speedMeter.style.width = percentage + "%";
    speedLabel.textContent = tier.label;
}

function setProgress(fraction) {
    progressBar.style.width = clamp(fraction, 0, 1) * 100 + "%";
}

function resetLights() {
    lightEls.forEach((light) => light.classList.remove("on"));
}

/* ---------- Mode and reset ---------- */

function resetValues() {
    setGameActive(false);
    cancelAll();
    Fx.clear();

    state = "idle";
    round = 0;
    streak = 0;
    times = [];
    attempts = [];
    misses = 0;
    falseStarts = 0;
    decoysDodged = 0;
    decoysThisRound = 0;
    duel = { p1: 0, p2: 0, rounds: [] };
    lastResult = null;
    suspended = false;

    setArea();
    setIcon("");
    resetLights();
    lightsEl.hidden = true;

    renderStats();
    renderHud();
    setProgress(0);

    speedMeter.style.width = "0%";
    speedLabel.textContent = "WAITING";

    setMessage("READY?", MODES[mode].intro);

    startButton.textContent = MODES[mode].start;
    startButton.hidden = false;
    resultPanel.classList.remove("show");
    rankBox.classList.remove("stamp");
}

function setMode(next) {
    if (!MODES[next]) return;

    mode = next;
    store.mode = next;
    saveStore();

    modeButtons.forEach((button) => {
        const active = button.dataset.mode === next;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    gameArea.dataset.mode = next;
    duelSides.hidden = next !== "duel";
    controlsHint.textContent = MODES[next].controls;

    Fx.movePill();
    resetValues();
}

function startChallenge() {
    if (isGameActive) return;
    resetValues();
    setGameActive(true);
    ensureAudio();

    runStartBest = store.bestSingle;
    startButton.hidden = true;

    beginRound();
}

/* ---------- Round flow ---------- */

function beginRound(repeat = false) {
    cancelAll();
    Fx.clear();

    if (!repeat) {
        round++;
    }

    state = "waiting";
    decoysThisRound = 0;

    setArea("waiting");
    setIcon("");
    renderHud();

    if (mode === "lights") {
        resetLights();
        lightsEl.hidden = false;
    } else {
        lightsEl.hidden = true;
    }

    setProgress((round - 1) / roundLimit);
    if (mode === "duel") {
        setMessage(T().wait, "Don't press until the screen turns green!");
    } else if (mode === "lights") {
        setMessage(T().wait, "Wait for the lights to go OUT.");
    } else {
        setMessage(T().wait, "Do not click yet.");
    }

    speedLabel.textContent = "GET READY";

    if (mode === "lights") {
        runLights();
    } else {
        scheduleSignal();
    }
}

function scheduleSignal() {
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    schedule(showSignal, delay);
}

// Lights Out: five lights come on at a steady rhythm, then after a RANDOM
// hold they all go out. The random hold is what makes it fair.
function runLights() {
    const lightStep = (i) => {
        if (i >= LIGHT_COUNT) {
            schedule(showGo, 700 + Math.random() * 2300);
            return;
        }

        lightEls[i].classList.add("on");
        schedule(() => lightStep(i + 1), LIGHT_STEP_MS);
    };

    schedule(() => lightStep(0), 900 + Math.random() * 1200);
}

function showSignal() {
    if (mode === "gonogo" && decoysThisRound < MAX_DECOYS_PER_ROUND && Math.random() < DECOY_CHANCE) {
        showDecoy();
        return;
    }

    showGo();
}

function showGo() {
    state = "signal";

    if (mode === "lights") {
        resetLights();
        setMessage("LIGHTS OUT!", "GO GO GO!");
        setIcon("");
    } else {
        setMessage(T().go, T().goSub);
        setIcon("✔");
    }

    setArea("ready");
    speedLabel.textContent = "REACT!";

    Fx.ambient.warp();

    // Start the clock when the green frame is actually drawn, not when this
    // code runs, so the screen-refresh delay is not counted against the player.
    rafId = requestAnimationFrame(() => {
        startTime = performance.now();
        state = "ready";
        schedule(missRound, RESPONSE_MS);
    });
}

function showDecoy() {
    state = "decoy";
    decoysThisRound++;

    setArea("decoy");
    setIcon("✋");
    setMessage("STOP!", "Decoy - do NOT click.");
    speedLabel.textContent = "HOLD STILL";


    schedule(() => {
        decoysDodged++;
        state = "waiting";

        setArea("waiting");
        setIcon("");
        setMessage(T().wait, "Good discipline. Keep waiting.");

        scheduleSignal();
    }, DECOY_SHOW_MS);
}

/* ---------- Input ---------- */

// side: 0 = single player, 1 / 2 = duel players. point: {x, y} client coords or null.
function handlePress(side, ts, point) {
    if (mode === "duel") {
        duelPress(side, ts);
        return;
    }

    if (state === "ready" || state === "signal") {
        const reaction = state === "signal" ? 0 : Math.round(ts - startTime);

        if (reaction >= RESPONSE_MS) {
            missRound();
        } else if (reaction < ANTICIPATION_MS) {
            falseStart("TOO FAST!", "That was a guess, not a reaction.");
        } else {
            finishRound(reaction, point);
        }
        return;
    }

    if (state === "waiting") {
        if (mode === "lights") {
            falseStart("JUMP START!", "The lights were still on.");
        } else {
            falseStart("TOO EARLY!", "Wait for the green signal.");
        }
        return;
    }

    if (state === "decoy") {
        falseStart("FELL FOR IT!", "That was a decoy.");
    }
}

function finishRound(reaction, point) {
    const tier = tierFor(reaction);

    attempts.push({ time: reaction });
    times.push(reaction);
    playPressSound(true);
    streak = reaction < STREAK_LIMIT_MS ? streak + 1 : 0;

    if (store.bestSingle === null || reaction < store.bestSingle) {
        store.bestSingle = reaction;
        saveStore();
    }

    awardXp(Math.max(10, Math.round((500 - reaction) / 5)));

    state = "between";

    // Hit-stop: the green frame is held for a beat while the impact plays,
    // then the number slams in. The time above is already recorded, so this
    // never affects the score.
    Fx.impact({ point, reaction, tier, style: T().impact });
    Fx.freeze(HIT_STOP_MS);

    schedule(() => revealHit(reaction, tier), reducedMotion ? 0 : HIT_STOP_MS);
}

function revealHit(reaction, tier) {
    setArea();
    setIcon("");
    lightsEl.hidden = true;

    setMessage(reaction + " ms", tier.label + " • " + tier.line);
    message.style.setProperty("--tc", tier.color);
    Fx.restart(message, "slam");

    updateSpeed(reaction, tier);
    renderStats();
    renderHud();


    advanceSolo(BETWEEN_MS, 1100);
}

function advanceSolo(nextDelay, resultsDelay = nextDelay) {
    setProgress(round / roundLimit);
    schedule(round >= roundLimit ? showResults : beginRound,
        round >= roundLimit ? resultsDelay : nextDelay);
}

function missRound() {
    if (mode === "duel") {
        cancelAll();
        duel.rounds.push({ winner: null, time: null });
        state = "between";
        setArea("too-early");
        setIcon("");
        setMessage("TIME'S UP!", "No point. Next round...");
        speedLabel.textContent = "MISSED";
        advanceDuel(FALSE_START_MS);
        return;
    }

    finishFailedRound("TIME'S UP!", "No reaction recorded.", "MISS");
}

function falseStart(title, sub) {
    playPressSound(false);
    finishFailedRound(title, sub, "FS");
    Fx.shake(12);
    Fx.flash(0.3, "#ef4444");
    vibrate([80, 40, 80]);
}

function finishFailedRound(title, sub, outcome) {
    cancelAll();

    state = "false-start";
    attempts.push({ time: null, outcome });
    if (outcome === "FS") falseStarts++;
    else misses++;
    streak = 0;

    setArea("too-early");
    setIcon("");
    resetLights();
    lightsEl.hidden = true;
    setMessage(title, sub + (round >= roundLimit ? " Results coming up..." : " Next round..."));

    speedMeter.style.width = "0%";
    speedLabel.textContent = outcome === "FS" ? "FALSE START" : "MISSED";

    renderHud();
    advanceSolo(FALSE_START_MS);
}

/* ---------- Duel ---------- */

function duelPress(side, ts) {
    if (side !== 1 && side !== 2) return;

    const other = side === 1 ? 2 : 1;

    if (state === "waiting" || state === "decoy") {
        duelPoint(other, null, "Player " + side + " jumped the gun!");
        return;
    }

    if (state === "ready" || state === "signal") {
        const reaction = state === "signal" ? 0 : Math.round(ts - startTime);

        if (reaction >= RESPONSE_MS) {
            missRound();
        } else if (reaction < ANTICIPATION_MS) {
            duelPoint(other, null, "Player " + side + " guessed too early!");
        } else {
            duelPoint(side, reaction, reaction + " ms");
        }
    }
}

function duelPoint(winner, reaction, note) {
    cancelAll();
    playPressSound(reaction !== null);

    duel["p" + winner]++;
    duel.rounds.push({ winner, time: reaction });

    if (reaction !== null) {
        times.push(reaction);
        renderStats();
        updateSpeed(reaction, tierFor(reaction));
    } else {
        speedLabel.textContent = "FALSE START";
    }

    state = "between";

    setArea(reaction !== null ? "" : "too-early");
    setIcon(reaction !== null ? "🏁" : "✖");
    setMessage("PLAYER " + winner + " SCORES!", note);
    renderHud();

    if (reaction !== null) {
        Fx.impact({ point: Fx.halfPoint(winner), reaction, tier: tierFor(reaction), style: "ring" });
        if (T().impact === "slash") Fx.slashHalf(winner === 1 ? 2 : 1, T().style.accent);
        Fx.freeze(HIT_STOP_MS);
    } else {
        Fx.shake(12);
        Fx.flash(0.3, "#ef4444");
        vibrate([80, 40, 80]);
    }

    advanceDuel(1600);
}

function advanceDuel(delay) {
    setProgress(round / roundLimit);
    schedule(round >= roundLimit ? showDuelResults : beginRound, delay);
}

/* ---------- Results ---------- */

function renderGrid(items) {
    resultGrid.replaceChildren();

    items.forEach(([label, value]) => {
        const cell = document.createElement("div");
        const name = document.createElement("span");
        const number = document.createElement("strong");

        name.textContent = label;
        number.textContent = value;
        cell.dataset.tilt = "";

        cell.append(name, number);
        resultGrid.appendChild(cell);
    });
}

function renderBars(entries) {
    roundBars.replaceChildren();
    roundBars.style.setProperty("--n", entries.length);

    const max = Math.max(1, ...entries.map((entry) => entry.value || 0));

    entries.forEach((entry, index) => {
        const bar = document.createElement("div");
        const label = document.createElement("span");

        bar.className = "round-bar" + (entry.cls ? " " + entry.cls : "");
        bar.style.height = Math.max(15, ((entry.value || 0) / max) * 90) + "px";
        bar.style.animationDelay = index * 0.1 + "s";
        bar.dataset.value = entry.text;
        bar.title = entry.title;

        label.textContent = entry.label;
        bar.appendChild(label);
        roundBars.appendChild(bar);
    });
}

function renderRecent() {
    const runs = store.history.filter((run) => run.mode === mode).slice(0, 5);

    recentList.replaceChildren();
    recent.hidden = runs.length === 0;

    runs.forEach((run, index) => {
        const item = document.createElement("li");
        item.textContent = run.avg + " ms · " + run.rank;
        if (index === 0) item.className = "latest";
        recentList.appendChild(item);
    });
}

function revealResults() {
    resultPanel.classList.add("show");

    resultPanel.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center"
    });
}

function showResults() {
    state = "finished";
    setGameActive(false);

    const bars = attempts.map(({ time, outcome }, index) => ({
        label: "R" + (index + 1),
        value: time,
        text: time === null ? outcome : String(time),
        title: "Round " + (index + 1) + ": " + (time !== null ? time + " ms" : outcome === "FS" ? "False start" : "Missed")
    }));
    const failures = [["FALSE STARTS", String(falseStarts)], ["MISSED", String(misses)]];
    if (mode === "gonogo") failures.push(["DECOYS DODGED", String(decoysDodged)]);

    barsTitle.textContent = "ROUND PERFORMANCE";
    renderBars(bars);
    if (!times.length) {
        resultIcon.textContent = "";
        resultLabel.textContent = MODES[mode].label;
        finalScore.textContent = "--";
        finalRating.textContent = "NO VALID REACTIONS";
        finalDescription.textContent = "All rounds are complete. Try again to set a reaction time.";
        recordBadge.hidden = true;
        rankBox.hidden = true;
        vizEl.hidden = true;
        renderGrid(failures);
        renderRecent();
        lastResult = {
            text: "I finished a Split Second challenge with no valid reactions.",
            card: {
                modeLabel: MODES[mode].short, big: "--", unit: "", sub: "NO VALID REACTIONS",
                rank: null, color: "#94a3b8", stats: failures, bars: bars.map(({ value }) => ({ value: value || 0 }))
            }
        };
        revealResults();
        announce("Challenge complete. No valid reactions.");
        return;
    }

    const average = Math.round(mean(times));
    const fastest = Math.min(...times);
    const tier = tierFor(average);
    const percent = percentFaster(average);

    const previousBest = store.bestAvg[mode];
    const complete = times.length === roundLimit;
    const brokeAverage = complete && typeof previousBest === "number" && average < previousBest;
    const brokeSingle = runStartBest !== null && fastest < runStartBest;

    if (complete && (typeof previousBest !== "number" || brokeAverage)) {
        store.bestAvg[mode] = average;
    }

    store.history.unshift({ mode, avg: average, fastest, rank: tier.rank, at: Date.now() });
    store.history.length = Math.min(store.history.length, 20);

    // Bonus XP for finishing, and for a clean run.
    awardXp(50 + (complete ? 25 : 0));
    saveStore();

    resultIcon.textContent = tier.icon;
    resultLabel.textContent = MODES[mode].label;
    countUp(finalScore, average, " ms");

    finalRating.textContent = tier.title;
    finalDescription.textContent =
        tier.desc + " Roughly faster than " + percent + "% of players (estimate).";

    recordBadge.hidden = !(brokeAverage || brokeSingle);
    recordBadge.textContent = brokeAverage ? "🎉 NEW BEST AVERAGE" : "⚡ NEW FASTEST REACTION";

    rankBox.hidden = false;
    vizEl.hidden = false;
    finalRank.textContent = tier.rank;
    rankBox.dataset.rank = tier.rank;
    rankBox.style.setProperty("--tc", tier.color);

    const grid = [
        ["AVERAGE", average + " ms"],
        ["FASTEST", fastest + " ms"],
        ["CONSISTENCY", consistencyScore(times) + "%"],
        ...failures
    ];

    renderGrid(grid);

    renderRecent();

    lastResult = {
        text: "I averaged " + average + " ms (rank " + tier.rank + ") on Split Second"
            + (mode === "gonogo" ? " Go/No-Go" : mode === "lights" ? " Lights Out" : "") + " ⚡ Can you beat it?",
        card: {
            modeLabel: MODES[mode].short,
            big: String(average),
            unit: "ms",
            sub: tier.title,
            rank: tier.rank,
            color: tier.color,
            stats: [["FASTEST", fastest + " ms"], ["CONSISTENCY", consistencyScore(times) + "%"], ["FASTER THAN", percent + "%"]],
            bars: bars.map(({ value }) => ({ value: value || 0 }))
        }
    };

    revealResults();
    Viz.show(average, percent);

    // The rank "stamps" onto the screen once the number has counted up.
    stampTimer = setTimeout(() => {
        Viz.stamp(tier.rank);

        if (tier.rank === "S" || tier.rank === "A" || brokeAverage || brokeSingle) {
            Fx.burst(36, [tier.color, "#ffffff", "#f472b6"]);
        }
    }, reducedMotion ? 0 : 900);

    setTimeout(announceLevelUp, reducedMotion ? 0 : 1900);

    announce("Result: " + average + " milliseconds average, rank " + tier.rank + ". " + tier.title + ".");
}

function showDuelResults() {
    state = "finished";
    setGameActive(false);

    const winner = duel.p1 === duel.p2 ? null : duel.p1 > duel.p2 ? 1 : 2;
    const score = duel.p1 + " - " + duel.p2;
    const headline = winner ? "PLAYER " + winner : "DRAW";
    const outcome = winner ? "WINS " + Math.max(duel.p1, duel.p2) + " - " + Math.min(duel.p1, duel.p2) : score;
    const summary = winner ? "Player " + winner + " wins the Split Second duel." : "The Split Second duel ended in a draw.";
    const fastest = times.length ? Math.min(...times) : null;

    resultIcon.textContent = "🏆";
    resultLabel.textContent = MODES.duel.label;
    finalScore.textContent = headline;
    finalRating.textContent = outcome;
    finalDescription.textContent = fastest !== null
        ? "Fastest winning reaction: " + fastest + " ms."
        : "No valid reactions were recorded.";

    recordBadge.hidden = true;
    rankBox.hidden = true;
    vizEl.hidden = true;
    recent.hidden = true;

    renderGrid([
        ["PLAYER 1", String(duel.p1)],
        ["PLAYER 2", String(duel.p2)],
        ["FASTEST", fastest !== null ? fastest + " ms" : "--"]
    ]);

    barsTitle.textContent = "ROUND WINNERS";
    renderBars(duel.rounds.map((entry, index) => ({
        label: "R" + (index + 1),
        value: entry.time || 0,
        text: entry.time ? String(entry.time) : entry.winner ? "FS" : "MISS",
        title: "Round " + (index + 1) + ": " + (entry.winner
            ? "Player " + entry.winner + (entry.time ? " (" + entry.time + " ms)" : " (opponent false start)")
            : "Neither player reacted"),
        cls: entry.winner ? "p" + entry.winner : ""
    })));

    lastResult = {
        text: summary + " Score: " + score,
        card: {
            modeLabel: "2-Player Duel",
            big: headline,
            unit: "",
            sub: outcome,
            rank: null,
            color: "#fbbf24",
            stats: [["PLAYER 1", String(duel.p1)], ["PLAYER 2", String(duel.p2)], ["FASTEST", fastest !== null ? fastest + " ms" : "--"]],
            bars: duel.rounds.map((entry) => ({ value: entry.time || 0 }))
        }
    };

    Fx.burst(40);
    revealResults();
    announce(summary + " " + score);
}

/* ---------- Share and save ---------- */

async function shareResult() {
    if (!lastResult) return;

    const url = location.href.split("#")[0];

    // Prefer sharing the result card image where the browser allows it.
    try {
        const blob = await Viz.cardBlob(lastResult.card);
        const file = new File([blob], "split-second.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Split Second", text: lastResult.text });
            return;
        }
    } catch (error) {
        if (error && error.name === "AbortError") return;
    }

    try {
        if (navigator.share) {
            await navigator.share({ title: "Split Second", text: lastResult.text, url });
            return;
        }
    } catch (error) {
        if (error && error.name === "AbortError") return;
    }

    try {
        await navigator.clipboard.writeText(lastResult.text + " " + url);
        toast("Result copied to clipboard");
    } catch (error) {
        toast("Couldn't copy - " + lastResult.text);
    }
}

async function saveImage() {
    if (!lastResult) return;

    try {
        const blob = await Viz.cardBlob(lastResult.card);
        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "split-second-result.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 2000);

        toast("Result image saved");
    } catch (error) {
        toast("Couldn't create the image");
    }
}

/* ---------- Events ---------- */

// pointerdown fires on touch / press, so it is ~50-100 ms quicker than "click".
gameArea.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("button")) return;
    if (state === "idle" || state === "finished") return;

    const point = { x: event.clientX, y: event.clientY };

    if (mode === "duel") {
        const box = gameArea.getBoundingClientRect();
        const side = event.clientX - box.left < box.width / 2 ? 1 : 2;
        handlePress(side, eventTime(event), point);
        return;
    }

    handlePress(0, eventTime(event), point);
});

document.addEventListener("keydown", (event) => {
    if (exitRunDialog.open) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const isSpace = event.code === "Space";
    const isEnterOnArea = event.code === "Enter" && event.target === gameArea;

    // Holding a key down must not count as extra presses.
    if (event.repeat) {
        if (isSpace && PLAY_STATES.includes(state)) event.preventDefault();
        return;
    }

    if (isSpace || isEnterOnArea) {
        if (event.target instanceof Element && event.target.closest("select")) return;

        const onControl = event.target instanceof Element &&
            event.target.closest("button, a, input, select, textarea");

        // Let a focused button work normally unless a round is running.
        if (onControl && !PLAY_STATES.includes(state)) return;

        event.preventDefault();

        if (state === "idle" || state === "finished") {
            startChallenge();
        } else if (mode !== "duel") {
            handlePress(0, eventTime(event), null);   // Space is a false start too
        }
        return;
    }

    if (mode === "duel" && PLAY_STATES.includes(state)) {
        if (event.code === "KeyQ") {
            event.preventDefault();
            handlePress(1, eventTime(event), null);
        } else if (event.code === "KeyP") {
            event.preventDefault();
            handlePress(2, eventTime(event), null);
        }
    }
});

startButton.addEventListener("click", startChallenge);
playAgain.addEventListener("click", startChallenge);
resetButton.addEventListener("click", () => confirmRunExit(resetValues));
shareButton.addEventListener("click", shareResult);
saveButton.addEventListener("click", saveImage);

soundButton.addEventListener("click", () => {
    store.muted = !store.muted;
    saveStore();
    renderSoundButton();
});

modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
});

themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
roundSelect.addEventListener("change", () => setRoundLimit(Number(roundSelect.value)));

// If the tab is hidden mid-round the player cannot see the signal, so
// that round is restarted when they come back.
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        if (["waiting", "signal", "ready", "decoy"].includes(state)) {
            cancelAll();
            suspended = true;
            state = "suspended";
        }
    } else if (suspended) {
        suspended = false;
        setArea();
        setIcon("");
        resetLights();
        setMessage("WELCOME BACK", "Restarting this round...");
        schedule(() => beginRound(true), 900);
    }
});

/* ---------- Start ---------- */

for (const [id, config] of Object.entries(THEMES)) {
    themeSelect.add(new Option(config.name, id));
}
roundSelect.value = String(roundLimit);
Fx.init();
renderSoundButton();
applyTheme(theme);
renderXp();
setMode(mode);
