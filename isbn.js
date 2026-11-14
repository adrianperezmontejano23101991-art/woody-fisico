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
 const words=s=>new Set(norm(s).split(' ').filter(w=>w.length>1));
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
 let stream=null,zx=null,loop=null,ocupado=false;
 function stopCam(){if(loop){cancelAnimationFrame(loop);loop=null}if(zx){try{zx.reset()}catch(e){}zx=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
 function cerrar(){stopCam();const e=$$('esc');if(e)e.hidden=true;document.body.classList.remove('esc-abierto')}
 async function camara(){
  const v=$$('escVideo');stopCam();
  const leido=code=>{const k=a13(code);if(!k||ocupado)return;ocupado=true;navigator.vibrate?.(60);stopCam();resolver(k)};
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
    <form id="escForm" class="esc-form"><input id="escInput" inputmode="numeric" autocomplete="off" placeholder="o escribe el ISBN" aria-label="ISBN"><button>Buscar</button></form>
    <div id="escHoja" class="esc-hoja" hidden></div>`;
   $$('escX').onclick=cerrar;
   $$('escForm').onsubmit=ev=>{ev.preventDefault();const k=a13($$('escInput').value);if(!k){toast('Ese ISBN no tiene 10 o 13 cifras');return}stopCam();resolver(k)};
  }
  ocupado=false;$$('escHoja').hidden=true;$$('escInput').value='';e.hidden=false;document.body.classList.add('esc-abierto');camara();
  if(!matchMedia('(pointer:coarse)').matches)$$('escInput').focus();
 }
 function hoja(html){const h=$$('escHoja');h.innerHTML=html;h.hidden=false;
  h.querySelectorAll('[data-otro]').forEach(b=>b.onclick=()=>{ocupado=false;h.hidden=true;$$('escInput').value='';camara()});return h}
 const externos=k=>`<div class="esc-fuera"><a href="https://www.whakoom.com/search?s=${k}" target="_blank" rel="noopener">Whakoom</a><a href="https://www.todostuslibros.com/busquedas?keyword=${k}" target="_blank" rel="noopener">Todos tus libros</a><a href="https://www.amazon.es/s?k=${k}" target="_blank" rel="noopener">Amazon</a><a href="https://www.google.com/search?q=${k}+site%3Alistadomanga.es" target="_blank" rel="noopener">Listado Manga</a></div>`;
 async function resolver(k){
  hoja(`<div class="esc-cargando">Buscando ${k}…</div>`);
  const ix=await indice();
  if(ix.tomos.has(k)){const {o,t}=ix.tomos.get(k);return irObra(o,t)}
  if(ix.busc.has(k)){const {b,t}=ix.busc.get(k);return irBus(b,t)}
  const info=await lookup(k);const n=numTomo(info.titles[0]);
  const c=info.titles.length?candidatos(info,ix.lista):[];
  if(c.length===1||(c.length>1&&c[0].s>=0.9&&c[0].s-c[1].s>=0.3)){const x=c[0];return x.tipo==='obra'?irObra(x.o,null,n):irBus(x.b,null)}
  const cab=info.titles.length?`<div class="esc-libro">${info.cover?`<img src="${es(info.cover)}" alt="">`:''}<div><b>${es(info.titles[0])}</b><small>${es([info.authors.join(', '),info.publisher,info.year].filter(Boolean).join(' · '))}</small><small>ISBN ${k}</small></div></div>`:`<div class="esc-libro"><div><b>ISBN ${k}</b><small>No sale en Google Books ni en Open Library.</small></div></div>`;
  const h=hoja(cab+(c.length?`<p class="esc-tit">¿Es alguna de estas?</p><div class="esc-ops">${c.map((x,j)=>{const img=x.tipo==='obra'?portada(x.o):x.b.img;const tit=x.tipo==='obra'?x.o.titulo:x.b.t,au=x.tipo==='obra'?(x.o.autores||[]).join(', '):(x.b.a||[]).join(', ');const eti=x.tipo==='obra'?(x.o.tiene?'Lo tienes':'En tu lista'):'Buscado';return `<button class="esc-op" data-j="${j}">${img?`<img src="${es(img)}" alt="">`:'<span class="esc-sin"></span>'}<span><b>${es(tit)}</b><small>${es(au)}</small><em class="${x.tipo==='obra'&&x.o.tiene?'si':''}">${eti}</em></span></button>`}).join('')}</div>`:`<p class="esc-tit">No lo tienes ni está en tus buscados.</p>`)+`<p class="esc-tit">Buscarlo en</p>${externos(k)}<button type="button" class="esc-otro" data-otro>Escanear otro</button>`);
  h.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{const x=c[+b.dataset.j];x.tipo==='obra'?irObra(x.o,null,n):irBus(x.b,null)});
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
 .esc-otro{display:block;width:100%;margin-top:16px;background:var(--accent);color:#1f2816;border:0;font-weight:600}
 .tomo.isbn-marca{outline:3px solid var(--accent);outline-offset:3px;border-radius:6px;transition:outline .3s}
 body.esc-abierto{overflow:hidden}`;document.head.append(css);
 function boton(){const a=$$('infoBtn');if(!a||$$('isbnBtn'))return;const b=document.createElement('button');b.id='isbnBtn';b.className='icon-btn';b.type='button';b.title='Escanear un ISBN';b.innerHTML='▥ <span class="lbl-isbn">ISBN</span>';b.onclick=abrirEscaner;a.before(b)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();
})();
