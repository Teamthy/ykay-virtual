// YK-Virtual service worker — PWA offline shell (M1 hardening).
// Strategy:
//   - App shell (/ , /offline)  → precached at install
//   - Hashed static assets      → cache-first (immutable, safe)
//   - Navigations               → network-first, offline fallback
//   - API calls                 → never cached (money/data safety)
//   - Unsplash images           → stale-while-revalidate

const CACHE = "yk-virtual-v3";
// App shell — core routes precached at install so the LMS, chat
// and dashboards open offline (data still streams from the API when online).
const SHELL = ["/", "/offline", "/lms", "/chat", "/dashboard", "/login"];
const API_PREFIX = "/api/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // API: network only.
  if (req.url.includes(API_PREFIX)) return;

  const url = new URL(req.url);

  // Navigation requests: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/offline")),
        ),
    );
    return;
  }

  // Hashed Next.js build assets (_next/static): cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Images: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
