/* Guarda la app para que abra al momento y sin conexión. Los datos van aparte (GitHub). */
const V='wf-3';
const SHELL=['./','index.html','app.js','nube.js','isbn.js','style.css','fisico.css','movil.css','manifest.webmanifest','icono-192.png','icono-512.png','icono-180.png','woody-library.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
