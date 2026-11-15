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
let P=null,pv='comprar',ptipo='todo',pcol='ya',pano='',pform=(()=>{try{return localStorage.getItem('wf-pform')}catch{}})()||'tabla',SAL=[],arrastra=null;
try{const g=JSON.parse(localStorage.getItem('prio')||'{}');if(g.pv)pv=g.pv;if(g.ptipo)ptipo=g.ptipo}catch{}
const recuerda=()=>{try{localStorage.setItem('prio',JSON.stringify({pv,ptipo}))}catch{}};

let VER=0,cIx=null,cL=null;{const _api=api;api=async function(u,d){if(d!==undefined){VER++;cIx=cL=null}return _api(u,d)}}
function indiceObras(){if(cIx&&cIx.o===obras&&cIx.n===obras.length)return cIx.m;const m=new Map();for(const o of obras)for(const t of [o.titulo,...(o.alias||[]),...(o.tomos||[]).map(x=>x.serie)]){const k=ntk(t);if(k&&!m.has(k))m.set(k,o)}cIx={o:obras,n:obras.length,m};return m}
function estadoEs(lm,f){if(!lm){const e=String(f.estado||'');return e.charAt(0).toUpperCase()+e.slice(1)}const e=lm.est||'';if(/abierta/.test(e))return 'Abierta · '+(lm.ed_n||0)+(lm.n?' de '+lm.n:'');if(/pausa/.test(e))return 'En pausa · '+(lm.ed_n||0)+(lm.n?' de '+lm.n:'');if(/cancel/.test(e))return 'Cancelada';if(lm.n&&lm.ed_n>=lm.n)return 'Terminada';if(lm.n&&lm.ed_n<lm.n)return 'En curso · '+(lm.ed_n||0)+' de '+lm.n;return e.charAt(0).toUpperCase()+e.slice(1)}
const terminada=lm=>!!(lm&&lm.n&&lm.ed_n>=lm.n&&/completa/.test(lm.est||''));const sinAcabar=lm=>!!(lm&&/cancel|pausa/.test(lm.est||''));
function lista(){if(cL&&cL.o===obras&&cL.b===bus&&cL.P===P&&cL.v===VER)return cL.l;const l=lista0();cL={o:obras,b:bus,P,v:VER,l};return l}
function lista0(){const ob=indiceObras(),busK=new Map();(bus||[]).forEach(b=>{const k=ntk(b.t);if(k&&!busK.has(k))busK.set(k,b)});
 const ks=new Set([...Object.keys(P.fichas),...busK.keys()]);const out=[];
 for(const k of ks){const f=P.fichas[k]||{},b=busK.get(k),pr=P.prio[k]||{};const it={k,t:f.t||b?.t||k,a:b?.a?.length?b.a:(f.a||[]),img:b?.img||f.img||'',url:b?.url||f.url||'',nota:b?.nota??f.nota,n:(v=>/^\d+$/.test(String(v))?v+(v==1?' tomo':' tomos'):v)(b?.n||f.n||f.tomos||''),gen:b?.gen||f.gen||'',g:f.g||'',ed:b?.p||f.ed||'',estado:b?.e||f.estado||'',lm:f.lm||null,precio:f.precio,dif:f.dif,anyo:f.anyo,grupo:f.prox,nex:f.nota_ex,fuentes:f.f||(b?['Buscados']:[]),buscado:!!b,p:pr.p||'',o:pr.o,d:String(b?.d||f.d||'')
  .replace(/(\s*[\r\n]\s*)+/g,'\n'),cal:!!f.cal,idioma:b?.l||f.idioma||'',formato:b?.ed||''};
  if(!f.tipo){const m=String(b?.n||'').match(/\d+/);it.tipo0=b?.gen==='Terror'?'terror':m&&+m[0]<=3?'corta':'otras'}else it.tipo0=f.tipo;
  it.tipo=pr.tipo||it.tipo0;
  const o=ob.get(k)||ob.get(ntk(it.t));if(o&&o.tiene&&!k.includes('~')){it.obra=o.id;it.tengo=o._tengo;it.o_=o;if(!it.img)it.img=portada(o)||'';if(!pr.tipo&&/terror/i.test(o.estante||''))it.tipo='terror';const tot=it.lm?.n||0,wk=o.wk_ed||[],wkN=wk.reduce((x,e)=>x+e[1],0),wkFin=wk.length&&wk.every(e=>e[2]==='T'||e[2]==='C'),cont=!!it.lm?.cont;
   const mios=new Set(o.tomos.filter(x=>x.tengo).map(x=>'nº'+x.num)),num=t=>/^nº\d+$/.test(t[0]);const te=it.lm?.te||[],tp=it.lm?.tp||[];
   it.faltan=te.filter(t=>num(t)&&!mios.has(t[0])).map(t=>t[0]);it.vienen=tp.filter(t=>!mios.has(t[0]));const conNum=te.some(num);
   if(!cont&&wkFin&&o._tengo>=wkN&&!it.vienen.length)continue;
   if(conNum?!it.faltan.length&&!it.vienen.length:(!tot||o._tengo>=tot)&&!it.vienen.length)continue}
  if(!it.obra&&!it.buscado&&!f.f?.some(x=>x!=='Buscados'))continue;
  it.est=estadoEs(it.lm,it);out.push(it)}
 return out}
