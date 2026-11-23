"use strict";

const { createServer } = require("node:http");
const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const { readFile, writeFile, rename, mkdir } = require("node:fs/promises");
const { join, resolve } = require("node:path");

const port = Number(process.env.PORT || 3000);
const base = new URL(process.env.APP_ORIGIN || "http://localhost:" + port);
const localOrigins = ["localhost", "127.0.0.1", "[::1]"];
if (!["https:", "http:"].includes(base.protocol) ||
    (base.protocol === "http:" && !localOrigins.includes(base.hostname))) {
    throw new Error("APP_ORIGIN must use HTTPS except on localhost.");
}
const redirectUri = new URL("/auth/google/callback", base).href;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const configured = Boolean(clientId && clientSecret);
const profilesDirectory = resolve(process.env.PROFILE_DIR || join(__dirname, ".profiles"));
const competition = require("./competition-server")(profilesDirectory);
const day = 24 * 60 * 60;
const sessionSeconds = 7 * day;
const sessions = new Map();
const signIns = new Map();

for (const entries of [sessions, signIns]) {
    setInterval(() => {
        for (const [key, value] of entries) {
            if (value.expires <= Date.now()) entries.delete(key);
        }
    }, 60_000).unref();
}

const assets = new Map([
    ["/", ["index.html", "text/html", false]],
    ["/index.html", ["index.html", "text/html", false]],
    ["/competition.js", ["competition.js", "text/javascript", true]],
    ["/auth.js", ["auth.js", "text/javascript", false]],
    ["/style.css", ["style.css", "text/css", false]],
    ["/fx.js", ["fx.js", "text/javascript", true]],
    ["/viz.js", ["viz.js", "text/javascript", true]],
    ["/script.js", ["script.js", "text/javascript", true]],
    ["/icon.svg", ["icon.svg", "image/svg+xml", false]],
    ["/coastal.svg", ["coastal.svg", "image/svg+xml", false]],
    ["/ruins.svg", ["ruins.svg", "image/svg+xml", false]],
    ["/manifest.webmanifest", ["manifest.webmanifest", "application/manifest+json", false]],
    ["/sw.js", ["sw.js", "text/javascript", false]]
]);

function token() {
    return randomBytes(32).toString("base64url");
}

function setCookie(response, name, value, maxAge) {
    const secure = base.protocol === "https:" ? "; Secure" : "";
    response.appendHeader("Set-Cookie",
        name + "=" + value + "; Max-Age=" + maxAge + "; Path=/; HttpOnly; SameSite=Lax" + secure);
}

function readCookie(request, name) {
    const entry = (request.headers.cookie || "").split(";").map((part) => part.trim())
        .find((part) => part.startsWith(name + "="));
    return entry ? entry.slice(name.length + 1) : "";
}

function redirect(response, location) {
    response.writeHead(303, { Location: location }).end();
}

function json(response, status, data) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(data));
}

function beginGoogle(request, response) {
    if (!configured) return redirect(response, "/?auth=setup");

    // State is tied to this browser. The verifier stays server-side and is single-use.
    signIns.delete(readCookie(request, "split_oauth"));
    const state = token();
    const verifier = token();
    signIns.set(state, { verifier, expires: Date.now() + 600_000 });
    setCookie(response, "split_oauth", state, 600);

    const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    google.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: "code",
        scope: "openid email profile", state, prompt: "select_account",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256"
    });
    redirect(response, google.href);
}

async function fetchJson(url, options) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Google returned HTTP " + response.status);
    return response.json();
}

async function finishGoogle(request, response, params) {
    const cookieState = readCookie(request, "split_oauth");
    const callbackState = params.get("state") || "";
    const pending = signIns.get(cookieState);
    signIns.delete(cookieState);
    setCookie(response, "split_oauth", "", 0);

    if (!pending || pending.expires <= Date.now() || !/^[A-Za-z0-9_-]{43}$/.test(callbackState) ||
        !timingSafeEqual(Buffer.from(cookieState), Buffer.from(callbackState))) {
        return redirect(response, "/?auth=expired");
    }
    if (params.has("error")) return redirect(response, "/?auth=denied");
    if (!params.get("code")) return redirect(response, "/?auth=failed");

    try {
        const credentials = await fetchJson("https://oauth2.googleapis.com/token", {
            method: "POST",
            body: new URLSearchParams({
                grant_type: "authorization_code", code: params.get("code"),
                client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
                code_verifier: pending.verifier
            })
        });
        if (typeof credentials.access_token !== "string") throw new Error("Missing Google access token");
        const profile = await fetchJson("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: "Bearer " + credentials.access_token }
        });
        if (typeof profile.sub !== "string" || !profile.sub || typeof profile.email !== "string" ||
            !profile.email || profile.email_verified !== true) {
            return redirect(response, "/?auth=profile");
        }
        const user = {
            id: profile.sub,
            name: typeof profile.name === "string" && profile.name ? profile.name : profile.email,
            email: profile.email
        };
        // The Google subject is stable across sign-ins and email changes.
        const key = createHash("sha256").update(user.id).digest("hex");
        await mkdir(profilesDirectory, { recursive: true, mode: 0o700 });
        const destination = join(profilesDirectory, key + ".json");
        const temporary = destination + "." + token() + ".tmp";
        await writeFile(temporary, JSON.stringify(user), { mode: 0o600 });
        await rename(temporary, destination);

        sessions.delete(readCookie(request, "split_session"));
        const sessionId = token();
        sessions.set(sessionId, { user, expires: Date.now() + sessionSeconds * 1000 });
        setCookie(response, "split_session", sessionId, sessionSeconds);
        redirect(response, "/");
    } catch (error) {
        console.error("Google sign-in failed:", error.name);
        redirect(response, "/?auth=failed");
    }
}

async function handle(request, response) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy",
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
        "object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const url = new URL(request.url, base);
    const sessionId = readCookie(request, "split_session");
    const session = sessions.get(sessionId);
    const user = session && session.expires > Date.now() ? session.user : null;

    if (url.pathname.startsWith("/competition/")) return competition(request, response, url, user, sessionId, base.origin, json);

    if (request.method === "POST" && url.pathname === "/auth/logout") {
        if (request.headers.origin !== base.origin) return json(response, 403, { error: "Invalid origin." });
        sessions.delete(sessionId);
        setCookie(response, "split_session", "", 0);
        return response.writeHead(204).end();
    }

    if (request.method !== "GET") return response.writeHead(405).end();
    if (url.pathname === "/auth/session") return json(response, 200, { configured, user });
    if (url.pathname === "/auth/google") return beginGoogle(request, response);
    if (url.pathname === "/auth/google/callback") return finishGoogle(request, response, url.searchParams);

    const asset = assets.get(url.pathname);
    if (!asset) return response.writeHead(404).end();
    const [file, type, needsLogin] = asset;
    if (needsLogin && !user) return response.writeHead(401).end();
    response.writeHead(200, { "Content-Type": type + "; charset=utf-8" }).end(await readFile(join(__dirname, file)));
}

createServer((request, response) => {
    handle(request, response).catch((error) => {
        console.error("Request failed:", error.name);
        if (!response.headersSent) json(response, 500, { error: "The game server could not complete the request." });
        else response.end();
    });
}).listen(port, process.env.HOST || "127.0.0.1", () => {
    console.log("Split Second is listening at " + base.origin);
    if (!configured) console.log("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable sign-in.");
});
