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
    return `<article class="available-card"><a href="${esc(media.image)}"><img src="${esc(media.image)}" alt="${esc(media.imageAlt || `${item.title}: an example from the Albury repertoire`)}" width="1536" height="1024" loading="lazy"></a><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`;
  }).join('')}</div>`;
  const drinks = () => `<section class="culinary-gallery"><h3>House syrups &amp; cordials</h3><p class="muted">Clear glass, gold caps and the ivory Albury label: the house drinks family. Five core cordials and a separate vanilla syrup. Cordials are kept chilled; the team confirms today’s selection.</p><div class="photo-grid">${gallery(culinary.mediaGroups.coreHouseDrinks)}</div><h3 style="margin-top:38px" id="seasonal-cordials">Through the seasons</h3><p class="muted">Two recipes for the seasonal rotation. These photographs show the wider repertoire; ask the team about availability.</p><div class="photo-grid two-photos">${gallery(culinary.mediaGroups.seasonalCordials)}</div><p><a href="ALBURY_HOUSE_COLLECTIONS.html#produce">Browse the pantry &amp; bottle collection →</a></p><h3 style="margin-top:38px">A few from the bar</h3><p class="muted">Classic drinks to request; Crispin or Harjit can adjust the serve to your preference.</p><div class="photo-grid">${gallery(culinary.mediaGroups.cocktails)}</div></section><div class="producer-links"><article><h3>Limestone Springs</h3><p>Kentucky water, properly brewed sodas and mixers.</p><a href="ALBURY_LIMESTONE_SPRINGS.html">The story &amp; selected bottles →</a><br><a href="https://limestone-springs.vercel.app/" target="_blank" rel="noopener noreferrer">Visit Limestone Springs ↗</a></article><article><h3>Hatfield</h3><p>Bardstown bourbon and a wider world of drinks and hospitality.</p><a href="ALBURY_HATFIELD.html">The story &amp; selected bottles →</a><br><a href="https://hatfield-group.vercel.app/" target="_blank" rel="noopener noreferrer">Visit Hatfield ↗</a></article></div>`;
  return {photo, dishes, baking, available, drinks};
})();
