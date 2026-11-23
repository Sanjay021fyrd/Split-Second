"use strict";

/* =========================================================
   Visual effects: hit impact, ambient background and
   micro-interactions. No game logic lives here.
   ========================================================= */

const Fx = (() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const stage = document.getElementById("stage");
    const area = document.getElementById("game-area");
    const layer = document.getElementById("fx");

    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    function restart(el, className) {
        el.classList.remove(className);
        void el.offsetWidth;   // force a reflow so the animation plays again
        el.classList.add(className);
    }

    function add(el, ms) {
        layer.appendChild(el);
        setTimeout(() => el.remove(), ms);
        return el;
    }

    function toLocal(point) {
        const box = area.getBoundingClientRect();
        if (!point) return { x: box.width / 2, y: box.height / 2, w: box.width, h: box.height };
        return { x: point.x - box.left, y: point.y - box.top, w: box.width, h: box.height };
    }

    // Centre of the left (side 1) or right (side 2) half, in client coordinates.
    function halfPoint(side) {
        const box = area.getBoundingClientRect();
        return { x: box.left + box.width * (side === 1 ? 0.25 : 0.75), y: box.top + box.height / 2 };
    }

    /* ---------- Impact effects ---------- */

    function ring(p, color) {
        if (reduced) return;

        [0, 0.12].forEach((delay) => {
            const el = document.createElement("b");
            el.className = "ring";
            el.style.left = p.x + "px";
            el.style.top = p.y + "px";
            el.style.animationDelay = delay + "s";
            if (color) el.style.setProperty("--rc", color);
            add(el, 1200);
        });
    }

    function flash(strength, color) {
        if (reduced) return;

        const el = document.createElement("i");
        el.className = "flash";
        el.style.setProperty("--fs", strength);
        if (color) el.style.background = color;
        add(el, 600);
    }

    function punch(scale) {
        if (reduced) return;
        stage.style.setProperty("--punch", scale);
        restart(stage, "punch");
    }

    function shake(px) {
        if (reduced) return;
        stage.style.setProperty("--shake", px + "px");
        restart(stage, "shake");
    }

    function speedLines() {
        if (reduced) return;
        const el = document.createElement("i");
        el.className = "speedlines";
        add(el, 800);
    }

    // A sword-cut streak (used by the Samurai theme).
    function slash(p, color, span) {
        if (reduced) return;

        const angle = rand(18, 38) * (Math.random() < 0.5 ? -1 : 1);

        [0, 0.08].forEach((delay, i) => {
            const el = document.createElement("i");
            el.className = "slash";
            el.style.left = p.x + "px";
            el.style.top = p.y + i * 9 + "px";
            el.style.width = (span || p.w * 1.3) + "px";
            el.style.setProperty("--ang", angle + i * 3 + "deg");
            el.style.setProperty("--sc", color || "#fff");
            el.style.animationDelay = delay + "s";
            add(el, 1000);
        });
    }

    function slashHalf(side, color) {
        const p = toLocal(halfPoint(side));
        slash(p, color, p.w * 0.62);
    }

    function burst(count = 30, colors) {
        if (reduced) return;

        const palette = colors || ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#f472b6"];

        for (let i = 0; i < count; i++) {
            const piece = document.createElement("i");
            const angle = Math.random() * Math.PI * 2;
            const distance = 90 + Math.random() * 190;

            piece.className = "spark";
            piece.style.setProperty("--dx", Math.cos(angle) * distance + "px");
            piece.style.setProperty("--dy", Math.sin(angle) * distance + "px");
            piece.style.setProperty("--r", Math.round(Math.random() * 720 - 360) + "deg");
            piece.style.setProperty("--c", palette[i % palette.length]);
            add(piece, 1100);
        }
    }

    let freezeTimer = 0;

    // Hit-stop: hold the frame for a beat so the press feels solid.
    function freeze(ms) {
        if (reduced) return;
        stage.classList.add("freeze");
        clearTimeout(freezeTimer);
        freezeTimer = setTimeout(() => stage.classList.remove("freeze"), ms);
    }

    function impact({ point, reaction, tier, style }) {
        const p = toLocal(point);
        const fast = reaction < 220;

        flash(fast ? 0.55 : 0.32);
        punch(fast ? 1.04 : 1.02);

        if (style === "slash") {
            slash(p, tier.color);
        } else {
            ring(p, tier.color);
        }

        if (fast) {
            speedLines();
            burst(reaction < 180 ? 26 : 14, [tier.color, "#ffffff"]);
        }

        if (reaction > 450) {
            shake(6);   // a slow reaction gets a small "ouch" wobble
        }
    }

    function clear() {
        layer.replaceChildren();
        clearTimeout(freezeTimer);
        stage.classList.remove("freeze", "shake", "punch");
    }

    /* ---------- Number roll (odometer feel) ---------- */

    function setText(el, value) {
        const text = String(value);

        if (el.dataset.v === text) return;
        el.dataset.v = text;

        if (reduced) {
            el.textContent = text;
            return;
        }

        const span = document.createElement("span");
        span.className = "roll";
        span.textContent = text;
        el.replaceChildren(span);
    }

    /* ---------- Micro-interactions ---------- */

    function initTilt() {
        if (reduced || coarse) return;

        let current = null;

        const reset = (el) => {
            if (!el) return;
            el.classList.remove("tilting");
            el.style.transform = "";
        };

        document.addEventListener("pointermove", (event) => {
            const el = event.target instanceof Element ? event.target.closest("[data-tilt]") : null;

            if (current && current !== el) reset(current);
            current = el;
            if (!el) return;

            const r = el.getBoundingClientRect();
            const px = (event.clientX - r.left) / r.width;
            const py = (event.clientY - r.top) / r.height;

            el.classList.add("tilting");
            el.style.transform =
                "perspective(700px) rotateX(" + ((0.5 - py) * 10).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 12).toFixed(2) + "deg)";
            el.style.setProperty("--mx", px * 100 + "%");
            el.style.setProperty("--my", py * 100 + "%");
        }, { passive: true });

        document.documentElement.addEventListener("mouseleave", () => {
            reset(current);
            current = null;
        });
    }

    function initMagnetic() {
        if (reduced || coarse) return;

        const selector = ".start-btn, .ghost-btn, .icon-btn";

        document.addEventListener("pointermove", (event) => {
            document.querySelectorAll(selector).forEach((button) => {
                const r = button.getBoundingClientRect();
                if (!r.width) return;

                const dx = event.clientX - (r.left + r.width / 2);
                const dy = event.clientY - (r.top + r.height / 2);
                const reach = Math.max(r.width, r.height) / 2 + 70;

                if (Math.hypot(dx, dy) < reach) {
                    button.style.setProperty("--tx", clamp(dx * 0.22, -9, 9) + "px");
                    button.style.setProperty("--ty", clamp(dy * 0.3, -8, 8) + "px");
                } else if (button.style.getPropertyValue("--tx")) {
                    button.style.removeProperty("--tx");
                    button.style.removeProperty("--ty");
                }
            });
        }, { passive: true });
    }

    function initRipple() {
        if (reduced) return;

        document.addEventListener("pointerdown", (event) => {
            const button = event.target instanceof Element
                ? event.target.closest(".start-btn, .ghost-btn, .mode-btn, .reset-btn, .icon-btn, .theme-btn")
                : null;
            if (!button) return;

            const r = button.getBoundingClientRect();
            const size = Math.max(r.width, r.height) * 2;
            const ripple = document.createElement("span");

            ripple.className = "ripple";
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = event.clientX - r.left - size / 2 + "px";
            ripple.style.top = event.clientY - r.top - size / 2 + "px";

            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 700);
        });
    }

    // A soft light that follows the pointer inside the game area.
    function initGlow() {
        area.addEventListener("pointermove", (event) => {
            const r = area.getBoundingClientRect();
            area.style.setProperty("--mx", event.clientX - r.left + "px");
            area.style.setProperty("--my", event.clientY - r.top + "px");
        }, { passive: true });
    }

    // The sliding highlight behind the active mode button.
    function movePill() {
        const pill = document.getElementById("mode-pill");
        const active = document.querySelector(".mode-btn.active");
        if (!pill || !active) return;

        pill.style.width = active.offsetWidth + "px";
        pill.style.height = active.offsetHeight + "px";
        pill.style.transform = "translate(" + active.offsetLeft + "px," + active.offsetTop + "px)";

        requestAnimationFrame(() => pill.classList.add("ready"));
    }

    /* ---------- Ambient background (canvas) ---------- */

    const Ambient = (() => {
        const canvas = document.getElementById("ambient");
        const ctx = canvas.getContext("2d");

        let w = 0;
        let h = 0;
        let theme = "neon";
        let items = [];
        let warpLevel = 0;
        let warpTarget = 0;
        let warpTimer = 0;
        let last = 0;
        let raf = 0;
        let colors = { a: "99,102,241", b: "6,182,212" };

        const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function make(initial) {
            if (theme === "space") {
                return { x: rand(-1, 1), y: rand(-1, 1), z: initial ? rand(0.05, 1) : 1,
                         tint: Math.random() < 0.7 ? "255,255,255" : "196,181,253" };
            }
            if (theme === "samurai") {
                return { x: rand(0, w), y: initial ? rand(-20, h) : -20, s: rand(0.4, 1),
                         r: rand(0, 6.28), v: rand(18, 42), sw: rand(0, 6.28), size: rand(5, 11) };
            }
            return { x: rand(0, w), y: initial ? rand(0, h) : h + 10, r: rand(1, 3),
                     v: rand(6, 18), ph: rand(0, 6.28) };
        }

        function seed() {
            const count = theme === "space" ? 130 : theme === "samurai" ? 34 : 55;
            items = Array.from({ length: count }, () => make(true));
        }

        function drawSpace(dt) {
            const cx = w / 2;
            const cy = h / 2;
            const k = Math.max(w, h) * 0.35;
            const speed = 0.015 + warpLevel * 1.1;

            ctx.lineCap = "round";

            for (const s of items) {
                const prevZ = s.z + speed * dt * (1 + warpLevel * 5);
                s.z -= speed * dt;

                const sx = cx + (s.x / s.z) * k;
                const sy = cy + (s.y / s.z) * k;

                if (s.z <= 0.03 || sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) {
                    Object.assign(s, make(false));
                    continue;
                }

                const px = cx + (s.x / prevZ) * k;
                const py = cy + (s.y / prevZ) * k;
                const alpha = Math.min(1, (1 - s.z) * 1.3 + 0.15);

                ctx.strokeStyle = "rgba(" + s.tint + "," + alpha.toFixed(2) + ")";
                ctx.lineWidth = (1 - s.z) * 2.2 + 0.4 + warpLevel * 1.2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            }
        }

        function drawPetals(dt) {
            for (const p of items) {
                p.sw += dt * 1.2;
                p.y += p.v * dt;
                p.x += Math.sin(p.sw) * 18 * dt + 8 * dt;
                p.r += dt * 0.8;

                if (p.y > h + 20 || p.x > w + 30) {
                    Object.assign(p, make(false));
                    p.x = rand(-30, w);
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = "rgba(251,113,133," + (0.15 + 0.35 * p.s).toFixed(2) + ")";
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        function drawMotes(dt, now) {
            for (const p of items) {
                p.y -= p.v * dt;
                p.x += Math.sin(now / 1500 + p.ph) * 6 * dt;

                if (p.y < -10) Object.assign(p, make(false));

                const alpha = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(now / 1200 + p.ph));
                ctx.fillStyle = "rgba(" + (p.ph > 3 ? colors.b : colors.a) + "," + alpha.toFixed(2) + ")";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function frame(dt, now) {
            warpLevel += (warpTarget - warpLevel) * Math.min(1, dt * 8);
            ctx.clearRect(0, 0, w, h);

            if (theme === "space") drawSpace(dt);
            else if (theme === "samurai") drawPetals(dt);
            else drawMotes(dt, now);
        }

        function loop(now) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
            last = now;
            frame(dt, now);
        }

        function start() {
            cancelAnimationFrame(raf);

            if (reduced) {
                frame(0.016, performance.now());   // one still frame
                return;
            }

            last = performance.now();
            raf = requestAnimationFrame(loop);
        }

        function setTheme(next) {
            theme = next;
            colors = { a: css("--accent-rgb") || "99,102,241", b: css("--accent2-rgb") || "6,182,212" };
            seed();
            start();
        }

        function warp() {
            if (reduced || theme !== "space") return;
            warpTarget = 1;
            clearTimeout(warpTimer);
            warpTimer = setTimeout(() => { warpTarget = 0; }, 650);
        }

        function init() {
            resize();
            window.addEventListener("resize", () => { resize(); seed(); if (reduced) start(); });

            document.addEventListener("visibilitychange", () => {
                if (document.hidden) cancelAnimationFrame(raf);
                else start();
            });
        }

        return { init, setTheme, warp };
    })();

    function init() {
        Ambient.init();
        initTilt();
        initMagnetic();
        initRipple();
        initGlow();

        movePill();
        window.addEventListener("resize", movePill);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    }

    return {
        reduced, init, restart, impact, ring, slash, slashHalf, flash, burst,
        shake, punch, freeze, clear, halfPoint, setText, movePill, ambient: Ambient
    };
})();
