// Offline cache for the web/PWA version only. The Android app does not use it.
// Network first, so updated files are used whenever the player is online; the cache is the offline fallback.
const C="heavensflight-v26";
const FILES=["./","index.html","terms.html","privacy.html","style.css","game.js","core.js","platform.js","atlas.js","gfx.js","assets/atlas.webp","assets/gift3.webp","assets/gift7.webp","assets/gift30.webp"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("heavensflight-")&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{ if(e.request.method!=="GET")return;
 e.respondWith(fetch(e.request).then(r=>{ if(r&&r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy))} return r }).catch(()=>caches.match(e.request))) });
