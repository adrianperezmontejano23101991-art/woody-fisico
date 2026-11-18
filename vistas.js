'use strict';
/* Navegación y listas. Cinco secciones (Tengo, Buscados, Listas, Novedades, Más) y listas que se pintan a trozos
   según se baja, para que ninguna pestaña cargue mil portadas de golpe. */
(()=>{
const GRUPO={obras:'obras',puntuaciones:'obras',autores:'obras',buscados:'buscados',prioridades:'prioridades',novedades:'novedades',todasnov:'novedades',proximos:'novedades',descubrir:'novedades',recomendaciones:'novedades',mas:'mas',extras:'mas',revisar:'mas'};
const SUB={obras:[['obras','Obras'],['puntuaciones','Por nota'],['autores','Autores']],novedades:[['novedades','Mis novedades'],['todasnov','Todas las novedades'],['proximos','Próximos'],['recomendaciones','Recomendaciones']]};
const LOTE=60;let cola=null;

// la portada «imagen censurada» de Listado Manga no se enseña en ningún sitio
document.addEventListener('load',e=>{const t=e.target;if(t.tagName==='IMG'&&/08a02c268a6d6b2304c152aa0acdc7a0|imagen_censurada/i.test(t.src))t.remove()},true);
// ---------- pintar a trozos
function sigue(){if(!cola)return;const c=cola;let n=0;
 while(n<LOTE&&c.gi<c.grupos.length){const G=c.grupos[c.gi];
  if(c.ii===0){if(G.t!=null)c.fin.insertAdjacentHTML('beforebegin',`<h2 class="group-title">${esc(G.t)}<small>${G.s||G.items.length}</small></h2>`);c.grid=document.createElement('div');c.grid.className=c.cls;c.fin.before(c.grid)}
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
 const kDup=b=>{const t=sinAcento(String(b.t).replace(/\([^)]*\)/g,'')).replace(/[^a-z0-9 ]+/g,' ').trim().split(/\s+/).filter(Boolean);return t.join('')};
 const pesoB=b=>(/espa/i.test(b.l||'')?0:2)+(b.img?0:1);const unicos=new Map();bus.forEach((b,i)=>{if(mias.has(b))return;const k=kDup(b)||'#'+i;const o=unicos.get(k);if(!o||pesoB(b)<pesoB(o[0]))unicos.set(k,[b,i])});
 const idx=[...unicos.values()].filter(([b])=>!q||sinAcento(b.t+' '+(b.a||[]).join(' ')).includes(q));
 const PRN={pronto:'1 · En mi lista de prioridad',no:'3 · No me interesa'};
 const clave=b=>busVer==='prio'?(PRN[window.prioDe?prioDe(b.t):'']||'2 · Resto'):busVer==='genero'?(b.gen||'Sin género'):busVer==='autor'?((b.a||[])[0]||'Autor pendiente'):(sinAcento(b.t).match(/[a-z0-9]/)||['#'])[0].toUpperCase();
 const m=new Map();idx.forEach(x=>{const k=clave(x[0]);(m.get(k)||m.set(k,[]).get(k)).push(x)});
 const orden=[...m].sort((a,b)=>busVer==='genero'?b[1].length-a[1].length:coll.compare(a[0],b[0]));orden.forEach(x=>x[1].sort((a,b)=>coll.compare(a[0].t,b[0].t)));
 const cab=`<div class="nov-cab"><div><b>Buscados</b><small>${bus.length-mias.size} que te faltan${mias.size?` · ${mias.size} que ya tienes no salen (quítalos de buscados en Whakoom)`:''}${q?` · ${idx.length} con este filtro`:''}</small></div><div class="seg">${[['genero','Género'],['autor','Autor'],['az','A–Z'],['prio','Prioridad']].map(([k,t])=>`<button data-busver="${k}" class="${busVer===k?'on':''}">${t}</button>`).join('')}</div></div>`;
 trozos(g,cab,orden.map(([t,items])=>({t,items})),([b,i])=>`<div class="card" role="button" tabindex="0" data-bus="${i}"><div class="cover">${b.img?`<img loading="lazy" src="${esc(b.img)}" alt="" onerror="this.remove()">`:''}<div class="placeholder">${esc(b.t)}</div>${mias.has(b)?'<span class="estado-badge" style="background:#2a4a2a">Ya la tienes</span>':''}</div><h3>${esc(b.t)}</h3><p>${esc((b.a||[]).join(', ')||'Autor pendiente')}</p><p class="meta">${esc([b.n,b.p].filter(Boolean).join(' · '))}</p></div>`);
 g.querySelectorAll('[data-busver]').forEach(b=>b.onclick=async()=>{busVer=b.dataset.busver;if(busVer==='prio'&&window.cargaPrio)try{await cargaPrio()}catch{}pintaBuscados()})};

// ---------- Novedades al estilo de Whakoom: portadas con su número, por meses (las tuyas) o por semanas (todo el manga)
const MESN=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const isoHoy=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dia=s=>new Date(s+'T12:00:00');
const fechaCorta=x=>{if(!x.iso)return x.fecha||'';const d=dia(x.iso);return /^\D*\d{1,2}\s/.test(String(x.fecha||'').replace(/^[^,]*,\s*/,''))?d.getDate()+' '+MESN[d.getMonth()].slice(0,3):MESN[d.getMonth()]};
const numDe=x=>x.num||((String(x.titulo).match(/n[º°]\s*(\d+)/)||[])[1]||'');
const tituloSin=t=>String(t||'').replace(/\s*n[º°]\s*\d+.*$/,'').trim()||t;
const CENSURA=/08a02c268a6d6b2304c152aa0acdc7a0|imagen_censurada/i;
const cartaW=(x,conMotivo)=>`<div class="ncard wkcard"><a href="${esc(x.url)}" target="_blank" rel="noopener" class="cover">${x.img&&!CENSURA.test(x.img)?`<img loading="lazy" src="${esc(x.img)}" alt="" onerror="this.remove()">`:''}<div class="placeholder ph">${esc(x.titulo)}</div>${numDe(x)?`<span class="wk-num">#${esc(numDe(x))}</span>`:''}</a><h3 title="${esc(x.titulo)}">${esc(tituloSin(x.titulo))}</h3><p>${esc(fechaCorta(x))}${x.editorial?' · '+esc(x.editorial):''}</p>${conMotivo&&x.motivo?`<p class="wk-mot wk-${esc(x.motivo.split(' ')[0].toLowerCase())}">${esc(x.motivo)}</p>`:''}</div>`;
const sinDatos=g=>{g.className='grouped';g.innerHTML='<div class="empty">Aún no hay salidas cargadas: aparecerán tras la próxima comprobación de novedades.</div>'};
pintaNovedades=function(){const g=$('grid');if(!nov){g.className='grouped';g.innerHTML='<div class="empty">Cargando…</div>';return}if(!nov.salidas)return sinDatos(g);
 const hoy=isoHoy(),ym=hoy.slice(0,7),q=sinAcento($('search').value.trim());
 const l=nov.salidas.filter(x=>x.motivo&&x.iso&&x.iso>=hoy.slice(0,8)+'01'&&(x.iso>=hoy||x.iso.slice(0,7)===ym)&&!(window.esMia&&x.iso<hoy&&esMia(x))&&(!q||sinAcento(x.titulo+' '+(x.editorial||'')+' '+(x.autores||[]).join(' ')).includes(q)));
 const gr=new Map();l.forEach(x=>{const m=x.iso.slice(0,7);const t=m===ym?'Este mes':MESN[+m.slice(5)-1].replace(/^./,c=>c.toUpperCase())+(m.slice(0,4)!==hoy.slice(0,4)?' '+m.slice(0,4):'');(gr.get(t)||gr.set(t,[]).get(t)).push(x)});
 const cab=`<div class="nov-cab"><div><b>Mis novedades</b><small>Tus colecciones, lo que sigue en otra editorial, obras nuevas de tus autores y terror${nov.ultima?' · comprobado '+esc(nov.ultima):''}</small></div></div>`;
 trozos(g,cab,[...gr].map(([t,items])=>({t,items})),x=>cartaW(x,true),'grid ngrid wkgrid')};
// ---------- Recomendaciones: lo que te puede gustar del manga editado en España (terror y cortas emotivas)
let recom=null;
window.pintaRecom=async function(){const g=$('grid');g.className='grouped';if(!recom){g.innerHTML='<div class="empty">Cargando…</div>';try{recom=await api('/api/recomendaciones')}catch(e){g.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}if(ui.vista!=='recomendaciones')return}
 if(!recom.terror){g.innerHTML='<div class="empty">Aún no hay recomendaciones.</div>';return}
 const q=sinAcento($('search').value.trim());const fuera=x=>window.esMia&&esMia({titulo:x.t,url:x.url});const pasa=x=>!fuera(x)&&(!q||sinAcento(x.t+' '+(x.a||[]).join(' ')+' '+(x.ed||'')).includes(q));
 const carta=x=>`<div class="ncard wkcard"><a href="${esc(x.url)}" target="_blank" rel="noopener" class="cover">${x.img?`<img loading="lazy" src="${esc(x.img)}" alt="" onerror="this.remove()">`:''}<div class="placeholder ph">${esc(x.t)}</div>${x.score?`<span class="wk-num">★ ${(x.score/10).toFixed(1).replace('.',',')}</span>`:''}</a><h3 title="${esc(x.t)}">${esc(x.t)}</h3><p title="${esc((x.a||[]).join(', '))}">${esc([x.n?x.n+(x.n==1?' tomo':' tomos'):'',x.ed].filter(Boolean).join(' · '))}</p>${x.por?`<p class="wk-mot">${esc(x.por)}</p>`:''}</div>`;
 const cab=`<div class="nov-cab"><div><b>Recomendaciones</b><small>Manga editado en España que no tienes, ni buscas, ni has leído · nota de AniList${recom.fecha?' · '+esc(recom.fecha):''}</small></div></div>`;
 trozos(g,cab,[{t:'Terror',s:'',items:recom.terror.filter(pasa)},{t:'Historias cortas emotivas',s:'Hasta 10 tomos · drama, slice of life',items:recom.cortas.filter(pasa)}].map(G=>({...G,s:G.items.length+(G.s?' · '+G.s:'')})),carta,'grid ngrid wkgrid')};
window.pintaTodasNov=function(){const g=$('grid');if(!nov){g.className='grouped';g.innerHTML='<div class="empty">Cargando…</div>';return}if(!nov.salidas)return sinDatos(g);
 const hoy=dia(isoHoy()),lunes=new Date(hoy);lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7));const q=sinAcento($('search').value.trim());
 const desde=lunes.toISOString().slice(0,10);const l=nov.salidas.filter(x=>x.iso&&x.iso>=desde&&(!q||sinAcento(x.titulo+' '+(x.editorial||'')+' '+(x.autores||[]).join(' ')).includes(q)));
 const gr=new Map();l.forEach(x=>{const d=dia(x.iso),ini=new Date(d);ini.setDate(d.getDate()-((d.getDay()+6)%7));const fin=new Date(ini);fin.setDate(ini.getDate()+6);
  const t=/^\D*\d{1,2}\s/.test(String(x.fecha||'').replace(/^[^,]*,\s*/,''))?`Novedades del ${ini.getDate()}${ini.getMonth()!==fin.getMonth()?' de '+MESN[ini.getMonth()]:''} al ${fin.getDate()} de ${MESN[fin.getMonth()]}`:`${MESN[d.getMonth()].replace(/^./,c=>c.toUpperCase())}, sin día fijo`;
  (gr.get(t)||gr.set(t,[]).get(t)).push(x)});
 const cab=`<div class="nov-cab"><div><b>Todas las novedades</b><small>Todo el manga que sale en España, semana a semana${nov.ultima?' · comprobado '+esc(nov.ultima):''}</small></div></div>`;
 trozos(g,cab,[...gr].map(([t,items])=>({t,items})),x=>cartaW(x,true),'grid ngrid wkgrid')};

