// 通信できるときは最新の版を取りに行き（3.5秒で返事がなければ保存済みの版）、
// 通信できないときは保存済みの版で動かす
const VER = "takken-ox-v4";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function fromNet(req, c) {
  return fetch(req, { cache: "no-cache" }).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VER).then(c => new Promise(resolve => {
      let done = false;
      const fallback = async () => { if (done) return; const hit = (await c.match(req, { ignoreSearch: true })) || (await c.match("index.html")); if (hit && !done) { done = true; resolve(hit); } };
      const timer = setTimeout(fallback, 3500);
      fromNet(req, c).then(r => { if (!done) { done = true; clearTimeout(timer); resolve(r); } })
        .catch(async () => { clearTimeout(timer); await fallback(); if (!done) { done = true; resolve(Response.error()); } });
    })));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VER).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit))));
  }
});
