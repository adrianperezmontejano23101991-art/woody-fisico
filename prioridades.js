'use strict';
/* Prioridades: todo lo que te falta (terror, tomos únicos y cortas, el resto) en un tablero por prioridad,
   tu orden de lectura y un calendario por meses. Se rehace solo con lo que tienes y lo que buscas. */
(()=>{
const ntk=s=>String(s||'').replace(/\([^)]*\)/g,'').normalize('NFKD').replace(/[^\x00-\x7f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const COLS=[['ya','Ya'],['pronto','Pronto'],['algun','Algún día'],['','Sin decidir']];
const TIPOS=[['todo','Todo'],['terror','Terror'],['corta','Tomo único y cortas'],['otras','Resto']];
const TIPO_TXT={terror:'Terror',corta:'Tomo único / corta',otras:'Resto'};
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
let P=null,pv='comprar',ptipo='todo',verNo=false,arrastra=null;
try{const g=JSON.parse(localStorage.getItem('prio')||'{}');if(g.pv)pv=g.pv;if(g.ptipo)ptipo=g.ptipo}catch{}
const recuerda=()=>{try{localStorage.setItem('prio',JSON.stringify({pv,ptipo}))}catch{}};

function indiceObras(){const m=new Map();for(const o of obras)for(const t of [o.titulo,...(o.alias||[]),...(o.tomos||[]).map(x=>x.serie)]){const k=ntk(t);if(k&&!m.has(k))m.set(k,o)}return m}
function estadoEs(lm,f){if(!lm){const e=String(f.estado||'');return e.charAt(0).toUpperCase()+e.slice(1)}const e=lm.est||'';if(/abierta/.test(e))return 'Abierta · '+(lm.ed_n||0)+(lm.n?' de '+lm.n:'');if(/pausa/.test(e))return 'En pausa · '+(lm.ed_n||0)+(lm.n?' de '+lm.n:'');if(/cancel/.test(e))return 'Cancelada';if(lm.n&&lm.ed_n>=lm.n)return 'Terminada';return e.charAt(0).toUpperCase()+e.slice(1)}
const terminada=lm=>lm&&lm.n&&lm.ed_n>=lm.n&&!/abierta|pausa/.test(lm.est||'');
function lista(){const ob=indiceObras(),busK=new Map();(bus||[]).forEach(b=>{const k=ntk(b.t);if(k&&!busK.has(k))busK.set(k,b)});
 const ks=new Set([...Object.keys(P.fichas),...busK.keys()]);const out=[];
 for(const k of ks){const f=P.fichas[k]||{},b=busK.get(k),pr=P.prio[k]||{};const it={k,t:f.t||b?.t||k,a:b?.a?.length?b.a:(f.a||[]),img:b?.img||f.img||'',url:b?.url||f.url||'',nota:b?.nota??f.nota,n:(v=>/^\d+$/.test(String(v))?v+(v==1?' tomo':' tomos'):v)(b?.n||f.n||f.tomos||''),gen:b?.gen||f.gen||'',g:f.g||'',ed:b?.p||f.ed||'',estado:b?.e||f.estado||'',lm:f.lm||null,precio:f.precio,dif:f.dif,anyo:f.anyo,grupo:f.prox,nex:f.nota_ex,fuentes:f.f||(b?['Buscados']:[]),buscado:!!b,p:pr.p||'',o:pr.o};
  if(!f.tipo){const m=String(b?.n||'').match(/\d+/);it.tipo0=b?.gen==='Terror'?'terror':m&&+m[0]<=3?'corta':'otras'}else it.tipo0=f.tipo;
  it.tipo=pr.tipo||it.tipo0;
  const o=ob.get(k);if(o&&o.tiene){it.obra=o.id;it.tengo=o._tengo;const tot=it.lm?.n||0;if(!tot||o._tengo>=tot)continue}
  if(!it.obra&&!it.buscado&&!f.f?.some(x=>x!=='Buscados'))continue;
  it.est=estadoEs(it.lm,it);out.push(it)}
 return out}
const pasa=(it,q)=>(ptipo==='todo'||it.tipo===ptipo)&&(!q||sinAcento(it.t+' '+it.a.join(' ')+' '+it.ed).includes(q));
const ordenCol=(a,b)=>(a.o??1e9)-(b.o??1e9)||(+(b.nota||0))-(+(a.nota||0))||coll.compare(a.t,b.t);
function etiquetas(it){const l=[];if(it.tengo)l.push(`<b class="ptiene">Tienes ${it.tengo}${it.lm?.n?'/'+it.lm.n:''}</b>`);else if(it.n)l.push(esc(it.n));if(it.est)l.push(esc(it.est));if(it.nota&&!isNaN(+it.nota))l.push('★ '+wkf(it.nota));if(it.precio)l.push(esc(it.precio)+' €');if(it.dif)l.push(esc(it.dif));return l.join(' · ')}
function tarjetaP(it){return `<div class="pcard" draggable="true" data-pk="${esc(it.k)}">${it.img?`<img loading="lazy" src="${esc(it.img)}" alt="">`:`<span class="psin">${esc(it.t.slice(0,1))}</span>`}<div class="ptxt"><b>${esc(it.t)}</b><small>${esc(it.a.slice(0,2).join(', '))}</small><span class="pet">${etiquetas(it)}</span></div></div>`}
function cabecera(extra=''){return `<div class="nov-cab"><div><b>Prioridades</b><small>${extra}</small></div><div class="seg">${[['comprar','Por comprar'],['leer','Por leer'],['calendario','Calendario']].map(([k,t])=>`<button data-pv="${k}" class="${pv===k?'on':''}">${t}</button>`).join('')}</div></div>`}
const tiposHtml=()=>`<div class="ptipos seg">${TIPOS.map(([k,t])=>`<button data-pt="${k}" class="${ptipo===k?'on':''}">${t}</button>`).join('')}</div>`;

window.pintaPrioridades=async function(){const g=$('grid');g.className='grouped';
 if(!P||!bus){g.innerHTML='<div class="empty">Cargando…</div>';try{const r=await Promise.all([P?null:api('/api/prioridades'),bus?null:api('/api/buscados')]);if(r[0])P=r[0];if(r[1])bus=r[1]}catch(e){g.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}if(ui.vista!=='prioridades')return}
 const q=sinAcento($('search').value.trim());
 if(pv==='leer')return pintaLectura(g,q);
 const todo=lista();const l=todo.filter(it=>pasa(it,q));
 if(pv==='calendario')return pintaCalendario(g,l);
 const vivos=l.filter(it=>it.p!=='no'),no=l.filter(it=>it.p==='no');
 g.innerHTML=cabecera(`${vivos.length} por comprar`)+tiposHtml()+`<div class="pboard">${COLS.map(([p,t])=>{const c=vivos.filter(it=>it.p===p).sort(ordenCol);return `<section class="pcol" data-pcol="${p}"><h3>${t}<small>${c.length}</small></h3><div class="plist">${c.map(tarjetaP).join('')||'<p class="pvacio">Arrastra aquí o cámbialo desde la ficha.</p>'}</div></section>`}).join('')}</div>`+
  `<div class="pfin"><button id="pExcel">⬇ Descargar Excel</button>${no.length?` <button id="pVerNo">${verNo?'Ocultar':'Ver'} las que no te interesan (${no.length})</button>`:''}</div>`+(verNo&&no.length?`<div class="plist pno">${no.sort(ordenCol).map(tarjetaP).join('')}</div>`:'');
 enlaza(g,todo);
 if(innerWidth<650){const bd=g.querySelector('.pboard'),c=[...bd.children].find(x=>x.querySelector('.pcard'));if(c)bd.scrollLeft=c.offsetLeft-bd.offsetLeft}
 $('pExcel').onclick=()=>excel(todo.filter(it=>it.p!=='no'));if($('pVerNo'))$('pVerNo').onclick=()=>{verNo=!verNo;pintaPrioridades()}};

function enlaza(g,todo){g.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{pv=b.dataset.pv;recuerda();pintaPrioridades()});
 g.querySelectorAll('[data-pt]').forEach(b=>b.onclick=()=>{ptipo=b.dataset.pt;recuerda();pintaPrioridades()});
 const porK=new Map(todo.map(it=>[it.k,it]));
 g.querySelectorAll('.pcard').forEach(c=>{c.onclick=()=>fichaP(porK.get(c.dataset.pk),todo);c.ondragstart=e=>{arrastra=c.dataset.pk;e.dataTransfer.effectAllowed='move';c.classList.add('parr')};c.ondragend=()=>{c.classList.remove('parr');arrastra=null}});
 g.querySelectorAll('[data-pcol]').forEach(s=>{s.ondragover=e=>{if(!arrastra)return;e.preventDefault();s.classList.add('psobre')};s.ondragleave=()=>s.classList.remove('psobre');
  s.ondrop=e=>{e.preventDefault();s.classList.remove('psobre');if(!arrastra)return;const it=porK.get(arrastra);const ante=e.target.closest?.('.pcard');coloca(it,s.dataset.pcol,ante&&ante.dataset.pk!==it.k?porK.get(ante.dataset.pk):null,todo)}})}

async function cambia(k,d){const e=P.prio[k]||(P.prio[k]={});Object.assign(e,d);if('p' in d&&!d.p)delete e.p;if('tipo' in d&&!d.tipo)delete e.tipo;if(!Object.keys(e).length)delete P.prio[k];await api('/api/prioridad',{k,...d})}
// pone «it» en la columna p, delante de «antes» (o al final); numera solo lo que hace falta
async function coloca(it,p,antes,todo){const col=todo.filter(x=>x.p===p&&x.k!==it.k&&x.p!=='no').sort(ordenCol);const i=antes?col.indexOf(antes):-1;
 const ops=[];if(i>=0){const hasta=col.slice(0,i+1);hasta.forEach((x,j)=>{const o=j<i?j:j+1;if(x.o!==o)ops.push([x.k,{o}])});ops.push([it.k,{p,o:i}])}
 else{const conO=col.filter(x=>x.o!=null);ops.push([it.k,{p,o:conO.length?Math.max(...conO.map(x=>x.o))+1:null}])}
 try{for(const [k,d] of ops)await cambia(k,d)}catch(e){toast(e.message)}pintaPrioridades()}

function fichaP(it,todo){if(!it)return;sel=null;const lmUrl=it.lm?'https://www.listadomanga.es/coleccion.php?id='+it.lm.id:'';
 const pills=[TIPO_TXT[it.tipo],it.ed,it.n,it.est,it.lm?.fin&&terminada(it.lm)?'Acabó '+fecha(it.lm.fin):'',it.lm?.prox?'Próximo tomo: '+fecha(it.lm.prox):'',it.precio?it.precio+' €':'',it.dif,it.anyo?'Año '+it.anyo:'',it.grupo&&it.grupo!=='Próximas adquisiciones'?it.grupo:'',it.nex].filter(Boolean);
 $('detailContent').innerHTML=`<div class="detail-layout"><div class="detail-side">${it.img?`<img class="detail-cover" src="${esc(it.img)}" alt="Portada">`:''}</div><div><span class="eyebrow">POR COMPRAR · ${esc((COLS.find(c=>c[0]===it.p)||['','DESCARTADA'])[1].toUpperCase())}</span><h2>${esc(it.t)}</h2><div>${esc(it.a.join(' · ')||'Autor pendiente')}</div>
  ${it.tengo?`<p><b>Tienes ${it.tengo}${it.lm?.n?' de '+it.lm.n:''} tomos.</b></p>`:''}<div class="pills">${pills.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}${it.nota&&!isNaN(+it.nota)?`<span class="pill">Whakoom ${wkf(it.nota)} / 5</span>`:''}</div>${it.g?`<p class="fine">${esc(it.g)}</p>`:''}
  <h3 class="psub">Prioridad</h3><div class="seg pprio">${[...COLS,['no','No me interesa']].map(([p,t])=>`<button data-pp="${p}" class="${it.p===p?'on':''}">${t}</button>`).join('')}</div>
  <div class="pmover"><button data-pm="-1">↑ Subir</button><button data-pm="1">↓ Bajar</button><button data-pm="0">⤒ La primera</button></div>
  <h3 class="psub">Tipo</h3><div class="seg">${TIPOS.slice(1).map(([k,t])=>`<button data-ptp="${k}" class="${it.tipo===k?'on':''}">${t}</button>`).join('')}</div>
  <div class="links">${it.url?`<a href="${esc(it.url)}" target="_blank" rel="noopener">Whakoom ↗</a>`:''}${lmUrl?`<a href="${lmUrl}" target="_blank" rel="noopener">Listado Manga ↗</a>`:''}</div><p class="fine">Sale de: ${esc(it.fuentes.join(', ')||'—')}</p></div></div>`;
 const d=$('detailContent');
 d.querySelectorAll('[data-pp]').forEach(b=>b.onclick=async()=>{try{await cambia(it.k,{p:b.dataset.pp});it.p=b.dataset.pp;d.querySelectorAll('[data-pp]').forEach(x=>x.classList.toggle('on',x===b));pintaPrioridades()}catch(e){toast(e.message)}});
 d.querySelectorAll('[data-ptp]').forEach(b=>b.onclick=async()=>{const t=b.dataset.ptp;try{await cambia(it.k,{tipo:t===it.tipo0?'':t});it.tipo=t;d.querySelectorAll('[data-ptp]').forEach(x=>x.classList.toggle('on',x===b));pintaPrioridades()}catch(e){toast(e.message)}});
 d.querySelectorAll('[data-pm]').forEach(b=>b.onclick=async()=>{const fresco=lista();const col=fresco.filter(x=>x.p===it.p).sort(ordenCol);const i=col.findIndex(x=>x.k===it.k);const m=+b.dataset.pm;
  if(m===0)await coloca(it,it.p,col[0]?.k===it.k?null:col[0],fresco);else if(m<0&&i>0)await coloca(it,it.p,col[i-1],fresco);else if(m>0&&i<col.length-1)await coloca(it,it.p,col[i+2]||null,fresco);toast('Movida')});
 if(!$('detail').open)$('detail').showModal()}
const fecha=s=>{const m=String(s||'').match(/(\d{4})-(\d{2})/);return m?MES[+m[2]-1]+' '+m[1]:s};

// ---------- por leer: tu lista de prioridad de lectura y lo que tienes sin leer
function pintaLectura(g,q){const ob=indiceObras(),busK=new Map((bus||[]).map(b=>[ntk(b.t),b]));
 const fila=(t,i)=>{const k=ntk(t),o=ob.get(k),b=busK.get(k),f=P.fichas[k]||{};return{t,i,k,o,img:o?portada(o):b?.img||f.img||'',a:o?.autores||b?.a||f.a||[],leido:!!o?.leido,tiene:!!o?.tiene,tomos:o?o._tengo+'/'+o._total:''}};
 const ord=P.lectura.map(fila);const enLista=new Set(ord.map(x=>x.k));
 const pend=ord.filter(x=>!x.leido),leidos=ord.length-pend.length;
 const sinOrden=obras.filter(o=>o.tiene&&!o.leido&&!enLista.has(ntk(o.titulo))).sort((a,b)=>coll.compare(a.titulo,b.titulo));
 const ver=x=>!q||sinAcento(x.t+' '+x.a.join(' ')).includes(q);
 const carta=(x,n)=>`<div class="pcard plee" draggable="${n?'true':'false'}" data-lt="${esc(x.t)}">${n?`<span class="pnum">${n}</span>`:''}${x.img?`<img loading="lazy" src="${esc(x.img)}" alt="">`:`<span class="psin">${esc(x.t.slice(0,1))}</span>`}<div class="ptxt"><b>${esc(x.t)}</b><small>${esc(x.a.slice(0,2).join(', '))}</small><span class="pet">${x.tiene?'En casa · '+x.tomos:'No lo tienes en papel'}</span></div>${n?`<span class="pacc"><button data-lm="-1" title="Subir">↑</button><button data-lm="1" title="Bajar">↓</button><button data-lq title="Quitar de la lista">✕</button></span>`:`<span class="pacc"><button data-la>＋ A la lista</button></span>`}</div>`;
 g.innerHTML=cabecera(`${pend.length} en tu orden de lectura${leidos?` · ${leidos} ya leídos`:''}`)+`<h2 class="group-title">Tu orden de lectura<small>Arrastra o usa las flechas</small></h2><div class="plist plectura">${pend.filter(ver).map(x=>carta(x,pend.indexOf(x)+1)).join('')||'<p class="pvacio">Vacía.</p>'}</div>`+
  `<h2 class="group-title">En casa sin leer y sin orden<small>${sinOrden.length}</small></h2><div class="plist plectura">${sinOrden.map(o=>fila(o.titulo)).filter(ver).map(x=>carta(x,0)).join('')}</div>`;
 g.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{pv=b.dataset.pv;recuerda();pintaPrioridades()});
 const guarda=async l=>{P.lectura=l;try{await api('/api/lectura',{orden:l})}catch(e){toast(e.message)}pintaPrioridades()};
 const pos=t=>P.lectura.indexOf(t);
 g.querySelectorAll('.plee').forEach(c=>{const t=c.dataset.lt;
  c.querySelector('[data-la]')?.addEventListener('click',e=>{e.stopPropagation();guarda([...P.lectura,t])});
  c.querySelector('[data-lq]')?.addEventListener('click',e=>{e.stopPropagation();guarda(P.lectura.filter(x=>x!==t))});
  c.querySelectorAll('[data-lm]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const m=+b.dataset.lm;const vis=pend.map(x=>x.t);const i=vis.indexOf(t),j=i+m;if(j<0||j>=vis.length)return;const l=[...P.lectura];const a=pos(t),bb=pos(vis[j]);[l[a],l[bb]]=[l[bb],l[a]];guarda(l)}));
  c.onclick=()=>{const o=ob.get(ntk(t));if(o)abrir(o.id)};
  if(c.draggable){c.ondragstart=e=>{arrastra=t;e.dataTransfer.effectAllowed='move'};c.ondragend=()=>arrastra=null;c.ondragover=e=>{if(arrastra)e.preventDefault()};c.ondrop=e=>{e.preventDefault();if(!arrastra||arrastra===t)return;const l=P.lectura.filter(x=>x!==arrastra);l.splice(l.indexOf(t),0,arrastra);guarda(l)}}})}

// ---------- calendario: cuándo sale lo que te falta
function pintaCalendario(g,l){const vivos=l.filter(it=>it.p!=='no'&&it.lm);const ahora=new Date(),ym=ahora.getFullYear()+'-'+String(ahora.getMonth()+1).padStart(2,'0');
 const mini=it=>`<button class="pmini p-${it.p||'nada'}" data-pk="${esc(it.k)}" title="${esc(it.t)}">${it.img?`<img loading="lazy" src="${esc(it.img)}" alt="">`:''}<span>${esc(it.t)}</span>${it.tengo?`<em>${it.tengo}/${it.lm.n||'?'}</em>`:''}</button>`;
 const meses=[];for(let i=0;i<12;i++){const d=new Date(ahora.getFullYear(),ahora.getMonth()+i,1);meses.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))}
 const prox=vivos.filter(it=>it.lm.prox&&it.lm.prox>=ym);const luego=prox.filter(it=>it.lm.prox>meses[11]);
 const fin=vivos.filter(it=>terminada(it.lm)&&it.lm.fin);const anos=[...new Set(fin.map(it=>it.lm.fin.slice(0,4)))].sort().reverse();
 const abiertas=vivos.filter(it=>!terminada(it.lm)&&!(it.lm.prox&&it.lm.prox>=ym));
 const leyenda=`<div class="pley">${COLS.map(([p,t])=>`<span class="p-${p||'nada'}">${t}</span>`).join('')}</div>`;
 g.innerHTML=cabecera(`${vivos.length} con datos de Listado Manga`)+tiposHtml()+leyenda+
  `<h2 class="group-title">Próximos tomos<small>Lo que te falta y tiene fecha</small></h2><div class="pcal"><table><thead><tr>${meses.map(m=>`<th>${MESL[+m.slice(5)-1]} ${m.slice(0,4)}</th>`).join('')}<th>Más adelante</th></tr></thead><tbody><tr>${meses.map(m=>`<td>${prox.filter(it=>it.lm.prox===m).sort(ordenCol).map(mini).join('')}</td>`).join('')}<td>${luego.sort(ordenCol).map(mini).join('')}</td></tr></tbody></table></div>`+
  `<h2 class="group-title">Terminadas en España<small>Por el mes en que salió el último tomo</small></h2><div class="pcal"><table><thead><tr><th>Año</th>${MESL.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${anos.map(a=>`<tr><th>${a}</th>${MESL.map((_,i)=>{const m=a+'-'+String(i+1).padStart(2,'0');return `<td>${fin.filter(it=>it.lm.fin===m).sort(ordenCol).map(mini).join('')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`+
  `<h2 class="group-title">Abiertas sin próximo tomo anunciado<small>${abiertas.length}</small></h2><div class="pmis">${abiertas.sort(ordenCol).map(mini).join('')}</div>`;
 enlaza(g,l);const porK=new Map(l.map(it=>[it.k,it]));g.querySelectorAll('.pmini').forEach(b=>b.onclick=()=>fichaP(porK.get(b.dataset.pk),l))}

// ---------- Excel (.xlsx hecho aquí mismo, sin librerías)
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zip(files){const en=new TextEncoder(),partes=[],dir=[];let off=0;
 for(const [nombre,txt] of files){const n=en.encode(nombre),d=en.encode(txt),c=crc32(d);const h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,n.length,true);
  const cd=new DataView(new ArrayBuffer(46));cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0x0800,true);cd.setUint32(16,c,true);cd.setUint32(20,d.length,true);cd.setUint32(24,d.length,true);cd.setUint16(28,n.length,true);cd.setUint32(42,off,true);
  partes.push(h,n,d);dir.push(cd,n);off+=30+n.length+d.length}
 const tam=dir.reduce((a,x)=>a+(x.byteLength??x.length),0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,tam,true);e.setUint32(16,off,true);
 return new Blob([...partes,...dir,e],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function excel(l){const x=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
 const cab=['Prioridad','Orden','Tipo','Título','Autor','Tienes','Tomos en España','Estado en España','Editorial','Acabó','Próximo tomo','Whakoom / 5','Precio (€)','Dificultad','Notas','Sale de','Listado Manga','Whakoom'];
 const anchos=[14,7,18,40,28,8,10,18,24,11,13,10,10,14,32,30,13,10];
 const pn={ya:'1 · Ya',pronto:'2 · Pronto',algun:'3 · Algún día','':'4 · Sin decidir'},est={ya:2,pronto:3,algun:4,'':0};
 const filas=[...l].sort((a,b)=>(pn[a.p]||'9').localeCompare(pn[b.p]||'9')||ordenCol(a,b));
 const col=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=(i-m-1)/26}return s};
 const links=[];
 const celda=(r,c,v,s=0)=>{const ref=col(c)+r;if(v===''||v==null)return s?`<c r="${ref}" s="${s}"/>`:'';return typeof v==='number'?`<c r="${ref}" s="${s}"><v>${v}</v></c>`:`<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`};
 let rows=`<row r="1">${cab.map((h,i)=>celda(1,i,h,1)).join('')}</row>`;
 filas.forEach((it,i)=>{const r=i+2,lm=it.lm||{},u=it.lm?'https://www.listadomanga.es/coleccion.php?id='+lm.id:'';const s=est[it.p]||0;
  const v=[pn[it.p],it.o!=null?it.o+1:'',TIPO_TXT[it.tipo],it.t,it.a.join(', '),it.tengo||'',lm.n||'',it.est,lm.ed||it.ed,terminada(it.lm)?fecha(lm.fin):'',lm.prox?fecha(lm.prox):'',it.nota&&!isNaN(+it.nota)?+it.nota:'',typeof it.precio==='number'?it.precio:(it.precio||''),it.dif||'',[it.grupo&&it.grupo!=='Próximas adquisiciones'?it.grupo:'',it.nex].filter(Boolean).join(' · '),it.fuentes.join(', '),u?'Ver':'',it.url?'Ver':''];
  if(u){links.push([col(3)+r,u]);links.push([col(16)+r,u])}else if(it.url)links.push([col(3)+r,it.url]);if(it.url)links.push([col(17)+r,it.url]);
  rows+=`<row r="${r}">${v.map((y,c)=>celda(r,c,y,c===0?s:(c===3||c>=16)&&(c!==3||u||it.url)?5:0)).join('')}</row>`});
 const ult=col(cab.length-1)+(filas.length+1);
 const hoja=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${anchos.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${ult}"/>${links.length?`<hyperlinks>${links.map(([ref],i)=>`<hyperlink ref="${ref}" r:id="h${i}"/>`).join('')}</hyperlinks>`:''}</worksheet>`;
 const relsHoja=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links.map(([,u],i)=>`<Relationship Id="h${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${x(u)}" TargetMode="External"/>`).join('')}</Relationships>`;
 const estilos=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F3B2B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFEB9C"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const b=zip([['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
  ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets><sheet name="Por comprar" sheetId="1" r:id="r1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Por comprar'!$A$1:$${col(cab.length-1)}$${filas.length+1}</definedName></definedNames></workbook>`],
  ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
  ['xl/styles.xml',estilos],['xl/worksheets/sheet1.xml',hoja],['xl/worksheets/_rels/sheet1.xml.rels',relsHoja]]);
 const a=document.createElement('a');a.href=URL.createObjectURL(b);const h=new Date();a.download=`Mangas por comprar (${h.getDate()}-${h.getMonth()+1}-${h.getFullYear()}).xlsx`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
})();
