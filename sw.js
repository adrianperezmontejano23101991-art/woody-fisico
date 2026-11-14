/* Guarda la app para que abra al momento y sin conexión, guarda las portadas y muestra los avisos. Los datos van aparte (GitHub). */
const V='wf-11',IMG='wf-portadas';
const SHELL=['./','index.html','app.js','nube.js','isbn.js','style.css','fisico.css','movil.css','manifest.webmanifest','icono-192.png','icono-512.png','icono-180.png','woody-library.png'];
const FOTOS=/^https:\/\/(i\d?\.whakoom\.com|static\.listadomanga\.com|www\.listadomanga\.es|static\.cegal\.es|books\.google\.[a-z.]+|covers\.openlibrary\.org)\//;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==IMG).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET')return;
 if(FOTOS.test(u.href)){   // portadas: primero lo guardado; si no está, se baja y se guarda
  e.respondWith(caches.open(IMG).then(async c=>{const h=await c.match(e.request);if(h)return h;try{const r=await fetch(e.request);if(r.ok||r.type==='opaque')c.put(e.request,r.clone());return r}catch(err){return Response.error()}}));
  return;
 }
 if(u.origin!==location.origin)return;
 e.respondWith(fetch(u.href,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
self.addEventListener('push',e=>{
 let d={};try{d=e.data.json()}catch(err){d={title:'Woody Físico',body:e.data?.text()||''}}
 e.waitUntil(self.registration.showNotification(d.title||'Woody Físico',{body:d.body||'',icon:d.icon||'icono-192.png',badge:'icono-192.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 const url=new URL(e.notification.data?.url||'./',self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{for(const w of ws){if('focus' in w){w.navigate(url);return w.focus()}}return clients.openWindow(url)}));
});
