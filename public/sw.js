const CACHE_NAME = "picphoto-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          }).catch(() => cached || new Response("Offline", { status: 503 }))
        );
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && request.headers.get("accept")?.includes("text/html")) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        return caches.match("/").then((rootCached) => {
          return rootCached || new Response(
            "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#1e40af;color:white'><div style='text-align:center'><h1 style='font-size:3rem'>PIC PHOTO</h1><p>Sin conexión</p></div></body></html>",
            { status: 503, headers: { "Content-Type": "text/html" } }
          );
        });
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
