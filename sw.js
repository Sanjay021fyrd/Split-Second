// Network-first service worker: always tries the latest files, falls back to
// the cache when offline so the game still works without a connection.
const CACHE = "split-second-v2";
const ASSETS = ["./", "index.html", "style.css", "fx.js", "viz.js", "script.js", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() => caches.match(request).then((hit) => hit || caches.match("index.html")))
    );
});
