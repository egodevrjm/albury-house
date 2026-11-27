window.AlburyMenus = (() => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const courses = [["with_drinks","With drinks"],["starter","To start"],["bowl","The bowl"],["main","The plate"],
    ["alongside","Alongside"],["dessert","Pudding"],["bread_preserves","Bread and preserves"],["vegetarian","Vegetarian option"]];
  const esc = AlburyCSV.esc;
  const specials = window.ALBURY_CONTENT["special-menus"].menus;
  const dayMS = 86_400_000;
  const opening = "2025-08-11";
  const epoch = Date.parse(opening + "T00:00:00Z");
  let data;
  let byDate;
  const api = { date: opening, specialId: "", specials, days };

  const stamp = value => Date.parse(value + "T00:00:00Z");
  const dateKey = ms => new Date(ms).toISOString().slice(0, 10);
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(stamp(value)) && dateKey(stamp(value)) === value;
  api.setDate = value => {
    if (!validDate(value)) return false;
    api.date = value;
    return true;
  };
  const nextDate = (offset, date = api.date) => dateKey(stamp(date) + offset * dayMS);
  api.canShift = offset => {
    const next = nextDate(offset);
    return offset < 0 ? api.date > data.coverage.start && next <= data.coverage.end
      : api.date < data.coverage.end && next >= data.coverage.start;
  };
  api.shift = offset => {
    const next = nextDate(offset);
    api.date = next < data.coverage.start ? data.coverage.start : next > data.coverage.end ? data.coverage.end : next;
  };
  api.dateLimits = () => `min="${data.coverage.start}" max="${data.coverage.end}"`;
  api.label = (date = api.date) => new Date(date + "T12:00:00Z").toLocaleDateString("en-GB",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  api.position = (date = api.date) => {
    const offset = (stamp(date) - epoch) / dayMS;
    return { day: (offset % 7 + 7) % 7, season: byDate.get(date)?.season };
  };
  const imageChoice = choice => {
    const dish = data.dishes[choice.dishId];
    return choice.omitPhoto ? choice : { ...choice, image: dish.path, imageAlt: dish.imageAlt, photoSeason: dish.photoSeason };
  };
  const veganChoice = choice => ({ ...imageChoice(choice), ...(choice.standby ? { standby: imageChoice(choice.standby) } : {}) });

  api.forDate = (date = api.date, specialId = "") => {
    const position = api.position(date);
    const day = byDate.get(date);
    const special = specials.find(item => item.id === specialId);
    const rows = [];
    if (day) {
      rows.push({ meal: "Breakfast", main: data.breakfast });
      for (const [meal, choice] of [["Lunch", day.lunch], ["Dinner", day.dinner]]) {
        const pudding = day.pudding?.meal === meal ? imageChoice(day.pudding) : null;
        rows.push({ meal, main: choice.description, ...imageChoice(choice), ...(pudding ? { dessert: pudding.description, pudding } : {}) });
      }
    }
    if (special) {
      const row = { meal: special.meal, ...special.menu };
      const index = rows.findIndex(item => item.meal === row.meal);
      if (index === -1) rows.push(row); else rows[index] = row;
    }
    return { ...position, date, theme: special?.name ?? day?.season ?? "", rows, covered: !!day,
      lead: day?.lead, snackOptions: day?.snacks.map(imageChoice) ?? [], guestService: day?.guestService,
      veganLunch: day && special?.meal !== "Lunch" ? veganChoice(day.veganLunch) : null,
      veganDinner: day && special?.meal !== "Dinner" ? veganChoice(day.veganDinner) : null };
  };
  api.dishesFor = daily => daily.rows.map(row => [row.meal, courses.filter(([key]) => row[key]).map(([key,label]) => [label,row[key]]), row]);
  api.week = (date = api.date) => {
    const start = stamp(date) - api.position(date).day * dayMS;
    return days.map((day, i) => {
      const value = dateKey(start + i * dayMS);
      const daily = api.forDate(value, value === date ? api.specialId : "");
      return [day, daily.theme, api.dishesFor(daily), daily];
    });
  };

  api.coverageNote = () => `Menus are available from ${api.label(data.coverage.start)} to ${api.label(data.coverage.end)}.`;
  api.photo = (choice, label, showSeason = true) => choice?.image ? `<figure class="dated-menu-photo"><a class="meal-photo" href="${esc(choice.image)}" aria-label="View ${esc(label)} photograph"><img src="${esc(choice.image)}" alt="${esc(choice.imageAlt)}" width="512" height="512" loading="lazy"></a>${showSeason ? `<figcaption>Late-summer plating</figcaption>` : ""}</figure>` : "";
  const option = (value, label) => value ? `<article class="dated-option">${api.photo(value, label, false)}
    <div><h4>${esc(label)}</h4><p>${esc(value.description)}</p>${value.advanceNotice ? `<p class="muted">With notice</p><p><strong>On hand</strong> · ${esc(value.standby.description)}</p>` : ""}</div></article>` : "";
  api.snacks = daily => `<div class="dated-options">${daily.snackOptions.map((choice,i) => option(choice, i === 0 ? "Savoury" : "Sweet")).join("")}</div>`;
  api.extras = daily => !daily.covered ? "" : `<div class="dated-menu-extras">
    <details><summary>Vegan options</summary><div class="dated-options">${option(daily.veganLunch,"Lunch")}${option(daily.veganDinner,"Dinner")}</div></details>
    <details><summary>Between meals</summary>${api.snacks(daily)}</details>
    ${daily.guestService ? `<details><summary>If people are over</summary><p>${esc(daily.guestService)}</p></details>` : ""}</div>`;
  api.specialPicker = () => `<label>Occasion menu<select id="special-menu-select"><option value="">House menu for this date</option>${specials.map(item => `<option value="${esc(item.id)}" ${api.specialId === item.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>`;
  api.controls = () => `<div class="rotation-controls">
    <label>Menu date <input id="menu-date" type="date" value="${api.date}" ${api.dateLimits()} required></label>
    <button type="button" data-menu-shift="-7" ${api.canShift(-7) ? "" : "disabled"}>← Previous week</button>
    <button type="button" data-menu-shift="7" ${api.canShift(7) ? "" : "disabled"}>Next week →</button>
    <button type="button" id="menu-reset">Opening week</button>${api.specialPicker()}</div>
    <p class="muted">${api.coverageNote()}</p>${api.specialId ? `<p class="muted">${esc(specials.find(item => item.id === api.specialId).notes)}</p>` : ""}`;
  api.specialCatalogue = () => `<h2>Occasion menus</h2><p>Choose one above for the selected date. The team confirms any arrangements.</p>${specials.map(item => `<details class="special-menu"><summary>${esc(item.name)} · ${esc(item.meal)}</summary><p>${esc(item.notes)}</p><dl>${courses.filter(([key]) => item.menu[key]).map(([key,label]) => `<div><dt>${esc(label)}</dt><dd>${esc(item.menu[key])}</dd></div>`).join("")}</dl></details>`).join("")}`;
  api.repertoire = () => {
    const groups = {};
    for (const dish of Object.values(data.dishes)) (groups[dish.category] ??= []).push(dish);
    return `<section><h2>House dishes</h2><p class="intro">Photographs show the late-summer plating. Open a dish for the autumn and winter versions.</p>
      <nav class="dish-category-links" aria-label="Dish categories">${Object.keys(groups).map(group => `<a href="#repertoire" data-dish-group="${esc(group)}">${esc(group)}</a>`).join("")}</nav>
      ${Object.entries(groups).map(([group, dishes]) => `<section class="dish-repertoire-section" data-dish-section="${esc(group)}">
        <h3>${esc(group)}</h3><div class="dish-repertoire-grid">${dishes.map(dish => `<article class="panel dish-card">
          ${api.photo({image: dish.path, imageAlt: dish.imageAlt}, dish.name, false)}
          <h4>${esc(dish.name)}</h4><p>${esc(dish.versions["Late summer"])}</p>
          <details><summary>Seasonal versions</summary><dl><dt>Autumn</dt><dd>${esc(dish.versions.Autumn)}</dd><dt>Winter</dt><dd>${esc(dish.versions.Winter)}</dd></dl><p>${esc(dish.notes)}</p></details></article>`).join("")}</div></section>`).join("")}</section>`;
  };
  api.bind = render => {
    const update = () => {
      const url = new URL(location.href);
      url.searchParams.set("date", api.date);
      if (api.specialId) url.searchParams.set("special_menu_id", api.specialId); else url.searchParams.delete("special_menu_id");
      history.replaceState(null, "", url);
      render();
    };
    document.querySelector("#menu-date")?.addEventListener("change", event => { if (api.setDate(event.target.value)) update(); });
    document.querySelector("#special-menu-select")?.addEventListener("change", event => { api.specialId = event.target.value; update(); });
    document.querySelectorAll("[data-menu-shift]").forEach(button => { button.onclick = () => { api.shift(Number(button.dataset.menuShift)); update(); }; });
    document.querySelector("#menu-reset")?.addEventListener("click", () => { api.date = opening; api.specialId = ""; update(); });
    document.querySelectorAll("[data-dish-group]").forEach(link => { link.onclick = event => {
      event.preventDefault();
      [...document.querySelectorAll("[data-dish-section]")].find(section => section.dataset.dishSection === link.dataset.dishGroup)?.scrollIntoView();
    }; });
  };
  const params = new URLSearchParams(location.search);
  api.setDate(params.get("date"));
  if (specials.some(item => item.id === params.get("special_menu_id"))) api.specialId = params.get("special_menu_id");
  api.ready = fetch("site/data/public/dining-calendar.json?v=1").then(response => {
    if (!response.ok) throw Error("The menu calendar is unavailable.");
    return response.json();
  }).then(value => { data = value; byDate = new Map(data.days.map(day => [day.date, day])); });
  return api;
})();
