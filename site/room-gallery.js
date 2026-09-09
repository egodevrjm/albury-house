(() => {
 const floors=ALBURY_HOUSE_CATALOGUE.tour,groups=[];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const slug=v=>v.path.split('/').pop().replace(/\.[^.]+$/,'')+(v.path.includes('/new-views/')?'-additional-view':'');
 floors.forEach(floor=>{const map=new Map();floor.rooms.forEach(view=>{if(!map.has(view.roomId))map.set(view.roomId,{id:view.roomId,name:view.roomName,floor,views:[]});map.get(view.roomId).views.push(view)});const rooms=[...map.values()];if(floor.id==='exterior'){const order=['street-arrival','front-elevation','duchess-of-bedford-walk-mews','existing-site-before-landscape-works','the-cedars-future-landscape-proposal'];rooms.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):order.length)-(order.includes(b.id)?order.indexOf(b.id):order.length))}groups.push(...rooms)});
 const grid=document.querySelector('#room-grid'),search=document.querySelector('#room-search'),dialog=document.querySelector('#room-dialog'),planDialog=document.querySelector('#plan-dialog');
 let browseFloor='all',selected=null,viewIndex=0,visible=groups,gridKey='',lastGroup=null;
 const url=(g,v=g.views[0])=>'#/'+g.floor.id+'/'+g.id+'/'+slug(v);
 function parts(){try{return decodeURIComponent(location.hash.replace(/^#\/?/,'')).split('/')}catch{return []}}
 function legacyRedirect(p){if(p[0]==='guide'){location.replace('ALBURY_HOUSE_GUIDE.html#'+(p[1]||'overview'));return true}if(p[0]==='collections'){location.replace('ALBURY_HOUSE_COLLECTIONS.html#'+p.slice(1).join('/'));return true}return false}
 const canonicalId=id=>floors.find(f=>f.id===id||(f.legacyIds||[]).includes(id))?.id||id;
 const first=parts();first[0]=canonicalId(first[0]);if(legacyRedirect(first))return;
 if(floors.some(f=>f.id===first[0]))browseFloor=first[0];
 search.value=new URLSearchParams(location.search).get('q')||'';
 document.querySelector('#room-floors').innerHTML='<a href="#/all">Whole house &amp; grounds</a>'+floors.map(f=>`<a href="#/${f.id}" title="${esc(f.level||'Outdoor area')}">${esc(f.name)}</a>`).join('');
 function renderGrid(){const q=search.value.toLocaleLowerCase().trim(),key=browseFloor+'|'+q;if(key===gridKey)return;gridKey=key;visible=groups.filter(g=>(browseFloor==='all'||g.floor.id===browseFloor)&&[g.name,g.floor.name,g.floor.level,...(g.floor.aliases||[]),...g.views.map(v=>v.title+' '+v.description)].join(' ').toLocaleLowerCase().includes(q));
 grid.innerHTML=visible.length?visible.map(g=>`<a class="room-card" href="${url(g)}"><div class="room-card-image"><img src="${esc(g.views[0].path)}" alt="${esc(g.name)}" width="1536" height="1024" loading="lazy"><span class="view-badge">${g.views.length} ${g.views.length===1?'view':'views'}</span></div><h2>${esc(g.name)}</h2><p>${esc(g.floor.name)}${g.floor.level&&g.floor.name!==g.floor.level?' · '+esc(g.floor.level):''}</p></a>`).join(''):'<div class="room-empty"><h2>No matching rooms</h2><p>Try another name or floor.</p><button type="button" id="room-clear">Show all rooms</button></div>';
 document.querySelector('#room-count').textContent=`${visible.length} rooms & spaces · ${visible.reduce((n,g)=>n+g.views.length,0)} views`;
 document.querySelectorAll('#room-floors a').forEach(a=>a.setAttribute('aria-current',a.hash==='#/'+browseFloor?'page':'false'));
 document.querySelector('#room-clear')?.addEventListener('click',()=>{search.value='';const u=new URL(location.href);u.searchParams.delete('q');history.replaceState(null,'',u);navigate('#/all')});
 }
 function navigate(hash,replace=false){history[replace?'replaceState':'pushState'](null,'',hash);render()}
 function render(){const p=parts();if(legacyRedirect(p))return;p[0]=canonicalId(p[0]);selected=null;const f=floors.find(f=>f.id===p[0]);
 if(f&&p[1]){selected=groups.find(g=>g.floor===f&&g.id===p[1]);if(selected)viewIndex=Math.max(0,selected.views.findIndex(v=>slug(v)===p[2]));else{selected=groups.find(g=>g.floor===f&&g.views.some(v=>slug(v)===p[1]));if(selected)viewIndex=selected.views.findIndex(v=>slug(v)===p[1]);}}
 if(!selected){browseFloor=f?f.id:'all';if(dialog.open)dialog.close();document.title='Room tour — Albury';renderGrid();return}
 renderGrid();const g=selected,v=g.views[viewIndex];lastGroup=g;
 document.querySelector('#room-position').textContent=g.floor.name+(g.floor.level&&g.floor.name!==g.floor.level?' · '+g.floor.level:'')+' · '+g.views.length+(g.views.length===1?' view':' views');document.querySelector('#room-title').textContent=g.name;
 document.querySelector('#view-title').textContent=v.title;document.querySelector('#room-description').textContent=v.description;document.querySelector('#view-position').textContent=(viewIndex+1)+' / '+g.views.length;
 const img=document.querySelector('#room-image');document.querySelector('#image-error').hidden=true;img.onload=()=>{document.querySelector('#image-error').hidden=true};img.onerror=()=>{document.querySelector('#image-error').hidden=false};img.src=v.path;img.alt=v.title+', '+g.floor.name+', Albury';document.querySelector('#room-image-link').href=v.path;document.querySelector('#room-download').href=v.path;
 document.querySelector('#view-previous').disabled=viewIndex===0;document.querySelector('#view-next').disabled=viewIndex===g.views.length-1;
 const existing=document.querySelector('#room-views').dataset.room;
 if(existing!==g.floor.id+'/'+g.id){document.querySelector('.room-notes').open=false;document.querySelector('#room-views').innerHTML=g.views.map((v,i)=>`<button class="room-thumb" type="button" data-view="${i}" aria-label="View ${i+1}: ${esc(v.title)}"><img src="${esc(v.path)}" alt="" width="1536" height="1024" loading="lazy"><span>${esc(v.title.includes(' — ')?v.title.split(' — ').slice(1).join(' — '):v.title)}</span></button>`).join('');document.querySelector('#room-views').dataset.room=g.floor.id+'/'+g.id;document.querySelector('#room-views').scrollTop=0;document.querySelector('#room-views').scrollLeft=0;}
 document.querySelectorAll('[data-view]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.view===viewIndex));b.onclick=()=>navigate(url(g,g.views[+b.dataset.view]),true)});
 const pane=document.querySelector('#room-views'),active=pane.querySelector('[aria-pressed=true]');if(active){const a=active.getBoundingClientRect(),r=pane.getBoundingClientRect();if(a.bottom>r.bottom)pane.scrollTop+=a.bottom-r.bottom;if(a.top<r.top)pane.scrollTop-=r.top-a.top;if(a.right>r.right)pane.scrollLeft+=a.right-r.right;if(a.left<r.left)pane.scrollLeft-=r.left-a.left;}
 const idx=visible.indexOf(g);document.querySelector('#room-previous').disabled=idx<=0;document.querySelector('#room-next').disabled=idx<0||idx===visible.length-1;
 document.title=g.name+' — Albury';if(!dialog.open){dialog.showModal();dialog.scrollTop=0}
 }
 function closeRoom(){const previous=lastGroup;if(planDialog.open)planDialog.close();navigate('#/'+browseFloor);if(previous)[...grid.querySelectorAll('.room-card')].find(a=>a.hash===url(previous))?.focus({preventScroll:true});}
 document.querySelector('#room-close').onclick=closeRoom;document.querySelector('#room-return').onclick=closeRoom;dialog.addEventListener('cancel',e=>{e.preventDefault();closeRoom()});
 function stepView(n){if(!selected)return;const v=selected.views[viewIndex+n];if(v)navigate(url(selected,v),true)}
 function stepRoom(n){const g=visible[visible.indexOf(selected)+n];if(g){navigate(url(g),true);dialog.scrollTop=0}}
 document.querySelector('#view-previous').onclick=()=>stepView(-1);document.querySelector('#view-next').onclick=()=>stepView(1);document.querySelector('#room-previous').onclick=()=>stepRoom(-1);document.querySelector('#room-next').onclick=()=>stepRoom(1);
 dialog.addEventListener('keydown',e=>{if(planDialog.open||e.target.matches('input,select'))return;if(e.key==='ArrowLeft'){e.preventDefault();stepView(-1)}if(e.key==='ArrowRight'){e.preventDefault();stepView(1)}});
 const plans=floors.flatMap(f=>[{id:f.id,name:f.name+(f.level&&f.name!==f.level?' — '+f.level:''),plan:f.plan},...(f.additionalPlans||[]).map((p,i)=>({id:f.id+'-plan-'+i,name:f.name+' — '+p.name,plan:p.path}))]);
 document.querySelector('#plan-floor').innerHTML=plans.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');
 function renderPlan(){const f=plans.find(f=>f.id===document.querySelector('#plan-floor').value);document.querySelector('#plan-image').src=f.plan;document.querySelector('#plan-image').alt=f.name+' plan of Albury';document.querySelector('#plan-original').href=f.plan;document.querySelector('#plan-title').textContent=f.name+' · plan'}
 function openPlan(){document.querySelector('#plan-floor').value=selected?.floor.id||(browseFloor==='all'?'raised-ground':browseFloor);renderPlan();planDialog.showModal()}
 document.querySelector('#show-plans').onclick=openPlan;document.querySelector('#room-plan').onclick=openPlan;document.querySelector('#plan-close').onclick=()=>planDialog.close();document.querySelector('#plan-floor').onchange=renderPlan;
 for(const d of [dialog,planDialog])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d===planDialog)d.close();else closeRoom()}}});
 search.addEventListener('input',()=>{const u=new URL(location.href);if(search.value)u.searchParams.set('q',search.value);else u.searchParams.delete('q');history.replaceState(null,'',u);renderGrid()});
 window.addEventListener('hashchange',render);window.addEventListener('popstate',render);render();
})();
