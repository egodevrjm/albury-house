(() => {
  'use strict';
  const main = document.querySelector('[data-brand-page]');
  if (!main) return;
  const brands = window.ALBURY_CONTENT?.brands?.brands;
  const brand = brands?.find(item => item.id === main.dataset.brandPage);
  if (!brand) throw new Error(`Unknown Albury producer page: ${main.dataset.brandPage}`);
  const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  main.innerHTML = `<header class="page-intro"><h1>${esc(brand.name)}</h1><p class="owners">${esc(brand.locationLine)}</p></header><p class="intro">${esc(brand.intro)}</p><div class="producer-story"><h2>${esc(brand.storyTitle)}</h2><div>${brand.story.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}<p><a href="${esc(brand.externalUrl)}" target="_blank" rel="noopener noreferrer">${esc(brand.externalLabel)}</a></p></div></div><section><h2>${esc(brand.productsTitle)}</h2><div class="producer-products ${brand.products.length === 2 ? 'two-products' : ''}">${brand.products.map(product => `<article class="producer-product"><a href="${esc(product.image)}"><img src="${esc(product.image)}" alt="${esc(`${product.name} in its own producer packaging`)}" loading="lazy"></a><h3>${esc(product.name)}</h3><p>${esc(product.description)}</p></article>`).join('')}</div></section><div class="producer-story"><h2>${esc(brand.moreTitle)}</h2><p>${esc(brand.more)}</p></div><p><a href="${esc(brand.related.href)}">${esc(brand.related.label)}</a> · <a href="ALBURY_CULINARY_MENU.html#drinks">Back to drinks →</a></p>`;
})();
