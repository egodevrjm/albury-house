window.AlburyStoryDate = (() => {
  const opening = window.ALBURY_CONTENT?.house?.storyDate ?? '2025-08-11';
  const key = 'albury-story-date';
  const datePages = new Set(['ALBURY_WELCOME.html', 'ALBURY_CULINARY_MENU.html', 'ALBURY_WEEKLY_MENUS.html',
    'ALBURY_WEATHER.html', 'ALBURY_LONDON_CALENDAR.html']);
  const subscribers = new Set();
  const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  const requested = () => new URLSearchParams(location.search).get('date');
  const saved = () => { try { return localStorage.getItem(key); } catch { return null; } };
  let date = opening;

  function use(value) {
    const changed = date !== value;
    date = value;
    try { localStorage.setItem(key, value); } catch { /* Date links work without browser storage. */ }
    if (changed) subscribers.forEach(callback => callback(value));
  }
  if (valid(requested())) use(requested());
  else {
    const stored = saved();
    if (valid(stored)) date = stored;
  }

  return {
    opening, valid,
    get date() { return date; },
    set(value) {
      if (!valid(value)) return false;
      const url = new URL(location.href);
      url.searchParams.set('date', value);
      try { history.replaceState(history.state, '', url); } catch { /* A file URL can still use the selected date. */ }
      use(value);
      return true;
    },
    subscribe(callback) { subscribers.add(callback); },
    fromHistory() { if (valid(requested())) use(requested()); },
    link(href) {
      if (!href || href.startsWith('#')) return href;
      const target = new URL(href, location.href);
      if (target.origin !== location.origin || !datePages.has(target.pathname.split('/').pop()) ||
          target.searchParams.has('date')) return href;
      target.searchParams.set('date', date);
      return target.href;
    },
    label(value = date) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString('en-GB',
        { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    },
  };
})();

(()=>{
const content=window.ALBURY_CONTENT;
if(!content)throw new Error('Albury content bundle is missing. Run site/build_content.py.');
const storyDate=window.AlburyStoryDate;
const page=location.pathname.split('/').pop();
const pages=new Map(content.pages.pages.map(item=>[item.id,item]));
const current=[...pages.values()].find(item=>item.href===page);
const navigation=content.navigation;
const activeId=navigation.activePageAliases[current?.id]||current?.id;
const link=id=>{const item=pages.get(id);if(!item)return'';return `<a href="${item.href}"${activeId===id?' aria-current="page"':''}>${item.label}</a>`};
const house=navigation.house;
const bar=document.createElement('div');bar.className='albury-bar';
const sectionGroup=(name,items,kind)=>`<details class="albury-house-menu" data-nav-group="${kind}"><summary>${name}</summary><div class="albury-house-links">${items.map(item=>`<a href="${item.href}">${item.label}</a>`).join('')}</div></details>`;
bar.innerHTML=`<a class="albury-wordmark" href="${navigation.wordmark.href}">${navigation.wordmark.label}</a><button class="albury-menu-toggle" aria-expanded="false" aria-controls="albury-global-links">Menu</button><nav id="albury-global-links" class="albury-links" aria-label="Albury site">${navigation.primary.map(link).join('')}<details class="albury-house-menu${house.includes(activeId)?' is-current':''}"><summary>The house</summary><div class="albury-house-links">${house.map(link).join('')}</div></details>${sectionGroup('Food &amp; Drink',navigation.food,'food')}${sectionGroup('Your stay',navigation.stay,'stay')}${navigation.services.map(link).join('')}</nav>
<details class="albury-house-menu albury-story-date"><summary><span>Story date</span> <time></time></summary>
<div class="albury-date-panel"><label>Choose the story date<input type="date" required></label><button type="button">Return to opening day</button></div></details>`;
document.body.prepend(bar);
const toggle=bar.querySelector('.albury-menu-toggle'), globalLinks=bar.querySelector('nav'), menus=[...bar.querySelectorAll('details')];
toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));globalLinks.classList.toggle('is-open',open);if(!open)menus.forEach(menu=>menu.open=false)};
menus.forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)menus.filter(other=>other!==menu).forEach(other=>other.open=false)}));
document.addEventListener('click',event=>{menus.forEach(menu=>{if(!menu.contains(event.target))menu.open=false})});
const dateMenu=bar.querySelector('.albury-story-date');
const dateInput=dateMenu.querySelector('input');
const dateLabel=dateMenu.querySelector('time');
function dateLink(anchor) {
  if (anchor.hasAttribute('download')) return;
  const original=anchor.dataset.storyDateHref ?? anchor.getAttribute('href');
  const destination=storyDate.link(original);
  if (destination!==original) {
    anchor.dataset.storyDateHref=original;
    anchor.href=destination;
  }
}
function showStoryDate() {
  dateInput.value=storyDate.date;
  dateLabel.dateTime=storyDate.date;
  dateLabel.textContent=storyDate.label();
  bar.querySelectorAll('a[href]').forEach(dateLink);
}
dateInput.addEventListener('change',()=>{ if(!storyDate.set(dateInput.value)) showStoryDate(); });
dateMenu.querySelector('button').addEventListener('click',()=>storyDate.set(storyDate.opening));
storyDate.subscribe(showStoryDate);
showStoryDate();
window.addEventListener('popstate',storyDate.fromHistory);
document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('a[href]');
  if(anchor) dateLink(anchor);
},true);

document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=menus.find(menu=>menu.open);if(open){open.open=false;open.querySelector('summary').focus()}else if(toggle.getAttribute('aria-expanded')==='true'){toggle.click();toggle.focus()}});
function updateCurrent(){
  const staySection=page==='ALBURY_CULINARY_MENU.html'&&['#hospitality','#team','#service'].includes(location.hash);
  const foodCollection=page==='ALBURY_HOUSE_COLLECTIONS.html'&&/^#(?:produce|baking)(?:\/|$)/.test(location.hash);
  bar.querySelector('[data-nav-group="food"]').classList.toggle('is-current',foodCollection||page==='ALBURY_GIFTS.html'||(!staySection&&(activeId==='kitchen'||current?.id==='weekly-menus'||page==='ALBURY_PANTRY_ITEMS.html')));
  bar.querySelector('[data-nav-group="stay"]').classList.toggle('is-current',staySection||page==='ALBURY_GIFTS.html');
  bar.querySelectorAll('[data-nav-group] a').forEach(a=>{
    const target=new URL(a.href);
    const selected=target.pathname===location.pathname&&target.hash===(location.hash||(page==='ALBURY_CULINARY_MENU.html'?'#today':''));
    if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
}
updateCurrent();window.addEventListener('hashchange',updateCurrent);
bar.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menus.forEach(menu=>menu.open=false);globalLinks.classList.remove('is-open');toggle.setAttribute('aria-expanded','false')}));

if(current?.id==='room-tour'){document.body.classList.add('with-site-bar');new ResizeObserver(()=>document.body.style.setProperty('--site-bar-height',bar.offsetHeight+'px')).observe(bar)}
})();
