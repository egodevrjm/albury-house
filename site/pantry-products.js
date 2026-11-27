(() => {
  const catalogue = window.ALBURY_MANAGED_CONTENT?.pantryProducts;
  if (!catalogue) return;
  const changed = new Set(catalogue.changedIds);
  const groups = [...document.querySelectorAll('.pantry-portrait-grid')];
  const items = new Map(groups.flatMap(group => [...group.children]).map(figure => [figure.id, figure]));
  function productCard(product) {
    const original = items.get(product.id);
    if (original && !changed.has(product.id)) return original;
    const card = document.createElement('figure');
    card.className = 'pantry-item';
    card.id = product.id;
    if (product.image) {
      const link = document.createElement('a');
      link.href = product.image;
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.imageAlt;
      image.loading = 'lazy';
      link.append(image);
      card.append(link);
    }
    const caption = document.createElement('figcaption');
    const title = document.createElement('strong');
    title.textContent = product.id + ' · ' + product.name;
    caption.append(title, document.createTextNode(product.description ? ' — ' + product.description : ''));
    card.append(caption);
    return card;
  }
  [catalogue.openingItems, catalogue.seasonalRecipes].forEach((products, index) => {
    groups[index]?.replaceChildren(...products.map(productCard));
  });
  document.getElementById('opening-title').textContent = 'Opening range · ' + catalogue.openingItems.length + ' products';
  const intro = document.querySelector('.pantry-portraits-main header .intro');
  intro.textContent = 'Browse the opening range and seasonal preparations. Select an image to view it at full size.';
})();
