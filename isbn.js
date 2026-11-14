/* ISBN: escribe, pega o escanea el código de barras de un tomo (lector USB o cámara) y Woody Físico
   busca qué obra es (Google Books y Open Library) y la ficha que le corresponde: tu colección o tus buscados.
   Un lector de códigos USB funciona como un teclado: basta con tener abierto el cuadro de ISBN. */
(function(){
 const $$=id=>document.getElementById(id);
 const es=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()
  .replace(/[«»"'’`´!¡?¿.,:;()\[\]{}~\-–—_/\\|·•★☆♪]/g,' ')
  .replace(/\b(tomo|vol|volumen|volume|n|no|nº|num|numero|edicion|edition|integral|kanzenban|deluxe|maximum)\b/g,' ')
  .replace(/\b\d+\b/g,' ').replace(/\s+/g,' ').trim();
 const words=s=>new Set(norm(s).split(' ').filter(w=>w.length>1));
 function score(a,b){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++});return n/Math.max(A.size,B.size)}
 function cleanIsbn(s){const d=String(s||'').replace(/[^0-9Xx]/g,'').toUpperCase();return d.length===13||d.length===10?d:''}
 function numTomo(t){const m=String(t||'').match(/(?:tomo|vol\.?|volumen|volume|n[ºo°]\.?|#)\s*(\d{1,3})\b/i)||String(t||'').match(/\b(\d{1,3})\s*$/);return m?String(+m[1]):''}

 async function lookup(isbn){
  const out={titles:[],authors:[],publisher:'',year:'',cover:'',src:[]};
  try{const r=await (await fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:'+isbn)).json();
   for(const it of r.items||[]){const v=it.volumeInfo||{};if(v.title)out.titles.push(v.title+(v.subtitle?' '+v.subtitle:''));(v.authors||[]).forEach(a=>out.authors.push(a));out.publisher=out.publisher||v.publisher||'';out.year=out.year||(v.publishedDate||'').slice(0,4);out.cover=out.cover||(v.imageLinks&&(v.imageLinks.thumbnail||v.imageLinks.smallThumbnail)||'').replace(/^http:/,'https:');if(!out.src.includes('Google Books'))out.src.push('Google Books')}}catch(e){}
  try{const r=await (await fetch('https://openlibrary.org/api/books?bibkeys=ISBN:'+isbn+'&format=json&jscmd=data')).json();
   const v=r['ISBN:'+isbn];if(v){if(v.title)out.titles.push(v.title+(v.subtitle?' '+v.subtitle:''));(v.authors||[]).forEach(a=>out.authors.push(a.name));out.publisher=out.publisher||((v.publishers||[])[0]||{}).name||'';out.year=out.year||String(v.publish_date||'').slice(-4);out.cover=out.cover||(v.cover&&(v.cover.medium||v.cover.small))||'';out.src.push('Open Library')}}catch(e){}
  out.titles=[...new Set(out.titles)];out.authors=[...new Set(out.authors)];return out;
 }

 function puntua(info,nombres,autores){
  let t=0;for(const x of info.titles)for(const y of nombres)t=Math.max(t,score(x,y));
  let a=0;const au=autores.join(' ');for(const x of info.authors)a=Math.max(a,score(x,au));
  return (t>=0.5||(t>=0.34&&a>=0.5))?t*0.8+a*0.2:0;
 }
 async function coincidencias(info){
  const mias=[];
  for(const o of (typeof obras!=='undefined'?obras:[])){
   const nombres=[o.titulo,...(o.alias||[]),...new Set((o.tomos||[]).map(t=>t.serie).filter(Boolean))].filter(Boolean);
   const s=puntua(info,nombres,o.autores||[]);if(s)mias.push({o,s});
  }
  let lista=typeof bus!=='undefined'&&bus?bus:null;
  if(!lista){try{lista=await api('/api/buscados');try{bus=lista}catch(e){}}catch(e){lista=[]}}
  const busc=[];lista.forEach((b,i)=>{const s=puntua(info,[b.t].filter(Boolean),b.a||[]);if(s)busc.push({b,i,s})});
  return {mias:mias.sort((x,y)=>y.s-x.s).slice(0,6),busc:busc.sort((x,y)=>y.s-x.s).slice(0,6)};
 }
 function lineaTomo(o,n){
  if(!n)return '';const ts=(o.tomos||[]).filter(t=>String(t.num)===n);
  if(!ts.length)return ` · <b>tomo ${es(n)}: no consta</b>`;
  return ts.some(t=>t.tengo)?` · <b class="isbn-si">tomo ${es(n)}: lo tienes</b>`:` · <b class="isbn-no">tomo ${es(n)}: no lo tienes</b>`;
 }

 async function buscar(code){
  const isbn=cleanIsbn(code);const box=$$('isbnResult');
  if(!isbn){box.innerHTML='<p>Eso no parece un ISBN (tiene que tener 10 o 13 cifras).</p>';return}
  box.innerHTML='<p>Buscando '+isbn+'…</p>';
  const info=await lookup(isbn);
  const ext=`<p class="isbn-links">Buscar a mano: <a href="https://www.whakoom.com/search?s=${isbn}" target="_blank" rel="noopener">Whakoom</a> · <a href="https://www.google.com/search?q=${isbn}+site%3Alistadomanga.es" target="_blank" rel="noopener">Listado Manga</a> · <a href="https://www.google.com/search?q=${isbn}" target="_blank" rel="noopener">Google</a></p>`;
  if(!info.titles.length){box.innerHTML=`<p>No he encontrado datos de este ISBN (${isbn}) en Google Books ni en Open Library.</p>`+ext;return}
  const n=numTomo(info.titles[0]);const {mias,busc}=await coincidencias(info);
  box.innerHTML=`<div class="isbn-info">${info.cover?`<img src="${es(info.cover)}" alt="">`:''}<div><b>${es(info.titles[0])}</b>${info.titles.length>1?`<br><small>${es(info.titles.slice(1).join(' · '))}</small>`:''}<br>${es(info.authors.join(', ')||'Autor desconocido')}${info.publisher?' · '+es(info.publisher):''}${info.year?' · '+es(info.year):''}<br><small>ISBN ${isbn} · datos de ${es(info.src.join(' y '))}</small></div></div>`
   +(mias.length?`<p><b>En tu colección:</b></p><ul class="isbn-hits">${mias.map(({o,s})=>`<li><button type="button" data-obra="${es(o.id)}">${es(o.titulo)}</button> <small>${es((o.autores||[]).join(', '))} · tienes ${o._tengo??0} de ${o._total??(o.tomos||[]).length} tomos${lineaTomo(o,n)} · ${Math.round(s*100)} %</small></li>`).join('')}</ul>`:'<p>No está en tu colección.</p>')
   +(busc.length?`<p><b>En buscados:</b></p><ul class="isbn-hits">${busc.map(({b,i,s})=>`<li><button type="button" data-bus="${i}">${es(b.t)}</button> <small>${es((b.a||[]).join(', '))} · ${Math.round(s*100)} %</small></li>`).join('')}</ul>`:'')
   +ext;
  box.querySelectorAll('[data-obra]').forEach(el=>el.onclick=()=>{cerrar();abrir(el.dataset.obra)});
  box.querySelectorAll('[data-bus]').forEach(el=>el.onclick=()=>{cerrar();abrirBus(bus[+el.dataset.bus]);if(!$$('detail').open)$$('detail').showModal()});
 }

 // Cámara: BarcodeDetector si el navegador lo trae; si no, ZXing (static/vendor/zxing.min.js)
 let stream=null,zx=null,loop=null;
 function stopCam(){if(loop){cancelAnimationFrame(loop);loop=null}if(zx){try{zx.reset()}catch(e){}zx=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}const v=$$('isbnVideo');if(v)v.hidden=true}
 function cerrar(){stopCam();const d=$$('isbnDialog');if(d?.open)d.close()}
 async function startCam(){
  const v=$$('isbnVideo');v.hidden=false;
  const done=code=>{stopCam();$$('isbnInput').value=code;buscar(code)};
  try{
   if('BarcodeDetector' in window&&(await BarcodeDetector.getSupportedFormats()).includes('ean_13')){
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});v.srcObject=stream;await v.play();
    const sup=await BarcodeDetector.getSupportedFormats();const det=new BarcodeDetector({formats:['ean_13','ean_8'].filter(f=>sup.includes(f))});
    const tick=async()=>{try{const r=await det.detect(v);const c=r.find(x=>cleanIsbn(x.rawValue));if(c)return done(c.rawValue)}catch(e){}loop=requestAnimationFrame(tick)};tick();
   }else{
    if(!window.ZXing)await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='vendor/zxing.min.js';s.onload=ok;s.onerror=()=>ko(Error('no se pudo cargar el lector de códigos'));document.head.append(s)});
    const hints=new Map();hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8]);
    zx=new ZXing.BrowserMultiFormatReader(hints);
    zx.decodeFromVideoDevice(null,v,res=>{if(res&&cleanIsbn(res.getText()))done(res.getText())});
   }
  }catch(e){stopCam();toast('No se pudo usar la cámara: '+e.message)}
 }

 function abrirIsbn(){
  let d=$$('isbnDialog');
  if(!d){d=document.createElement('dialog');d.id='isbnDialog';d.className='isbn';document.body.append(d);
   d.innerHTML=`<button class="close" type="button" id="isbnClose" aria-label="Cerrar">×</button><h2>Buscar por ISBN</h2>
    <p>Escribe el ISBN, pásalo con el lector de códigos de barras o enséñaselo a la cámara.</p>
    <form id="isbnForm"><input id="isbnInput" inputmode="numeric" autocomplete="off" placeholder="978…" aria-label="ISBN"> <button type="submit">Buscar</button> <button type="button" id="isbnCam">📷 Cámara</button></form>
    <video id="isbnVideo" muted playsinline hidden></video><div id="isbnResult"></div>`;
   $$('isbnClose').onclick=cerrar;d.addEventListener('close',stopCam);
   $$('isbnForm').onsubmit=e=>{e.preventDefault();buscar($$('isbnInput').value).catch(err=>toast('Error: '+err.message))};
   $$('isbnCam').onclick=()=>startCam();
  }
  $$('isbnInput').value='';$$('isbnResult').innerHTML='';
  if(!d.open)d.showModal();$$('isbnInput').focus();
 }

 const css=document.createElement('style');css.textContent=`dialog.isbn{width:min(640px,94vw);padding:18px 22px}dialog.isbn h2{margin:4px 0 6px}dialog.isbn form{display:flex;gap:6px;margin:8px 0}dialog.isbn #isbnInput{flex:1;font-size:18px;letter-spacing:1px;padding:6px 8px}dialog.isbn video{width:100%;max-height:300px;background:#000;border-radius:6px;margin:6px 0}.isbn-info{display:flex;gap:12px;align-items:flex-start;margin:10px 0}.isbn-info img{width:80px;border-radius:4px}.isbn-hits{list-style:none;padding:0;margin:6px 0}.isbn-hits li{margin:5px 0}.isbn-hits button{cursor:pointer}.isbn-si{color:#2e8b57}.isbn-no{color:#c0392b}.isbn-links{font-size:12px;opacity:.8}`;document.head.append(css);
 function boton(){const a=$$('infoBtn');if(!a||$$('isbnBtn'))return;const b=document.createElement('button');b.id='isbnBtn';b.className='icon-btn';b.type='button';b.title='Buscar una ficha por ISBN (código de barras)';b.textContent='ISBN';b.onclick=abrirIsbn;a.before(b)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();
})();
