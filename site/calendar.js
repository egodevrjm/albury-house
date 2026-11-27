(() => {
  const story=window.AlburyStoryDate;
  const esc=AlburyCSV.esc, months=Array.from({length:12},(_,i)=>new Date(Date.UTC(2025,7+i,1)).toISOString().slice(0,7));
  const monthName=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
  const dateName=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
  const month=document.querySelector('#event-month'), category=document.querySelector('#event-category'), search=document.querySelector('#event-search'), content=document.querySelector('#events');
  let events=[],visible=[];
  const storyDate=()=>story?.date ?? '2025-08-11';
  const storyDateLabel=()=>story?.label() ?? dateName(storyDate());
  const matchesDate=(event,date)=>event.start_date<=date&&event.end_date>=date;
  function overlaps(e,m){return e.start_date<=m+'-31' && e.end_date>=m+'-01';}
  function ics(list){
    const safe=s=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const compact=s=>s.replace(/-/g,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Albury//London Events//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    for(const e of list){const end=new Date(Date.parse(e.end_date+'T00:00:00Z')+86400000).toISOString().slice(0,10);lines.push('BEGIN:VEVENT','UID:'+e.id+'@albury.local','DTSTAMP:20260908T120000Z','DTSTART;VALUE=DATE:'+compact(e.start_date),'DTEND;VALUE=DATE:'+compact(end),'SUMMARY:'+safe(e.title),'LOCATION:'+safe(e.location),'DESCRIPTION:'+safe(e.description+' '+e.notes+'\nAccess: '+e.access+'\nLocal event reference; no household booking.\n'+e.source_url),'URL:'+e.source_url,'TRANSP:TRANSPARENT','END:VEVENT');}
    lines.push('END:VCALENDAR');
    // RFC 5545 line folding measured in UTF-8 octets, without splitting a code point.
    return lines.map(line=>{let parts=[],part='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>73){parts.push(part);part=' ';bytes=1;}part+=char;bytes+=size;}parts.push(part);return parts.join('\r\n');}).join('\r\n')+'\r\n';
  }
  function exportEvents(list){AlburyCSV.download(ics(list),'albury-london-'+(month.value==='all'?'2025-2026':month.value==='story'?storyDate():month.value)+'.ics','text/calendar;charset=utf-8');}
  function card(e){return `<article class="event-card"><div class="event-date"><time datetime="${e.start_date}">${dateName(e.start_date)}</time>${e.start_date!==e.end_date?` – <time datetime="${e.end_date}">${dateName(e.end_date)}</time>`:''}</div><div><p class="event-meta">${esc(e.category)} · ${esc(e.access)}</p><h3>${esc(e.title)}</h3><p class="event-meta">${esc(e.location)}</p><p>${esc(e.description)}</p>${e.notes?`<p class="event-notes">${esc(e.notes)}</p>`:''}<div class="event-actions"><a href="${esc(e.source_url)}" target="_blank" rel="noopener noreferrer">Organiser &amp; source ↗</a><button type="button" data-event="${esc(e.id)}" aria-label="Save date: ${esc(e.title)}">Save date</button></div></div></article>`;}
  function render(){
    const q=search.value.toLocaleLowerCase().trim();
    const dayView=month.value==='story', date=storyDate();
    const inCalendar=date>='2025-08-01'&&date<='2026-07-31';
    const scope=dayView?' on '+storyDateLabel():month.value==='all'?' in the year':' in '+monthName(month.value);
    visible=events.filter(e=>(dayView?inCalendar&&matchesDate(e,date):month.value==='all'||overlaps(e,month.value))&&(category.value==='all'||e.category===category.value)&&[e.title,e.location,e.description,e.category].join(' ').toLocaleLowerCase().includes(q));
    document.querySelector('#event-story-date').textContent='On the story date · '+storyDateLabel();
    const emptyNote=dayView&&!inCalendar ? 'The London calendar covers August 2025 to July 2026.'
      : dayView ? 'Browse the month or the full year for more events.' : 'Try another month, interest or search term.';
    let last='';
    content.innerHTML=visible.length?visible.map(e=>{
      const m=dayView?date.slice(0,7):month.value==='all'?e.start_date.slice(0,7):month.value;
      const heading=m!==last?`<h2 class="event-month-heading">${dayView?esc(storyDateLabel()):monthName(m)}</h2>`:'';
      last=m;return heading+card(e);
    }).join(''):`<div class="empty-events"><h2>No matching events${dayView?esc(scope):''}</h2><p>${emptyNote}</p><button type="button" id="events-clear">Show the full calendar</button></div>`;
    document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>exportEvents(events.filter(e=>e.id===b.dataset.event)));
    document.querySelector('#events-clear')?.addEventListener('click',()=>{month.value='all';category.value='all';search.value='';render();});
    document.querySelectorAll('[data-month]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.month===month.value)));
    document.querySelector('#event-count').textContent=`${visible.length} events${scope}.`;
    document.querySelector('#events-download').disabled=!visible.length;
    const url=new URL(location.href);
    for(const [key,value] of [['month',month.value],['category',category.value==='all'?'':category.value],['q',q?search.value:'']]){
      if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
    }
    history.replaceState(history.state,'',url);
  }
  AlburyCSV.load('site/data/london-events.csv',window.ALBURY_EVENTS_CSV).then(({text,source})=>{
    events=AlburyCSV.parse(text).sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.title.localeCompare(b.title));
    const ids=new Set();
    for(const e of events){if(!e.id||ids.has(e.id)||!e.title||!e.category||!/^https:\/\//.test(e.source_url)||![e.start_date,e.end_date].every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d)||e.end_date<e.start_date||e.start_date>'2026-07-31'||e.end_date<'2025-08-01')throw new Error('Invalid or duplicate calendar entry: '+e.id);ids.add(e.id);}
    month.insertAdjacentHTML('beforeend',months.map(m=>`<option value="${m}">${monthName(m)}</option>`).join(''));
    category.insertAdjacentHTML('beforeend',[...new Set(events.map(e=>e.category))].sort().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join(''));
    document.querySelector('#month-rail').innerHTML='<button type="button" data-month="story">Story date</button><button type="button" data-month="all">Full year</button>'+months.map(m=>`<button type="button" data-month="${m}">${monthName(m).split(' ')[0]} <span>${events.filter(e=>overlaps(e,m)).length}</span></button>`).join('');
    const params=new URLSearchParams(location.search);month.value=[...months,'all','story'].includes(params.get('month'))?params.get('month'):params.has('q')?'all':'story';category.value=[...category.options].some(o=>o.value===params.get('category'))?params.get('category'):'all';search.value=params.get('q')||'';
    month.onchange=category.onchange=render;search.oninput=render;
    story?.subscribe(()=>{month.value='story';render();});
    document.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{month.value=b.dataset.month;render();});
    document.querySelector('#events-download').onclick=()=>exportEvents(visible);
    if(source==='fallback')document.querySelector('.calendar-note').insertAdjacentHTML('afterbegin','<p>The latest CSV could not be reached; showing the bundled research edition.</p>');
    render();
  }).catch(error=>{content.textContent='The calendar could not be loaded: '+error.message;document.querySelector('#events-download').disabled=true;});
})();
