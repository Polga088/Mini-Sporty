const CACHE_NAME = "mini-sporty-pwa-v3";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.svg", "/icon-512.svg", "/icon-maskable.svg", "/manifest.webmanifest"];
const PRIVATE_PATH_PREFIXES = ["/api/auth", "/api/"];
const STATIC_PATH_PREFIXES = ["/_next/static/", "/_next/image", "/icon-", "/favicon", "/manifest.webmanifest", "/offline"];

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function shouldBypassCache(requestUrl, request) {
  if (!isSameOrigin(requestUrl)) return true;
  if (request.method !== "GET") return true;
  if (PRIVATE_PATH_PREFIXES.some((prefix) => requestUrl.pathname.startsWith(prefix))) return true;
  if (request.headers.has("x-middleware-subrequest")) return true;
  return false;
}

function isStaticAsset(requestUrl) {
  return STATIC_PATH_PREFIXES.some((prefix) => requestUrl.pathname.startsWith(prefix)) || ["script", "style", "image", "font", "worker"].includes(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && typeof event.data === "object" && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (shouldBypassCache(requestUrl, event.request)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (!isStaticAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      try {
        const response = await fetch(event.request);
        const cacheable = response && response.ok && response.type === "basic" && !response.headers.get("cache-control")?.includes("no-store");
        if (cacheable) {
          const cache = await caches.open(CACHE_NAME);
          void cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return caches.match(OFFLINE_URL);
      }
    })
  );
});