const pasa=(it,q)=>(ptipo==='todo'||it.tipo===ptipo)&&(!q||sinAcento(it.t+' '+it.a.join(' ')+' '+it.ed).includes(q));
const ordenCol=(a,b)=>(a.o??1e9)-(b.o??1e9)||(+(b.nota||0))-(+(a.nota||0))||coll.compare(a.t,b.t);
function etiquetas(it){const l=[];if(it.tengo){l.push(`<b class="ptiene">Tienes ${it.tengo}${it.lm?.n?'/'+it.lm.n:''}</b>`);if(it.lm?.cont)l.push('sigue en '+esc(it.lm.ed));if(it.faltan?.length)l.push('ya puedes comprar '+esc(it.faltan.slice(0,3).join(', ')+(it.faltan.length>3?'…':'')))}else if(it.n)l.push(esc(it.n));if(it.est)l.push(esc(it.est));if(it.nota&&!isNaN(+it.nota))l.push('★ '+wkf(it.nota));if(it.precio)l.push(esc(it.precio)+' €');if(it.dif)l.push(esc(it.dif));return l.join(' · ')}
function tarjetaP(it){return `<div class="pcard" draggable="true" data-pk="${esc(it.k)}">${it.img?`<img loading="lazy" src="${esc(it.img)}" alt="">`:`<span class="psin">${esc(it.t.slice(0,1))}</span>`}<div class="ptxt"><b>${esc(it.t)}</b><small>${esc(it.a.slice(0,2).join(', '))}</small><span class="pet">${etiquetas(it)}</span></div></div>`}
function cabecera(extra=''){return `<div class="nov-cab"><div><b>Mis listas</b><small>${extra}</small></div><div class="seg">${[['comprar','Prioridad de compra'],['leer','Orden de lectura'],['calendario','Próximos'],['anos','Por años']].map(([k,t])=>`<button data-pv="${k}" class="${pv===k?'on':''}">${t}</button>`).join('')}</div></div>`}
const tiposHtml=()=>`<div class="ptipos seg">${TIPOS.map(([k,t])=>`<button data-pt="${k}" class="${ptipo===k?'on':''}">${t}</button>`).join('')}</div>`;

window.pintaPrioridades=async function(){const g=$('grid');g.className='grouped';
 if(!P||!bus){g.innerHTML='<div class="empty">Cargando…</div>';try{const r=await Promise.all([P?null:api('/api/prioridades'),bus?null:api('/api/buscados'),nov?null:api('/api/novedades').catch(()=>null)]);if(r[0])P=r[0];if(r[1])bus=r[1];if(r[2])nov=r[2]}catch(e){g.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}if(ui.vista!=='prioridades')return}
 const q=sinAcento($('search').value.trim());
 if(pv==='leer')return pintaLectura(g,q);
 const todo=lista();const l=todo.filter(it=>pasa(it,q));
 if(pv==='calendario'||pv==='anos')return pintaCalendario(g,l);
 const vivos=l.filter(it=>it.p!=='no'&&!it.cal),no=l.filter(it=>it.p==='no'&&!it.cal);
 const grupos=[...COLS,['no','No me interesa']].map(([p,t])=>[p,t,(p==='no'?no:vivos.filter(it=>it.p===p)).sort(ordenCol)]);
 if(!grupos.some(x=>x[0]===pcol&&x[2].length))pcol=(grupos.find(x=>x[2].length)||grupos[0])[0];
 const cab=cabecera(`${vivos.length} por comprar`)+tiposHtml()+`<div class="chips pchips">${grupos.map(([p,t,v])=>`<button class="chip ${pcol===p?'on':''}" data-pc="${p}">${t}<b>${v.length}</b></button>`).join('')}<button class="chip" id="pExcel">⬇ Excel</button></div>`;
 trozos(g,cab,[{t:null,items:grupos.find(x=>x[0]===pcol)[2]}],tarjetaP,'pgridl');
 enlaza(g);
 g.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>{pcol=b.dataset.pc;pintaPrioridades()});
 $('pExcel').onclick=()=>excel(todo.filter(it=>it.p!=='no'&&!it.cal))};

