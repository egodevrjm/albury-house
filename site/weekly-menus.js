(() => {
  const esc=AlburyCSV.esc;
  function render(){
    const controls=document.querySelector('#weekly-controls');
    controls.innerHTML=AlburyMenus.controls()+AlburyMenus.editor();
    document.querySelectorAll('section.day').forEach(el=>el.remove());
    const week=AlburyMenus.week();
    const {day}=AlburyMenus.position();
    const start=new Date(Date.parse(AlburyMenus.date+'T00:00:00Z')-day*86400000);
    const html=week.map(([name,theme,meals],i)=>{
      const date=new Date(start.getTime()+i*86400000).toISOString().slice(0,10);
      return `<section class="day" id="${name.toLowerCase()}" aria-labelledby="title-${i+1}"><div class="day-title"><span class="number">${String(i+1).padStart(2,'0')}</span><div><h2 id="title-${i+1}">${name} · ${AlburyMenus.label(date)}</h2><p>${esc(theme)}</p></div></div><div class="meals">${meals.map(([meal,courses])=>`<article class="meal"><h3>${meal}</h3><dl>${courses.map(([label,dish])=>`<div class="${label==='Vegetarian plate'?'alternative':''}"><dt>${esc(label)}</dt><dd>${esc(dish)}</dd></div>`).join('')}</dl></article>`).join('')}</div></section>`;
    }).join('');
    document.querySelector('aside.service').insertAdjacentHTML('afterend',html);
    AlburyMenus.bind(render);
  }
  AlburyMenus.ready.then(()=>{
    render();if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }).catch(error=>{document.querySelector('#weekly-controls').textContent='The rotation could not be loaded. Showing the original week below. '+error.message;});
})();
