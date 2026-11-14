/* Woody Físico ⇄ Whakoom. Se ejecuta en www.whakoom.com (con tu sesión abierta) desde el marcador «woody»,
   en el móvil o en el PC. No necesita el programa del PC: habla directamente con tu repositorio de datos.
   0) Lo que marcaste en el escáner («Lo tengo», «Lo quiero») se pasa a tu Whakoom.
   1) Descarga tu comicteca y tus buscados y los manda a tus datos.
   2) Recorre despacio tus tomos para traer nota de Whakoom, tu nota, ISBN y portada.
   TOKEN y REPO los pone el marcador. */
(async function(){
 if(typeof TOKEN==='undefined'||!TOKEN){alert('Este marcador es antiguo: copia el nuevo desde Woody Físico (ⓘ → Whakoom).');return}
 if(!/(^|\.)whakoom\.com$/.test(location.hostname)){alert('Abre primero whakoom.com y pulsa aquí el marcador.');return}
 if(window.__woodySync){window.__woodySync.box.style.display='block';return}
 const S=window.__woodySync={parar:false};
 const API='https://api.github.com/repos/'+REPO+'/contents/',DIR='programa/data/';
 const box=S.box=document.createElement('div');
 box.style.cssText='position:fixed;right:10px;left:10px;bottom:10px;max-width:380px;margin-left:auto;z-index:2147483647;background:#1d1b19;color:#f3ede4;font:14px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 8px 30px #0008;padding:14px 16px';
 box.innerHTML='<b style="font-size:15px">Woody Físico ⇄ Whakoom</b><div id="wsTxt" style="margin:8px 0">Empezando…</div><div style="height:6px;background:#444;border-radius:3px;overflow:hidden"><div id="wsBar" style="height:100%;width:0;background:#c9a24a"></div></div><div style="margin-top:10px;display:flex;gap:8px"><button id="wsStop" style="flex:1;padding:8px">Parar</button><button id="wsHide" style="padding:8px">Ocultar</button></div><small style="display:block;margin-top:8px;opacity:.7">Deja esta pestaña abierta y la pantalla encendida hasta que termine. Si lo paras, la próxima vez sigue donde lo dejó.</small>';
 document.body.append(box);
 const txt=t=>box.querySelector('#wsTxt').innerHTML=t, bar=p=>box.querySelector('#wsBar').style.width=Math.round(p*100)+'%';
 box.querySelector('#wsStop').onclick=()=>{S.parar=true;txt('Parando…')};
 box.querySelector('#wsHide').onclick=()=>box.style.display='none';
 const espera=ms=>new Promise(r=>setTimeout(r,ms));
 try{S.luz=await navigator.wakeLock?.request('screen')}catch(e){}
 const b64=buf=>{const u=buf instanceof Uint8Array?buf:new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
 const gh=async(ruta,op={})=>{const r=await fetch(API+ruta,{...op,cache:'no-store',headers:{'Authorization':'Bearer '+TOKEN,'Accept':op.body?'application/vnd.github+json':'application/vnd.github.raw+json',...(op.body?{'Content-Type':'application/json'}:{})}});if(r.status===401||r.status===403)throw Error('La clave de GitHub no vale: copia de nuevo el marcador desde Woody Físico.');if(!r.ok)throw Error('GitHub respondió '+r.status);return r};
 let ops=[];
 const op=(ruta,d)=>ops.push({id:'wk-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),t:Date.now(),ruta,d});
 const manda=async()=>{if(!ops.length)return;const lote=ops;ops=[];await gh(`cambios/${new Date().toISOString().replace(/[:.]/g,'-')}-wk-${Math.random().toString(36).slice(2,6)}.json`,{method:'PUT',body:JSON.stringify({message:'Sincronización con Whakoom',content:b64(new TextEncoder().encode(JSON.stringify({ops:lote})))})})};
 const pagina=async u=>{for(let intento=0;;intento++){const r=await fetch(u,{credentials:'include'});if(r.status===429){txt('Whakoom pide calma: espero 15 minutos…');await espera(15*60*1000);continue}if(!r.ok&&intento<2){await espera(5000);continue}return r}};
 const num=s=>parseFloat(String(s||'').replace(/\./g,'').replace(',','.'))||0;
 const lee=d=>{const mia=d.querySelector('.edit.big.ratingstars .rs-val');return {m:num(d.querySelector('.rate-avg')?.textContent),v:num(d.querySelector('.rate-count')?.textContent),
  y:mia?(num(mia.textContent)||Math.round(num((mia.getAttribute('style')||'').match(/width:\s*([\d.]+)%/)?.[1])/20)):0,
  i:((d.querySelector('meta[property="og:image"]')||{}).content||'').replace(/^https?:\/\/[^/]+\/(small|medium|large)\//,''),
  b:(d.querySelector('[itemprop="isbn"]')?.textContent||'').replace(/[^0-9Xx]/g,'').toUpperCase()}};
 try{
  txt('Leyendo tus datos…');
  const cat=await (await gh(DIR+'catalogo.json')).json();
  let busc=[];try{busc=await (await gh(DIR+'buscados_fichas.json')).json()}catch(e){}
  const res=[];

  // 0) Lo añadido con el escáner → tu Whakoom
  async function enIframe(url,sel,ms=9000){const f=document.createElement('iframe');f.style.cssText='position:fixed;width:10px;height:10px;opacity:0;pointer-events:none;bottom:0;left:0';f.src=url;document.body.append(f);const t0=Date.now();let r=[];while(Date.now()-t0<ms){await espera(500);try{r=[...f.contentDocument.querySelectorAll(sel)].map(a=>a.getAttribute('href'));if(r.length)break}catch(e){}}f.remove();return [...new Set(r)]}
  async function comicDe(u){const d=new DOMParser().parseFromString(await (await pagina(u)).text(),'text/html');const code=(u.match(/\/comics\/([^/]+)/)||[])[1]||d.querySelector('.pub-detail[data-item-type="comic"]')?.getAttribute('data-item-id');const wkid=d.querySelector('.bi-detail[data-item-type="comic"]')?.getAttribute('data-item-id');
   return code?{code,wkid,url:new URL(u,location.origin).href,img:lee(d).i}:null}
  async function buscaComic(it){
   if(it.isbn){const l=await enIframe('/search?s='+it.isbn,'a[href^="/comics/"]');if(l.length)return comicDe(l[0])}
   const l=await enIframe('/search?s='+encodeURIComponent(it.titulo),'a[href^="/comics/"],a[href^="/ediciones/"]');
   const c=l.filter(h=>h.startsWith('/comics/'));if(c.length===1)return comicDe(c[0]);
   const e=l.filter(h=>h.startsWith('/ediciones/'));
   if(e.length===1&&(!it.num||String(it.num)==='1')){const x=await comicDe(e[0]);if(x&&x.wkid)return x}
   return null;
  }
  const cab={'Content-Type':'application/json; charset=utf-8','X-Requested-With':'XMLHttpRequest'};
  for(const it of (cat.wk_cola||[]).filter(x=>!x.error)){
   if(S.parar)break;
   txt(`Pasando a Whakoom: ${it.titulo}${it.num?' '+it.num:''}…`);
   const c=await buscaComic(it);
   if(!c){op('/api/whakoom/cola/hecho',{isbn:it.isbn,accion:it.accion,error:'No lo encuentro en Whakoom: añádelo a mano'});res.push(`✗ ${it.titulo}: no está en Whakoom`);continue}
   const r=it.accion==='quiero'
    ?await fetch('/wkws.asmx/AddWishList',{method:'POST',credentials:'include',headers:cab,body:JSON.stringify({t:'comic',i:c.code})})
    :await fetch('/wkws.asmx/arcm',{method:'POST',credentials:'include',headers:cab,body:JSON.stringify({c:'comic'+c.code,a:true,fe:false,em:0})});
   if(!r.ok){op('/api/whakoom/cola/hecho',{isbn:it.isbn,accion:it.accion,error:'Whakoom respondió '+r.status});res.push(`✗ ${it.titulo}: Whakoom no lo aceptó`);continue}
   op('/api/whakoom/cola/hecho',{isbn:it.isbn,accion:it.accion,wkid:c.wkid,code:c.code,url:c.url,img:c.img});
   res.push(`✓ ${it.titulo}${it.num?' '+it.num:''} → ${it.accion==='quiero'?'buscados':'comicteca'}`);
   await espera(1500);
  }
  await manda();

  // 1) Excel de la comicteca y de buscados
  txt('Descargando tu comicteca…');
  const u=new DOMParser().parseFromString(await (await pagina('/mycollection/utilities')).text(),'text/html');
  for(const [accion,boton,tipo,nombre] of [['/mycollection/utilities/collection','downloadMC','comicteca','Comicteca'],['/mycollection/utilities/wanted','downloadW','buscados','Buscados']]){
   const f=u.querySelector(`form[action="${accion}"]`);if(!f){res.push(`✗ No encuentro la descarga de ${nombre} (¿has iniciado sesión?)`);continue}
   const fd=new FormData(f);fd.append(boton,boton);
   const r=await fetch(accion,{method:'POST',body:fd,credentials:'include'});
   if(!/spreadsheet/.test(r.headers.get('content-type')||'')){res.push(`✗ Whakoom no ha dado el Excel de ${nombre}`);continue}
   op('/api/whakoom/excel',{tipo,b64:b64(await r.arrayBuffer())});await manda();
   res.push(`✓ ${nombre} enviada`);
   await espera(1500);
  }
  const resumen=res.join('<br>')+'<br><small>En un minuto lo verás en Woody Físico.</small>';

  // 2) Notas, ISBN y portadas, tomo a tomo (primero lo que nunca se ha mirado)
  const lim=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const tomos=[];
  for(const o of cat.obras||[])for(const t of o.tomos||[])if(t.code&&t.url&&t.tengo&&(t.wk_fecha||'')<lim)tomos.push([t.wk_fecha||'',t.code,t.url]);
  tomos.sort();
  const tb=[];for(const b of busc)for(const t of b.tomos||[])if(t.code&&t.url&&(t.wk_fecha||'')<lim)tb.push([t.wk_fecha||'',t.code,t.url]);
  tb.sort();const todos=[...tomos,...tb];
  let items={},hechos=0;
  const suelta=async fin=>{if(Object.keys(items).length||fin){op('/api/whakoom/notas',{items,fin});items={};await manda()}};
  for(const [,code,url] of todos){
   if(S.parar)break;
   txt(`${resumen}<br><br>Notas, ISBN y portadas: ${hechos} de ${todos.length} tomos`);bar(hechos/Math.max(1,todos.length));
   try{const r=await pagina(new URL(url).pathname);if(r.ok)items[code]=lee(new DOMParser().parseFromString(await r.text(),'text/html'))}catch(e){}
   hechos++;
   if(hechos%150===0)await suelta(false);
   await espera(1200+Math.random()*800);
  }
  await suelta(!S.parar);bar(1);
  txt(`${resumen}<br><br>${S.parar?`Parado en ${hechos} de ${todos.length} tomos: la próxima vez sigue por ahí.`:`Notas al día (${hechos} tomos).`}<br><b>Listo.</b>`);
 }catch(e){txt('⚠ '+e.message)}
 try{S.luz?.release()}catch(e){}
 box.querySelector('#wsStop').textContent='Cerrar';box.querySelector('#wsStop').onclick=()=>{box.remove();delete window.__woodySync};
})();