function enlaza(g){g.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{pv=b.dataset.pv;recuerda();pintaPrioridades()});
 g.querySelectorAll('[data-pt]').forEach(b=>b.onclick=()=>{ptipo=b.dataset.pt;recuerda();pintaPrioridades()})}
window.abrePk=k=>{const l=lista();fichaP(l.find(x=>x.k===k),l)};
window.abrePs=i=>{const x=SAL[i];if(!x)return;if(x.it)fichaP(x.it,lista());else fichaCol({titulo:x.t,img:x.img,url:x.url,sub:x.ex,fecha:fecha(x.m)})};

async function cambia(k,d){cL=null;const e=P.prio[k]||(P.prio[k]={});Object.assign(e,d);if('p' in d&&!d.p)delete e.p;if('tipo' in d&&!d.tipo)delete e.tipo;if(!Object.keys(e).length)delete P.prio[k];await api('/api/prioridad',{k,...d})}
// pone «it» en la columna p, delante de «antes» (o al final); numera solo lo que hace falta
async function coloca(it,p,antes,todo){const col=todo.filter(x=>x.p===p&&x.k!==it.k&&x.p!=='no').sort(ordenCol);const i=antes?col.indexOf(antes):-1;
 const ops=[];if(i>=0){const hasta=col.slice(0,i+1);hasta.forEach((x,j)=>{const o=j<i?j:j+1;if(x.o!==o)ops.push([x.k,{o}])});ops.push([it.k,{p,o:i}])}
 else{const conO=col.filter(x=>x.o!=null);ops.push([it.k,{p,o:conO.length?Math.max(...conO.map(x=>x.o))+1:null}])}
 try{for(const [k,d] of ops)await cambia(k,d)}catch(e){toast(e.message)}pintaPrioridades()}

