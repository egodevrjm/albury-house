(() => {
  const page = location.pathname.split('/').at(-1);
  const records = window.ALBURY_MANAGED_CONTENT?.pageCopy?.[page];
  if (!records) return;
  for (const record of records) {
    const node = document.querySelector('[data-albury-copy="' + CSS.escape(record.id) + '"]');
    if (!node) continue;
    if (Array.isArray(record.text)) {
      const fragments = [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE && child.data.trim());
      fragments.forEach((fragment, index) => {
        if (typeof record.text[index] === 'string') fragment.data = record.text[index];
      });
    }
    if (node instanceof HTMLImageElement) {
      if (typeof record.image === 'string') {
        const original = node.getAttribute('src');
        const link = node.parentElement.closest('a');
        if (link?.getAttribute('href') === original) link.setAttribute('href', record.image);
        node.removeAttribute('srcset');
        node.src = record.image;
      }
      if (typeof record.alt === 'string') node.alt = record.alt;
    }
  }
})();
