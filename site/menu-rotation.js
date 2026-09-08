window.AlburyMenus = (() => {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const meals = ['Breakfast','Lunch','Dinner'];
  const courses = [['with_drinks','With drinks'],['starter','To start'],['bowl','The bowl'],['main','The plate'],['alongside','Alongside'],['dessert','To finish'],['bread_preserves','Bread & preserves'],['vegetarian','Vegetarian plate']];
  const epoch = Date.UTC(2025, 7, 11), dayMS = 86400000;
  const api = {rows: [], csv: '', source: '', days, courses, date: '2025-08-11'};
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value; }
  function validate(text) {
    const rows = AlburyCSV.parse(text), keys = new Set();
    if (!rows.length) throw new Error('The menu CSV is empty.');
    for (const row of rows) {
      if (!/^\d+$/.test(row.cycle) || Number(row.cycle) < 1 || Number(row.cycle) > 52 || !days.includes(row.day) || !meals.includes(row.meal) || !row.main || !row.theme) throw new Error('Each menu needs a cycle (1–52), weekday, theme, meal and main dish.');
      const key = `${Number(row.cycle)}-${row.day}-${row.meal}`;
      if (keys.has(key)) throw new Error(`Duplicate menu: ${key}.`); keys.add(key);
    }
    const cycles = [...new Set(rows.map(r => Number(r.cycle)))].sort((a,b) => a-b);
    cycles.forEach((cycle,i) => {
      if (cycle !== i+1) throw new Error('Cycle numbers must start at 1 with no gaps.');
      for (const day of days) {
        if (new Set(rows.filter(r=>Number(r.cycle)===cycle && r.day===day).map(r=>r.theme)).size!==1) throw new Error(`Use the same theme for each meal on ${day}, cycle ${cycle}.`);
        for (const meal of meals) if (!keys.has(`${cycle}-${day}-${meal}`)) throw new Error(`Missing ${meal} on ${day}, cycle ${cycle}.`);
      }
    });
    return rows;
  }
  api.use = text => { const rows = validate(text); api.rows = rows; api.csv = text; api.cycles = Math.max(...rows.map(r=>Number(r.cycle))); };
  api.setDate = value => { if (!validDate(value)) return false; api.date=value; return true; };
  api.shift = n => { api.date = new Date(Date.parse(api.date+'T00:00:00Z') + n*dayMS).toISOString().slice(0,10); };
  api.position = (date=api.date) => {
    const offset = Math.floor((Date.parse(date+'T00:00:00Z')-epoch)/dayMS);
    const day = ((offset%7)+7)%7, week = Math.floor(offset/7);
    return {day, cycle: ((week%api.cycles)+api.cycles)%api.cycles+1};
  };
  api.week = (date=api.date) => {
    const {cycle} = api.position(date);
    return days.map(day => {
      const rows = api.rows.filter(r=>Number(r.cycle)===cycle && r.day===day);
      return [day, rows[0].theme, meals.map(meal => [meal, courses.filter(([key])=>rows.find(r=>r.meal===meal)[key]).map(([key,label])=>[label,rows.find(r=>r.meal===meal)[key]])])];
    });
  };
  api.label = date => new Date((date||api.date)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  api.controls = () => `<div class="rotation-controls"><label>Menu date <input id="menu-date" type="date" value="${api.date}" required></label><button type="button" data-menu-shift="-7">← Previous week</button><button type="button" data-menu-shift="7">Next week →</button><button type="button" id="menu-reset">Opening week</button></div>${api.source==='fallback'?'<p class="muted">The latest CSV could not be reached; showing the bundled menus.</p>':''}<p class="muted">Summer rotation · week ${api.position().cycle} of ${api.cycles}. Select a date to see its menu. This is a repeating kitchen plan; serving arrangements are confirmed with the team.</p>`;
  api.editor = () => `<details class="menu-data-tools"><summary>Menu CSV · download or preview edits</summary><p>Download the table, edit it in a spreadsheet, then choose the saved CSV to preview it here. A preview lasts until this page is reloaded.</p><div class="button-row"><button type="button" id="menu-download">Download menus.csv</button><label>Preview a menu CSV <input id="menu-import" type="file" accept=".csv,text/csv"></label></div><p id="menu-import-status" role="status"></p><p class="muted">For permanent changes, replace site/data/menus.csv. Hosted pages read it directly. When opening from disk, rebuild the bundled copy using site/build_data.py. <a href="site/README.md">Editing guide</a>.</p></details>`;
  api.bind = render => {
    document.querySelector('#menu-date')?.addEventListener('change', e=>{if(api.setDate(e.target.value)) render();});
    document.querySelectorAll('[data-menu-shift]').forEach(b=>b.onclick=()=>{api.shift(Number(b.dataset.menuShift));render();});
    document.querySelector('#menu-reset')?.addEventListener('click',()=>{api.date='2025-08-11';render();});
    document.querySelector('#menu-download')?.addEventListener('click',()=>AlburyCSV.download(api.csv,'menus.csv'));
    document.querySelector('#menu-import')?.addEventListener('change',async e=>{
      const file=e.target.files[0];if(!file)return;
      try { const text=await file.text();api.use(text);api.source='preview';render();const details=document.querySelector('.menu-data-tools');details.open=true;document.querySelector('#menu-import-status').textContent=`Previewing ${file.name}: ${api.rows.length} menus in ${api.cycles} weeks. Reload to return to the saved menus.`; }
      catch(error){document.querySelector('#menu-import-status').textContent=`Could not load this CSV: ${error.message} The current menus are unchanged.`;}
    });
  };
  const requested = new URLSearchParams(location.search).get('date'); if(requested)api.setDate(requested);
  api.ready = AlburyCSV.load('site/data/menus.csv',window.ALBURY_MENU_CSV).then(({text,source})=>{api.use(text);api.source=source;});
  return api;
})();
