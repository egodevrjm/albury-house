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
bar.innerHTML=`<a class="albury-wordmark" href="${navigation.wordmark.href}">${navigation.wordmark.label}</a><button class="albury-menu-toggle" aria-expanded="false" aria-controls="albury-global-links">Menu</button><nav id="albury-global-links" class="albury-links" aria-label="Albury site">${navigation.primary.map(link).join('')}<details class="albury-house-menu${house.includes(activeId)?' is-current':''}"><summary>The house</summary><div class="albury-house-links">${house.map(link).join('')}</div></details>${navigation.services.map(link).join('')}</nav>`;
document.body.prepend(bar);
bar.querySelector('button').onclick=e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));bar.querySelector('nav').classList.toggle('is-open',open)};
const menu=bar.querySelector('details');document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});
if(current?.id==='room-tour'){document.body.classList.add('with-site-bar');new ResizeObserver(()=>document.body.style.setProperty('--site-bar-height',bar.offsetHeight+'px')).observe(bar)}
})();
