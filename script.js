"use strict";

/* =========================================================
   Split Second - game logic
   Modes: Classic, Lights Out, Go / No-Go, 2-Player Duel
   Effects live in fx.js, result visuals in viz.js.
   ========================================================= */

/* ---------- Config ---------- */

const TOTAL_ROUNDS = 5;        // classic, lights out, go/no-go
const DUEL_WINS = 3;
const MIN_DELAY = 2000;        // random wait before the signal (ms)
const MAX_DELAY = 5000;
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
        intro: "Green means GO. Purple means HOLD - don't touch it!",
        start: "START CHALLENGE",
        controls: "CLICK / TAP / SPACE",
        label: "GO / NO-GO COMPLETE"
    },
    duel: {
        short: "Duel",
        intro: "Two players, one screen. First to " + DUEL_WINS + " round wins.",
        start: "START DUEL",
        controls: "P1: Q or tap left  ·  P2: P or tap right",
        label: "DUEL COMPLETE"
    }
};

const THEMES = {
    neon:    { name: "Neon Arcade", level: 1, bg: "#050816", wait: "WAIT...",   go: "CLICK!",   goSub: "NOW!",    impact: "ring" },
    samurai: { name: "Samurai",     level: 2, bg: "#12060a", wait: "STEADY...", go: "DRAW!",    goSub: "STRIKE!", impact: "slash" },
    space:   { name: "Deep Space",  level: 3, bg: "#02030d", wait: "STANDBY...", go: "LAUNCH!", goSub: "ENGAGE!", impact: "ring" }
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
const themeButtons = document.querySelectorAll(".theme-btn");
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
    const store = { bestSingle: null, bestAvg: {}, history: [], muted: false, mode: "classic", theme: "neon", xp: 0 };

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
    if (!THEMES[store.theme]) store.theme = "neon";
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
let theme = store.theme;
let state = "idle";   // idle | waiting | signal | ready | decoy | between | false-start | suspended | finished
let round = 0;
let streak = 0;
let times = [];
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
            audioCtx.resume();
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

const SOUNDS = {
    go() { tone(880, 0, 0.14, "square", 0.07); },
    tick(i) { tone(300 + i * 80, 0, 0.1, "square", 0.05); },
    decoy() { tone(330, 0, 0.1, "triangle", 0.12); tone(330, 0.17, 0.1, "triangle", 0.12); },
    hit() { tone(660, 0, 0.09, "sine", 0.12); tone(990, 0.08, 0.14, "sine", 0.12); },
    thud() { tone(95, 0, 0.2, "sine", 0.3); tone(55, 0, 0.28, "sine", 0.25); },
    fail() { tone(190, 0, 0.22, "sawtooth", 0.09); tone(130, 0.12, 0.3, "sawtooth", 0.09); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.12)); }
};

function play(name, arg) {
    ensureAudio();
    if (SOUNDS[name]) SOUNDS[name](arg);
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

    renderThemeButtons();
}

function awardXp(amount) {
    const before = levelOf(store.xp);

    store.xp += Math.max(0, Math.round(amount));
    saveStore();
    renderXp();

    const after = levelOf(store.xp);
    if (after > before) pendingLevel = after;
}

function renderThemeButtons() {
    const level = levelOf(store.xp);

    themeButtons.forEach((button) => {
        const id = button.dataset.theme;
        const info = THEMES[id];
        const locked = level < info.level;

        button.classList.toggle("locked", locked);
        button.setAttribute("aria-pressed", String(id === theme));
        button.title = locked ? info.name + " - unlocks at level " + info.level : info.name;
        button.setAttribute("aria-label", button.title);
    });
}

