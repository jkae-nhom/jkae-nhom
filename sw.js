// Service worker: cache image files (cache-first, immutable) + app shell (network-first).
const CACHE = "dog-tracker-v2";
const SHELL = ["./", "./index.html", "./momentkh.js"];
const IMG_RE = /\/assets\/.+\.(jpe?g|png|webp|gif|avif|bmp)$/i;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Photos: cache-first and keep forever (never cache 404s so probing still works).
  if (IMG_RE.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    }));
    return;
  }

  // App shell (same-origin): network-first so a normal refresh always gets the latest
  // page/code; fall back to cache only when offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
