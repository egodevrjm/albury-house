(() => {
 const target=document.querySelector('#welcome-events');if(!target)return;
 const esc=AlburyCSV.esc;
 const label=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const requested=new URLSearchParams(location.search).get('date');const date=valid(requested)?requested:'2025-08-11';
 AlburyCSV.load('site/data/london-events.csv',window.ALBURY_EVENTS_CSV).then(({text,source})=>{
 const rows=AlburyCSV.parse(text);
 if(rows.some(e=>!e.title||!valid(e.start_date)||!valid(e.end_date)||e.end_date<e.start_date))throw Error('Invalid event data.');
 const ongoing=rows.filter(e=>e.start_date<=date&&e.end_date>=date).sort((a,b)=>a.end_date.localeCompare(b.end_date)||a.title.localeCompare(b.title)).slice(0,1);
 const upcoming=rows.filter(e=>e.start_date>date).sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.title.localeCompare(b.title)).slice(0,3-ongoing.length);
 const events=[...ongoing,...upcoming];
 const content=events.length?'<div class="welcome-event-list">'+events.map(e=>`<article class="welcome-event"><span class="event-kicker">${esc(e.category)}${e.start_date<date?' · Under way':''}</span><h3>${esc(e.title)}</h3><time datetime="${e.start_date}">${label(e.start_date)}${e.start_date!==e.end_date?'–'+label(e.end_date):''}</time><p>${esc(e.location)}</p><p>${esc(e.description)}</p><a href="ALBURY_LONDON_CALENDAR.html?month=${e.start_date.slice(0,7)}&amp;q=${encodeURIComponent(e.title)}">Details &amp; dates →</a></article>`).join('')+'</div>':'<p>No upcoming events remain in this calendar. <a href="ALBURY_LONDON_CALENDAR.html">Browse the full year →</a></p>';
 target.innerHTML=`<h2>In &amp; around London</h2><p>Coming up from ${label(date)} ${date.slice(0,4)}. <a href="ALBURY_LONDON_CALENDAR.html">View the full calendar →</a></p>${content}<p class="events-footnote">Local events, not household bookings. Dates come from the retrospective August 2025–July 2026 guide; details may have been announced after story opening.${source==='fallback'?' Showing the saved calendar while its CSV is unavailable.':''}</p>`;
 }).catch(()=>{target.innerHTML='<h2>In &amp; around London</h2><p><a href="ALBURY_LONDON_CALENDAR.html">Open the London calendar →</a></p>';});
})();
