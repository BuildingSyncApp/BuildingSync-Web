// BuildingSync R1 — minimal service worker so the app is installable as a PWA
// (iOS Safari / Chrome / Edge "Add to Home Screen"). Caching strategy is
// intentionally conservative for a smoke build: shell network-first, fall back
// to offline page when no network. Heavier strategies arrive post-launch.

const CACHE = "buildingsync-r1-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Network-first for navigation, fall back to cached shell if offline.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((r) => r || caches.match("/"))),
    );
  }
});
