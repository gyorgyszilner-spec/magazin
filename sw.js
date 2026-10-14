// ZoomComicFX player – service worker (offline olvasás). Export: mv88930b
const EXPORT_ID = "mv88930b";
const SCOPE = self.registration.scope;
const SHELL = "zcfx-shell|" + SCOPE + "|" + EXPORT_ID;
const SHELL_FILES = ["./", "./index.html", "./data.js", "./fonts/fonts.css", "./manifest.webmanifest", "./icon-192.png"];
self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES.map(u => new Request(u, { cache: "reload" }))).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("zcfx-shell|" + SCOPE) && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET" || !req.url.startsWith(SCOPE)) return;
    if (req.headers.has("range")) return;   // videó-részletkérések: közvetlenül a hálózat (iOS a 206-os választ várja)
    const isShell = req.mode === "navigate" || //(index.html|data.js|manifest.webmanifest)?(?.*)?$/.test(new URL(req.url).pathname.replace(new URL(SCOPE).pathname, "/"));
    if (isShell) {
        // a váz: előbb a hálózat (új export!), offline a tárolt példány
        e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(SHELL).then(cc => cc.put(req, c)); } return r; })
            .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match("./index.html"))));
        return;
    }
    // média és betűk: előbb a tár (a player előtöltője is ide tölt), aztán a hálózat
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req).then(r => {
        if (r.ok && //fonts//.test(req.url)) { const c = r.clone(); caches.open(SHELL).then(cc => cc.put(req, c)); }
        return r;
    })));
});