// ---------- Extras: lo que hay en Woody Library, por autor
let woody=null,exVer='autor';const _extras=pintaExtras;
const ak=x=>sinAcento(x).replace(/[^a-z0-9]/g,'').split('').sort().join('');
pintaExtras=async function(){const g=$('grid');g.className='grouped';
 const seg=`<div class="seg">${[['autor','Por autor'],['imprimir','Para imprimir']].map(([k,t])=>`<button data-exver="${k}" class="${exVer===k?'on':''}">${t}</button>`).join('')}</div>`;
 const liga=()=>g.querySelectorAll('[data-exver]').forEach(b=>b.onclick=()=>{exVer=b.dataset.exver;render()});
 if(exVer==='imprimir'){_extras();g.querySelector('.nov-cab')?.insertAdjacentHTML('beforeend',seg);liga();return}
 if(!woody){g.innerHTML='<div class="empty">Cargando…</div>';try{woody=await api('/api/woody')}catch(e){g.innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}if(ui.vista!=='extras')return}
 const q=sinAcento($('search').value.trim());const mios=new Set();obras.filter(o=>o.tiene).forEach(o=>(o.autores||[]).forEach(a=>mios.add(ak(a))));
 const m=new Map();for(const x of woody){if(q&&!sinAcento(x.t+' '+(x.a||[]).join(' ')).includes(q))continue;for(const a of (x.a?.length?x.a:['Autor por identificar'])){const k=ak(a);(m.get(k)||m.set(k,{a,items:[]}).get(k)).items.push(x)}}
 const gr=[...m].map(([k,v])=>({t:v.a,mio:mios.has(k)&&v.a!=='Autor por identificar',items:v.items.sort((a,b)=>coll.compare(a.t,b.t))}));
 gr.sort((a,b)=>(b.mio-a.mio)||(b.items.length-a.items.length)||coll.compare(a.t,b.t));gr.forEach(G=>G.s=G.items.length+(G.mio?' · tienes obras suyas en papel':''));
 const cab=`<div class="nov-cab"><div><b>Extras</b><small>${woody.length} obras en Woody Library · ${m.size} autores · primero los autores que tienes en papel</small></div>${seg}</div>`;
 trozos(g,cab,gr,x=>`<${x.md?`a href="https://mangadex.org/title/${esc(x.md)}" target="_blank" rel="noopener"`:'div'} class="card wcard"><div class="cover">${x.img?`<img loading="lazy" src="${esc(x.img)}" alt="" onerror="this.remove()">`:''}<div class="placeholder">${esc(x.t)}</div></div><h3>${esc(x.t)}</h3><p class="meta">${esc([x.pg?x.pg+' págs':'',(x.l||[]).join(', '),x.y].filter(Boolean).join(' · '))}</p></${x.md?'a':'div'}>`);
 liga()};

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
 const tt=obras.filter(o=>o.tiene).reduce((a,o)=>a+(o._tengo||0),0);
 const ft=bus.filter(b=>!(window.esMiaBus&&esMiaBus(b))).reduce((a,b)=>a+(parseInt(b.n)||1),0)+((typeof nov!=="undefined"&&nov?.seguidas)?Object.values(nov.seguidas).reduce((a,s)=>a+(s.cols||[]).reduce((x,c)=>x+(c.faltan||[]).length,0),0):0);
 const tot2=tt+ft,pc2=tot2?Math.round(tt*100/tot2):0;
 barra.innerHTML=`<div class="bc-txt"><span>Tienes <b>${t}</b> títulos</span><span>Te faltan <b>${f}</b></span></div><div class="bc-barra" title="${pc} %"><i style="width:${pc}%"></i><em>${pc} %</em></div>`
  +`<details class="bc-tomos"${window.__tomosAbierto?' open':''}><summary>Tomos</summary><div class="bc-txt"><span>Tienes <b>${tt}</b> tomos</span><span>Te faltan <b>${ft}</b></span></div><div class="bc-barra" title="${pc2} %"><i style="width:${pc2}%"></i><em>${pc2} %</em></div></details>`;
 barra.querySelector('.bc-tomos').ontoggle=e=>{window.__tomosAbierto=e.target.open}}
