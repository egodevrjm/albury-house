(() => {
  const esc = AlburyCSV.esc;
  function render() {
    document.querySelector("#weekly-controls").innerHTML = AlburyMenus.controls();
    document.querySelector("#menu-week").innerHTML = AlburyMenus.week().map(([day,theme,meals,daily],i) => `
      <section class="day" id="${day.toLowerCase()}" aria-labelledby="title-${i+1}">
        <div class="day-title"><div><h2 id="title-${i+1}">${day} · ${AlburyMenus.label(daily.date)}</h2>
        <p>${esc(daily.lead ?? theme)}</p></div></div>
        ${meals.length ? `<div class="meals">${meals.map(([meal,courses,row])=>`
          <article class="meal"><h3>${meal}</h3>${AlburyMenus.photo(row,meal.toLowerCase())}
          <dl>${courses.map(([label,dish])=>`<div><dt>${esc(label)}</dt><dd>${esc(dish)}</dd></div>`).join('')}</dl>
          ${AlburyMenus.photo(row.pudding,"pudding",false)}</article>`).join('')}</div>` : `<p>No house menu is published for this date.</p>`}
        ${AlburyMenus.extras(daily)}
      </section>`).join("");
    document.querySelector("#special-menus").innerHTML = AlburyMenus.specialCatalogue();
    AlburyMenus.bind(render);
  }
  AlburyMenus.ready.then(() => {
    render();
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }).catch(error => { document.querySelector("#weekly-controls").textContent = error.message; });
})();
