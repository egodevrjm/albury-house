window.AlburyMenus = (() => {
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const meals=['Breakfast','Lunch','Dinner'], seasons=['spring','summer','autumn','winter'];
  const courses=[['with_drinks','With drinks'],['starter','To start'],['bowl','The bowl'],['main','The plate'],['alongside','Alongside'],['dessert','To finish'],['bread_preserves','Bread & preserves'],['vegetarian','Vegetarian plate']];
  const epoch=Date.UTC(2025,7,11),dayMS=86400000,esc=AlburyCSV.esc;
  const specials=window.ALBURY_CONTENT['special-menus'].menus;
  const api={rows:[],csv:'',source:'',days,courses,date:'2025-08-11',specialId:'',specials,cycles:2};
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  function validate(text){
    const rows=AlburyCSV.parse(text),keys=new Set();
    for(const row of rows){
      if(!seasons.includes(row.season)||!['1','2'].includes(row.cycle)||!days.includes(row.day)||!meals.includes(row.meal)||!row.main||!row.theme)throw Error('Each menu needs a season, cycle 1 or 2, weekday, theme, meal and main dish.');
      const key=`${row.season}-${row.cycle}-${row.day}-${row.meal}`;
      if(keys.has(key))throw Error(`Duplicate menu: ${key}.`);keys.add(key);
    }
    for(const season of seasons)for(const cycle of [1,2])for(const day of days){
      if(new Set(rows.filter(r=>r.season===season&&+r.cycle===cycle&&r.day===day).map(r=>r.theme)).size!==1)throw Error(`Check the day theme for ${season}, cycle ${cycle}, ${day}.`);
      for(const meal of meals)if(!keys.has(`${season}-${cycle}-${day}-${meal}`))throw Error(`Missing ${season} ${meal} on ${day}, cycle ${cycle}.`);
    }
    return rows;
  }
  api.use=text=>{const rows=validate(text);api.rows=rows;api.csv=text;};
  api.setDate=value=>{if(!validDate(value))return false;api.date=value;return true;};
  api.shift=n=>{api.date=new Date(Date.parse(api.date+'T00:00:00Z')+n*dayMS).toISOString().slice(0,10);};
  api.position=(date=api.date)=>{
    if(!validDate(date))throw Error('Use a valid YYYY-MM-DD menu date.');
    const offset=Math.floor((Date.parse(date+'T00:00:00Z')-epoch)/dayMS),day=((offset%7)+7)%7,week=Math.floor(offset/7),month=Number(date.slice(5,7));
    const season=month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
    return {day,cycle:((week%2)+2)%2+1,season};
  };
  api.forDate=(date=api.date,specialId='')=>{
    const position=api.position(date),special=specialId?specials.find(s=>s.id===specialId):null;
    if(specialId&&!special)throw Error('Unknown special menu.');
    const rows=api.rows.filter(r=>r.season===position.season&&+r.cycle===position.cycle&&r.day===days[position.day]).map(r=>special&&r.meal===special.meal?{...r,...special.menu}:{...r});
    return {...position,theme:special?.name||rows[0].theme,rows};
  };
  api.week=(date=api.date)=>{
    const start=Date.parse(date+'T00:00:00Z')-api.position(date).day*dayMS;
    return days.map((day,i)=>{
      const dayDate=new Date(start+i*dayMS).toISOString().slice(0,10),daily=api.forDate(dayDate,dayDate===date?api.specialId:'');
      return [day,daily.theme,meals.map(meal=>{const row=daily.rows.find(r=>r.meal===meal);return [meal,courses.filter(([key])=>row[key]).map(([key,label])=>[label,row[key]])];})];
    });
  };
  api.label=date=>new Date((date||api.date)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  api.controls=()=>`<div class="rotation-controls"><label>Menu date <input id="menu-date" type="date" value="${api.date}" required></label><button type="button" data-menu-shift="-7">← Previous week</button><button type="button" data-menu-shift="7">Next week →</button><button type="button" id="menu-reset">Opening week</button><label>Menu for selected date <select id="special-menu-select"><option value="">Regular seasonal menu</option>${specials.map(s=>`<option value="${esc(s.id)}" ${api.specialId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label></div>${api.source==='fallback'?'<p class="muted">The latest CSV could not be reached; showing the bundled menus.</p>':''}<p class="muted">${api.position().season[0].toUpperCase()+api.position().season.slice(1)} rotation · week ${api.position().cycle} of 2. Each date uses its own season, including weeks that cross a season boundary. A special menu replaces only its lunch or dinner on the selected date.</p>${api.specialId?`<p class="muted">${esc(specials.find(s=>s.id===api.specialId).notes)} This is a menu option; arrangements are confirmed with the team.</p>`:''}`;
  api.specialCatalogue=()=>`<h2>Special menus</h2><p>Choose an occasion menu above to use it for the selected date, or browse the full menus here. These are available kitchen plans; dates and guest arrangements are agreed separately.</p>${specials.map(s=>`<details class="special-menu"><summary>${esc(s.name)} <span>· ${esc(s.meal)}</span></summary><p>${esc(s.notes)}</p><dl>${courses.filter(([key])=>s.menu[key]).map(([key,label])=>`<div><dt>${esc(label)}</dt><dd>${esc(s.menu[key])}</dd></div>`).join('')}</dl></details>`).join('')}`;
  api.editor=()=>`<details class="menu-data-tools"><summary>Menu CSV · download or preview edits</summary><p>Download the four seasonal rotations, edit them in a spreadsheet, then preview the saved CSV. A preview lasts until this page is reloaded.</p><div class="button-row"><button type="button" id="menu-download">Download menus.csv</button><label>Preview a menu CSV <input id="menu-import" type="file" accept=".csv,text/csv"></label></div><p id="menu-import-status" role="status"></p><p class="muted">Keep all four seasons complete, with two weeks of breakfast, lunch and dinner in each. <a href="site/README.md">Editing guide</a>.</p></details>`;
  api.bind=render=>{
    const update=()=>{const u=new URL(location.href);u.searchParams.set('date',api.date);api.specialId?u.searchParams.set('special_menu_id',api.specialId):u.searchParams.delete('special_menu_id');history.replaceState(null,'',u);render();};
    document.querySelector('#menu-date')?.addEventListener('change',e=>{if(api.setDate(e.target.value))update();});
    document.querySelector('#special-menu-select')?.addEventListener('change',e=>{api.specialId=e.target.value;update();});
    document.querySelectorAll('[data-menu-shift]').forEach(b=>b.onclick=()=>{api.shift(Number(b.dataset.menuShift));update();});
    document.querySelector('#menu-reset')?.addEventListener('click',()=>{api.date='2025-08-11';api.specialId='';update();});
    document.querySelector('#menu-download')?.addEventListener('click',()=>AlburyCSV.download(api.csv,'menus.csv'));
    document.querySelector('#menu-import')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{api.use(await file.text());api.source='preview';render();document.querySelector('.menu-data-tools').open=true;document.querySelector('#menu-import-status').textContent=`Previewing ${file.name}: ${api.rows.length} meals across four seasons. Reload to return to saved menus.`;}catch(error){document.querySelector('#menu-import-status').textContent=`Could not load this CSV: ${error.message} The current menus are unchanged.`;}});
  };
  const params=new URLSearchParams(location.search);if(params.get('date'))api.setDate(params.get('date'));
  if(specials.some(s=>s.id===params.get('special_menu_id')))api.specialId=params.get('special_menu_id');
  api.ready=AlburyCSV.load('site/data/menus.csv?schema=2',window.ALBURY_MENU_CSV).then(({text,source})=>{api.use(text);api.source=source;});
  return api;
})();