function applyTheme(id) {
    if (!THEMES[id] || levelOf(store.xp) < THEMES[id].level) id = "neon";

    theme = id;
    store.theme = id;
    saveStore();

    document.documentElement.dataset.theme = id;
    $("meta-theme").setAttribute("content", THEMES[id].bg);

    Fx.ambient.setTheme(id);
    renderThemeButtons();
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

    const unlocked = Object.values(THEMES).filter((info) => info.level === level);
    const sub = unlocked.length ? unlocked.map((info) => info.name).join(", ") + " theme unlocked!" : "Keep going!";

    showBanner("LEVEL UP · LV " + level, sub);
    Fx.burst(40);
    play("win");
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
        Fx.setText(roundDisplay, round > 0 ? String(round) : "-");
        hud2Label.textContent = "P1 · Q";
        Fx.setText(comboDisplay, String(duel.p1));
        hud3Label.textContent = "P2 · P";
        Fx.setText(bestDisplay, String(duel.p2));
        return;
    }

    hud1Label.textContent = "ROUND";
    Fx.setText(roundDisplay, Math.min(round, TOTAL_ROUNDS) + " / " + TOTAL_ROUNDS);
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
    cancelAll();
    Fx.clear();

    state = "idle";
    round = 0;
    streak = 0;
    times = [];
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
    resetValues();
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

    if (mode === "duel") {
        setProgress(Math.max(duel.p1, duel.p2) / DUEL_WINS);
        setMessage(T().wait, "Don't press until the screen turns green!");
    } else if (mode === "lights") {
        setProgress((round - 1) / TOTAL_ROUNDS);
        setMessage(T().wait, "Wait for the lights to go OUT.");
    } else {
        setProgress((round - 1) / TOTAL_ROUNDS);
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
        play("tick", i);
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

    play("go");
    if (theme === "space") Fx.ambient.warp();

    // Start the clock when the green frame is actually drawn, not when this
    // code runs, so the screen-refresh delay is not counted against the player.
    rafId = requestAnimationFrame(() => {
        startTime = performance.now();
        state = "ready";
    });
}

function showDecoy() {
    state = "decoy";
    decoysThisRound++;

    setArea("decoy");
    setIcon("✋");
    setMessage("HOLD!", "Decoy - do NOT click.");
    speedLabel.textContent = "HOLD STILL";

    play("decoy");

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

    if (state === "ready") {
        const reaction = Math.round(ts - startTime);

        if (reaction < ANTICIPATION_MS) {
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

    times.push(reaction);
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
    play("thud");

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
    setProgress(round / TOTAL_ROUNDS);
    renderStats();
    renderHud();

    play("hit");

    if (round >= TOTAL_ROUNDS) {
        schedule(showResults, 1100);
    } else {
        schedule(beginRound, BETWEEN_MS);
    }
}

// A false start no longer ends the whole run: the same round is replayed.
function falseStart(title, sub) {
    cancelAll();

    state = "false-start";
    falseStarts++;
    streak = 0;

    setArea("too-early");
    setIcon("✖");
    setMessage(title, sub + " Same round again...");

    speedMeter.style.width = "0%";
    speedLabel.textContent = "FALSE START";

    renderHud();
    Fx.shake(12);
    Fx.flash(0.3, "#ef4444");
    play("fail");
    vibrate([80, 40, 80]);

    schedule(() => beginRound(true), FALSE_START_MS);
}

/* ---------- Duel ---------- */

function duelPress(side, ts) {
    if (side !== 1 && side !== 2) return;

    const other = side === 1 ? 2 : 1;

    if (state === "waiting" || state === "decoy") {
        duelPoint(other, null, "Player " + side + " jumped the gun!");
        return;
    }

    if (state === "ready") {
        const reaction = Math.round(ts - startTime);

        if (reaction < ANTICIPATION_MS) {
            duelPoint(other, null, "Player " + side + " guessed too early!");
        } else {
            duelPoint(side, reaction, reaction + " ms");
        }
    }
}

function duelPoint(winner, reaction, note) {
    cancelAll();

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
    setProgress(Math.max(duel.p1, duel.p2) / DUEL_WINS);
    renderHud();

    if (reaction !== null) {
        Fx.impact({ point: Fx.halfPoint(winner), reaction, tier: tierFor(reaction), style: "ring" });
        if (theme === "samurai") Fx.slashHalf(winner === 1 ? 2 : 1, "#e11d48");
        Fx.freeze(HIT_STOP_MS);
        play("thud");
        play("hit");
    } else {
        Fx.shake(12);
        Fx.flash(0.3, "#ef4444");
        play("fail");
        vibrate([80, 40, 80]);
    }

    if (duel.p1 >= DUEL_WINS || duel.p2 >= DUEL_WINS) {
        schedule(showDuelResults, 1200);
    } else {
        schedule(beginRound, 1600);
    }
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

    const average = Math.round(mean(times));
    const fastest = Math.min(...times);
    const tier = tierFor(average);
    const percent = percentFaster(average);

    const previousBest = store.bestAvg[mode];
    const brokeAverage = typeof previousBest === "number" && average < previousBest;
    const brokeSingle = runStartBest !== null && fastest < runStartBest;

    if (typeof previousBest !== "number" || average < previousBest) {
        store.bestAvg[mode] = average;
    }

    store.history.unshift({ mode, avg: average, fastest, rank: tier.rank, at: Date.now() });
    store.history.length = Math.min(store.history.length, 20);

    // Bonus XP for finishing, and for a clean run.
    awardXp(50 + (falseStarts === 0 ? 25 : 0));
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
        ["FALSE STARTS", String(falseStarts)]
    ];

    if (mode === "gonogo") {
        grid.push(["DECOYS DODGED", String(decoysDodged)]);
    }

    renderGrid(grid);

    barsTitle.textContent = "ROUND PERFORMANCE";
    renderBars(times.map((time, index) => ({
        label: "R" + (index + 1),
        value: time,
        text: String(time),
        title: "Round " + (index + 1) + ": " + time + " ms"
    })));

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
            bars: times.map((time) => ({ value: time }))
        }
    };

    revealResults();
    Viz.show(average, percent);

    // The rank "stamps" onto the screen once the number has counted up.
    stampTimer = setTimeout(() => {
        Viz.stamp(tier.rank);
        play("thud");

        if (tier.rank === "S" || tier.rank === "A" || brokeAverage || brokeSingle) {
            Fx.burst(36, [tier.color, "#ffffff", "#f472b6"]);
            play("win");
        }
    }, reducedMotion ? 0 : 900);

    setTimeout(announceLevelUp, reducedMotion ? 0 : 1900);

    announce("Result: " + average + " milliseconds average, rank " + tier.rank + ". " + tier.title + ".");
}

