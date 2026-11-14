/* Woody Físico en la nube: la misma app que en el PC, pero leyendo y guardando en tu repositorio privado de GitHub.
   - Lee catalogo.json, buscados_fichas.json y novedades.json del repositorio de datos.
   - Lo que cambias aquí se guarda en cambios/*.json; el programa del PC lo aplica y vuelve a subir el catálogo.
   - Mientras tanto, la app aplica tus cambios por encima para que los veas al momento. Sin conexión, se quedan en cola. */
(function(){
 const REPO='adrianperezmontejano23101991-art/woody-fisico-datos';
 const API='https://api.github.com/repos/'+REPO+'/contents/';
 const LS={get:k=>{try{return localStorage.getItem('wf_'+k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem('wf_'+k,v)}catch(e){}},del:k=>{try{localStorage.removeItem('wf_'+k)}catch(e){}}};
 const fetchReal=window.fetch.bind(window);
 const CAMPOS=['seguir','orden','titulo','autores','estante','valoracion','anime','comentario','portada_tomo','lm_id','notas','revisado','leido_manual'];
 const hoy=()=>new Date().toISOString().slice(0,10);
 const json=(o,st=200)=>new Response(JSON.stringify(o),{status:st,headers:{'Content-Type':'application/json'}});
 let token=LS.get('token');
 let datos={catalogo:null,buscados:null,novedades:null};
 let pendientes=JSON.parse(LS.get('pendientes')||'[]');   // ops aún no aplicadas por el PC
 let cola=JSON.parse(LS.get('cola')||'[]');               // ops aún no subidas a GitHub
 let ocultas=new Set(JSON.parse(LS.get('ocultas')||'[]'));
 const guardaLocal=()=>{LS.set('pendientes',JSON.stringify(pendientes));LS.set('cola',JSON.stringify(cola));LS.set('ocultas',JSON.stringify([...ocultas]))};

 // ---------- GitHub
 const gh=async(ruta,op={})=>{const r=await fetchReal(API+ruta,{...op,headers:{'Authorization':'Bearer '+token,'Accept':op.raw?'application/vnd.github.raw+json':'application/vnd.github+json',...(op.body?{'Content-Type':'application/json'}:{})},cache:'no-store'});if(r.status===401||r.status===403&&!op.raw){pideToken('La clave no vale o ha caducado. Pon una nueva.');throw Error('Sin permiso')}if(!r.ok&&r.status!==404)throw Error('GitHub '+r.status);return r};
 async function leer(nombre){
  const cache=LS.get('f_'+nombre);
  try{const r=await gh(nombre,{raw:true});if(r.status===404)return cache?JSON.parse(cache):null;const t=await r.text();LS.set('f_'+nombre,t);return JSON.parse(t)}
  catch(e){if(cache)return JSON.parse(cache);throw e}
 }
 const b64=s=>{const u=new TextEncoder().encode(s);let x='';for(let i=0;i<u.length;i+=32768)x+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(x)};
 let subiendo=null;
 async function subir(){
  if(subiendo||!cola.length||!token||!navigator.onLine)return;
  const lote=cola.slice();
  subiendo=(async()=>{
   try{
    const nombre=`cambios/${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(36).slice(2,7)}.json`;
    await gh(nombre,{method:'PUT',body:JSON.stringify({message:'Cambios desde el móvil',content:b64(JSON.stringify({ops:lote},null,1))})});
    cola=cola.slice(lote.length);guardaLocal();aviso();
   }catch(e){aviso('Sin conexión: tus cambios esperan en el móvil')}
   finally{subiendo=null;if(cola.length)setTimeout(subir,4000)}
  })();
 }
 let tSubir=null;
 function encola(ruta,d){const op={t:Date.now(),ruta,d};cola.push(op);pendientes.push(op);guardaLocal();aviso();clearTimeout(tSubir);tSubir=setTimeout(subir,1500)}

 // ---------- aplicar cambios por encima del catálogo
 function aplica(cat,op){
  const m=op.ruta.match(/^\/api\/obra\/([^/]+)(\/tomos|\/portada|\/borrar)?$/);
  if(m){const id=decodeURIComponent(m[1]);const o=cat.obras.find(x=>x.id===id);if(!o)return null;
   if(!m[2]){for(const [k,v] of Object.entries(op.d))if(CAMPOS.includes(k))o[k]=v;if(op.d.valoracion&&!o.fecha_valoracion)o.fecha_valoracion=hoy();return o}
   if(m[2]==='/tomos'){const f=op.d.leido?hoy():'';o.tomos.forEach(t=>{if(!op.d.ids||op.d.ids.includes(t.id))t.leido=f});return o}
   if(m[2]==='/portada'){o.portada_movil=op.d.url;return o}
   if(m[2]==='/borrar'){cat.obras=cat.obras.filter(x=>x!==o);return{ok:true}}}
  if(op.ruta==='/api/tengo'){const d=op.d;if(d.accion==='quiero')return {ok:true,buscado:d.titulo};
   const nn=x=>String(x||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
   let o=d.obra_id&&cat.obras.find(x=>x.id===d.obra_id)||cat.obras.find(x=>[x.titulo,...(x.alias||[]),...(x.tomos||[]).map(t=>t.serie)].some(y=>y&&nn(y)===nn(d.titulo)));
   if(!o){o={id:'nueva-'+(d.isbn||Date.now()),titulo:d.titulo||d.isbn,alias:[],autores:d.autores||[],estante:'Pendiente de leer',valoracion:'',anime:'',comentario:'',fecha_valoracion:'',tomos:[],revisar:[],lm_id:null,portada_tomo:null,portada_url:'',origen:['Escáner']};cat.obras.push(o)}
   let t=o.tomos.find(x=>d.isbn&&x.isbn===d.isbn)||o.tomos.find(x=>d.num&&String(x.num)===String(d.num)&&(!x.isbn||x.isbn===d.isbn));
   if(!t){t={id:'isbn-'+(d.isbn||Date.now()),code:'',serie:o.titulo,edicion:'',num:d.num||'',titulo:'',editorial:d.editorial||'',idioma:'Español',publicado:'',leido:'',url:'',img:'',img_url:d.portada||'',tengo:true,portada:d.portada?'esc-'+(d.isbn||'x'):''};o.tomos.push(t)}
   t.tengo=true;if(d.isbn)t.isbn=d.isbn;if(d.accion==='leido'&&!t.leido)t.leido=hoy();return o}
  if(op.ruta==='/api/nueva'){const d=op.d;let base=(d.titulo||'obra').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'obra',id=base,i=1;while(cat.obras.some(x=>x.id===id))id=base+'-'+(++i);
   const o={id,titulo:d.titulo,alias:[],autores:d.autores||[],estante:d.estante||'General',valoracion:d.valoracion||'',anime:'',comentario:d.comentario||'',fecha_valoracion:d.valoracion?hoy():'',tomos:[],revisar:[],lm_id:null,portada_tomo:null,portada_url:'',origen:['Manual'],leido_manual:true,manual:true};cat.obras.push(o);return o}
  return null;
 }
 function catalogoActual(){
  const c=JSON.parse(JSON.stringify(datos.catalogo||{obras:[]}));
  const hasta=(c.nube||{}).cambios_hasta||0;
  pendientes=pendientes.filter(op=>op.t>hasta);guardaLocal();
  for(const op of pendientes)aplica(c,op);
  return c;
 }

 // ---------- portadas: las del PC no están aquí; se piden a Whakoom o a su web de origen
 let mapa={};
 function rehaceMapa(c){mapa={};for(const o of c.obras){for(const t of o.tomos||[]){const u=t.img_url||(t.img?'https://i1.whakoom.com/small/'+t.img:'');if(!t.portada&&u&&t.img_url)t.portada='url-'+t.id;if(t.portada&&u)mapa[t.portada]=u}if(o.portada_externa&&o.portada_url)mapa[o.portada_externa.split('?')[0]]=o.portada_url}}
 const remoto=v=>{if(!v||!v.startsWith('/portadas/'))return v;const n=decodeURIComponent(v.slice(10).split('?')[0]);return mapa[n]||'icono-192.png'};
 function arreglaImgs(raiz){(raiz.querySelectorAll?raiz:document).querySelectorAll('img[src^="/portadas/"],[data-zoom^="/portadas/"]').forEach(e=>{if(e.getAttribute('src')?.startsWith('/portadas/'))e.setAttribute('src',remoto(e.getAttribute('src')));if(e.dataset.zoom?.startsWith('/portadas/'))e.dataset.zoom=remoto(e.dataset.zoom)})}
 new MutationObserver(ms=>{for(const m of ms){if(m.type==='attributes')arreglaImgs(m.target.parentNode||document);else m.addedNodes.forEach(n=>n.nodeType===1&&(n.matches?.('img[src^="/portadas/"]')?arreglaImgs(n.parentNode):arreglaImgs(n)))}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-zoom']});

 // ---------- la API del PC, imitada
 const SOLO_PC={autores:[],relaciones:[],aviso:'Esto se calcula en el PC.'};
 async function responde(u,op){
  const ruta=u.split('?')[0],metodo=(op?.method||'GET').toUpperCase(),d=op?.body?JSON.parse(op.body):{};
  if(metodo==='GET'){
   if(ruta==='/api/catalogo'){if(!datos.catalogo)await carga();const c=catalogoActual();rehaceMapa(c);return json(c)}
   if(ruta==='/api/buscados'){if(!datos.buscados)datos.buscados=await leer('buscados_fichas.json')||[];return json(datos.buscados)}
   if(ruta==='/api/novedades'){if(!datos.novedades)datos.novedades=await leer('novedades.json');const n=JSON.parse(JSON.stringify(datos.novedades||{cartas:{tuyas:[]},avisos:[],seguidas:[]}));
    if(n.cartas)for(const k in n.cartas)if(Array.isArray(n.cartas[k]))n.cartas[k]=n.cartas[k].filter(x=>!ocultas.has(x.id)&&!(k==='tuyas'&&ocultas.has('*tuyas')));n.activo=false;return json(n)}
   if(ruta==='/api/estado')return json({activo:false,fase:'',hechas:0,total:0,pendientes:0,fallos:0,whakoom:(datos.catalogo||{}).whakoom||{}});
   if(ruta.startsWith('/api/relaciones/')||ruta==='/api/autor')return json(SOLO_PC);
   const mi=ruta.match(/^\/api\/isbn\/(\d{10,13})$/);
   if(mi){const k=mi[1];const r=await gh('resultados/'+k+'.json',{raw:true});if(r.ok)return json(JSON.parse(await r.text()));
    const ya=+LS.get('consulta_'+k)||0;if(Date.now()-ya>180000){LS.set('consulta_'+k,Date.now());await gh('consultas/'+k+'.json',{method:'PUT',body:JSON.stringify({message:'Buscar ISBN '+k,content:b64('{}')})}).catch(()=>{})}
    return json({isbn:k,pendiente:true})}
   return json({error:'No disponible en el móvil'},404);
  }
  if(ruta.startsWith('/api/novedades/')){if(d.id)ocultas.add(d.id);if(d.todos)ocultas.add('*tuyas');}
  if(ruta==='/api/whakoom/excel')return json({error:'Importa el Excel desde el PC'},400);
  encola(ruta,d);
  const c=catalogoActual();const r=aplica(c,{ruta,d});rehaceMapa(c);
  return json(r||{ok:true});
 }
 window.fetch=function(u,op){if(typeof u==='string'&&u.startsWith('/api/'))return responde(u,op).catch(e=>json({error:e.message},500));return fetchReal(u,op)};

 async function carga(){
  if(!token)await new Promise(ok=>pideToken('',ok));
  datos.catalogo=await leer('catalogo.json')||{obras:[]};
  aviso();
 }

 // ---------- aviso de estado y clave
 function aviso(txt){
  let b=document.getElementById('nubeEstado');if(!b){b=document.createElement('div');b.id='nubeEstado';document.body.append(b)}
  const c=datos.catalogo||{};const n=cola.length,p=pendientes.length;
  b.textContent=txt||(n?`☁ ${n} ${n===1?'cambio':'cambios'} por subir`:p?`☁ ${p} ${p===1?'cambio':'cambios'} esperando al PC`:c.nube?.exportado?`☁ Datos del PC del ${new Date(c.nube.exportado).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'');
  b.hidden=!b.textContent;
 }
 function pideToken(msg,ok){
  let d=document.getElementById('nubeToken');
  if(!d){d=document.createElement('dialog');d.id='nubeToken';d.className='confirm-box';document.body.append(d)}
  d.innerHTML=`<h2>Conectar con tus datos</h2>${msg?`<p class="nube-err">${msg}</p>`:''}<p>Pega la clave de GitHub de Woody Físico (empieza por <b>github_pat_</b>). Se guarda solo en este móvil.</p><form id="nubeForm" class="form"><input id="nubeClave" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required><button class="primary">Conectar</button></form>`;
  d.querySelector('form').onsubmit=e=>{e.preventDefault();token=d.querySelector('#nubeClave').value.trim();LS.set('token',token);d.close();ok?ok():location.reload()};
  if(!d.open)d.showModal();
 }
 window.addEventListener('online',subir);
 setInterval(async()=>{if(!token||document.hidden)return;try{const viejo=JSON.stringify((datos.catalogo||{}).nube);datos.catalogo=await leer('catalogo.json')||datos.catalogo;datos.novedades=null;if(JSON.stringify(datos.catalogo.nube)!==viejo&&typeof cargar==='function'){await cargar(true)}aviso()}catch(e){}},120000);
 const VERSION='14 nov 2026 · 15:00';
 document.addEventListener('DOMContentLoaded',()=>{aviso();subir();
  const ip=document.getElementById('infoPanel');if(ip){const v=document.createElement('p');v.className='fine';v.id='versionApp';v.textContent='Versión de la app: '+VERSION;ip.append(v)}
  const st=document.createElement('style');st.textContent=`#nubeEstado{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(72px + env(safe-area-inset-bottom));z-index:45;background:#1d231dee;border:1px solid var(--line);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--muted);pointer-events:none}@media(min-width:651px){#nubeEstado{bottom:14px}}#infoPanel:not([hidden])~#nubeEstado{display:none}.nube-err{color:#f0a0a0}#nubeClave{width:100%;font-family:monospace}#bajar,.fine .dot{display:none}`;document.head.append(st)});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 // ---------- instalar como app
 let instalar=null;
 const enApp=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 function botonInstalar(fn){if(enApp||document.getElementById('instalarBtn'))return;const a=document.getElementById('infoBtn');if(!a)return;const b=document.createElement('button');b.id='instalarBtn';b.className='icon-btn';b.type='button';b.textContent='⤓ Instalar';b.title='Instalar Woody Físico como app';b.onclick=fn;a.before(b)}
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();instalar=e;botonInstalar(async()=>{instalar.prompt();const r=await instalar.userChoice;if(r.outcome==='accepted')document.getElementById('instalarBtn')?.remove()})});
 window.addEventListener('appinstalled',()=>document.getElementById('instalarBtn')?.remove());
 document.addEventListener('DOMContentLoaded',()=>{if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!enApp)botonInstalar(()=>alert('Para instalarla: pulsa el botón Compartir de Safari (el cuadrado con la flecha) y luego «Añadir a pantalla de inicio».'))});
})();
