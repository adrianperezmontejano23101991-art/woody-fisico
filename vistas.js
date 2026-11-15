'use strict';
/* Navegación y listas. Cinco secciones (Tengo, Buscados, Listas, Novedades, Más) y listas que se pintan a trozos
   según se baja, para que ninguna pestaña cargue mil portadas de golpe. */
(()=>{
const GRUPO={obras:'obras',puntuaciones:'obras',autores:'obras',buscados:'buscados',prioridades:'prioridades',novedades:'novedades',descubrir:'novedades',mas:'mas',extras:'mas',revisar:'mas'};
const SUB={obras:[['obras','Obras'],['puntuaciones','Por nota'],['autores','Autores']],novedades:[['novedades','Avisos'],['descubrir','Descubrir']]};
const LOTE=60;let cola=null;

// ---------- pintar a trozos
function sigue(){if(!cola)return;const c=cola;let n=0;
 while(n<LOTE&&c.gi<c.grupos.length){const G=c.grupos[c.gi];
  if(c.ii===0){if(G.t!=null)c.fin.insertAdjacentHTML('beforebegin',`<h2 class="group-title">${esc(G.t)}<small>${G.items.length}</small></h2>`);c.grid=document.createElement('div');c.grid.className=c.cls;c.fin.before(c.grid)}
  const parte=G.items.slice(c.ii,c.ii+LOTE-n);c.grid.insertAdjacentHTML('beforeend',parte.map(c.carta).join(''));c.ii+=parte.length;n+=parte.length;
  if(c.ii>=G.items.length){c.gi++;c.ii=0}}
 if(c.gi>=c.grupos.length){c.fin.remove();cola=null}}
function llena(){let v=0;while(cola&&cola.fin.isConnected&&cola.fin.getBoundingClientRect().top<innerHeight+1200&&v++<8)sigue()}
window.trozos=function(g,cab,grupos,carta,cls='grid ngrid'){g.className='grouped';g.innerHTML=cab;const fin=document.createElement('div');fin.className='trozos-fin';g.append(fin);
 grupos=grupos.filter(G=>G.items.length);if(!grupos.length){fin.outerHTML='<div class="empty">Nada con estos filtros.</div>';cola=null;return}
 cola={grupos,carta,cls,fin,gi:0,ii:0,grid:null};llena()};
let espera=0;const alBajar=()=>{if(!cola||espera)return;espera=requestAnimationFrame(()=>{espera=0;llena()})};
document.addEventListener('scroll',alBajar,{capture:true,passive:true});addEventListener('resize',alBajar,{passive:true});

// ---------- Tengo: portadas a trozos
let corta=false,resto=null;
{const _ord=ordenar;ordenar=function(l){const r=_ord(l);if(corta){resto=r;return r.slice(0,LOTE)}return r}}
pintaNiveles=function(l){const sin=l.filter(o=>o._nota===null).sort((a,b)=>coll.compare(a.titulo,b.titulo));const r=l.filter(o=>o._nota!==null).sort((a,b)=>b._nota-a._nota||coll.compare(a.titulo,b.titulo));const gr=new Map();
 r.forEach(o=>{const k=o._nota>10?o.valoracion:o._nota===10?'10':o._nota>=9.5?'9,5 – 9,75':o._nota>=9?'9 – 9,25':o._nota>=8?'8 – 8,75':o._nota>=7?'7 – 7,75':'Menos de 7';(gr.get(k)||gr.set(k,[]).get(k)).push(o)});if(sin.length)gr.set('Sin puntuar',sin);
 trozos($('grid'),'',[...gr].map(([t,items])=>({t,items})),tarjeta,'grid')};
pintaAutores=function(){const m=new Map();filtradas().forEach(o=>(o.autores||[]).forEach(a=>(m.get(a)||m.set(a,[]).get(a)).push(o)));const l=[...m].sort((a,b)=>b[1].length-a[1].length||coll.compare(a[0],b[0]));
 trozos($('grid'),'',[{t:null,items:l}],([a,w])=>{const p=[...w].sort((x,y)=>(y._nota??-1)-(x._nota??-1)).find(portada);const c=p&&portada(p);return `<button class="author-tile" data-autor="${esc(a)}" title="${esc(a)} · ${w.length}">${c?`<img loading="lazy" src="${esc(c)}" alt="">`:''}<span class="tile-name">${esc(a)}</span><span class="tile-count">${w.length}</span></button>`},'mosaic')};

// ---------- Buscados
pintaBuscados=async function(){const g=$('grid');if(!bus){g.className='grouped';g.innerHTML='<div class="empty">Cargando…</div>';try{bus=await api('/api/buscados')}catch(e){g.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}if(ui.vista!=='buscados')return}
 const q=sinAcento($('search').value.trim());const mias=new Set(window.esMiaBus?bus.filter(esMiaBus):[]);
 const idx=bus.map((b,i)=>[b,i]).filter(([b])=>!mias.has(b)).filter(([b])=>!q||sinAcento(b.t+' '+(b.a||[]).join(' ')).includes(q));
 const PRN={ya:'1 · Ya',pronto:'2 · Pronto',algun:'3 · Algún día',no:'5 · No me interesa'};
 const clave=b=>busVer==='prio'?(PRN[window.prioDe?prioDe(b.t):'']||'4 · Sin decidir'):busVer==='genero'?(b.gen||'Sin género'):busVer==='autor'?((b.a||[])[0]||'Autor pendiente'):(sinAcento(b.t).match(/[a-z0-9]/)||['#'])[0].toUpperCase();
 const m=new Map();idx.forEach(x=>{const k=clave(x[0]);(m.get(k)||m.set(k,[]).get(k)).push(x)});
 const orden=[...m].sort((a,b)=>busVer==='genero'?b[1].length-a[1].length:coll.compare(a[0],b[0]));orden.forEach(x=>x[1].sort((a,b)=>coll.compare(a[0].t,b[0].t)));
 const cab=`<div class="nov-cab"><div><b>Buscados</b><small>${bus.length-mias.size} que te faltan${mias.size?` · ${mias.size} que ya tienes no salen (quítalos de buscados en Whakoom)`:''}${q?` · ${idx.length} con este filtro`:''}</small></div><div class="seg">${[['genero','Género'],['autor','Autor'],['az','A–Z'],['prio','Prioridad']].map(([k,t])=>`<button data-busver="${k}" class="${busVer===k?'on':''}">${t}</button>`).join('')}</div></div>`;
 trozos(g,cab,orden.map(([t,items])=>({t,items})),([b,i])=>`<div class="card" role="button" tabindex="0" data-bus="${i}"><div class="cover">${b.img?`<img loading="lazy" src="${esc(b.img)}" alt="" onerror="this.remove()">`:''}<div class="placeholder">${esc(b.t)}</div>${mias.has(b)?'<span class="estado-badge" style="background:#2a4a2a">Ya la tienes</span>':''}</div><h3>${esc(b.t)}</h3><p>${esc((b.a||[]).join(', ')||'Autor pendiente')}</p><p class="meta">${esc([b.n,b.p].filter(Boolean).join(' · '))}</p></div>`);
 g.querySelectorAll('[data-busver]').forEach(b=>b.onclick=async()=>{busVer=b.dataset.busver;if(busVer==='prio'&&window.cargaPrio)try{await cargaPrio()}catch{}pintaBuscados()})};

// ---------- Más
function pintaMas(){const g=$('grid');g.className='grouped';const rev=obras.filter(o=>o.revisar?.length&&!o.revisado).length;
 g.innerHTML=`<div class="nov-cab"><div><b>Más</b><small>${esc($('summary').textContent||'')}</small></div></div><div class="mas-menu">
  <button data-ir="revisar">◈ Por revisar<b>${rev||''}</b><small>Obras con datos dudosos que conviene mirar</small></button>
  <button data-ir="extras">✂ Extras<small>Material extra de tus obras</small></button>
  <button data-clic="nueva">＋ Añadir una obra leída<small>Para lo que lees sin tenerlo en Whakoom</small></button>
  <button data-clic="infoBtn">ⓘ Whakoom, clave y versión<small>Sincronizar con Whakoom y datos de la app</small></button></div>`;
 g.querySelectorAll('[data-ir]').forEach(b=>b.onclick=()=>{ui.vista=b.dataset.ir;render()});g.querySelectorAll('[data-clic]').forEach(b=>b.onclick=()=>$(b.dataset.clic).click())}

// ---------- barra: lo que tengo frente a lo que me falta
const barra=document.createElement('div');barra.id='barraCol';barra.hidden=true;
async function pintaBarra(){if(!bus)try{bus=await api('/api/buscados')}catch{return}
 const t=obras.filter(o=>o.tiene).length,f=bus.filter(b=>!(window.esMiaBus&&esMiaBus(b))).length,tot=t+f,pc=tot?Math.round(t*100/tot):0;
 barra.innerHTML=`<div class="bc-txt"><span>Tienes <b>${t}</b> títulos</span><span>Te faltan <b>${f}</b></span></div><div class="bc-barra" title="${pc} %"><i style="width:${pc}%"></i><em>${pc} %</em></div>`}
// ---------- pintar
const sub=document.createElement('div');sub.id='subnav';sub.className='seg';sub.hidden=true;$('estados').before(sub);sub.after(barra);
sub.onclick=e=>{const b=e.target.closest('[data-sub]');if(!b)return;ui.vista=b.dataset.sub;ui.autor=null;if(ui.vista==='puntuaciones'){$('orden').value='nota';ui.ordenCol=null}render()};
let antes='';
{const _render=render;render=function(){cola=null;document.querySelectorAll('.trozos-fin').forEach(x=>x.remove());const v=ui.vista,gr=GRUPO[v]||v;
  corta=v==='obras'&&ui.modo==='cuadro';resto=null;
  if(v==='mas'){document.body.dataset.vista='mas';pintaMas()}else _render();
  if(corta&&resto&&resto.length>LOTE){const l=resto,g=$('grid');$('contador').textContent=l.length+(l.length===1?' obra · ':' obras · ')+l.reduce((n,o)=>n+o._tengo,0)+' tomos en casa';
   const fin=document.createElement('div');fin.className='trozos-fin';g.after(fin);cola={grupos:[{t:null,items:l}],carta:tarjeta,cls:'grid',fin,gi:0,ii:LOTE,grid:g};llena()}
  corta=false;
  document.querySelectorAll('.views .nav').forEach(b=>b.classList.toggle('active',b.dataset.view===gr));
  const s=SUB[gr];sub.hidden=!s||!!ui.autor;if(s)sub.innerHTML=s.map(([k,t])=>`<button data-sub="${k}" class="${v===k?'on':''}">${t}</button>`).join('');
  barra.hidden=v!=='obras'||!!ui.autor;if(!barra.hidden)pintaBarra();document.body.dataset.grupo=gr;if(antes!==v){antes=v;scrollTo(0,0);document.querySelector('main')?.scrollTo?.(0,0)}}}
$('grid').addEventListener('click',e=>{const t=e.target;const b=t.closest('[data-bus]');if(b&&bus)return abrirBus(bus[+b.dataset.bus]);
 const po=t.closest('[data-po]');if(po)return abrir(po.dataset.po);
 const ps=t.closest('[data-ps]');if(ps)return window.abrePs?.(+ps.dataset.ps);
 const pk=t.closest('.pcard[data-pk],.pmini[data-pk]');if(pk)return window.abrePk?.(pk.dataset.pk)});
render();
})();
