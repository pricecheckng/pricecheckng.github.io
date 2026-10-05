const CACHE = "pricecheck-ng-v2";
const SHELL = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest", "icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for the app's own files, with the cache as an offline fallback.
// "no-cache" makes the browser check with the server every time, so a new version
// shows up straight away instead of waiting for the browser's own 10 minute cache.
// Price data comes from Supabase and is never cached here.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (_) {
    d = { body: e.data ? e.data.text() : "" };
  }
  const hash = d.hash || (/portfolio/i.test(d.title || "") ? "#portfolio" : "#alerts");
  e.waitUntil(
    self.registration.showNotification(d.title || "PriceCheck NG", {
      body: d.body || "Open PriceCheck NG to see the latest price.",
      icon: "icon-192.png",
      badge: "badge-96.png",
      tag: d.tag || undefined,
      data: { hash },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.hash) || "#alerts";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.registration.scope)) {
          w.postMessage({ type: "goto", hash });
          return w.focus();
        }
      }
      return self.clients.openWindow(self.registration.scope + hash);
    })
  );
});