// ---------- pintar
const sub=document.createElement('div');sub.id='subnav';sub.className='seg';sub.hidden=true;$('estados').before(sub);sub.after(barra);
sub.onclick=e=>{const b=e.target.closest('[data-sub]');if(!b)return;ui.vista=b.dataset.sub;ui.autor=null;if(ui.vista==='puntuaciones'){$('orden').value='nota';ui.ordenCol=null}render()};
let antes='';
{const _render=render;render=function(){cola=null;document.querySelectorAll('.trozos-fin').forEach(x=>x.remove());const v=ui.vista,gr=GRUPO[v]||v;
  corta=v==='obras'&&ui.modo==='cuadro';resto=null;
  if(v==='mas'){document.body.dataset.vista='mas';pintaMas()}else if(v==='recomendaciones'){pintaRecom()}else if(v==='todasnov'||v==='proximos'){const g=$('grid');if(!nov){g.className='grouped';g.innerHTML='<div class="empty">Cargando…</div>';cargaNov()}else if(v==='todasnov')pintaTodasNov();else window.pintaProximos()}else _render();
  if(corta&&resto&&resto.length>LOTE){const l=resto,g=$('grid');$('contador').textContent=l.length+(l.length===1?' obra · ':' obras · ')+l.reduce((n,o)=>n+o._tengo,0)+' tomos en casa';
   const fin=document.createElement('div');fin.className='trozos-fin';g.after(fin);cola={grupos:[{t:null,items:l}],carta:tarjeta,cls:'grid',fin,gi:0,ii:LOTE,grid:g};llena()}
  corta=false;
  document.querySelectorAll('.views .nav').forEach(b=>b.classList.toggle('active',b.dataset.view===gr));
  const s=SUB[gr];sub.hidden=!s||!!ui.autor;if(s)sub.innerHTML=s.map(([k,t])=>`<button data-sub="${k}" class="${v===k?'on':''}">${t}</button>`).join('');
  barra.hidden=v!=='obras'||!!ui.autor;if(!barra.hidden)pintaBarra();document.body.dataset.grupo=gr;if(antes!==v){antes=v;scrollTo(0,0);document.querySelector('main')?.scrollTo?.(0,0)}}}
$('grid').addEventListener('click',e=>{const t=e.target;const b=t.closest('[data-bus]');if(b&&bus)return abrirBus(bus[+b.dataset.bus]);
 const po=t.closest('[data-po]');if(po)return abrir(po.dataset.po);
 const pr=t.closest('[data-pr]');if(pr)return window.abrePr?.(+pr.dataset.pr);
 const ps=t.closest('[data-ps]');if(ps)return window.abrePs?.(+ps.dataset.ps);
 const pk=t.closest('.pcard[data-pk],.pmini[data-pk]');if(pk)return window.abrePk?.(pk.dataset.pk)});
render();
})();