function showDuelResults() {
    state = "finished";

    const winner = duel.p1 > duel.p2 ? 1 : 2;
    const loserScore = winner === 1 ? duel.p2 : duel.p1;
    const fastest = times.length ? Math.min(...times) : null;

    resultIcon.textContent = "🏆";
    resultLabel.textContent = MODES.duel.label;
    finalScore.textContent = "PLAYER " + winner;
    finalRating.textContent = "WINS " + duel["p" + winner] + " - " + loserScore;
    finalDescription.textContent = fastest !== null
        ? "Fastest winning reaction: " + fastest + " ms."
        : "Won on false starts - nobody was fast enough!";

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
        text: entry.time ? String(entry.time) : "FS",
        title: "Round " + (index + 1) + ": Player " + entry.winner
            + (entry.time ? " (" + entry.time + " ms)" : " (opponent false start)"),
        cls: entry.winner === 1 ? "p1" : "p2"
    })));

    lastResult = {
        text: "Player " + winner + " won a Split Second duel "
            + duel.p1 + "-" + duel.p2 + " ⚡ Think you're faster?",
        card: {
            modeLabel: "2-Player Duel",
            big: "PLAYER " + winner,
            unit: "",
            sub: "WINS " + duel["p" + winner] + " - " + loserScore,
            rank: null,
            color: "#fbbf24",
            stats: [["PLAYER 1", String(duel.p1)], ["PLAYER 2", String(duel.p2)], ["FASTEST", fastest !== null ? fastest + " ms" : "--"]],
            bars: duel.rounds.map((entry) => ({ value: entry.time || 0 }))
        }
    };

    Fx.burst(40);
    play("win");
    revealResults();
    announce("Player " + winner + " wins the duel " + duel.p1 + " to " + duel.p2 + ".");
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
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const isSpace = event.code === "Space";
    const isEnterOnArea = event.code === "Enter" && event.target === gameArea;

    // Holding a key down must not count as extra presses.
    if (event.repeat) {
        if (isSpace && PLAY_STATES.includes(state)) event.preventDefault();
        return;
    }

    if (isSpace || isEnterOnArea) {
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
resetButton.addEventListener("click", resetValues);
shareButton.addEventListener("click", shareResult);
saveButton.addEventListener("click", saveImage);

soundButton.addEventListener("click", () => {
    store.muted = !store.muted;
    saveStore();
    renderSoundButton();
    play("hit");
});

modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
});

themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const id = button.dataset.theme;
        const info = THEMES[id];

        if (levelOf(store.xp) < info.level) {
            toast("Reach level " + info.level + " to unlock the " + info.name + " theme");
            return;
        }

        applyTheme(id);
        toast(info.name + " theme");
    });
});

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

Fx.init();
renderSoundButton();
applyTheme(theme);
renderXp();
setMode(mode);

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