function fichaP(it,todo){if(!it)return;sel=null;const lm=it.lm,lmUrl=lm?'https://www.listadomanga.es/coleccion.php?id='+lm.id:'';const o=it.o_;
 const mios=new Set((o?.tomos||[]).filter(t=>t.tengo).map(t=>String(t.num))),leidos=new Set((o?.tomos||[]).filter(t=>t.leido).map(t=>String(t.num)));
 const pills=[TIPO_TXT[it.tipo],lm?.ed||it.ed,it.formato,it.idioma,it.n,it.est,lm?.ini?'Empezó '+fecha(lm.ini):'',lm?.fin&&terminada(lm)?'Acabó '+fecha(lm.fin):'',lm?.cierra?'Último tomo: '+fecha(lm.cierra):'',lm?.jp?'Japón: '+lm.jp+' tomos'+(lm.jpe?' ('+lm.jpe+')':''):'',it.precio?'Colección: '+it.precio+' €':'',it.dif,it.anyo?'Año '+it.anyo:'',it.grupo&&it.grupo!=='Próximas adquisiciones'?it.grupo:'',it.nex].filter(Boolean);
 const filaT=(t,prep)=>{const n=(t[0].match(/^nº(\d+)$/)||[])[1],mio=n&&mios.has(n);return `<tr class="${mio?'pmio':''} ${prep?'pprep':''}"><td>${mio?'✓':''}</td><td>${esc(t[0])}</td><td>${t[1]?fecha(t[1]):''}${prep?' · en preparación':''}</td><td class="num">${t[2]?esc(t[2])+' €':''}</td><td>${n&&leidos.has(n)?'Leído':''}</td></tr>`};
 const tablaT=lm&&(lm.te?.length||lm.tp?.length)?`<h3 class="psub">Tomos en España${mios.size?` · tienes ${mios.size}`:''}</h3><div class="ptomos"><table>${(lm.te||[]).map(t=>filaT(t)).join('')}${(lm.tp||[]).map(t=>filaT(t,1)).join('')}</table>${lm.ne?`<p class="fine">Quedan ${lm.ne} tomos más sin fecha.</p>`:''}</div>`:'';
 const notas=[it.nota&&!isNaN(+it.nota)?`<span class="pnota"><b>${wkf(it.nota)}</b><small>Whakoom / 5</small></span>`:'',o?.valoracion?`<span class="pnota"><b>${esc(o.valoracion)}</b><small>Tu nota</small></span>`:'',o?.wk_media?`<span class="pnota"><b>${wkf(o.wk_media)}</b><small>Whakoom (tus tomos)</small></span>`:''].join('');
 $('detailContent').innerHTML=`<div class="detail-layout"><div class="detail-side">${it.img?`<img class="detail-cover" src="${esc(it.img)}" alt="Portada">`:''}</div><div><span class="eyebrow">${it.cal?'NOVEDAD DE UN AUTOR QUE TIENES':'POR COMPRAR · '+esc((COLS.find(c=>c[0]===it.p)||['','DESCARTADA'])[1].toUpperCase())}</span><h2>${esc(it.t)}</h2><div>${esc(it.a.join(' · ')||'Autor pendiente')}</div>
  ${it.tengo?`<p><b>Tienes ${it.tengo}${lm?.n?' de '+lm.n:''} tomos.</b>${lm?.cont?' Los tuyos son de otra edición; la colección sigue en '+esc(lm.ed)+'.':''}${it.faltan?.length?' Ya han salido y te faltan: '+esc(it.faltan.join(', '))+'.':''} ${o?`<button id="pMia">Abrir mi ficha</button>`:''}</p>`:''}${notas?`<div class="pnotas">${notas}</div>`:''}<div class="pills">${pills.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>${it.g?`<p class="fine">${esc(it.g)}</p>`:''}${it.d?`<p class="description" style="max-height:none">${esc(it.d)}</p>`:''}
  <div class="pmover pacciones"><button data-ptengo>✓ Lo tengo…</button>${it.buscado?'':'<button data-pquiero>♡ Lo quiero (buscados y Whakoom)</button>'}</div>
  <h3 class="psub">Prioridad</h3><div class="seg pprio">${[...COLS,['no','No me interesa']].map(([p,t])=>`<button data-pp="${p}" class="${it.p===p?'on':''}">${t}</button>`).join('')}</div>
  <div class="pmover"><button data-pm="-1">↑ Subir</button><button data-pm="1">↓ Bajar</button><button data-pm="0">⤒ La primera</button></div>
  <h3 class="psub">Tipo</h3><div class="seg">${TIPOS.slice(1).map(([k,t])=>`<button data-ptp="${k}" class="${it.tipo===k?'on':''}">${t}</button>`).join('')}</div>
  ${tablaT}<div class="links">${it.url?`<a href="${esc(it.url)}" target="_blank" rel="noopener">Whakoom ↗</a>`:`<a href="https://www.whakoom.com/search?s=${encodeURIComponent(it.t)}" target="_blank" rel="noopener">Buscar en Whakoom ↗</a>`}${lmUrl?`<a href="${lmUrl}" target="_blank" rel="noopener">Listado Manga ↗</a>`:''}</div><p class="fine">Sale de: ${esc(it.fuentes.join(', ')||'—')}</p></div></div>`;
 if($('pMia'))$('pMia').onclick=()=>abrir(o.id);
 acciones($('detailContent'),{titulo:it.t,img:it.img,autores:it.a,url:it.url||lmUrl,editorial:lm?.ed||it.ed,sugeridos:window.__escNum?(()=>{const n=window.__escNum;window.__escNum='';return n})():it.faltan?.length?it.faltan.map(x=>x.replace('nº','')).join(','):(lm?.n?'1-'+lm.n:'1')});
 const d=$('detailContent');
 d.querySelectorAll('[data-pp]').forEach(b=>b.onclick=async()=>{try{await cambia(it.k,{p:b.dataset.pp});it.p=b.dataset.pp;d.querySelectorAll('[data-pp]').forEach(x=>x.classList.toggle('on',x===b));pintaPrioridades()}catch(e){toast(e.message)}});
 d.querySelectorAll('[data-ptp]').forEach(b=>b.onclick=async()=>{const t=b.dataset.ptp;try{await cambia(it.k,{tipo:t===it.tipo0?'':t});it.tipo=t;d.querySelectorAll('[data-ptp]').forEach(x=>x.classList.toggle('on',x===b));pintaPrioridades()}catch(e){toast(e.message)}});
 d.querySelectorAll('[data-pm]').forEach(b=>b.onclick=async()=>{const fresco=lista();const col=fresco.filter(x=>x.p===it.p).sort(ordenCol);const i=col.findIndex(x=>x.k===it.k);const m=+b.dataset.pm;
  if(m===0)await coloca(it,it.p,col[0]?.k===it.k?null:col[0],fresco);else if(m<0&&i>0)await coloca(it,it.p,col[i-1],fresco);else if(m>0&&i<col.length-1)await coloca(it,it.p,col[i+2]||null,fresco);toast('Movida')});
 if(!$('detail').open)$('detail').showModal()}
const fecha=s=>{const m=String(s||'').match(/(\d{4})-(\d{2})/);return m?MES[+m[2]-1]+' '+m[1]:s};

