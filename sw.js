// Retire caches created by the previous, offline-only version of the game.
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("split-second-")).map((name) => caches.delete(name)));
    await self.clients.claim();
    await self.registration.unregister();
})()));
