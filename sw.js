// App-shell cache so the page opens without network (tests entered offline wait on the phone).
// Network first for everything on this origin, so a redeploy is picked up at once; the cache is only
// the fallback. Arkiv RPC and every other origin are never cached: data always comes from the chain.
const CACHE = "jalsaakshya-shell-v1"
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"]).catch(() => {}))) })
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.endsWith("/curator.html")) return
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return res
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || caches.match("./index.html"))))
})
