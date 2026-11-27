(()=>{
const content=window.ALBURY_CONTENT;
if(!content)throw new Error('Albury content bundle is missing. Run site/build_content.py.');
const page=location.pathname.split('/').pop();
const pages=new Map(content.pages.pages.map(item=>[item.id,item]));
const current=[...pages.values()].find(item=>item.href===page);
const navigation=content.navigation;
const activeId=navigation.activePageAliases[current?.id]||current?.id;
const link=id=>{const item=pages.get(id);if(!item)return'';return `<a href="${item.href}"${activeId===id?' aria-current="page"':''}>${item.label}</a>`};
const house=navigation.house;
const bar=document.createElement('div');bar.className='albury-bar';
const sectionGroup=(name,items,kind)=>`<details class="albury-house-menu" data-nav-group="${kind}"><summary>${name}</summary><div class="albury-house-links">${items.map(item=>`<a href="${item.href}">${item.label}</a>`).join('')}</div></details>`;
bar.innerHTML=`<a class="albury-wordmark" href="${navigation.wordmark.href}">${navigation.wordmark.label}</a><button class="albury-menu-toggle" aria-expanded="false" aria-controls="albury-global-links">Menu</button><nav id="albury-global-links" class="albury-links" aria-label="Albury site">${navigation.primary.map(link).join('')}<details class="albury-house-menu${house.includes(activeId)?' is-current':''}"><summary>The house</summary><div class="albury-house-links">${house.map(link).join('')}</div></details>${sectionGroup('Food & drink',navigation.food,'food')}${sectionGroup('Your stay',navigation.stay,'stay')}${navigation.services.map(link).join('')}</nav>`;
document.body.prepend(bar);
const toggle=bar.querySelector('button'), globalLinks=bar.querySelector('nav'), menus=[...bar.querySelectorAll('details')];
toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));globalLinks.classList.toggle('is-open',open);if(!open)menus.forEach(menu=>menu.open=false)};
menus.forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)menus.filter(other=>other!==menu).forEach(other=>other.open=false)}));
document.addEventListener('click',event=>{menus.forEach(menu=>{if(!menu.contains(event.target))menu.open=false})});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=menus.find(menu=>menu.open);if(open){open.open=false;open.querySelector('summary').focus()}else if(toggle.getAttribute('aria-expanded')==='true'){toggle.click();toggle.focus()}});
function updateCurrent(){const staySection=page==='ALBURY_CULINARY_MENU.html'&&['#hospitality','#team','#service'].includes(location.hash);bar.querySelector('[data-nav-group="food"]').classList.toggle('is-current',!staySection&&(activeId==='kitchen'||current?.id==='weekly-menus'||page==='ALBURY_PANTRY_ITEMS.html'));bar.querySelector('[data-nav-group="stay"]').classList.toggle('is-current',staySection||page==='ALBURY_GIFTS.html');bar.querySelectorAll('[data-nav-group] a').forEach(a=>{const target=new URL(a.href);const selected=target.pathname===location.pathname&&target.hash===(location.hash|| (page==='ALBURY_CULINARY_MENU.html'?'#today':''));if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
updateCurrent();window.addEventListener('hashchange',updateCurrent);
bar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menus.forEach(menu=>menu.open=false);globalLinks.classList.remove('is-open');toggle.setAttribute('aria-expanded','false')}));

if(current?.id==='room-tour'){document.body.classList.add('with-site-bar');new ResizeObserver(()=>document.body.style.setProperty('--site-bar-height',bar.offsetHeight+'px')).observe(bar)}
})();
