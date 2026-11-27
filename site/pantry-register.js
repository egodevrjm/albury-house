(async () => {
  'use strict';
  const escape = AlburyCSV.esc;
  const target = document.querySelector('#pantry-register');
  let catalogue = window.ALBURY_FOOD_CATALOGUE;
  try {
    const response = await fetch('/api/room-catalogue?food=1', { signal: AbortSignal.timeout(4500) });
    if (response.ok) catalogue = (await response.json()).food ?? catalogue;
  } catch {
    // Use the bundled register while the live editor store is unavailable.
  }
  if (!catalogue) return;

  const groups = catalogue.collections.find(collection => collection.id === 'produce').rooms;
  const products = new Map(catalogue.pantry.map(item => [item.id, item]));
  const sections = new Map();
  for (const card of groups) {
    if (card.foodSection === 'Group photographs') continue;
    if (!sections.has(card.foodSection)) sections.set(card.foodSection, []);
    sections.get(card.foodSection).push(card);
  }

  const portrait = card => {
    const item = products.get(card.productLinks[0].id);
    const photo = item.image ? `<a href="${escape(item.image)}" target="_blank" rel="noopener" aria-label="View ${escape(item.name)} photograph"><img src="${escape(item.image)}" alt="${escape(item.name)}" width="1254" height="1254" loading="lazy"></a>` : '';
    return `<figure class="pantry-item" id="${escape(item.id)}">
      ${photo}<figcaption><span class="pantry-item-code">${escape(card.foodLabel)}</span><h3>${escape(item.name)}</h3>
      ${card.description ? `<p>${escape(card.description)}</p>` : ''}
      <a href="ALBURY_HOUSE_COLLECTIONS.html#produce/${escape(card.viewSlug)}">View in the collection</a>
      </figcaption></figure>`;
  };

  const sectionId = index => 'pantry-category-' + (index + 1);
  const entries = [...sections];
  target.innerHTML = `<nav class="pantry-category-links" aria-label="Pantry categories">
    ${entries.map(([name], index) => `<a href="#${sectionId(index)}">${escape(name)}</a>`).join('')}
    </nav>${entries.map(([name, cards], index) => `<section id="${sectionId(index)}" class="pantry-category">
    <h2>${escape(name)}</h2><div class="pantry-portrait-grid">${cards.map(portrait).join('')}</div>
    </section>`).join('')}`;
  const anchor = location.hash.slice(1);
  if (anchor === 'opening-items' || anchor === 'seasonal-recipes') {
    const item = catalogue.pantry.find(product => anchor === 'seasonal-recipes' ? product.season : /^P\d+$/.test(product.id));
    if (item) document.getElementById(item.id)?.scrollIntoView();
  } else if (anchor) {
    document.getElementById(anchor)?.scrollIntoView();
  }
})();
