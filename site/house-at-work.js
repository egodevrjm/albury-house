(() => {
  'use strict';
  const main = document.querySelector('[data-house-at-work]');
  if (!main) return;
  const content = window.ALBURY_CONTENT?.['house-at-work'];
  if (!content) throw new Error('Albury house-at-work content is unavailable. Run site/build_content.py.');
  const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  main.innerHTML = `<header class="page-intro"><h1>The house at work</h1><p class="owners">Kitchen, front of house &amp; the rooms behind the scenes</p></header><p class="intro">${esc(content.intro)}</p><div class="working-gallery">${content.scenes.map(scene => `<figure id="${esc(scene.id)}"><a href="${esc(scene.image)}"><img src="${esc(scene.image)}" alt="${esc(scene.description)}" width="1536" height="1024" loading="lazy"></a><figcaption><h2>${esc(scene.title)}</h2><p>${esc(scene.description)}</p><a href="${esc(scene.roomHref)}">Explore this room →</a></figcaption></figure>`).join('')}</div><p class="muted">Illustrated moments in the working house. <a href="ALBURY_HOUSE_GUIDE.html#staff">Meet the household team →</a></p>`;
})();