// ---------- ficha de cualquier colección (novedades, calendario, descubrir, buscados…)
async function asegura(){if(!P||!bus){const r=await Promise.all([P?null:api('/api/prioridades'),bus?null:api('/api/buscados')]);if(r[0])P=r[0];if(r[1])bus=r[1]}}
const limpiaT=t=>String(t||'').replace(/\s*-\s*Pack .*$/i,'').replace(/\s*n[º°]\s*\d+.*$/i,'').replace(/\s*\((de \d+|[^)]*Ediciones?[^)]*|[^)]*Editorial[^)]*|Panini[^)]*|Norma[^)]*|Ivrea[^)]*|Planeta[^)]*|Milky Way[^)]*)\)\s*$/i,'').trim();
window.fichaCol=async function(c){try{await asegura()}catch{}
 const lmId=+((String(c.url||'').match(/listadomanga\.es\/coleccion\.php\?id=(\d+)/)||[])[1]||0),t=limpiaT(c.titulo),k=ntk(t);
 const o=obras.find(x=>(x.lm_cols||[]).includes(lmId)||x.lm_id===lmId)||indiceObras().get(k);
 const l=lista();const it=l.find(x=>lmId&&x.lm?.id===lmId)||l.find(x=>x.k===k);
 if(it)return fichaP(it,l);if(o)return abrir(o.id);
 sel=null;const lmUrl=lmId?'https://www.listadomanga.es/coleccion.php?id='+lmId:'';
 $('detailContent').innerHTML=`<div class="detail-layout"><div class="detail-side">${c.img?`<img class="detail-cover" src="${esc(c.img)}" alt="Portada">`:''}</div><div><span class="eyebrow">NO ESTÁ EN TUS LISTAS</span><h2>${esc(t||c.titulo)}</h2>${c.titulo!==t?`<div class="fine">${esc(c.titulo)}</div>`:''}<div class="pills">${[c.sub,c.fecha].filter(Boolean).map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>
  <div class="pmover pacciones"><button data-ptengo>✓ Lo tengo…</button><button data-pquiero>♡ Lo quiero (buscados y Whakoom)</button>${/^\d+$/.test(String(c.id||''))?'<button data-pno>No me interesa</button>':''}</div>
  <div class="links">${lmUrl?`<a href="${lmUrl}" target="_blank" rel="noopener">Listado Manga ↗</a>`:c.url?`<a href="${esc(c.url)}" target="_blank" rel="noopener">Ver ↗</a>`:''}<a href="https://www.whakoom.com/search?s=${encodeURIComponent(t)}" target="_blank" rel="noopener">Buscar en Whakoom ↗</a></div></div></div>`;
 const d=$('detailContent');acciones(d,{titulo:t||c.titulo,img:c.img,url:lmUrl||c.url,sugeridos:(String(c.titulo).match(/n[º°]\s*(\d+)/)||[])[1]||'1'});
 d.querySelector('[data-pno]')?.addEventListener('click',async()=>{try{await api('/api/novedades/descartar',{id:c.id});toast('Quitada');$('detail').close();if(typeof cargaNov==='function')cargaNov()}catch(e){toast(e.message)}});
 if(!$('detail').open)$('detail').showModal()};
function acciones(d,x){d.querySelector('[data-pquiero]')?.addEventListener('click',async e=>{try{await api('/api/tengo',{accion:'quiero',titulo:x.titulo,portada:x.img||'',autores:x.autores||[],url:x.url||'',editorial:x.editorial||''});bus=null;toast('Añadida a buscados; pasará a Whakoom');e.target.disabled=true}catch(er){toast(er.message)}});
 d.querySelector('[data-ptengo]')?.addEventListener('click',async e=>{const r=prompt('¿Qué tomos tienes? (por ejemplo 1-3 o 1,2,5)',x.sugeridos||'1');if(!r)return;const nums=[];for(const p of r.split(/[,\s]+/)){const m=p.match(/^(\d+)(?:-(\d+))?$/);if(!m)continue;for(let n=+m[1];n<=+(m[2]||m[1])&&nums.length<200;n++)nums.push(String(n))}if(!nums.length)return;
  try{for(const n of nums)await api('/api/tengo',{accion:'tengo',titulo:x.titulo,num:n,portada:n===nums[0]?x.img||'':'',editorial:x.editorial||''});toast(nums.length+(nums.length===1?' tomo apuntado':' tomos apuntados')+'; pasarán a Whakoom');e.target.disabled=true;if(typeof cargar==='function')cargar(true)}catch(er){toast(er.message)}})}
