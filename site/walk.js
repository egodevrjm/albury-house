(() => {
  'use strict';
  const content = window.ALBURY_CONTENT;
  const sections = content.rooms.tour;
  const maps = content.walk.sections;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const flatten = rooms => rooms.flatMap(r => [r, ...flatten(r.children || [])]);
  const roomsBySection = new Map(sections.map(s => {
    const grouped = new Map();
    s.rooms.forEach(v => {
      if (!grouped.has(v.roomId)) grouped.set(v.roomId, {id:v.roomId, name:v.roomName, views:[]});
      grouped.get(v.roomId).views.push(v);
    });
    return [s.id, grouped];
  }));
  const currentRooms = maps.flatMap(m => flatten(m.rooms).filter(r=>r.id).map(r=>({sectionId:m.id,...roomsBySection.get(m.id).get(r.id)})));
  const visited = new Set();
  const trail = [];
  let section, map, room, shape, photoIndex=0, mode='floor', viewBox, dragging=null, moved=false;
  const svg=$('walk-map');
  const key=(s,r)=>`${s}/${r}`;
  const roomFor=(s,r)=>roomsBySection.get(s)?.get(r);
  const mapFor=s=>maps.find(m=>m.id===s);
  const entryFor=(s,r)=>flatten(mapFor(s).rooms).find(e=>e.id===r);
  const roomLink=(s,r)=>`ALBURY_HOUSE_TOUR.html#/${encodeURIComponent(s)}/${encodeURIComponent(r)}`;
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  $('walk-floors').innerHTML=sections.map(s=>`<button data-floor="${esc(s.id)}">${esc(s.name)}<small>${esc(s.level || 'Grounds & arrivals')}</small></button>`).join('');
  $('walk-floor-select').innerHTML=sections.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.level && s.level!==s.name?' · '+esc(s.level):''}</option>`).join('');

  function labelLines(text,width) {
    const words=text.replace(/^Studio Albury — /,'').split(/\s+/);
    const max=Math.max(9,Math.floor(width/16));
    const lines=[];
    for(const word of words){if(!lines.length || (lines.at(-1)+' '+word).length>max)lines.push(word);else lines[lines.length-1]+=' '+word;}
    return lines;
  }
  function features(r) {
    const {x,y,width:w,height:h}=r;
    if(r.feature==='pool') return `<g class="map-feature"><rect x="${x+25}" y="${y+38}" width="${w-50}" height="${h-76}" rx="6"/>${[1,2,3,4].map(i=>`<path d="M${x+25+(w-50)*i/5} ${y+48}v${h-96}"/>`).join('')}</g>`;
    if(r.id==='instrument-isolation-booth')return `<g class="map-feature"><circle cx="${x+70}" cy="${y+h/2}" r="45" stroke-dasharray="4 5"/>${[0,1,2,3].map(i=>{const a=i*Math.PI/2;return `<rect x="${x+70+Math.cos(a)*48-9}" y="${y+h/2+Math.sin(a)*48-9}" width="18" height="18" rx="3"/>`;}).join('')}</g>`;
    if(r.feature==='cinema') return `<g class="map-feature"><path d="M${x+30} ${y+22}h${w-60}" stroke-width="5"/>${[0,1,2].map(i=>`<path d="M${x+40} ${y+65+i*55}h${w-80}" stroke-width="10"/>`).join('')}</g>`;
    if(r.feature==='console')return `<g class="map-feature"><path d="M${x+30} ${y+22}h${w-60}" stroke-width="5"/><rect x="${x+w*.2}" y="${y+h-40}" width="${w*.6}" height="22" rx="3"/></g>`;
    if(r.feature==='games')return `<g class="map-feature"><rect x="${x+30}" y="${y+35}" width="150" height="75" rx="6"/><circle cx="${x+w-90}" cy="${y+72}" r="35"/></g>`;
    return '';
  }
  function renderShape(r) {
    if(!r.id)return `<g class="map-void"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}"/><text x="${r.x+r.width/2}" y="${r.y+r.height/2}"><tspan x="${r.x+r.width/2}">Live room below</tspan><tspan x="${r.x+r.width/2}" dy="28">Double-height void</tspan></text></g>`;
    const canonical=roomFor(section.id,r.id);
    let label=canonical.name;
    if(r.width<180 || r.height<90) label=r.label.join(' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
    if(r.id==='live-tracking-room')label='Live room · Double height';
    if(r.id==='vocal-booth')label='Voice booth · 3–4 people';
    if(r.id==='instrument-isolation-booth')label='String booth · Quartet in the round';
    const textWidth=r.id==='instrument-isolation-booth'?r.width-160:r.labelX ? 180 : r.width-24;
    const lines=labelLines(label,textWidth);
    const size=Math.max(11,Math.min(30,(r.height-24)/(lines.length*1.3),textWidth/(Math.max(...lines.map(l=>l.length))*.56)));
    const cx=r.id==='instrument-isolation-booth'?r.x+160+(r.width-160)/2:r.labelX || r.x+r.width/2;
    const cy=(r.textCenterY || r.y+r.height/2)-(lines.length-1)*size*.63;
    return `<g class="map-room" data-room="${esc(r.id)}" data-kind="${esc(r.kind)}" role="button" tabindex="0" aria-label="${esc(canonical.name)}"><title>${esc(canonical.name)}</title><rect class="room-shape" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="2"/>${features(r)}<text class="map-number" x="${r.x+12}" y="${r.y+21}">${r.height>=110 && r.width>=155?esc(r.number || ''):''}</text><text font-size="${size}" style="paint-order:stroke;stroke:var(--panel);stroke-width:4px;stroke-linejoin:round">${lines.map((l,i)=>`<tspan x="${cx}" y="${cy+i*size*1.26}">${esc(l)}</tspan>`).join('')}</text><circle class="position-dot" cx="${r.x+r.width-16}" cy="${r.y+16}" r="7" hidden/>${(r.children||[]).map(renderShape).join('')}</g>`;
  }
  function renderMap() {
    const f=map.footprint;
    svg.innerHTML=`<defs><pattern id="void-lines" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#edece2"/><path d="M0 0V14" stroke="#c6c9b9" stroke-width="2"/></pattern></defs><rect class="map-footprint" x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}"/>${map.rooms.map(renderShape).join('')}`;
    svg.setAttribute('aria-label',`${section.name} — interactive schematic. Select a room to explore.`);
    $('map-title').textContent=section.name;
    $('map-level').textContent=section.kind==='floor' ? section.level : 'Grounds & arrivals';
    $('floor-view').textContent=section.kind==='floor'?'Floor map':'Area map';
    $('walk-room-list').innerHTML=flatten(map.rooms).filter(r=>r.id).map(r=>`<button data-room="${esc(r.id)}">${esc(roomFor(section.id,r.id).name)}</button>`).join('')+(map.references?.length ? `<p>Background references</p>${map.references.map(id=>`<a href="${roomLink(section.id,id)}">${esc(roomFor(section.id,id).name)} ↗</a>`).join('')}`:'');
    document.querySelector('.walk-directory summary').textContent=section.kind==='floor'?'Rooms on this floor':'Places in this area';
    document.querySelectorAll('[data-floor]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.floor===section.id)));
    $('walk-floor-select').value=section.id;
    $('walk-room-select').innerHTML=flatten(map.rooms).filter(r=>r.id).map(r=>`<option value="${esc(r.id)}">${esc(roomFor(section.id,r.id).name)}</option>`).join('');
    const index=sections.findIndex(s=>s.id===section.id);
    $('floor-down').disabled=index===0 || section.kind!=='floor';
    $('floor-up').disabled=index===6 || section.kind!=='floor';
    $('full-plan-link').href=section.plan;
  }
  function setViewBox(box) {viewBox=box;svg.setAttribute('viewBox',box.join(' '));}
  function fit() {
    if(mode==='room' && shape){
      const pad=45;
      // Include the parent shell when a booth is selected, so its containment
      // remains visible even at room scale.
      const focus=shape.parentId && section.id==='music-nobile'?entryFor(section.id,shape.parentId):shape;
      setViewBox([focus.x-pad,focus.y-pad,focus.width+pad*2,focus.height+pad*2]);
    }else setViewBox([...map.viewBox]);
  }
  function setMode(next){mode=next;$('floor-view').setAttribute('aria-pressed',String(mode==='floor'));$('room-view').setAttribute('aria-pressed',String(mode==='room'));fit();}
  function showPhoto() {
    const photo=room.views[photoIndex];
    $('photo-error').hidden=true;
    const img=$('walk-photo');
    img.src=photo.path;img.alt=photo.title || room.name;
    $('photo-count').textContent=`${photoIndex+1} / ${room.views.length}`;
    $('photo-description').textContent=photo.description || '';
    $('photo-prev').disabled=room.views.length<2;$('photo-next').disabled=room.views.length<2;
  }
  function connections() {
    const links=[];
    if(shape.parentId)links.push({id:shape.parentId,text:`Return to ${roomFor(section.id,shape.parentId).name}`});
    for(const child of shape.children||[])links.push({id:child.id,text:`Step inside: ${roomFor(section.id,child.id).name}`});
    if(section.id==='music-nobile' && room.id==='live-tracking-room')links.push({id:'control-room',text:'Explore the control room →'});
    if(section.id==='music-nobile' && room.id==='control-room')links.push({id:'live-tracking-room',text:'Explore the live room →'});
    $('room-connections').innerHTML=links.map(l=>`<button data-room="${esc(l.id)}">${esc(l.text)}</button>`).join('');
    if(section.id==='raised-ground' && room.id==='garden-room')$('room-connections').innerHTML+='<button data-go="exterior/rear-terrace">Step out to the terrace →</button>';
    if(section.id==='exterior' && room.id==='rear-terrace')$('room-connections').innerHTML+='<button data-go="raised-ground/garden-room">Explore the garden room →</button>';
    if(section.id==='exterior' && ['street-arrival','front-elevation'].includes(room.id))$('room-connections').innerHTML+='<button data-go="raised-ground/entrance-reception-hall">Enter Albury House →</button>';
  }
  function select(sid,rid,{record=true,url=true}={}) {
    const nextMap=mapFor(sid);
    if(!nextMap)return select('raised-ground','entrance-reception-hall',{record,url});
    let nextShape=entryFor(sid,rid);
    if(!nextShape) {rid=nextMap.arrival;nextShape=entryFor(sid,rid);}
    const changed=section?.id!==sid;
    if(record && room && key(section.id,room.id)!==key(sid,rid))trail.push([section.id,room.id]);
    section=sections.find(s=>s.id===sid);map=nextMap;room=roomFor(sid,rid);shape=nextShape;photoIndex=0;
    visited.add(key(sid,rid));
    if(changed)renderMap();
    document.querySelectorAll('[data-room]').forEach(el=>{
      const selected=el.dataset.room===rid;
      el.classList.toggle('selected',selected);
      el.classList.toggle('visited',visited.has(key(sid,el.dataset.room)));
      if(el.classList.contains('map-room')){el.setAttribute('aria-pressed',String(selected));el.querySelector(':scope > .position-dot').toggleAttribute('hidden',!selected);}
      else el.setAttribute('aria-current',String(selected));
    });
    $('walk-room-select').value=rid;
    $('walk-room-name').textContent=room.name;
    $('room-location').textContent=section.name;
    const notes={
      'music-nobile/live-tracking-room':'Studio Albury’s double-height live room contains two enclosed, normal-height isolation booths. The control room completes the studio; the rec room is a separate space on Music Nobile.',
      'music-nobile/control-room':'Studio Albury’s control room looks into the live room through the wide acoustic window.',
      'music-nobile/vocal-booth':'An enclosed, normal-height booth inside the double-height live room, comfortably accommodating 3–4 people for voice work.',
      'music-nobile/instrument-isolation-booth':'An enclosed, normal-height booth inside the double-height live room, comfortably fitting a string quartet seated in the round.',
      'exterior/former-no-34-boundary-existing-condition':'The current boundary with acquired No. 34. The neighbouring house remains unintegrated and unused at story opening.'
    };
    const description=room.views[0].description || '';
    const brief=description.length>340?description.slice(0,337).replace(/\s+\S*$/,'')+'…':description;
    $('room-note').textContent=notes[key(sid,rid)] || brief;
    $('room-gallery-link').href=roomLink(sid,rid);
    $('walk-back').disabled=trail.length===0;
    $('walk-progress').textContent=`${visited.size} of ${currentRooms.length} current spaces explored`;
    showPhoto();connections();
    if(changed || mode==='room')fit();
    if(url && location.hash!==`#/${sid}/${rid}`)history.pushState(null,'',`#/${sid}/${rid}`);
    document.title=`${room.name} · Walk Albury — Albury House`;
  }
  function route(){if(location.hash==='#walk-map')return;const parts=location.hash.replace(/^#\/?/,'').split('/').map(s=>{try{return decodeURIComponent(s);}catch{return '';}});select(parts[0]||'raised-ground',parts[1],{url:false});}
  function moveRoom(delta){const list=flatten(map.rooms).filter(r=>r.id);const i=list.findIndex(r=>r.id===room.id);select(section.id,list[(i+delta+list.length)%list.length].id);}
  function moveFloor(delta){const i=sections.findIndex(s=>s.id===section.id);const next=sections[i+delta];if(next?.kind==='floor')select(next.id,mapFor(next.id).arrival);}
  document.addEventListener('click',event=>{
    if(moved){moved=false;return;}
    const floor=event.target.closest('[data-floor]');if(floor)select(floor.dataset.floor,mapFor(floor.dataset.floor).arrival);
    const dest=event.target.closest('[data-go]');if(dest)select(...dest.dataset.go.split('/'));
    const target=event.target.closest('[data-room]');if(target)select(section.id,target.dataset.room);
  });
  svg.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key) && event.target.dataset.room){event.preventDefault();select(section.id,event.target.dataset.room);}});
  $('walk-room-select').addEventListener('change',event=>select(section.id,event.target.value));
  $('walk-floor-select').addEventListener('change',event=>select(event.target.value,mapFor(event.target.value).arrival));
  $('walk-back').onclick=()=>{const previous=trail.pop();if(previous)select(...previous,{record:false});};
  $('floor-down').onclick=()=>moveFloor(-1);$('floor-up').onclick=()=>moveFloor(1);
  $('room-prev').onclick=()=>moveRoom(-1);$('room-next').onclick=()=>moveRoom(1);
  $('photo-prev').onclick=()=>{photoIndex=(photoIndex-1+room.views.length)%room.views.length;showPhoto();};
  $('photo-next').onclick=()=>{photoIndex=(photoIndex+1)%room.views.length;showPhoto();};
  $('walk-photo').onerror=()=>{$('photo-error').hidden=false;};
  $('floor-view').onclick=()=>setMode('floor');$('room-view').onclick=$('focus-room').onclick=()=>{setMode('room');if(matchMedia('(max-width:680px)').matches)svg.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
  $('map-fit').onclick=fit;
  function zoom(factor){const [x,y,w,h]=viewBox;const width=Math.max(130,Math.min(3000,w*factor));const ratio=width/w;setViewBox([x+(w-width)/2,y+(h-h*ratio)/2,width,h*ratio]);}
  $('zoom-in').onclick=()=>zoom(.75);$('zoom-out').onclick=()=>zoom(1.333333);
  // Mouse/pen drag pans; touch remains native vertical scrolling on phones.
  svg.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.button!==0)return;dragging={x:event.clientX,y:event.clientY,box:[...viewBox],id:event.pointerId};moved=false;});
  svg.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const dx=event.clientX-dragging.x,dy=event.clientY-dragging.y;
    if(Math.hypot(dx,dy)<5 && !moved)return;
    moved=true;svg.classList.add('dragging');svg.setPointerCapture(event.pointerId);
    const bounds=svg.getBoundingClientRect();const scale=Math.max(dragging.box[2]/bounds.width,dragging.box[3]/bounds.height);
    setViewBox([dragging.box[0]-dx*scale,dragging.box[1]-dy*scale,dragging.box[2],dragging.box[3]]);
  });
  const endDrag=event=>{dragging=null;svg.classList.remove('dragging');if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);};
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
  const input=$('walk-search'),results=$('walk-results');
  input.addEventListener('input',()=>{
    const query=normalize(input.value.trim());results.hidden=!query;if(!query)return;
    const found=currentRooms.filter(r=>normalize(`${r.name} ${sections.find(s=>s.id===r.sectionId).name} ${sections.find(s=>s.id===r.sectionId).level||''}`).includes(query));
    results.innerHTML=found.length?found.map(r=>`<button data-search-room="${esc(key(r.sectionId,r.id))}">${esc(r.name)}<small>${esc(sections.find(s=>s.id===r.sectionId).name)}</small></button>`).join(''):'<p>No rooms found. Try a floor name or another room.</p>';
  });
  results.addEventListener('click',event=>{const b=event.target.closest('[data-search-room]');if(b){select(...b.dataset.searchRoom.split('/'));results.hidden=true;input.value='';input.focus();}});
  input.addEventListener('keydown',event=>{if(event.key==='Escape'){results.hidden=true;input.value='';}if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}if(event.key==='Enter'){event.preventDefault();results.querySelector('button')?.click();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){results.hidden=true;}});
  document.addEventListener('click',event=>{if(!event.target.closest('.walk-search'))results.hidden=true;});
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
  route();
})();
