(() => {
  'use strict';
  const style = window.ALBURY_CONTENT?.['house-style'];
  if (!style) throw new Error('Albury house-style content is unavailable. Run site/build_content.py.');
  const esc = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const textColour = hex => {
    const rgb = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16));
    return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 150 ? '#142126' : '#fffdf7';
  };
  const swatch = colour => `<button class="swatch" data-hex="${esc(colour.hex)}" style="--swatch:${esc(colour.hex)};--ink:${textColour(colour.hex)}"><span class="swatch-name">${esc(colour.name)}</span><span class="swatch-role">${esc(colour.role)}</span><code>${esc(colour.hex)}</code></button>`;
  const primary = document.querySelector('.palette-primary');
  const support = document.querySelector('.palette-support');
  if (primary && support) {
    primary.innerHTML = style.colours.slice(0, 4).map(swatch).join('');
    support.innerHTML = style.colours.slice(4).map(swatch).join('');
  }
  document.querySelectorAll('[data-expression]').forEach(button => button.addEventListener('click', () => {
    const variant = style.expressions[button.dataset.expression];
    const image = document.querySelector('#expression-image');
    image.src = variant.image;
    image.alt = variant.imageAlt;
    document.querySelector('#expression-link').href = variant.image;
    document.querySelector('#expression-caption').textContent = variant.caption;
    document.querySelectorAll('[data-expression]').forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
  }));
  document.querySelectorAll('[data-hex]').forEach(button => button.addEventListener('click', async () => {
    const name = button.querySelector('.swatch-name').textContent;
    const code = button.dataset.hex;
    try {
      await navigator.clipboard.writeText(code);
      document.querySelector('#colour-copy-status').textContent = `Copied ${name}: ${code}`;
    } catch {
      document.querySelector('#colour-copy-status').textContent = `${name}: ${code} — select and copy this code.`;
    }
  }));
  document.querySelector('#print-style')?.addEventListener('click', () => window.print());
})();
