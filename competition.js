"use strict";

(() => {
    const element = (id) => document.getElementById(id);
    const panel = element("competition");
    const arena = element("competition-arena");
    const signal = element("competition-signal");
    const status = element("competition-status");
    const results = element("competition-results");
    const board = element("competition-board");
    let code = "";
    let generation = 0;
    let timer;
    let frame;
    let shownAt = 0;
    let snapshot;
    let guest = false;
    let sent = false;
    let loading = false;
    let dailyCard = null;
    const dailyButton = element("competition-daily");
    let dailyStatusRequest = 0;

    async function refreshDaily() {
        const token = ++dailyStatusRequest;
        try {
            const data = await api("daily-status", {});
            if (token !== dailyStatusRequest) return;
            dailyButton.disabled = data.played;
            element("competition-daily-action").textContent = data.played ? "Attempt used" : "Play today";
            const targets = data.rewards.map(({ name, target }) => name + " under " + target + " ms").join(" • ");
            element("competition-daily-targets").textContent =
                (data.played ? "Next attempt at 00:00 UTC. " : "Starting uses today's attempt. ") +
                "Daily badges by median (3 valid rounds): " + targets + ".";
        } catch {
            // The server still enforces the limit when a run starts.
        }
    }

    async function api(route, params, method = "GET") {
        const response = await fetch("/competition/" + route + "?" + new URLSearchParams(params), {
            method, cache: "no-store", signal: AbortSignal.timeout(5000)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not reach the game server.");
        return data;
    }

    function showSignal(label, phase) {
        signal.textContent = label;
        signal.dataset.phase = phase;
    }

    function stop() {
        generation++;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        shownAt = 0;
        snapshot = null;
        competitionRun = null;
        sent = false;
    }

    function openArena() {
        stop();
        results.replaceChildren();
        dailyCard = null;
        element("competition-share").hidden = true;
        const game = element("game");
        if (!game.hidden) resetValues();
        panel.dataset.playing = "true";
        game.hidden = true;
        arena.hidden = false;
        arena.scrollIntoView({ block: "nearest" });
        showSignal("WAIT", "wait");
        signal.focus({ preventScroll: true });
    }

    function finishGuest(label) {
        stop();
        showSignal("PLAY AGAIN", "finished");
        status.textContent = label;
    }

    function startGuest() {
        guest = true;
        code = "";
        openArena();
        competitionRun = "practice";
        status.textContent = "Practice • 1 round";
        timer = setTimeout(() => {
            showSignal("CLICK!", "go");
            frame = requestAnimationFrame(() => {
                shownAt = performance.now();
                timer = setTimeout(() => finishGuest("Missed. Try another round."), 3000);
            });
        }, 1700 + Math.random() * 2100);
    }

    function formatResults(state) {
        const own = state.results.map((row) => row.times[state.seat]);
        results.replaceChildren(...own.map((time, index) => {
            const row = document.createElement("li");
            const duelRound = state.results[index];
            row.textContent = "Round " + (index + 1) + " · " + (time ? time + " ms" : "Missed or early")
                + (state.mode === "duel" ? " · " + (duelRound.winner === null ? "Draw" : state.players[duelRound.winner] + " wins") : "");
            return row;
        }));
        if (state.mode === "duel") {
            const wins = state.players.map((_, index) => state.results.filter((row) => row.winner === index).length);
            return "Duel complete · " + state.players.map((player, index) => player + " " + wins[index]).join(" – ");
        }
        if (own.some((time) => !time)) return "All rounds complete. A score requires a valid reaction in every round.";
        const sorted = [...own].sort((a, b) => a - b);
        return "Median: " + sorted[Math.floor(sorted.length / 2)] + " ms";
    }

    async function refreshBoard() {
        try {
            const mode = element("competition-board-mode").value;
            const data = await api("leaderboard", { mode });
            if (mode !== element("competition-board-mode").value) return;
            board.replaceChildren(...data.rows.map(({ name, score, reward }) => {
                const row = document.createElement("li");
                row.textContent = name + " · " + score + " ms" + (reward ? " · " + reward : "");
                return row;
            }));
            element("competition-board-note").textContent = (mode === "daily" ? "UTC date " : "Week starting ") +
                data.period + (data.rows.length ? "" : " · No scores yet");
        } catch {
            element("competition-board-note").textContent = "Leaderboard unavailable. Select a board to retry.";
        }
    }

    function render(state) {
        const previous = snapshot;
        snapshot = state;
        if (!previous || state.round !== previous.round) sent = false;
        if (state.phase === "lobby") {
            status.textContent = "Share room code " + state.code + " with your friend.";
            showSignal("WAITING FOR PLAYER", "wait");
            return;
        }
        if (state.phase === "finished") {
            const summary = formatResults(state);
            stop();
            showSignal("COMPLETE", "finished");
            status.textContent = summary;
            if (state.mode === "daily") {
                const share = element("competition-share");
                const badge = state.dailyReward?.name;
                if (badge) status.textContent += " · " + badge + " badge earned";
                else if (state.results.every((row) => row.times[state.seat])) status.textContent += " · No badge earned";
                const times = state.results.map((row) => row.times[state.seat]);
                const valid = times.filter(Boolean);
                dailyCard = {
                    modeLabel: "DAILY CHALLENGE", big: valid.length === times.length ? summary.match(/\d+/)[0] : "COMPLETE",
                    unit: valid.length === times.length ? "ms" : "", sub: badge || "3-ROUND CLASSIC", rank: null, color: "#72ba57",
                    stats: [["VALID ROUNDS", valid.length + " / " + times.length]],
                    bars: times.map((time) => ({ value: time || 0 }))
                };
                share.hidden = false;
            }
            refreshBoard();
            return;
        }

        status.textContent = "Round " + state.round + " / " + state.limit;
        if (state.phase === "go" && !sent) {
            if (previous?.phase !== "go" || previous?.round !== state.round) {
                showSignal("CLICK!", "go");
                frame = requestAnimationFrame(() => { shownAt = performance.now(); });
            }
        } else {
            cancelAnimationFrame(frame);
            shownAt = 0;
            const ready = state.phase === "recorded" || state.phase === "between" || sent;
            showSignal(ready ? "RECORDED" : "WAIT", "wait");
        }
    }

    function watch(token) {
        timer = setTimeout(async () => {
            if (token !== generation) return;
            if (sent && loading) return watch(token);
            try {
                const state = await api("state", { code });
                if (token !== generation || loading) {
                    if (token === generation) watch(token);
                    return;
                }
                render(state);
                if (token === generation) watch(token);
            } catch (error) {
                if (token !== generation) return;
                stop();
                showSignal("DISCONNECTED", "finished");
                status.textContent = error.message;
            }
        }, snapshot?.phase === "lobby" ? 800 : 110);
    }

    async function startOnline(route, params) {
        if (loading || code) return;
        loading = true;
        guest = false;
        openArena();
        const token = generation;
        competitionRun = params.mode || "duel";
        status.textContent = "Connecting…";
        try {
            const state = await api(route, params, "POST");
            if (token !== generation) {
                api("leave", { code: state.code }, "POST").catch(() => {});
                return;
            }
            code = state.code;
            render(state);
            watch(token);
        } catch (error) {
            if (token === generation) {
                competitionRun = null;
                showSignal("UNAVAILABLE", "finished");
                status.textContent = error.message;
            }
        } finally {
            loading = false;
            if (params.mode === "daily") refreshDaily();
        }
    }

    async function press() {
        if (guest) {
            if (signal.dataset.phase === "finished") return startGuest();
            const ms = shownAt ? Math.round(performance.now() - shownAt) : 0;
            finishGuest(ms >= 100 ? ms + " ms" : "Too early. Wait for CLICK!");
            return;
        }
        if (!snapshot || sent || loading || !["wait", "go"].includes(snapshot.phase)) return;
        const ms = shownAt ? Math.round(performance.now() - shownAt) : 0;
        const token = generation;
        sent = true;
        loading = true;
        try {
            const state = await api("hit", { code, round: snapshot.round, ms }, "POST");
            if (token === generation) render(state);
        } catch (error) {
            if (token === generation) {
                stop();
                showSignal("DISCONNECTED", "finished");
                status.textContent = error.message;
            }
        } finally { loading = false; }
    }

    element("competition-practice").addEventListener("click", () => confirmRunExit(startGuest));
    element("competition-weekly").addEventListener("click", () => confirmRunExit(() => startOnline("create", { mode: "ranked" })));
    dailyButton.addEventListener("click", () => confirmRunExit(() => startOnline("create", { mode: "daily" })));
    element("competition-create").addEventListener("click", () => confirmRunExit(() => startOnline("create", { mode: "duel" })));
    element("competition-join").addEventListener("submit", (event) => {
        event.preventDefault();
        const room = element("competition-room").value.trim();
        confirmRunExit(() => startOnline("join", { code: room }));
    });
    signal.addEventListener("click", press);
    signal.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        press();
    });
    signal.addEventListener("click", (event) => { if (event.detail !== 0) event.stopImmediatePropagation(); }, true);
    element("competition-back").addEventListener("click", () => confirmRunExit(() => {
        const former = code;
        stop();
        code = "";
        guest = false;
        delete panel.dataset.playing;
        arena.hidden = true;
        element("competition-share").hidden = true;
        element("game").hidden = !panel.dataset.signedIn;
        if (former) api("leave", { code: former }, "POST").catch(() => {});
        refreshDaily();
    }));
    element("competition-share").addEventListener("click", async () => {
        if (!dailyCard) return;
        try {
            const blob = await Viz.cardBlob(dailyCard);
            const file = new File([blob], "split-second-daily.png", { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: "Split Second Daily" });
                return;
            }
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
            status.textContent = "Daily result card saved.";
        } catch (error) {
            if (error.name !== "AbortError") status.textContent = "Could not share your result card.";
        }
    });
    element("competition-board-mode").addEventListener("change", refreshBoard);
    refreshBoard();
    refreshDaily();
    window.addEventListener("focus", refreshDaily);
    setInterval(refreshDaily, 60000);
})();
