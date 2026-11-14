/* ISBN, al estilo Whakoom: pulsas ISBN, se abre la cámara a pantalla completa y, en cuanto lee el código,
   te lleva a la ficha. Si no está claro cuál es, te enseña las opciones; si no lo tienes ni lo buscas, dónde mirarlo.
   1) Tus tomos y tus buscados (los ISBN que trae la sincronización con Whakoom).  2) Google Books y Open Library.
   Un lector de códigos USB funciona como un teclado: basta con tener abierto el escáner. */
(function(){
 const $$=id=>document.getElementById(id);
 const es=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[«»"'’`´!¡?¿.,:;()\[\]{}~\-–—_/\\|·•★☆♪]/g,' ')
  .replace(/\b(tomo|vol|volumen|volume|n|no|nº|num|numero|edicion|edition|integral|kanzenban|deluxe|maximum)\b/g,' ')
  .replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();
 const VACIAS=new Set('el la los las lo un una unos unas de del al y e o u en con por para a the of an and to in on no vs le les du des et il di da'.split(' '));
 const words=s=>new Set(norm(s).split(' ').filter(w=>w.length>1&&!VACIAS.has(w)));
 function score(a,b){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++});return n/Math.max(A.size,B.size)}
 function a13(s){let d=String(s||'').replace(/[^0-9Xx]/g,'').toUpperCase();if(d.length===10){const b='978'+d.slice(0,9);let t=0;for(let i=0;i<12;i++)t+=(+b[i])*(i%2?3:1);d=b+((10-t%10)%10)}return d.length===13?d:''}
 function numTomo(t){const m=String(t||'').match(/(?:tomo|vol\.?|volumen|volume|n[ºo°]\.?|#)\s*(\d{1,3})\b/i)||String(t||'').match(/\b(\d{1,3})\s*$/);return m?String(+m[1]):''}

 // ---- índice de ISBN de lo tuyo
 async function indice(){
  const tomos=new Map(),busc=new Map();
  for(const o of (typeof obras!=='undefined'?obras:[]))for(const t of o.tomos||[]){const k=a13(t.isbn);if(k)tomos.set(k,{o,t})}
  let l=typeof bus!=='undefined'&&bus?bus:null;
  if(!l){try{l=await api('/api/buscados');try{bus=l}catch(e){}}catch(e){l=[]}}
  l.forEach((b,i)=>{for(const t of b.tomos||[]){const k=a13(t.isbn);if(k)busc.set(k,{b,i,t})}});
  return {tomos,busc,lista:l};
 }
 async function lookup(isbn){
  const out={titles:[],authors:[],publisher:'',year:'',cover:''};
  const g=fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:'+isbn).then(r=>r.json()).then(r=>{for(const it of r.items||[]){const v=it.volumeInfo||{};if(v.title)out.titles.push(v.title+(v.subtitle?' '+v.subtitle:''));(v.authors||[]).forEach(a=>out.authors.push(a));out.publisher=out.publisher||v.publisher||'';out.year=out.year||(v.publishedDate||'').slice(0,4);out.cover=out.cover||(v.imageLinks&&(v.imageLinks.thumbnail||v.imageLinks.smallThumbnail)||'').replace(/^http:/,'https:')}}).catch(()=>{});
  const ol=fetch('https://openlibrary.org/api/books?bibkeys=ISBN:'+isbn+'&format=json&jscmd=data').then(r=>r.json()).then(r=>{const v=r['ISBN:'+isbn];if(v){if(v.title)out.titles.push(v.title+(v.subtitle?' '+v.subtitle:''));(v.authors||[]).forEach(a=>out.authors.push(a.name));out.publisher=out.publisher||((v.publishers||[])[0]||{}).name||'';out.year=out.year||String(v.publish_date||'').slice(-4);out.cover=out.cover||(v.cover&&(v.cover.medium||v.cover.small))||''}}).catch(()=>{});
  await Promise.race([Promise.all([g,ol]),new Promise(r=>setTimeout(r,7000))]);
  out.titles=[...new Set(out.titles)];out.authors=[...new Set(out.authors)];return out;
 }
 function candidatos(info,lista){
  const r=[];const pun=(nombres,autores)=>{let t=0;for(const x of info.titles)for(const y of nombres)t=Math.max(t,score(x,y));let a=0;const au=autores.join(' ');for(const x of info.authors)a=Math.max(a,score(x,au));return (t>=0.5||(t>=0.34&&a>=0.5))?t*0.8+a*0.2:0};
  for(const o of (typeof obras!=='undefined'?obras:[])){const s=pun([o.titulo,...(o.alias||[]),...new Set((o.tomos||[]).map(t=>t.serie).filter(Boolean))].filter(Boolean),o.autores||[]);if(s)r.push({tipo:'obra',o,s})}
  lista.forEach((b,i)=>{const s=pun([b.t].filter(Boolean),b.a||[]);if(s)r.push({tipo:'bus',b,i,s})});
  return r.sort((x,y)=>y.s-x.s).slice(0,8);
 }

 // ---- abrir lo encontrado
 function irObra(o,t,num){
  cerrar();abrir(o.id);
  setTimeout(()=>{let el=t&&document.querySelector(`#detail [data-leer="${CSS.escape(t.id)}"]`)?.closest('.tomo');
   if(!el&&num){const x=(o.tomos||[]).find(z=>String(z.num)===num);el=x&&document.querySelector(`#detail [data-leer="${CSS.escape(x.id)}"]`)?.closest('.tomo')}
   if(el){el.classList.add('isbn-marca');el.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>el.classList.remove('isbn-marca'),4000)}},350);
  const tt=t||(o.tomos||[]).find(z=>String(z.num)===num);
  toast(tt?(tt.tengo?`Lo tienes · ${tt.num?'tomo '+tt.num:'tomo único'}`:`No lo tienes · ${tt.num?'tomo '+tt.num:'tomo único'}`):'En tu colección');
 }
 function irBus(b,t){cerrar();abrirBus(b);toast('Está en tus buscados'+(t?.num?` · tomo ${t.num}`:''))}

 // ---- pantalla del escáner
 let stream=null,zx=null,loop=null,ocupado=false,ultimo='',tUltimo=0;
 let rafaga=(()=>{try{return localStorage.getItem('wf_rafaga')==='1'}catch(e){return false}})();
 function seguir(ms=0){setTimeout(()=>{if($$('esc').hidden)return;ocupado=false;$$('escHoja').hidden=true;$$('escInput').value='';camara()},ms)}
 function stopCam(){if(loop){cancelAnimationFrame(loop);loop=null}if(zx){try{zx.reset()}catch(e){}zx=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
 function cerrar(){stopCam();const e=$$('esc');if(e)e.hidden=true;document.body.classList.remove('esc-abierto')}
 async function camara(){
  const v=$$('escVideo');stopCam();
  const leido=code=>{const k=a13(code);if(!k||ocupado||(k===ultimo&&Date.now()-tUltimo<5000))return;ultimo=k;tUltimo=Date.now();ocupado=true;navigator.vibrate?.(60);stopCam();resolver(k)};
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('este navegador no deja usar la cámara aquí');
   if('BarcodeDetector' in window&&(await BarcodeDetector.getSupportedFormats()).includes('ean_13')){
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}});v.srcObject=stream;await v.play();
    const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a']});
    const tick=async()=>{if(!stream)return;try{const r=await det.detect(v);const c=r.find(x=>a13(x.rawValue));if(c)return leido(c.rawValue)}catch(e){}loop=requestAnimationFrame(tick)};tick();
   }else{
    if(!window.ZXing)await new Promise((ok,ko)=>{const s=document.createElement('script');s.src=document.querySelector('script[src$="isbn.js"]').src.replace(/isbn\.js.*$/,'vendor/zxing.min.js');s.onload=ok;s.onerror=()=>ko(Error('no se pudo cargar el lector'));document.head.append(s)});
    const h=new Map();h.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8]);
    zx=new ZXing.BrowserMultiFormatReader(h);
    await zx.decodeFromConstraints({video:{facingMode:'environment'}},v,res=>{if(res)leido(res.getText())});
   }
   $$('escAviso').textContent='Apunta al código de barras';
  }catch(e){$$('escAviso').textContent='Sin cámara: escribe el ISBN o pásalo con el lector';$$('escInput').focus()}
 }
 function abrirEscaner(){
  let e=$$('esc');
  if(!e){e=document.createElement('div');e.id='esc';e.hidden=true;document.body.append(e);
   e.innerHTML=`<video id="escVideo" muted playsinline></video><div class="esc-marco"><i></i></div>
    <button type="button" class="esc-x" id="escX" aria-label="Cerrar">×</button>
    <p id="escAviso" class="esc-aviso">Abriendo la cámara…</p>
    <button type="button" id="escRafaga" class="esc-raf"></button>
    <form id="escForm" class="esc-form"><input id="escInput" inputmode="numeric" autocomplete="off" placeholder="o escribe el ISBN" aria-label="ISBN"><button>Buscar</button></form>
    <div id="escHoja" class="esc-hoja" hidden></div>`;
   $$('escX').onclick=cerrar;
   const pintaRaf=()=>{const b=$$('escRafaga');b.textContent=rafaga?'⚡ Ráfaga: sí':'⚡ Ráfaga: no';b.classList.toggle('on',rafaga)};pintaRaf();
   $$('escRafaga').onclick=()=>{rafaga=!rafaga;try{localStorage.setItem('wf_rafaga',rafaga?'1':'0')}catch(e){}pintaRaf();toast(rafaga?'Ráfaga: tras cada libro sigue escaneando':'Ráfaga desactivada')};
   $$('escForm').onsubmit=ev=>{ev.preventDefault();const k=a13($$('escInput').value);if(!k){toast('Ese ISBN no tiene 10 o 13 cifras');return}stopCam();resolver(k)};
  }
  ocupado=false;$$('escHoja').hidden=true;$$('escInput').value='';e.hidden=false;document.body.classList.add('esc-abierto');camara();
  if(!matchMedia('(pointer:coarse)').matches)$$('escInput').focus();
 }
 function hoja(html){const h=$$('escHoja');h.innerHTML=html;h.hidden=false;
  h.querySelectorAll('[data-otro]').forEach(b=>b.onclick=()=>{ocupado=false;h.hidden=true;$$('escInput').value='';camara()});return h}
 const externos=(k,tit,tl)=>{const q=encodeURIComponent((tit||'').replace(/\s*\d+\s*$/,''));return `<div class="esc-fuera"><a href="https://www.whakoom.com/search?s=${tit?q:k}" target="_blank" rel="noopener">Whakoom</a><a href="${es(tl||'https://www.todostuslibros.com/busquedas?keyword='+k)}" target="_blank" rel="noopener">Todos tus libros</a><a href="https://www.amazon.es/s?k=${k}" target="_blank" rel="noopener">Amazon</a>${tit?`<a href="https://www.google.com/search?q=${q}+site%3Alistadomanga.es" target="_blank" rel="noopener">Listado Manga</a>`:''}</div>`};
 // Todos tus libros y Listado Manga: en el PC, al momento; en el móvil, a través de GitHub (tarda hasta un minuto)
 async function porIsbn(k){
  const t0=Date.now();
  while(Date.now()-t0<100000){
   let r;try{r=await api('/api/isbn/'+k)}catch(e){return {}}
   if(!r.pendiente)return r;
   const c=document.querySelector('#escHoja .esc-cargando');if(c)c.textContent=`Buscando ${k} en Todos tus libros… (${Math.round((Date.now()-t0)/1000)} s, puede tardar un minuto)`;
   await new Promise(ok=>setTimeout(ok,5000));
  }
  return {};
 }
 async function resolver(k){
  hoja(`<div class="esc-cargando">Buscando ${k}…</div>`);
  const ix=await indice();
  if(ix.tomos.has(k)){const {o,t}=ix.tomos.get(k);if(t.tengo){if(rafaga){hoja(`<div class="esc-cargando">✓ Ya lo tienes: <b>${es(o.titulo)}${t.num?' '+es(t.num):''}</b></div>`);return seguir(1600)}return irObra(o,t)}return acciones({tipo:'obra',o},{isbn:k,num:t.num,titles:[o.titulo],authors:o.autores||[]},null)}
  if(ix.busc.has(k)){const {b,t}=ix.busc.get(k);return acciones({tipo:'bus',b},{isbn:k,num:t.num,titles:[b.t],authors:b.a||[],cover:b.img},null)}
  hoja(`<div class="esc-cargando">Buscando ${k} en Google Books, Open Library y Todos tus libros…</div>`);
  const pExt=porIsbn(k);
  const info=await lookup(k);info.isbn=k;
  const claro=c=>c.length===1||(c.length>1&&c[0].s>=0.9&&c[0].s-c[1].s>=0.3);
  let c=info.titles.length?candidatos(info,ix.lista):[];
  let ext=null,elegido=false;
  const cabecera=cargando=>{const tit=info.titles[0]||'';return info.titles.length?`<div class="esc-libro">${info.cover?`<img src="${es(info.cover)}" alt="">`:''}<div><b>${es(tit)}</b><small>${es([info.authors.join(', '),info.publisher,info.year].filter(Boolean).join(' · '))}</small><small>ISBN ${k}</small></div></div>`:`<div class="esc-libro"><div><b>ISBN ${k}</b><small>${cargando?'Aún no sé qué libro es.':'No sale en Google Books, Open Library ni Todos tus libros.'}</small></div></div>`};
  const pinta=cargando=>{
   const tit=info.titles[0]||'';
   const h=hoja(cabecera(cargando)+(cargando?`<div class="esc-cargando">${cargando}</div>`:'')
    +`<p class="esc-tit">${c.length?'¿De cuál es?':'No lo tienes ni está en tus buscados'}</p><div class="esc-ops">${c.map((x,j)=>{const img=x.tipo==='obra'?portada(x.o):x.b.img;const t=x.tipo==='obra'?x.o.titulo:x.b.t,au=x.tipo==='obra'?(x.o.autores||[]).join(', '):(x.b.a||[]).join(', ');const eti=x.tipo==='obra'?(x.o.tiene?'Lo tienes':'En tu lista'):'Buscado';return `<button type="button" class="esc-op" data-j="${j}">${img?`<img src="${es(img)}" alt="">`:'<span class="esc-sin"></span>'}<span><b>${es(t)}</b><small>${es(au)}</small><em class="${x.tipo==='obra'&&x.o.tiene?'si':''}">${eti}</em></span></button>`}).join('')}
     ${tit?`<button type="button" class="esc-op esc-nueva" data-nueva>${info.cover?`<img src="${es(info.cover)}" alt="">`:'<span class="esc-sin">＋</span>'}<span><b>${c.length?'Ninguna: es otra obra':'Añadirlo'}</b><small>${es(tit)}</small></span></button>`:''}</div>`
    +(ext?.listado?.length?`<p class="esc-tit">En Listado Manga</p><div class="esc-fuera">${ext.listado.map(l=>`<a href="${es(l.url)}" target="_blank" rel="noopener">${es(l.nombre)}</a>`).join('')}</div>`:'')
    +`<p class="esc-tit">Buscarlo en</p>${externos(k,tit,ext?.url)}<button type="button" class="esc-otro" data-otro>Escanear otro</button>`);
   h.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{elegido=true;acciones(c[+b.dataset.j],info,ext)});
   h.querySelector('[data-nueva]')?.addEventListener('click',()=>{elegido=true;acciones({tipo:'nueva'},info,ext)});
   h.querySelector('[data-otro]').addEventListener('click',()=>{elegido=true});
  };
  if(claro(c)){const x=c[0];return acciones(x,info,null)}
  pinta('Buscando también en Todos tus libros…');
  ext=await pExt;
  if(elegido||$$('esc').hidden)return;
  if(ext.titulo){info.titles.unshift(ext.titulo);info.titles=[...new Set(info.titles)];if(ext.autores?.length)info.authors=[...new Set([...ext.autores,...info.authors])];info.cover=info.cover||ext.portada||'';c=candidatos(info,ix.lista)}
  if(claro(c))return acciones(c[0],info,ext);
  pinta('');
 }

 // ---- qué hacer con lo escaneado: «Lo tengo», «Lo tengo y leído», «Lo quiero», «Ver ficha»
 function acciones(x,info,ext){
  const k=info.isbn,libro=info.titles[0]||'';
  const num=info.num||numTomo(libro);
  const titulo=x.tipo==='obra'?x.o.titulo:x.tipo==='bus'?x.b.t:libro.replace(/\s*(?:tomo|vol\.?|n[ºo°]\.?|#)?\s*\d{1,3}\s*$/i,'').trim()||libro;
  const autores=x.tipo==='obra'?(x.o.autores||[]):x.tipo==='bus'?(x.b.a||[]):info.authors;
  const img=x.tipo==='obra'?portada(x.o):x.tipo==='bus'?x.b.img:info.cover;
  const ya=x.tipo==='obra'?(x.o.tomos||[]).find(t=>(k&&t.isbn===k)||(num&&String(t.num)===String(num))):null;
  const estado=x.tipo==='obra'?(ya?.tengo?`Ya lo tienes${ya.num?' (tomo '+ya.num+')':''}`:x.o.tiene?'Tienes otros tomos de esta obra':'En tu lista, sin tomos'):x.tipo==='bus'?'Está en tus buscados':'Obra nueva';
  const h=hoja(`<div class="esc-libro">${img?`<img src="${es(img)}" alt="">`:''}<div><b>${es(titulo)}</b><small>${es(autores.join(', '))}</small><small>${es(estado)}${k?' · ISBN '+k:''}</small></div></div>
   <label class="esc-num">Tomo nº <input id="escNum" inputmode="numeric" value="${es(num)}" placeholder="—"></label>
   <div class="esc-acc"><button type="button" class="esc-si" data-a="tengo">✓ Lo tengo</button><button type="button" class="esc-si" data-a="leido">✓ Lo tengo y leído</button><button type="button" data-a="quiero">♡ Lo quiero</button>${x.tipo!=='nueva'?`<button type="button" data-a="ver">Ver ficha</button>`:''}</div>
   <p class="esc-nota">Se guarda al momento aquí y se pasa a tu Whakoom la próxima vez que sincronices con Whakoom en el PC.</p>
   <button type="button" class="esc-otro" data-otro>Escanear otro</button>`);
  h.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{
   const a=b.dataset.a;
   if(a==='ver')return x.tipo==='obra'?irObra(x.o,ya,num):x.tipo==='bus'?irBus(x.b,null):null;
   b.disabled=true;
   try{
    const r=await api('/api/tengo',{accion:a,obra_id:x.tipo==='obra'?x.o.id:'',titulo,autores,num:$$('escNum').value.trim(),isbn:k,editorial:info.publisher||'',portada:x.tipo==='obra'?'':(info.cover||(x.tipo==='bus'?x.b.img:'')),url:ext?.url||''});
    if(a==='quiero'){try{bus=null}catch(e){}toast(`«${titulo}» añadido a buscados`);if(rafaga)return seguir(300);cerrar();return}
    if(typeof cargar==='function')await cargar(true);
    if(rafaga){toast(`✓ ${titulo}${$$('escNum').value?' '+$$('escNum').value:''}${a==='leido'?' (leído)':''}`);return seguir(300)}
    const o=(typeof obras!=='undefined'?obras:[]).find(z=>z.id===r.id)||(typeof obras!=='undefined'?obras:[]).find(z=>z.titulo===titulo);
    if(o){const t=(o.tomos||[]).find(z=>z.isbn===k);irObra(o,t);toast(a==='leido'?'Añadido como leído':'Añadido a tu colección · pendiente de leer')}
    else{cerrar();toast('Añadido')}
   }catch(e){b.disabled=false;toast('No se pudo guardar: '+e.message)}
  });
 }

 const css=document.createElement('style');css.textContent=`
 #esc{position:fixed;inset:0;z-index:200;background:#000;display:flex;flex-direction:column}#esc[hidden]{display:none}
 #esc video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
 .esc-marco{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}.esc-marco i{width:min(78vw,420px);height:min(34vw,180px);border:3px solid #fff;border-radius:14px;box-shadow:0 0 0 100vmax #0008}
 .esc-x{position:absolute;top:calc(10px + env(safe-area-inset-top));right:12px;z-index:2;font-size:30px;line-height:1;border:0;background:#0006;color:#fff;border-radius:50%;width:46px;height:46px;padding:0}
 .esc-aviso{position:absolute;top:calc(22px + env(safe-area-inset-top));left:16px;right:70px;margin:0;color:#fff;font-size:15px;text-shadow:0 1px 3px #000}
 .esc-form{position:absolute;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;gap:8px;z-index:2}.esc-form input{flex:1;font-size:17px;background:#111d;color:#fff;border-color:#555}.esc-form button{background:var(--accent);color:#1f2816;border:0;font-weight:600}
 .esc-hoja{position:absolute;left:0;right:0;bottom:0;z-index:3;max-height:78vh;overflow:auto;background:#1b211b;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px #000a}
 .esc-cargando{padding:22px 0;text-align:center;color:var(--muted)}
 .esc-libro{display:flex;gap:12px;align-items:flex-start;margin-bottom:6px}.esc-libro img{width:64px;border-radius:4px}.esc-libro b{display:block;font-size:16px}.esc-libro small{display:block}
 .esc-tit{margin:14px 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--accent)}
 .esc-ops{display:grid;gap:8px}.esc-op{display:flex;gap:12px;align-items:center;text-align:left;padding:8px;border-radius:10px;background:#232a23}.esc-op img,.esc-sin{width:52px;height:76px;object-fit:cover;border-radius:4px;background:#2d3627;flex:none}.esc-op b{display:block}.esc-op small{display:block}.esc-op em{display:inline-block;margin-top:4px;font-style:normal;font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid #5b6b4b;color:var(--muted)}.esc-op em.si{background:#2d3627;color:var(--accent)}
 .esc-fuera{display:flex;flex-wrap:wrap;gap:8px}.esc-fuera a{padding:8px 12px;border:1px solid var(--line);border-radius:20px;text-decoration:none;font-size:13px}
 .esc-raf{position:absolute;top:calc(64px + env(safe-area-inset-top));left:16px;z-index:2;background:#0007;color:#fff;border:1px solid #fff6;border-radius:20px;padding:6px 12px;font-size:13px}.esc-raf.on{background:var(--accent);color:#1f2816;border-color:var(--accent);font-weight:600}
 .esc-num{display:flex;align-items:center;gap:8px;margin:12px 0 4px;font-size:13px;color:var(--muted)}.esc-num input{width:80px;font-size:16px;padding:8px}
 .esc-acc{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.esc-acc button{padding:13px 8px;font-size:14px;border-radius:10px}.esc-acc .esc-si{background:#2d3627;color:var(--accent);border-color:#5b6b4b;font-weight:600}
 .esc-nota{font-size:11px;margin:10px 0 0}.esc-nueva .esc-sin{display:grid;place-items:center;font-size:26px;color:var(--accent)}
 .esc-otro{display:block;width:100%;margin-top:16px;background:var(--accent);color:#1f2816;border:0;font-weight:600}
 .tomo.isbn-marca{outline:3px solid var(--accent);outline-offset:3px;border-radius:6px;transition:outline .3s}
 body.esc-abierto{overflow:hidden}`;document.head.append(css);
 function boton(){const a=$$('infoBtn');if(!a||$$('isbnBtn'))return;const b=document.createElement('button');b.id='isbnBtn';b.className='icon-btn';b.type='button';b.title='Escanear un ISBN';b.innerHTML='▥ <span class="lbl-isbn">ISBN</span>';b.onclick=abrirEscaner;a.before(b)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();
})();
