window.AlburyMedia = (() => {
  'use strict';
  const culinary = window.ALBURY_CONTENT?.culinary;
  if (!culinary) throw new Error('Albury culinary content is unavailable. Run site/build_content.py.');
  const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const record = id => {
    const item = culinary.media[id];
    if (!item) throw new Error(`Unknown Albury culinary media id: ${id}`);
    return item;
  };
  const photo = (id, title, description = '') => {
    const item = record(id);
    const heading = title || item.title;
    const copy = description || item.description;
    return `<figure class="culinary-figure"><a href="${esc(item.image)}"><img src="${esc(item.image)}" alt="${esc(item.imageAlt || heading)}" loading="lazy" width="1536" height="1024"></a><figcaption><strong>${esc(heading)}</strong>${copy ? `<span>${esc(copy)}</span>` : ''}</figcaption></figure>`;
  };
  const gallery = ids => ids.map(id => photo(id)).join('');
  const dishes = () => `<section class="culinary-gallery"><h3>From our summer table</h3><p class="muted">A few plates from the repertoire. The selected day’s menu is listed above.</p><div class="photo-grid">${gallery(culinary.mediaGroups.summerTable)}</div></section>`;
  const baking = () => `<section class="culinary-gallery" id="bethans-baking"><h3>From Bethan’s oven</h3><p class="muted">Bread, morning pastries and cakes from Bethan Pritchard’s repertoire, under Rafael’s culinary direction. Baking follows the household and the day’s service; ask the team what is ready.</p><div class="photo-grid">${gallery(culinary.mediaGroups.bethanBaking)}</div><p><a href="ALBURY_HOUSE_COLLECTIONS.html#baking">Explore Bethan’s baking →</a></p></section>`;
  const available = () => `<div class="available-gallery">${culinary.availableFood.map(item => {
    const media = record(item.mediaId);
    return `<article class="available-card" id="${esc(item.id)}">
      <a href="${esc(media.image)}"><img src="${esc(media.image)}" alt="${esc(media.imageAlt || 'A plate from the Albury repertoire')}" width="1536" height="1024" loading="lazy"></a>
      <h4>${esc(item.title)}</h4><p>${esc(item.description)}</p>
      <p><strong>Vegan option</strong> · ${esc(item.veganOption)}</p>
      ${item.serviceNote ? `<p class="muted">${esc(item.serviceNote)}</p>` : ''}
    </article>`;
  }).join('')}</div>`;
  const drinks = () => `<section class="culinary-gallery"><h3>House syrups &amp; cordials</h3><p class="muted">Clear glass, gold caps and the ivory Albury label: the house drinks family. Twelve core cordials and two separate syrups, vanilla and demerara. Cordials are kept chilled; the team confirms today’s selection.</p><div class="photo-grid">${gallery(culinary.mediaGroups.coreHouseDrinks)}</div><h3 style="margin-top:38px" id="seasonal-cordials">Through the seasons</h3><p class="muted">Two recipes for the seasonal rotation. These photographs show the wider repertoire; ask the team about availability.</p><div class="photo-grid two-photos">${gallery(culinary.mediaGroups.seasonalCordials)}</div><p><a href="ALBURY_HOUSE_COLLECTIONS.html#produce">Browse the pantry &amp; bottle collection →</a></p><h3 style="margin-top:38px">A few from the bar</h3><p class="muted">Classic drinks to request; Crispin or Harjit can adjust the serve to your preference.</p><div class="photo-grid">${gallery(culinary.mediaGroups.cocktails)}</div></section><div class="producer-links"><article><h3>Limestone Springs</h3><p>The house water, soda water, mixers and soft drinks; selected Limestone Springs bottles for today’s service.</p><a href="ALBURY_LIMESTONE_SPRINGS.html">The story &amp; selected bottles →</a><br><a href="https://limestone-springs.vercel.app/" target="_blank" rel="noopener noreferrer">Visit Limestone Springs ↗</a></article><article><h3>Hatfield</h3><p>The full commercial Hatfield spirits and wine family within a wider international cellar; ask which bottles are ready.</p><a href="ALBURY_HATFIELD.html">The story &amp; selected bottles →</a><br><a href="https://hatfield-group.vercel.app/" target="_blank" rel="noopener noreferrer">Visit Hatfield ↗</a></article></div>`;
  const bakeCards = kind => culinary.signatureBakes.filter(item => item.kind === kind).map(item => `
    <figure class="culinary-figure"><a href="${esc(item.image)}" aria-label="View ${esc(item.name)} photograph"><img src="${esc(item.image)}" alt="${esc(item.imageAlt)}" loading="lazy" width="1254" height="1254"></a>
    <figcaption><strong>${esc(item.name)}</strong><span>${esc(item.availability)}</span><span>${esc(item.description)}</span></figcaption></figure>`).join('');
  const signatureBakes = () => `<section class="culinary-gallery" id="signature-bakes" aria-labelledby="bethans-bakes-title">
    <h3 id="bethans-bakes-title">Bethan’s biscuits and cakes</h3>
    <h4>The guest-lounge tin</h4><p>Shortbread and chocolate sablés are the regular choices. Bethan changes the rest of the tin with the baking.</p>
    <div class="photo-grid bake-grid biscuit-grid">${bakeCards('biscuit tin')}</div>
    <p>With drinks, try the <a href="ALBURY_PANTRY_ITEMS.html#P20">Parmesan and black-pepper sablés</a>.</p>
    <h4>On a plate with tea or coffee</h4><div class="photo-grid bake-grid">${bakeCards('fresh sweet treat')}</div>
  </section>`;
  const cordialServes = () => `<section class="culinary-gallery" id="cordial-cocktails"><h3>House cordial cocktails &amp; alcohol-free serves</h3><p class="muted">Each pair starts with a house cordial. Crispin or Harjit confirms the selection and prepares the version you choose; these are options, not a record of orders. Select either photograph to open that drink alone.</p><div class="serve-grid">${culinary.cordialServes.map(item => `<article class="serve-card"><h4>${esc(item.name)}</h4><div class="serve-pair"><figure><a href="${esc(item.cocktailImage)}" target="_blank" rel="noopener" aria-label="Open ${esc(item.name)} cocktail alone"><img src="${esc(item.cocktailImage)}" alt="${esc(item.cocktailImageAlt)}" loading="lazy" width="1254" height="1254"></a><figcaption><strong>Cocktail</strong><span>${esc(item.cocktail)}</span></figcaption></figure><figure><a href="${esc(item.alcoholFreeImage)}" target="_blank" rel="noopener" aria-label="Open ${esc(item.name)} alcohol-free serve alone"><img src="${esc(item.alcoholFreeImage)}" alt="${esc(item.alcoholFreeImageAlt)}" loading="lazy" width="1254" height="1254"></a><figcaption><strong>Alcohol-free</strong><span>${esc(item.alcoholFree)}</span></figcaption></figure></div></article>`).join('')}</div></section>`;
  return {photo, dishes, baking, available, drinks, signatureBakes, cordialServes};
})();
