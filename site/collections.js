(() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories=ALBURY_HOUSE_CATALOGUE.collections, groups=[];
  const slug=item=>item.path.split('/').pop().replace(/\.[^.]+$/,'');
  const variant=item=>/— Full Colour$/.test(item.title)?'Full colour':/— White(?:\/Clear)? Led$/.test(item.title)?'Ivory led':null;
  categories.forEach(category=>{const local=new Map();category.rooms.forEach(item=>{const number=slug(item).match(/^\d+/)?.[0];const key=variant(item)&&number?number:slug(item);if(!local.has(key))local.set(key,{category,items:[]});local.get(key).items.push(item);});groups.push(...local.values());});
  groups.forEach(group=>{group.cover=group.items.find(i=>variant(i)==='Full colour')||group.items[0];group.title=group.cover.title.replace(/ — (?:Full Colour|White(?:\/Clear)? Led)$/,'');});
  const dialog=document.querySelector('#collection-dialog'),search=document.querySelector('#collection-search');let category='all',selected=null,visible=groups,lastGroup=null;
  document.querySelector('#collection-categories').innerHTML='<a href="#all">All collections</a>'+categories.map(c=>`<a href="#${c.id}">${esc(c.name)}</a>`).join('');
  function route(value,replace=false){history[replace?'replaceState':'pushState'](null,'','#'+value);render();}
  function render(){
    let parts=decodeURIComponent(location.hash.replace(/^#\/?/,'')).replace(/^collections\//,'').split('/');
    if(parts[0]==='house-items'&&parts[1]){const found=categories.find(c=>c.rooms.some(i=>slug(i)===parts[1]));if(found)parts[0]=found.id;}
    category=categories.some(c=>c.id===parts[0])?parts[0]:'all';
    selected=parts[1]?groups.find(g=>(category==='all'||g.category.id===category)&&g.items.some(i=>slug(i)===parts[1])):null;
    const q=search.value.trim().toLocaleLowerCase();visible=groups.filter(g=>(category==='all'||g.category.id===category)&&(g.title+' '+g.items.map(i=>i.description).join(' ')).toLocaleLowerCase().includes(q));
    document.querySelectorAll('#collection-categories a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+category?'page':'false'));
    document.querySelector('#collection-grid').innerHTML=visible.length?visible.map(g=>`<a class="collection-card" href="#${g.category.id}/${slug(g.cover)}"><img src="${esc(g.cover.path)}" alt="${esc(g.title)}" loading="lazy"><h2>${esc(g.title)}</h2><p>${esc(g.category.name)}${g.items.length>1?' · '+g.items.length+' colour variants':''}</p></a>`).join(''):'<div class="collection-empty"><h2>No matching items</h2><p>Try another search or collection.</p><button id="collection-reset">Show everything</button></div>';
    document.querySelector('#collection-count').textContent=`${visible.length} families · ${visible.reduce((n,g)=>n+g.items.length,0)} images`;
    document.querySelector('#collection-reset')?.addEventListener('click',()=>{search.value='';route('all')});
    if(!selected){if(dialog.open)dialog.close();document.title='House collections — Albury';return;}
    const item=selected.items.find(i=>slug(i)===parts[1])||selected.cover;lastGroup=selected;
    document.querySelector('#collection-title').textContent=selected.title;document.querySelector('#collection-description').textContent=item.description;
    const image=document.querySelector('#collection-image');image.src=item.path;image.alt=item.title;
    document.querySelector('#collection-image-link').href=item.path;document.querySelector('#collection-download').href=item.path;
    document.querySelector('#collection-position').textContent=selected.category.name+(variant(item)?' · '+variant(item):'');
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