// las cartas de Novedades y Descubrir abren su ficha
document.addEventListener('click',e=>{const a=e.target.closest?.('.ncard a.cover, .ncard h3');if(!a)return;const card=a.closest('.ncard');if(/\/blog\//.test(card.querySelector('a.cover')?.getAttribute('href')||''))return;e.preventDefault();
 const h=card.querySelector('a.cover');fichaCol({titulo:card.querySelector('h3')?.textContent||'',img:card.querySelector('img')?.getAttribute('src')||'',url:h?.getAttribute('href')||'',sub:card.querySelector('p')?.textContent||'',id:card.querySelector('[data-descarta]')?.dataset.descarta||card.querySelector('[data-visto]')?.dataset.visto||''})},true);

// ---------- para otras vistas
const baseT=t=>ntk(String(t||'').replace(/\s*[-–:]\s*(edici[oó]n|nueva edici|kanzenban|integral|deluxe|maximum|ultimate|perfect|master edition).*$/i,'').replace(/\((?:[^)]*(edici|integral|kanzenban|deluxe|maximum|ultimate|perfect|tapa dura|master|nueva|complete|castellano|català|catala|[A-Z][a-z]+ Ediciones?|Ivrea|Norma|Planeta|Panini|Glénat|EDT|ECC|Milky Way|Arechi|Distrito|Moztros|Kibook|Devir)[^)]*)\)/gi,''));
window.esMia=function(c){const lmId=+((String(c.url||'').match(/coleccion\.php\?id=(\d+)/)||[])[1]||c.id||0);
 if(lmId&&obras.some(o=>o.tiene&&((o.lm_cols||[]).includes(lmId)||o.lm_id===lmId)))return true;
 const ix=indiceObras(),t=limpiaT(c.titulo),o=ix.get(ntk(t))||ix.get(baseT(c.titulo))||ix.get(baseT(t));return !!(o&&o.tiene)};
window.esMiaBus=function(b){const ix=indiceObras(),t=limpiaT(b.t),o=ix.get(ntk(t))||ix.get(baseT(b.t));if(!o||!o.tiene)return false;
 const nb=+((String(b.n||'').match(/\d+/)||[])[0]||0);if(nb&&o._tengo<nb)return false;
 const ed=ntk(String(b.p||'').split(/\s/)[0]);if(ed&&ed.length>2&&!o._eds.some(e=>ntk(e).includes(ed)))return false;return true};
