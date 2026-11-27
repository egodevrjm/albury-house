/* Small RFC 4180 reader shared by the editable menu and events tables. */
window.AlburyCSV = (() => {
  function parse(text) {
    const matrix = []; let row = [], field = '', quoted = false, closed = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
        else field += c;
      } else if (c === ',' || c === '\n' || c === '\r') {
        row.push(field); field = ''; closed = false;
        if (c !== ',') { if (row.some(v => v !== '')) matrix.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
      } else if (c === '"' && !field && !closed) quoted = true;
      else { if (closed || c === '"') throw new Error('Invalid quoting in CSV.'); field += c; }
    }
    if (quoted) throw new Error('An opening quote has no closing quote.');
    row.push(field); if (row.some(v => v !== '')) matrix.push(row);
    const headers = matrix.shift();
    if (!headers || new Set(headers).size !== headers.length || headers.some(h => !h.trim())) throw new Error('CSV headers must be present and unique.');
    return matrix.map((cells, i) => {
      if (cells.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${cells.length} fields; expected ${headers.length}.`);
      return Object.fromEntries(headers.map((h, n) => [h.trim(), cells[n].trim()]));
    });
  }
  async function load(path, embedded) {
    if (location.protocol === 'file:') return {text: embedded, source: 'bundled'};
    try {
      const response = await fetch(path, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {text: await response.text(), source: 'csv'};
    } catch { return {text: embedded, source: 'fallback'}; }
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function download(text, name, type = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {parse, load, esc, download};
})();
