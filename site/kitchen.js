(()=>{'use strict';const content=document.querySelector('#kitchen-content');const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const culinary=window.ALBURY_CONTENT?.culinary,staff=window.ALBURY_CONTENT?.staff;if(!culinary||!staff)throw new Error('Albury content is unavailable. Run site/build_content.py.');const peopleById=Object.fromEntries(staff.people.map(person=>[person.id,person]));const rows=items=>'<div class="menu-list">'+items.map(([title,body])=>`<article class="menu-row"><h3>${title}</h3><p>${body}</p></article>`).join('')+'</div>';const mealCards=meals=>'<div class="three">'+meals.map(([title,dishes,row])=>`<article class="panel meal"><h3>${esc(title)}</h3>${AlburyMenus.photo(row,title.toLowerCase())}<dl>${dishes.map(([label,dish])=>`<dt>${esc(label)}</dt><dd>${esc(dish)}</dd>`).join('')}</dl>${AlburyMenus.photo(row.pudding,"pudding",false)}</article>`).join('')+'</div>';
const imageLink=(href,image,alt,title,copy,tone='green')=>`<a class="house-feature ${tone}" href="${href}"><img src="${esc(image)}" alt="${esc(alt)}" loading="lazy" width="1536" height="1024"><div><h3>${title} <span aria-hidden="true">→</span></h3><p>${copy}</p></div></a>`;
const related=()=>`<section class="dining-related"><p class="house-eyebrow">Make yourself at home</p><h2>Something else in mind?</h2><div class="house-feature-grid">${imageLink('#available',culinary.media['warm-toastie'].image,'Mushroom and Comté toastie','Between meals','A warm plate, a sweet bite or something for later.','ochre')}${imageLink('#drinks',culinary.cordialServes[0].alcoholFreeImage,'Ginger and lemongrass house serve','From the bar','House cordials, cocktails and a well-chosen glass.','green')}${imageLink('#hospitality','images/albury-house-items/travel/43-arrival-welcome-hamper-full-colour.webp','Albury overnight welcome basket','Guests & gifts','A thoughtful welcome, or something for the journey.','blue')}</div></section>`;
const dayControls = () => `<div class="table-date-controls">
        <button type="button" data-menu-shift="-1" aria-label="Previous day" ${AlburyMenus.canShift(-1)?'':'disabled'}>←</button>
        <label>Choose a date <input type="date" id="menu-date" value="${AlburyMenus.date}" ${AlburyMenus.dateLimits()} required></label>
        <button type="button" data-menu-shift="1" aria-label="Next day" ${AlburyMenus.canShift(1)?'':'disabled'}>→</button>
      </div>`;

function today(){
  const dated=AlburyMenus.forDate(AlburyMenus.date,AlburyMenus.specialId);
  const date=AlburyMenus.date;
  const weekday=AlburyMenus.days[dated.day];
  const special=AlburyMenus.specials.find(item=>item.id===AlburyMenus.specialId);
  return `<section aria-labelledby="today-title">
    <div class="table-date-heading">
      <div><h2 id="today-title">${weekday} at the table</h2>
      <p>${AlburyMenus.label()}${dated.lead?' · '+esc(dated.lead)+' leads the kitchen':''}</p></div>
      ${dayControls()}
    </div>
    <div class="table-options">
      <a href="ALBURY_WEEKLY_MENUS.html?date=${date}${special?'&amp;special_menu_id='+encodeURIComponent(special.id):''}">See the whole week →</a>
      <details class="occasion-picker" ${special?'open':''}><summary>Choose an occasion menu</summary>
      ${AlburyMenus.specialPicker()}${special?`<p>${esc(special.notes)}</p>`:''}</details>
      <button type="button" id="menu-reset">Return to opening day</button>
    </div>
    <div class="day-menu">${dated.rows.length?mealCards(AlburyMenus.dishesFor(dated)):`<p>${AlburyMenus.coverageNote()}</p>`}</div>
    ${AlburyMenus.extras(dated)}
    <p><a href="#repertoire">Browse all 96 house dishes →</a></p>
    ${related()}
  </section>`;
}

function betweenMeals() {
  const dated = AlburyMenus.forDate();
  return `<section aria-labelledby="between-meals-title">
    <div class="table-date-heading">
      <div><h2 id="between-meals-title">Between meals</h2><p>${esc(AlburyMenus.label())}${dated.lead ? ' · ' + esc(dated.lead) + ' leads the kitchen' : ''}</p></div>
      ${dayControls()}
    </div>
    <section class="today-snacks" aria-labelledby="today-snacks-title">
      <h3 id="today-snacks-title">Snacks for the day</h3>
      ${dated.covered ? AlburyMenus.snacks(dated) : `<p>${AlburyMenus.coverageNote()}</p>`}
    </section>
    <section aria-labelledby="usual-choices-title" class="standing-food">
      <h3 id="usual-choices-title">What the kitchen can put together</h3>
      <p class="intro">Tell the team roughly when you want to eat and how many people are hungry. These are the usual choices when ingredients and the rota allow.</p>
      ${AlburyMedia.available()}
    </section>
    ${AlburyMedia.signatureBakes()}
    <p><a href="ALBURY_HOUSE_COLLECTIONS.html#baking">Explore Bethan’s baking →</a> · <a href="#service">Prepare a note for the team →</a></p>
  </section>`;
}

function foodOverview(){
  return `<section aria-label="Food and Drink overview">
    <div class="house-feature-grid food-destinations">
      ${imageLink('#menus',culinary.media['hake-dinner'].image,'Hake with brown butter, capers and summer vegetables','Menus','Open the menu for the story date, see the week or browse the house dishes.','green')}
      ${imageLink('#available',culinary.media['warm-toastie'].image,'Mushroom and Comté toastie','Between Meals','The day’s snacks, studio breaks and a late supper.','ochre')}
      ${imageLink('#drinks',culinary.cordialServes[0].alcoholFreeImage,'Ginger and lemongrass house serve','Drinks & Bar','House cordials, cocktails, alcohol-free drinks and Club Alex.','oxblood')}
      ${imageLink('#pantry','images/albury-produce/opening-range/01-breakfast-preserves.webp','Three Albury house preserves','Pantry & Bethan’s Baking','The house’s labelled preparations, bread, pastries and biscuits.','blue')}
    </div>
    <p class="food-reference-links"><a href="ALBURY_GIFTS.html#hampers">Gifts from Albury →</a><a href="#team">Kitchen and front-of-house team →</a><a href="ALBURY_KITCHEN_LIBRARY.html">Kitchen Library →</a></p>
  </section>`;
}

function menuDestinations(){
  return `<section><h2>Menus</h2>
    <div class="house-feature-grid food-destinations">
      ${imageLink('#today',culinary.media['hake-dinner'].image,'Hake with brown butter and capers','Menu for the story date','Breakfast, lunch, dinner and the day’s snacks.','green')}
      ${imageLink('ALBURY_WEEKLY_MENUS.html?date='+AlburyMenus.date,culinary.media['breakfast-eggs'].image,'Scrambled eggs and sourdough','Weekly menus','See the whole week, including vegan options and notes for guests.','ochre')}
      ${imageLink('ALBURY_WEEKLY_MENUS.html#special-menus',culinary.media['chicken-tarragon'].image,'Chicken and tarragon from the house repertoire','Occasion menus','Christmas, celebrations and garden parties.','oxblood')}
      ${imageLink('#repertoire','images/albury-culinary/dated-menus/d01.webp','Hake with mussel and cider sauce','House dishes','Browse the photographed dishes and their seasonal versions.','blue')}
    </div>
  </section>`;
}

function pantryDestinations(){
  return `<section><h2>Pantry &amp; Bethan’s Baking</h2>
    <div class="house-feature-grid food-destinations">
      ${imageLink('ALBURY_PANTRY_ITEMS.html','images/albury-produce/individual/p01.webp','Seville bitter-orange marmalade jar','Pantry register','Browse individual products by category.','green')}
      ${imageLink('ALBURY_HOUSE_COLLECTIONS.html#produce/group-photographs','images/albury-produce/opening-range/01-breakfast-preserves.webp','Three Albury house preserves','Group photographs','See the labelled jars and bottles together.','ochre')}
      ${imageLink('ALBURY_HOUSE_COLLECTIONS.html#baking',culinary.media['bethan-afternoon-baking'].image,'Bethan’s afternoon baking','Bethan’s Baking','Bread, morning pastries, savoury bakes, biscuits and cakes.','oxblood')}
    </div>
  </section>`;
}

const sections={
food:foodOverview,
repertoire:()=>AlburyMenus.repertoire(),
menus:menuDestinations,
pantry:pantryDestinations,
available:betweenMeals,
drinks:()=>AlburyDrinks.render()+'<p class="food-reference-links"><a href="ALBURY_HOUSE_TOUR.html#/upper-basement/bar-games-room">See the Club Alex bar in the house tour →</a></p>',
hospitality:()=>`<section><h2>Guests &amp; hospitality</h2><p class="intro">Crispin coordinates what is ready for the guest; Rafael and Bethan provide the food. Staying overnight, joining dinner or leaving with something for home each calls for different provision.</p><div class="two hospitality-options"><article class="panel"><img class="hospitality-image" src="images/albury-house-items/travel/43-arrival-welcome-hamper-full-colour.webp" alt="Arrival welcome basket with water, treats and personal stationery" width="1536" height="1024" loading="lazy"><h3>Staying at Albury</h3><p>Still and sparkling Limestone Springs water, shortbread, chocolate sablés, a savoury snack and fruit, with personal stationery. The room also has its robe, slippers, socks and bathroom provision.</p><a href="ALBURY_KITCHEN_LIBRARY.html#guest-hospitality">See the complete welcome →</a></article><article class="panel"><img class="hospitality-image" src="images/albury-culinary/chicken-tarragon.webp" alt="Chicken and tarragon salad from the house repertoire" width="1536" height="1024" loading="lazy"><h3>Joining a meal</h3><p>Let the team know the number of guests, when they are coming, where you would like to eat and any dietary needs. Crispin coordinates service; Rafael confirms the menu.</p><a href="#service">Prepare the service brief →</a></article></div><p><a href="ALBURY_GIFTS.html">Gifts sent from Albury — hampers, biscuits, breakfast &amp; cordials →</a></p><h3 style="margin-top:38px" id="summer-party-gift-pack">The summer-party gift pack</h3><a href="images/albury-house-items/travel/47-summer-party-guest-gift-pack.webp"><img class="photo gift" src="images/albury-house-items/travel/47-summer-party-guest-gift-pack.webp" alt="Bottle-green Albury bag and its six selected guest gifts" width="1536" height="1024"></a><p class="intro">A travel cup, complete stationery folio, boxed house candle, playing cards, butter shortbread and bourbon–black cherry confiture with Hatfield Original. Gold house mark, black ribbon handles, ivory tissue and a personal note.</p><p>One pack per guest for the 25-person summer party. Everything in this pack is a gift; this selection is specific to that occasion.</p><div class="two"><article class="panel"><h3>What guests keep</h3><p>Issued slippers, socks, personal stationery and travel provision are theirs. Fresh house objects and food may also be selected as gifts.</p></article><article class="panel"><h3>What stays with the room</h3><p>The reusable welcome basket, working towels and room robe stay at Albury unless a fresh example has been expressly gifted.</p></article></div><p><a href="ALBURY_KITCHEN_LIBRARY.html#guest-hospitality">All hampers &amp; house gifts →</a></p></section>`,
team:()=>`<section><h2>The people behind the service</h2><p class="intro">Rafael leads food and the kitchen; Crispin leads dining, drinks and front of house. They coordinate with Ottilie, Kit and Louise for household plans and events. Crispin specified the Albury cordials, which the kitchen makes to his specifications.</p><div class="team-grid">${[['07-rafael-bellocq','Rafael Bellocq','Private Chef','Menus, cooking, suppliers and the culinary programme.'],['09-crispin-vale','Crispin Vale','Butler / Front-of-House Steward','Dining, drinks, guest-facing service and hospitality.'],['38-bethan-pritchard','Bethan Pritchard','Pastry & Pantry Chef','Bread, desserts, baking and preserves under Rafael.']].map(([img,name,role,desc])=>`<article class="person"><img src="images/albury/staff/${img}.webp" alt="${name}" loading="lazy"><h3>${name}</h3><p>${role}</p><p>${desc}</p></article>`).join('')}</div><div class="scroll-table"><table class="roster"><thead><tr><th scope="col">Name</th><th scope="col">Role</th></tr></thead><tbody>${[['Élodie Martin','Sous Chef'],['Tolly Venn','Chef de Partie / Second Cook'],['Dean Wilkes','Kitchen Porter / Steward'],['Gareth Palmer','Kitchen & Service Steward'],['Lewis Donnelly','Kitchen & Service Steward'],['Harjit Sethi','Deputy Butler'],['Callum Reed','House Attendant'],['Nia Bennett','House Attendant']].map(([n,r])=>`<tr><td>${n}</td><td>${r}</td></tr>`).join('')}</tbody></table></div><p><a href="ALBURY_HOUSE_GUIDE.html#staff">Full household directory →</a></p></section>`,
service:()=>`<section><h2>Service notes</h2><p class="intro">For an extra guest, a late supper, a packed lunch or a gathering, give the team the essentials together. Rafael handles the food; Crispin handles its service.</p><div class="two"><article class="panel"><h3>Before service</h3><ul><li>Confirm numbers, timing and location.</li><li>Agree dietary requirements privately with the team.</li><li>Check menu, drinks and table setup together.</li><li>Plan staff meals and later-shift provision.</li></ul></article><article class="panel"><h3>For a larger gathering</h3><p>Louise coordinates the event information, with Ottilie and Kit overseeing household arrangements. Additional catering and service support is brought in where required.</p></article></div><figure class="service-scene"><a href="ALBURY_HOUSE_AT_WORK.html"><img src="images/albury-culinary/pantry-service.webp" alt="A steward polishing glasses at the existing butler’s pantry counter" width="1536" height="1024" loading="lazy"></a><figcaption>Before dinner, in the butler’s pantry. <a href="ALBURY_HOUSE_AT_WORK.html">The house at work →</a></figcaption></figure><h3 style="margin-top:35px">Prepare a brief</h3><p class="muted">This makes a copyable note, not a booking. Nothing is sent or saved. Give the finished note to the team; discuss personal dietary details directly.</p><form class="brief-form" id="service-form"><label>What is needed?<select name="kind"><option>Guests joining a meal</option><option>Late supper</option><option>Packed food for a journey</option><option>Drinks or a gathering</option><option>Guest gifts</option></select></label><div class="two" style="margin-top:0"><label>Number of people<input name="count" type="number" min="1" max="300" required value="2"></label><label>Day &amp; time<input name="when" required placeholder="For example, Friday at 8 pm"></label></div><label>Where?<input name="where" required placeholder="For example, Garden Room"></label><label>Service preferences<textarea name="notes" maxlength="1200" placeholder="Food or drinks preferences, journey timing, or setup needed"></textarea></label><div class="button-row"><button type="submit">Prepare note</button><button type="reset">Clear</button></div></form><div id="brief-result" hidden><pre class="brief-output" id="brief-output"></pre><button type="button" id="copy-brief">Copy note</button><p class="muted" id="copy-status" role="status"></p></div></section>`};
sections.team=()=>{const featured=culinary.featuredTeam.map(id=>peopleById[id]);const roster=culinary.serviceRoster.map(id=>peopleById[id]);return `<section><h2>The people behind the service</h2><p class="intro">Rafael leads food and the kitchen; Crispin leads dining, drinks and front of house. They coordinate with Ottilie, Kit and Louise for household plans and events. Crispin specified the Albury cordials, which the kitchen makes to his specifications.</p><div class="team-grid">${featured.map(person=>`<article class="person"><img src="${esc(person.image)}" alt="${esc(person.imageAlt||person.name)}" loading="lazy"><h3>${esc(person.name)}</h3><p>${esc(person.role)}</p><p>${esc(person.remit)}</p></article>`).join('')}</div><div class="scroll-table"><table class="roster"><thead><tr><th scope="col">Name</th><th scope="col">Role</th></tr></thead><tbody>${roster.map(person=>`<tr><td>${esc(person.name)}</td><td>${esc(person.role)}</td></tr>`).join('')}</tbody></table></div><p><a href="ALBURY_HOUSE_GUIDE.html#staff">Full household directory →</a></p></section>`};
const aliases={'guest-hospitality':'hospitality','summer-party-gift-pack':'hospitality','pantry-gallery':'library','culinary-programme':'library'};function render(){let id=decodeURIComponent(location.hash.slice(1)||'today');if(id.startsWith('menu-')||id.startsWith('programme-')||id.startsWith('hospitality-')||aliases[id]==='library'){location.replace('ALBURY_KITCHEN_LIBRARY.html#'+encodeURIComponent(id));return}id=aliases[id]||id;if(id!=='today'&&!sections[id]){id='today';history.replaceState(null,'','#today')}content.dataset.section=id;content.innerHTML=id==='today'?today():sections[id]();document.querySelectorAll('.kitchen-tabs a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+(['today','repertoire'].includes(id)?'menus':id)?'page':'false'));document.title=(id==='today'?'Today’s menu':{food:'Food & Drink',menus:'Menus',repertoire:'House dishes',pantry:'Pantry & Bethan’s Baking',available:'Between Meals',drinks:'Drinks & Bar',hospitality:'Guest hospitality',team:'The kitchen & service team',service:'Service notes'}[id])+' — Albury';AlburyMenus.bind(render);if(id==='drinks')AlburyDrinks.bind();const form=document.querySelector('#service-form');if(form){form.onsubmit=e=>{e.preventDefault();const d=new FormData(form);document.querySelector('#brief-output').textContent=`ALBURY · KITCHEN & FRONT OF HOUSE\n${d.get('kind')}\nPeople: ${d.get('count')}\nWhen: ${d.get('when')}\nWhere: ${d.get('where')}\n${d.get('notes')||''}\n\nPlease confirm arrangements with the team.`;document.querySelector('#brief-result').hidden=false;document.querySelector('#brief-result').scrollIntoView({block:'nearest'});};form.onreset=()=>{document.querySelector('#brief-result').hidden=true;document.querySelector('#brief-output').textContent='';document.querySelector('#copy-status').textContent=''};document.querySelector('#copy-brief').onclick=async()=>{try{await navigator.clipboard.writeText(document.querySelector('#brief-output').textContent);document.querySelector('#copy-status').textContent='Copied. Pass this note to the team.'}catch{const range=document.createRange();range.selectNodeContents(document.querySelector('#brief-output'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.querySelector('#copy-status').textContent='The note is selected. Use Copy to place it on your clipboard.'}}}if(location.hash==='#summer-party-gift-pack')document.querySelector('#summer-party-gift-pack').scrollIntoView()}
window.addEventListener('hashchange',()=>{render();if(location.hash!=='#summer-party-gift-pack')window.scrollTo(0,0)});AlburyMenus.ready.then(render).catch(error=>{content.textContent='The menu data could not be loaded: '+error.message;});})();
