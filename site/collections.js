(async () => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let categories=ALBURY_HOUSE_CATALOGUE.collections;
  const apply=(updates,preview=false)=>{
    const replacement=new Map((updates||[]).map(collection=>[collection.id,collection]));
    categories=categories.map(collection=>{
      const next=replacement.get(collection.id);
      if(!next)return collection;
      if(!preview)return next;
      return {...next,rooms:next.rooms.map(item=>{
        const asset=item.path?.match(/^images\/albury\/managed\/([a-f0-9]{64})\.webp$/);
        return asset?{...item,path:'/api/room-editor?image='+asset[1]}:item;
      })};
    });
  };
  try{
    const response=await fetch('/api/room-catalogue',{signal:AbortSignal.timeout(4500)});
    if(response.ok){
      const published=await response.json();
      const content=published.contentUpdates?.collections;
      if(content)categories=content.collections;
      else apply(published.collectionUpdates);
    }
  }catch{
    // The embedded catalogue also works from disk and during a storage outage.
  }
  const draftId=new URLSearchParams(location.search).get('draft');
  if(draftId){
    const banner=document.createElement('p');
    banner.className='kitchen-main';
    banner.setAttribute('role','status');
    try{
      const response=await fetch('/api/room-editor',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'preview_draft',input:{draftId}}),signal:AbortSignal.timeout(4500)});
      if(!response.ok)throw new Error('Preview unavailable');
      const {draft,currentRevision,collectionPreview}=await response.json();
      apply(collectionPreview,true);
      banner.textContent='Draft preview · '+draft.name+(draft.baseRevision!==currentRevision?' · Based on an older publication':'');
    }catch{
      banner.textContent='Draft preview unavailable. Sign in to the editor and reopen the preview.';
    }
    document.body.prepend(banner);
  }
  const groups=[];
  const slug=item=>item.viewSlug??(item.path ? item.path.split('/').pop().replace(/\.[^.]+$/,'') : item.id);
  const normalize=value=>value.toLocaleLowerCase('en-GB').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const searchText=item=>[item.title,item.description,item.artist,item.location?.roomName,item.location?.placement].filter(Boolean).join(' ');
  const variant=item=>item.colourVariant??(/— Full Colour$/.test(item.title)?'Full colour':/— White(?:\/Clear)? Led$/.test(item.title)?'Ivory led':null);
  categories.forEach(category=>{const local=new Map();category.rooms.forEach(item=>{const number=slug(item).match(/^\d+/)?.[0];const key=variant(item)&&number?number:slug(item);if(!local.has(key))local.set(key,{category,items:[]});local.get(key).items.push(item);});groups.push(...local.values());});
  groups.forEach(group=>{group.cover=group.items.find(i=>variant(i)==='Full colour')||group.items[0];group.title=group.cover.title.replace(/ — (?:Full Colour|White(?:\/Clear)? Led)$/,'');});
  const dialog=document.querySelector('#collection-dialog'),search=document.querySelector('#collection-search');let category='all',selected=null,visible=groups,lastGroup=null;
  document.querySelector('#collection-categories').innerHTML='<a href="#all">All collections</a>'+categories.map(c=>`<a href="#${encodeURIComponent(c.id)}">${esc(c.name)}</a>`).join('');
  function route(value,replace=false){history[replace?'replaceState':'pushState'](null,'','#'+value);render();}
  function render(){
    let parts=decodeURIComponent(location.hash.replace(/^#\/?/,'')).replace(/^collections\//,'').split('/');
    if(parts[0]==='house-items'&&parts[1]){const found=categories.find(c=>c.rooms.some(i=>slug(i)===parts[1]));if(found)parts[0]=found.id;}
    category=categories.some(c=>c.id===parts[0])?parts[0]:'all';
    selected=parts[1]?groups.find(g=>(category==='all'||g.category.id===category)&&g.items.some(i=>slug(i)===parts[1])):null;
    const terms=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    visible=groups.filter(g=>(category==='all'||g.category.id===category)&&terms.every(term=>normalize(g.items.map(searchText).join(' ')).includes(term)));
    const scope=document.querySelector('#collection-scope');
    scope.textContent=categories.find(c=>c.id===category)?.description||'';scope.hidden=!scope.textContent;
    document.querySelectorAll('#collection-categories a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+category?'page':'false'));
    document.querySelector('#collection-grid').innerHTML=visible.length?visible.map(g=>`<a class="collection-card${g.cover.path ? '' : ' collection-card--text'}" href="#${encodeURIComponent(g.category.id)}/${encodeURIComponent(slug(g.cover))}">${g.cover.path ? `<img src="${esc(g.cover.path)}" alt="${esc(g.title)}" loading="lazy">` : ''}<h2>${esc(g.title)}</h2><p>${esc(g.cover.location ? [g.cover.artist,g.cover.location.roomName].filter(Boolean).join(' · ') : g.category.name)}${g.items.length>1?' · '+g.items.length+' colour variants':''}</p></a>`).join(''):'<div class="collection-empty"><h2>No matching items</h2><p>Try another search or collection.</p><button id="collection-reset">Show everything</button></div>';
    const count=document.querySelector('#collection-count');
    count.textContent=category==='art' ? `${visible.length} art ${visible.length===1?'record':'records'}` :
      `${visible.length} ${category==='all'?'entries':'families'} · ${visible.reduce((n,g)=>n+g.items.filter(item=>item.path).length,0)} images`;
    document.querySelector('#collection-reset')?.addEventListener('click',()=>{search.value='';route('all')});
    if(!selected){if(dialog.open)dialog.close();document.title='House collections — Albury';return;}
    const item=selected.items.find(i=>slug(i)===parts[1])||selected.cover;lastGroup=selected;
    document.querySelector('#collection-title').textContent=selected.title;document.querySelector('#collection-description').textContent=item.description;
    const image=document.querySelector('#collection-image'), imageLink=document.querySelector('#collection-image-link');
    const download=document.querySelector('#collection-download');
    imageLink.hidden=download.hidden=!item.path;
    document.querySelector('.collection-detail').classList.toggle('collection-detail--text',!item.path);
    if(item.path){
      image.src=item.path;image.alt=item.title;imageLink.href=download.href=item.path;
    }else{
      image.removeAttribute('src');imageLink.removeAttribute('href');download.removeAttribute('href');
    }
    const artLocation=document.querySelector('#collection-art-location');
    artLocation.replaceChildren();
    artLocation.hidden=!item.location;
    if(item.location){
      const room=document.createElement('a');
      room.href='ALBURY_HOUSE_TOUR.html#/'+encodeURIComponent(item.location.sectionId)+'/'+encodeURIComponent(item.location.roomId);
      room.textContent=item.location.roomName;
      artLocation.append(room,item.location.placement ? ' · '+item.location.placement : '');
    }
    const credit=document.querySelector('#collection-art-credit');
    credit.textContent=[item.provenance||item.attribution,item.value ? 'Story valuation '+item.value : ''].filter(Boolean).join(' · ');
    credit.hidden=!credit.textContent;
    document.querySelector('#collection-position').textContent=selected.category.name+(item.artist?' · '+item.artist:variant(item)?' · '+variant(item):'');
    document.querySelector('#collection-variants').innerHTML=selected.items.length>1?selected.items.map(i=>`<button type="button" data-variant="${esc(slug(i))}" aria-pressed="${i===item}">${esc(variant(i)||i.title)}</button>`).join(''):'';
    document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>route(selected.category.id+'/'+b.dataset.variant,true));
    const index=visible.indexOf(selected);document.querySelector('#collection-previous').disabled=index<=0;document.querySelector('#collection-next').disabled=index<0||index>=visible.length-1;
    document.title=selected.title+' — Albury collections';if(!dialog.open)dialog.showModal();
  }
  function close(){const previous=lastGroup;route(category);if(previous){const card=[...document.querySelectorAll('.collection-card')].find(a=>a.hash==='#'+previous.category.id+'/'+slug(previous.cover));card?.focus();}}
  document.querySelector('#collection-close').onclick=close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  function step(n){const g=visible[visible.indexOf(selected)+n];if(g)route(g.category.id+'/'+slug(g.cover),true);}
  document.querySelector('#collection-previous').onclick=()=>step(-1);document.querySelector('#collection-next').onclick=()=>step(1);
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}if(e.key==='ArrowRight'){e.preventDefault();step(1)}});
  search.addEventListener('input',render);window.addEventListener('hashchange',render);window.addEventListener('popstate',render);render();
})();
