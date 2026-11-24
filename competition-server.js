"use strict";

const { createHash, randomBytes, randomInt } = require("node:crypto");
const { mkdir, readFile, writeFile, rename, stat } = require("node:fs/promises");
const { join } = require("node:path");

module.exports = function createCompetition(profileDirectory) {
    const games = new Map();
    const file = join(profileDirectory, "competition-scores.json");
    let writes = Promise.resolve();
    const now = () => Date.now();
    const day = () => new Date().toISOString().slice(0, 10);
    const week = () => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
        return date.toISOString().slice(0, 10);
    };
    const median = (times) => [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
    const period = (mode) => mode === "daily" ? day() : week();

    const rewards = [
        { name: "Lightning", target: 200 },
        { name: "Quickdraw", target: 250 },
        { name: "Sharp Reflexes", target: 320 }
    ];
    const rewardFor = (score) => rewards.find(({ target }) => score < target) ?? null;
    const dailyAttempt = (date, id) => join(profileDirectory, "daily-attempts", date,
        createHash("sha256").update(id).digest("hex"));

    async function findDailyScore(date, id) {
        return (await readScores()).find((row) => row.mode === "daily" && row.period === date && row.id === id);
    }

    async function hasPlayedDaily(date, id) {
        try {
            await stat(dailyAttempt(date, id));
            return true;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        return Boolean(await findDailyScore(date, id));
    }

    async function readScores() {
        try { return JSON.parse(await readFile(file, "utf8")); }
        catch (error) { if (error.code !== "ENOENT") throw error; return []; }
    }

    function saveScore(game) {
        if (game.saving) return game.saving;
        if (game.mode === "duel" || game.results.some((round) => !round.times[0])) return;
        const times = game.results.map((round) => round.times[0]);
        const player = game.players[0];
        const operation = writes.then(async () => {
            const scores = (await readScores()).filter((row) => now() - Date.parse(row.period) < 21 * 86400000);
            const existing = scores.find((row) => row.id === player.id && row.mode === game.mode && row.period === game.period);
            const score = median(times);
            if (existing && (game.mode === "daily" || existing.score <= score)) return;
            if (existing) scores.splice(scores.indexOf(existing), 1);
            scores.push({ id: player.id, name: player.name, mode: game.mode, period: game.period, score });
            await mkdir(profileDirectory, { recursive: true, mode: 0o700 });
            await writeFile(file + ".tmp", JSON.stringify(scores), { mode: 0o600 });
            await rename(file + ".tmp", file);
        });
        writes = operation.catch(() => {});
        game.saving = operation.catch((error) => { game.saving = null; throw error; });
        return game.saving;
    }

    function startRound(game, time) {
        game.go = time + randomInt(1800, 4300);
        game.inputs = Array(game.players.length).fill(undefined);
        game.next = 0;
    }

    function advance(game, time) {
        if (!game.go || game.finished) return;
        if (!game.next && (time >= game.go + 3500 || game.inputs.every((input) => input !== undefined))) {
            const times = game.players.map((_, index) => game.inputs[index] ?? null);
            let winner = null;
            if (times.length === 2) {
                if (times[0] && (!times[1] || times[0] + 40 < times[1])) winner = 0;
                if (times[1] && (!times[0] || times[1] + 40 < times[0])) winner = 1;
            }
            game.results.push({ times, winner });
            if (game.results.length === game.limit) game.finished = true;
            else game.next = time + 900;
        }
        if (game.next && time >= game.next) startRound(game, time);
    }

    const expiry = setInterval(() => {
        for (const [code, game] of games) if (now() - game.touched > 15 * 60000) games.delete(code);
    }, 60000);
    expiry.unref();

    return async function competition(request, response, url, user, sessionId, origin, send) {
        const reply = (status, payload) => send(response, status, payload);
        const fail = (status, error) => reply(status, { error });
        const route = url.pathname.slice("/competition/".length);
        if (!user) return fail(401, "Sign in with Google to access practice and competition.");
        if (request.method === "GET" && route === "daily-status") {
            const date = day();
            const result = await findDailyScore(date, user.id);
            return reply(200, {
                played: Boolean(result) || await hasPlayedDaily(date, user.id),
                rewards,
                reward: result ? rewardFor(result.score) : null,
                resetsAt: Date.parse(date) + 86400000
            });
        }
        if (request.method === "GET" && route === "leaderboard") {
            const mode = url.searchParams.get("mode") === "daily" ? "daily" : "ranked";
            const current = period(mode);
            const rows = (await readScores()).filter((row) => row.mode === mode && row.period === current)
                .sort((a, b) => a.score - b.score).slice(0, 20).map(({ name, score }) => ({ name, score, reward: mode === "daily" ? rewardFor(score)?.name : undefined }));
            return reply(200, { period: current, rows });
        }

        const posting = request.method === "POST";
        if (posting && request.headers.origin !== origin) return fail(403, "Invalid request origin.");
        const time = now();
        const suppliedCode = (url.searchParams.get("code") || "").toUpperCase();
        let code = suppliedCode;
        let game = games.get(code);
        if (posting && route === "create") {
            const mode = url.searchParams.get("mode");
            if (!["duel", "daily", "ranked"].includes(mode)) return fail(400, "Choose a game mode.");
            const active = [...games.values()].filter((entry) => !entry.finished && entry.players.some((p) => p.id === user.id));
            if (active.length >= 4 || games.size >= 1000) return fail(429, "Close another match or try again shortly.");
            const current = period(mode);
            if (mode === "daily") {
                const used = () => fail(409, "Daily attempt used. The next challenge opens at 00:00 UTC.");
                if (await hasPlayedDaily(current, user.id)) return used();
                await mkdir(join(profileDirectory, "daily-attempts", current), { recursive: true, mode: 0o700 });
                try {
                    await mkdir(dailyAttempt(current, user.id), { mode: 0o700 });
                } catch (error) {
                    if (error.code === "EEXIST") return used();
                    throw error;
                }
            }
            do { code = randomBytes(4).toString("hex").toUpperCase(); } while (games.has(code));
            game = { mode, period: current, players: [{ id: user.id, name: user.name, sessionId }],
                limit: mode === "ranked" ? 5 : 3, touched: time, results: [], go: 0, finished: false };
            games.set(code, game);
            if (mode !== "duel") startRound(game, now());
        }
        if (!game) return fail(404, "Room or challenge expired. Start a new one.");
        let seat = game.players.findIndex((player) => player.sessionId === sessionId);
        if (posting && route === "join" && seat < 0) {
            if (game.mode !== "duel" || game.players.length === 2) return fail(409, "That room is full.");
            game.players.push({ id: user.id, name: user.name, sessionId });
            seat = 1;
            startRound(game, time);
        }
        if (seat < 0) return fail(403, "Join this room first.");
        if (posting && route === "leave") {
            games.delete(code);
            return reply(200, {});
        }
        if (!(posting && ["create", "join", "hit"].includes(route)) && !(request.method === "GET" && route === "state")) {
            return fail(405, "Unsupported action.");
        }
        game.touched = time;
        advance(game, time);
        const round = game.results.length + 1;
        if (posting && route === "hit" && game.go && !game.finished && !game.next &&
            Number(url.searchParams.get("round")) === round && game.inputs[seat] === undefined) {
            const elapsed = Number(url.searchParams.get("ms"));
            // The client measures from the first visible GO frame. Reject impossible times
            // and played-early inputs, while accommodating delivery and display latency.
            game.inputs[seat] = Number.isInteger(elapsed) && elapsed >= 100 && elapsed <= 3000 &&
                time >= game.go + elapsed && time <= game.go + 3500 ? elapsed : null;
            advance(game, time);
        }
        if (game.finished) await saveScore(game);
        const dailyReward = game.mode === "daily" && game.finished && game.results.every((round) => round.times[0])
            ? rewardFor(median(game.results.map((round) => round.times[0])))
            : null;
        const phase = game.finished ? "finished" : !game.go ? "lobby" : game.next ? "between" :
            game.inputs[seat] !== undefined ? "recorded" : time >= game.go ? "go" : "wait";
        return reply(200, { code, seat, phase, round: Math.min(game.results.length + (game.next || game.finished ? 0 : 1), game.limit),
            limit: game.limit, mode: game.mode, players: game.players.map((p) => p.name), results: game.results, dailyReward });
    };
};
