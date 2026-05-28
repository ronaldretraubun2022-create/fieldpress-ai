const CACHE_NAME = "fieldpress-ai-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/reporter.html",
  "/notulen.html",
  "/pricing.html",
  "/settings.html",
  "/assets/css/style.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
