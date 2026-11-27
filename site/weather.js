/* Authored daily London weather. The supplied CSV owns every weather value. */
(() => {
  const {esc,parse,load}=AlburyCSV;
  const opening='2025-08-11', dayMS=86400000;
  const widget=document.querySelector('#welcome-weather'), content=document.querySelector('#weather-content');
  const dateLabel=(date,short=false)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:short?'short':'long',day:'numeric',month:short?'short':'long',...(short?{}:{year:'numeric'}),timeZone:'UTC'});
  const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  function validate(text){
    const rows=parse(text),seen=new Set(),numbers=['High_C','Low_C','High_F','Low_F','Precip_mm','Precip_Chance_pct','Wind_mph'];
    if(!rows.length)throw Error('The weather CSV is empty.');
    for(const r of rows){
      if(!validDate(r.Date)||seen.has(r.Date))throw Error('Weather dates must be valid and unique.');
      seen.add(r.Date);
      if(!r.Condition?.trim() || r.Day!==new Date(r.Date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'}))throw Error('Check weather conditions and weekdays.');
      if(!numbers.every(k=>r[k]!=null&&r[k].trim()!==''&&Number.isFinite(Number(r[k])))||+r.High_C<+r.Low_C||+r.High_F<+r.Low_F||+r.Precip_mm<0||+r.Wind_mph<0||+r.Precip_Chance_pct<0||+r.Precip_Chance_pct>100)throw Error('Check temperatures, precipitation and wind values.');
      if(['High','Low'].some(k=>Math.abs(+r[k+'_C']*1.8+32-r[k+'_F'])>.11))throw Error('Celsius and Fahrenheit temperatures must agree.');
    }
    rows.sort((a,b)=>a.Date.localeCompare(b.Date));
    if(!seen.has(opening))throw Error('Include the story opening date, 11 August 2025.');
    for(let i=1;i<rows.length;i++)if(Date.parse(rows[i].Date)-Date.parse(rows[i-1].Date)!==dayMS)throw Error('Weather dates must be consecutive.');
    return rows;
  }
  function icon(condition){
    const c=condition.toLowerCase();
    const sun='<circle cx="22" cy="22" r="9"/><path d="M22 4v5m0 26v5M4 22h5m26 0h5M9 9l4 4m18 18 4 4M9 35l4-4m18-18 4-4"/>';
    const cloud='<path d="M17 40h30a10 10 0 0 0 0-20 14 14 0 0 0-27-2 11 11 0 0 0-3 22Z" fill="#f4f0e7"/>';
    const rain='<path d="m22 47-3 7m14-7-3 7m14-7-3 7"/>';
    const frost='<path d="M32 13v38M16 22l32 20M16 42l32-20M26 17l6 6 6-6M26 47l6-6 6 6"/>';
    let drawing;
    if(/thunder/.test(c))drawing=cloud+'<path d="m34 35-8 12h9l-6 13"/>';
    else if(/sleet/.test(c))drawing=cloud+rain+'<path d="M48 47v10m-5-5h10"/>';
    else if(/fog|mist/.test(c))drawing=cloud+'<path d="M10 47h42M16 54h32"/>';
    else if(/shower/.test(c))drawing=sun+cloud+rain;
    else if(/rain|drizzle/.test(c))drawing=cloud+rain;
    else if(/partly|spells|intervals/.test(c))drawing=sun+cloud;
    else if(/overcast|cloud|grey/.test(c))drawing=cloud;
    else if(/sun|bright|clear|heatwave/.test(c))drawing=sun;
    else if(/frost/.test(c))drawing=frost;
    else drawing=cloud;
    return `<svg class="weather-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawing}</svg>`;
  }
  const url=d=>'ALBURY_WEATHER.html?date='+encodeURIComponent(d);
  function forecast(rows){return '<div class="weather-days">'+rows.map(r=>`<a class="weather-forecast" href="${url(r.Date)}"><time datetime="${r.Date}">${dateLabel(r.Date,true)}</time>${icon(r.Condition)}<strong>${esc(r.High_C)}° <span class="forecast-low">/ ${esc(r.Low_C)}°C</span></strong><small>${esc(r.Condition)}</small><small>${esc(r.Precip_mm)} mm · ${esc(r.Precip_Chance_pct)}% precipitation</small></a>`).join('')+'</div>';}
  load('site/data/weather.csv?schema=2',window.ALBURY_WEATHER_CSV).then(({text,source})=>{
    const rows=validate(text),input=document.querySelector('#weather-date'),status=document.querySelector('#weather-status');
    const requested=new URLSearchParams(location.search).get('date');
    let date=rows.some(r=>r.Date===requested)?requested:opening;
    const invalid=requested&&!rows.some(r=>r.Date===requested);
    function render(){
      const index=rows.findIndex(r=>r.Date===date),r=rows[index];
      if(widget){
        widget.innerHTML=`<div><h2>London, ${dateLabel(date,true)}</h2><div class="weather-reading">${icon(r.Condition)}<span class="weather-temperature">${esc(r.High_C)}°</span><div>${esc(r.Condition)}<br><small>High ${esc(r.High_C)}° · Low ${esc(r.Low_C)}°C</small></div></div><p>${esc(r.Precip_mm)} mm precipitation · ${esc(r.Precip_Chance_pct)}% chance · Wind ${esc(r.Wind_mph)} mph</p><small>Story weather · fictional daily outlook${invalid?' · showing 11 August; requested date unavailable':''}${source==='fallback'?' · saved forecast':''}</small><br><a class="weather-more" href="${url(date)}">Full forecast &amp; choose a date →</a></div>${forecast(rows.slice(index+1,index+4))}`;
        return;
      }
      input.value=date;input.min=rows[0].Date;input.max=rows.at(-1).Date;
      document.querySelector('#weather-previous').disabled=index===0;
      document.querySelector('#weather-next').disabled=index===rows.length-1;
      content.innerHTML=`<section class="weather-day"><div><h2>${dateLabel(date)}</h2><div class="weather-reading">${icon(r.Condition)}<span class="weather-temperature">${esc(r.High_C)}°C</span></div><p class="weather-condition">${esc(r.Condition)} · daytime high</p><p class="weather-fahrenheit">High ${esc(r.High_F)}°F · Low ${esc(r.Low_F)}°F</p><dl class="weather-metrics"><div><dt>Daily low</dt><dd>${esc(r.Low_C)}°C</dd></div><div><dt>Precipitation</dt><dd>${esc(r.Precip_mm)} mm</dd></div><div><dt>Wind</dt><dd>${esc(r.Wind_mph)} mph</dd></div></dl></div><aside class="weather-note"><h3>Precipitation outlook</h3><p><strong class="weather-chance">${esc(r.Precip_Chance_pct)}%</strong> chance of precipitation</p><p>${esc(r.Precip_mm)} mm total for the day.</p></aside></section><section class="weather-outlook"><h2>${Math.min(7,rows.length-index)}-day outlook</h2>${forecast(rows.slice(index,index+7))}${rows.length-index<7?'<p class="muted">The weather file ends on '+dateLabel(rows.at(-1).Date)+'.</p>':''}</section>`;
      document.title=dateLabel(date,true)+' · Weather — Albury';
    }
    function setDate(value){
      if(!rows.some(r=>r.Date===value)){status.textContent='Choose a date between '+dateLabel(rows[0].Date)+' and '+dateLabel(rows.at(-1).Date)+'.';input.value=date;return;}
      date=value;const u=new URL(location.href);u.searchParams.set('date',date);history.replaceState(null,'',u);
      status.textContent=source==='fallback'?'The latest CSV could not be reached; showing the saved weather.':'';render();
    }
    if(content){
      input.addEventListener('change',e=>setDate(e.target.value));
      for(const [id,n] of [['previous',-1],['next',1]])document.querySelector('#weather-'+id).onclick=()=>{const row=rows[rows.findIndex(r=>r.Date===date)+n];if(row)setDate(row.Date);};
      document.querySelector('#weather-reset').onclick=()=>setDate(opening);
      status.textContent=invalid?'That date is outside the weather file; showing the story opening.':source==='fallback'?'The latest CSV could not be reached; showing the saved weather.':'';
    }
    render();
  }).catch(error=>{const target=content||widget;target.innerHTML='<p>Weather could not be loaded: '+esc(error.message)+'</p><p><a href="site/data/weather.csv">View the weather CSV</a></p>';});
})();
