"use strict";

/* =========================================================
   Result visuals: speed gauge, bell curve, rank stamp and
   the shareable result card (drawn on a canvas).
   ========================================================= */

const Viz = (() => {
    const $ = (id) => document.getElementById(id);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gaugeArc = $("gauge-arc");
    const gaugeNeedle = $("gauge-needle");
    const gaugeReadout = $("gauge-readout");

    const bellLine = $("bell-line");
    const bellArea = $("bell-area");
    const bellShade = $("bell-shade");
    const bellMarker = $("bell-marker");
    const bellDrop = $("bell-drop");
    const bellStem = $("bell-stem");
    const bellCaption = $("bell-caption");
    const rankBox = $("rank-box");

    let readoutRaf = 0;

    /* ---------- Gauge ---------- */

    // 100 ms (fast) = full right, 600 ms (slow) = full left.
    const gaugeFraction = (ms) => clamp(1 - (ms - 100) / 500, 0, 1);

    function showGauge(ms) {
        const t = gaugeFraction(ms);

        cancelAnimationFrame(readoutRaf);

        gaugeArc.style.transition = "none";
        gaugeArc.style.strokeDashoffset = "100";
        gaugeNeedle.style.transition = "none";
        gaugeNeedle.style.transform = "rotate(-90deg)";
        void gaugeNeedle.getBoundingClientRect();

        const angle = -90 + t * 180;

        if (reduced) {
            gaugeArc.style.strokeDashoffset = String(100 - t * 100);
            gaugeNeedle.style.transform = "rotate(" + angle + "deg)";
            gaugeReadout.textContent = ms + " ms";
            return;
        }

        gaugeArc.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.2,.9,.3,1)";
        gaugeArc.style.strokeDashoffset = String(100 - t * 100);
        gaugeNeedle.style.transition = "transform 1.3s cubic-bezier(.2,1.5,.4,1)";
        gaugeNeedle.style.transform = "rotate(" + angle + "deg)";

        const t0 = performance.now();
        const from = 600;

        const step = (now) => {
            const k = Math.min(1, (now - t0) / 1300);
            const eased = 1 - Math.pow(1 - k, 3);
            gaugeReadout.textContent = Math.round(from + (ms - from) * eased) + " ms";
            if (k < 1) readoutRaf = requestAnimationFrame(step);
        };

        readoutRaf = requestAnimationFrame(step);
    }

    /* ---------- Bell curve ---------- */

    const BELL = { min: 130, max: 420, mean: 270, sd: 45, width: 300, base: 108, top: 22 };

    const bellX = (ms) => ((clamp(ms, BELL.min, BELL.max) - BELL.min) / (BELL.max - BELL.min)) * BELL.width;
    const bellY = (ms) =>
        BELL.base - Math.exp(-0.5 * Math.pow((ms - BELL.mean) / BELL.sd, 2)) * (BELL.base - BELL.top);

    const fmt = (n) => n.toFixed(1);

    function curve(from, to) {
        const points = [];

        for (let ms = from; ms < to; ms += 3) {
            points.push([bellX(ms), bellY(ms)]);
        }
        points.push([bellX(to), bellY(to)]);

        return points;
    }

    function pathOf(points) {
        return points.map((p, i) => (i ? "L" : "M") + fmt(p[0]) + " " + fmt(p[1])).join(" ");
    }

    function buildBell() {
        const all = curve(BELL.min, BELL.max);
        bellLine.setAttribute("d", pathOf(all));
        bellArea.setAttribute("d", pathOf(all) + " L" + BELL.width + " " + BELL.base + " L0 " + BELL.base + " Z");
    }

    function showBell(ms, percent) {
        const x = bellX(ms);
        const y = bellY(ms);
        const slower = curve(clamp(ms, BELL.min, BELL.max), BELL.max);

        // Shade everyone who is slower than you.
        bellShade.setAttribute(
            "d",
            "M" + fmt(x) + " " + BELL.base + " " +
            slower.map((p) => "L" + fmt(p[0]) + " " + fmt(p[1])).join(" ") +
            " L" + BELL.width + " " + BELL.base + " Z"
        );

        bellMarker.setAttribute("transform", "translate(" + fmt(x) + " " + fmt(y) + ")");
        bellStem.setAttribute("y2", fmt(BELL.base - y));
        bellCaption.textContent = "Faster than about " + percent + "% of players";

        if (!reduced) {
            bellDrop.classList.remove("drop");
            void bellDrop.getBoundingClientRect();
            bellDrop.classList.add("drop");
        }
    }

    function show(ms, percent) {
        showGauge(ms);
        showBell(ms, percent);
    }

    function stamp(rank) {
        rankBox.dataset.rank = rank;
        rankBox.classList.remove("stamp");
        void rankBox.offsetWidth;
        rankBox.classList.add("stamp");
    }

    /* ---------- Share card ---------- */

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /* data: { modeLabel, big, unit, sub, rank, color, stats:[[label,value]], bars:[{value,text}] } */
    function cardBlob(data) {
        const W = 1080;
        const H = 1080;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;

        const ctx = canvas.getContext("2d");
        const css = getComputedStyle(document.documentElement);
        const get = (name) => css.getPropertyValue(name).trim();
        const accent = get("--accent") || "#6366f1";
        const accent2 = get("--accent-2") || "#06b6d4";
        const rgb1 = get("--accent-rgb") || "99,102,241";
        const rgb2 = get("--accent2-rgb") || "6,182,212";
        const color = data.color || "#a5b4fc";
        const font = "'Segoe UI', Arial, sans-serif";

        // background
        ctx.fillStyle = get("--bg") || "#050816";
        ctx.fillRect(0, 0, W, H);

        let glow = ctx.createRadialGradient(150, 130, 0, 150, 130, 760);
        glow.addColorStop(0, "rgba(" + rgb1 + ",.38)");
        glow.addColorStop(1, "rgba(" + rgb1 + ",0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        glow = ctx.createRadialGradient(960, 960, 0, 960, 960, 700);
        glow.addColorStop(0, "rgba(" + rgb2 + ",.3)");
        glow.addColorStop(1, "rgba(" + rgb2 + ",0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // panel
        roundRect(ctx, 50, 50, W - 100, H - 100, 48);
        ctx.fillStyle = "rgba(15,23,42,.72)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.12)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // brand
        const brand = ctx.createLinearGradient(90, 90, 170, 170);
        brand.addColorStop(0, accent);
        brand.addColorStop(1, accent2);
        roundRect(ctx, 90, 95, 78, 78, 20);
        ctx.fillStyle = brand;
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "700 44px " + font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⚡", 129, 136);

        ctx.textAlign = "left";
        ctx.font = "800 52px " + font;
        ctx.fillText("SPLIT SECOND", 192, 136);

        ctx.textAlign = "right";
        ctx.font = "700 28px " + font;
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(data.modeLabel.toUpperCase(), W - 90, 136);

        // big number
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.shadowColor = color;
        ctx.shadowBlur = 50;
        ctx.fillStyle = color;

        if (data.unit) {
            ctx.font = "900 210px " + font;
            const numberWidth = ctx.measureText(data.big).width;
            ctx.font = "800 70px " + font;
            const unitWidth = ctx.measureText(" " + data.unit).width;
            const startX = W / 2 - (numberWidth + unitWidth) / 2;

            ctx.textAlign = "left";
            ctx.font = "900 210px " + font;
            ctx.fillText(data.big, startX, 450);
            ctx.font = "800 70px " + font;
            ctx.fillText(" " + data.unit, startX + numberWidth, 450);
        } else {
            ctx.font = "900 130px " + font;
            ctx.fillText(data.big, W / 2, 440);
        }

        ctx.shadowBlur = 0;
        ctx.textAlign = "center";
        ctx.font = "800 40px " + font;
        ctx.fillStyle = "#86efac";
        ctx.fillText(data.sub, W / 2, 525);

        // rank badge
        if (data.rank) {
            const g = ctx.createLinearGradient(440, 560, 640, 760);
            g.addColorStop(0, accent);
            g.addColorStop(1, accent2);

            ctx.beginPath();
            ctx.arc(W / 2, 660, 92, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,.05)";
            ctx.fill();
            ctx.lineWidth = 8;
            ctx.strokeStyle = g;
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = "900 120px " + font;
            ctx.textBaseline = "middle";
            ctx.fillText(data.rank, W / 2, 668);
        } else {
            ctx.font = "120px " + font;
            ctx.textBaseline = "middle";
            ctx.fillText("🏆", W / 2, 668);
        }

        // stats
        const stats = data.stats.slice(0, 3);
        const boxW = 270;
        const gap = 24;
        const total = stats.length * boxW + (stats.length - 1) * gap;
        let x = W / 2 - total / 2;

        stats.forEach(([label, value]) => {
            roundRect(ctx, x, 790, boxW, 120, 22);
            ctx.fillStyle = "rgba(255,255,255,.06)";
            ctx.fill();

            ctx.textBaseline = "alphabetic";
            ctx.textAlign = "center";
            ctx.fillStyle = "#94a3b8";
            ctx.font = "800 22px " + font;
            ctx.fillText(label, x + boxW / 2, 832);
            ctx.fillStyle = "#f8fafc";
            ctx.font = "800 40px " + font;
            ctx.fillText(value, x + boxW / 2, 884);

            x += boxW + gap;
        });

        // mini bars
        if (data.bars && data.bars.length) {
            const n = data.bars.length;
            const bw = 100;
            const bgap = 26;
            const bTotal = n * bw + (n - 1) * bgap;
            const max = Math.max(1, ...data.bars.map((b) => b.value || 0));
            let bx = W / 2 - bTotal / 2;

            data.bars.forEach((bar) => {
                const bh = Math.max(10, ((bar.value || 0) / max) * 70);
                const bg = ctx.createLinearGradient(0, 1010 - bh, 0, 1010);
                bg.addColorStop(0, accent2);
                bg.addColorStop(1, accent);

                roundRect(ctx, bx, 1010 - bh, bw, bh, 8);
                ctx.fillStyle = bg;
                ctx.fill();
                bx += bw + bgap;
            });
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#94a3b8";
        ctx.font = "700 26px " + font;
        ctx.fillText("Can you beat it?", W / 2, 1052 - 8);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
        });
    }

    buildBell();

    return { show, stamp, cardBlob };
})();