window.cargaPrio=()=>asegura();
window.prioDe=t=>P?.prio?.[ntk(t)]?.p||'';
document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-busver="prio"]');if(!b||P)return;try{await asegura()}catch{}if(typeof pintaBuscados==='function')pintaBuscados()});

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
function pintaCalendario(g,l){const qq=sinAcento($('search').value.trim());const o_completa=x=>x.o._tengo>=x.lm.n;const vivos=l.filter(it=>it.p!=='no'&&it.lm);const ahora=new Date(),ym=ahora.getFullYear()+'-'+String(ahora.getMonth()+1).padStart(2,'0');
 const autMios=new Set();obras.filter(o=>o.tiene).forEach(o=>(o.autores||[]).forEach(a=>autMios.add(ntk(a).split('').sort().join(''))));
 const mini=(it,ex='')=>`<button class="pmini p-${it.p||'nada'}" data-pk="${esc(it.k)}" title="${esc(it.t)}">${it.img?`<img loading="lazy" src="${esc(it.img)}" alt="">`:''}<span>${esc(it.t)}${ex?`<i>${ex}</i>`:''}</span>${it.tengo?`<em>${it.tengo}/${it.lm.n||'?'}</em>`:''}</button>`;
 const meses=[];for(let i=0;i<12;i++){const d=new Date(ahora.getFullYear(),ahora.getMonth()+i,1);meses.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))}
 // próximos tomos: lo que ya sigues, lo que se cierra ese mes, novedades de tus autores y todo el terror que sale
 const hoy=ym+'-'+String(ahora.getDate()).padStart(2,'0');const porLm=new Map();for(const it of l)if(it.lm&&!porLm.has(it.lm.id))porLm.set(it.lm.id,it);
 const sal=[],visto=new Set();const mete=(x)=>{const k=x.col+'|'+(x.num||x.t);if(visto.has(k))return;visto.add(k);sal.push(x)};
 const C=nov?.cartas||{};const deCarta=(c,ex)=>{const col=+((c.url||'').match(/id=(\d+)/)||[])[1]||0,num=(c.titulo.match(/nº\s*(\d+)/)||[])[1]||'';const iso=c.iso||'';if(!iso||(iso.length>7?iso<hoy:iso<ym))return;
   const it=porLm.get(col);if(it?.p==='no')return;if(num&&it?.o_?.tomos.some(t=>t.tengo&&String(t.num)===num))return;
   if(ptipo!=='todo'&&(it?it.tipo!==ptipo:!(ptipo==='terror'&&ex==='Terror')))return;
   mete({col,num,m:iso.slice(0,7),t:c.titulo.replace(/\s*\((de \d+[^)]*)\)\s*$/,''),img:c.img||it?.img||'',url:c.url,ex,it})};
 (C.tuyas||[]).filter(c=>c.tipo==='proximo').forEach(c=>deCarta(c,'Tu colección'));
 for(const it of vivos){const mios=new Set((it.o_?.tomos||[]).filter(x=>x.tengo).map(x=>'nº'+x.num));for(const t of it.lm.tp||[]){if(!t[1]||t[1]<ym||mios.has(t[0]))continue;const cierra=it.lm.cierra===t[1]&&t===[...it.lm.tp].reverse().find(x=>x[1]===t[1]);
   const por=it.tengo?'Tu colección':cierra?(it.lm.tp.length===1&&!it.lm.ed_n?'Buscado · tomo único':'Buscado · último tomo'):'';
   if(por)mete({col:it.lm.id,num:(t[0].match(/\d+/)||[])[0]||'',m:t[1],t:it.t+(/^nº/.test(t[0])?' '+t[0]:''),img:it.img,ex:por+(it.tengo&&cierra?' · último':''),it})}}
 (C.tuyas||[]).filter(c=>c.tipo==='autor').forEach(c=>deCarta(c,c.sub||'Autor que tienes'));
 (C.terror_prox||[]).forEach(c=>deCarta(c,'Terror'));
 const miniS=x=>`<button class="pmini p-${x.it?.p||(x.ex==='Terror'?'terror':'nada')}" data-ps="${sal.indexOf(x)}" title="${esc(x.t)}">${x.img?`<img loading="lazy" src="${esc(x.img)}" alt="">`:''}<span>${esc(x.t)}<i>${esc(x.ex)}</i></span>${x.it?.tengo?`<em>${x.it.tengo}/${x.it.lm?.n||'?'}</em>`:''}</button>`;
 const peso=x=>x.ex.startsWith('Tu colección')?0:x.ex==='Terror'?1:x.ex.startsWith('Buscado')?2:3;
 const celda=m=>sal.filter(x=>x.m===m).sort((a,b)=>peso(a)-peso(b)||coll.compare(a.t,b.t)).map(miniS).join('');
 const luego=sal.filter(x=>x.m>meses[11]);
 const fin=vivos.filter(it=>!it.cal&&terminada(it.lm)&&it.lm.fin);const ten=P.fichas._tengo||{};const yaK=new Set(fin.map(it=>it.lm.id));
 const mias=obras.filter(o=>o.tiene&&ten[o.id]&&!yaK.has(ten[o.id].id)).map(o=>({o,lm:ten[o.id]})).filter(x=>terminada({...x.lm,ed_n:x.lm.ed_n})&&x.lm.fin&&o_completa(x)&&(ptipo==='todo'||(ptipo==='terror'?/terror/i.test(x.o.estante||''):ptipo==='corta'?x.lm.n<=3:true))&&(!qq||sinAcento(x.o.titulo).includes(qq)));
 const anos=[...new Set([...fin.map(it=>it.lm.fin.slice(0,4)),...mias.map(x=>x.lm.fin.slice(0,4))])].sort().reverse();
 const cortas=vivos.filter(it=>!it.cal&&sinAcabar(it.lm));const siguen=new Set(obras.filter(o=>o.tiene&&ten[o.id]&&!sinAcabar(ten[o.id])).map(o=>baseT(o.titulo.replace(/\([^)]*\)/g,''))));const cortasMias=obras.filter(o=>o.tiene&&ten[o.id]&&sinAcabar(ten[o.id])&&!siguen.has(baseT(o.titulo.replace(/\([^)]*\)/g,'')))&&(!qq||sinAcento(o.titulo).includes(qq))).map(o=>({o,lm:ten[o.id]}));
 const miniMia=(x,ex)=>`<button class="pmini ${ex?'':'pverde'}" data-po="${esc(x.o.id)}" title="${esc(x.o.titulo)}">${portada(x.o)?`<img loading="lazy" src="${esc(portada(x.o))}" alt="">`:''}<span>${esc(x.o.titulo)}${ex?`<i>${esc(ex)} · tienes ${x.o._tengo}</i>`:''}</span>${ex?'':`<em>${x.o._tengo}/${x.lm.n}</em>`}</button>`;
 const conFecha=new Set(sal.filter(x=>x.it).map(x=>x.it.k));const abiertas=vivos.filter(it=>!it.cal&&it.tengo&&!terminada(it.lm)&&!conFecha.has(it.k));
 SAL=sal;const mesT=m=>MESL[+m.slice(5)-1]+' '+m.slice(0,4);
 const leyenda=`<div class="pley">${COLS.map(([p,t])=>`<span class="p-${p||'nada'}">${t}</span>`).join('')}<span class="p-terror">Terror que no tienes en tus listas</span><span class="pverde-l">Completa en casa</span></div>`;
 const forma=`<div class="seg pforma"><button data-pf="tabla" class="${pform==='tabla'?'on':''}">▦ Cuadrícula</button><button data-pf="lista" class="${pform==='lista'?'on':''}">☰ Lista</button></div>`;
 const deMes=m=>[fin.filter(it=>it.lm.fin===m).sort(ordenCol),mias.filter(x=>x.lm.fin===m).sort((x,y)=>coll.compare(x.o.titulo,y.o.titulo))];
 const nAno=a=>fin.filter(it=>it.lm.fin.startsWith(a)).length+mias.filter(x=>x.lm.fin.startsWith(a)).length;
 if(pv==='calendario'){
  const conAlgo=meses.filter(m=>sal.some(x=>x.m===m));
  g.innerHTML=cabecera(`${sal.length} tomos con fecha que te interesan`)+tiposHtml()+forma+leyenda+
   (pform==='tabla'
    ?`<div class="pcal"><table><thead><tr>${meses.map(m=>`<th class="${m===ym?'phoy':''}">${mesT(m)}<b>${sal.filter(x=>x.m===m).length||''}</b></th>`).join('')}<th>Más adelante<b>${luego.length||''}</b></th></tr></thead><tbody><tr>${meses.map(m=>`<td class="${m===ym?'phoy':''}">${celda(m)}</td>`).join('')}<td>${luego.map(miniS).join('')}</td></tr></tbody></table></div>`
    :conAlgo.map(m=>`<h2 class="group-title">${mesT(m)}<small>${sal.filter(x=>x.m===m).length}</small></h2><div class="pmis">${celda(m)}</div>`).join('')+(luego.length?`<h2 class="group-title">Más adelante<small>${luego.length}</small></h2><div class="pmis">${luego.map(miniS).join('')}</div>`:''))+
   `<h2 class="group-title">Las tienes a medias y no hay próximo tomo con fecha<small>${abiertas.length}</small></h2><div class="pmis">${abiertas.sort(ordenCol).map(it=>mini(it)).join('')||'<p class="pvacio">Ninguna.</p>'}</div>`;
 }else{
  const nCort=cortas.length+cortasMias.length;const sinAc=`<h2 class="group-title" id="pSin">Sin acabar en España<small>Canceladas o en pausa · ${nCort}</small></h2><div class="pmis">${cortasMias.map(x=>miniMia(x,/pausa/.test(x.lm.est)?'En pausa':'Cancelada')).join('')}${cortas.sort(ordenCol).map(it=>mini(it,/pausa/.test(it.lm.est)?'En pausa':'Cancelada en '+it.lm.ed_n)).join('')}</div>`;
  if(pform==='lista'&&pano!=='x'&&!anos.includes(pano))pano=anos.includes(String(ahora.getFullYear()))?String(ahora.getFullYear()):(anos[0]||'x');
  const chips=`<div class="chips pchips panos">${anos.map(a=>`<button class="chip ${pform==='lista'&&pano===a?'on':''}" data-py="${a}">${a}<b>${nAno(a)}</b></button>`).join('')}<button class="chip ${pform==='lista'&&pano==='x'?'on':''}" data-py="x">Sin acabar<b>${nCort}</b></button></div>`;
  const cuerpo=pform==='tabla'
   ?`<div class="pcal panual"><table><thead><tr><th>Año</th>${MESL.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${anos.map(a=>`<tr id="pa${a}"><th>${a}<b>${nAno(a)}</b></th>${MESL.map((_,i)=>{const [x,y]=deMes(a+'-'+String(i+1).padStart(2,'0'));return `<td>${x.map(it=>mini(it)).join('')}${y.map(z=>miniMia(z)).join('')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`+sinAc
   :pano==='x'?sinAc:MESL.map((n,i)=>{const [x,y]=deMes(pano+'-'+String(i+1).padStart(2,'0'));return x.length+y.length?`<h2 class="group-title">${n} ${pano}<small>${x.length+y.length}</small></h2><div class="pmis">${x.map(it=>mini(it)).join('')}${y.map(z=>miniMia(z)).join('')}</div>`:''}).join('');
  g.innerHTML=cabecera(`${fin.length} terminadas por comprar · ${mias.length} completas en casa (en verde)`)+tiposHtml()+forma+leyenda+chips+cuerpo;
  g.querySelectorAll('[data-py]').forEach(b=>b.onclick=()=>{const a=b.dataset.py;if(pform==='lista'){pano=a;pintaPrioridades();return}
   if(a==='x'){$('pSin').scrollIntoView({block:'start'});return}
   const caja=g.querySelector('.pcal'),f=$('pa'+a);caja.scrollTop=f.offsetTop-caja.querySelector('thead').offsetHeight;caja.scrollIntoView({block:'start'})});
  if(pform==='lista')g.querySelector('.panos .on')?.scrollIntoView({block:'nearest',inline:'center'});
 }
 g.querySelectorAll('[data-pf]').forEach(b=>b.onclick=()=>{pform=b.dataset.pf;try{localStorage.setItem('wf-pform',pform)}catch{}pintaPrioridades()});
 enlaza(g)}

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
