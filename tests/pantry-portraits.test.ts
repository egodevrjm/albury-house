import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { getPantryItem, listPantry, searchImages } from '../lib/albury-data.js';

test('every opening and seasonal pantry record has its own deployable portrait', () => {
  const all = listPantry({ includeSeasonal: true, limit: 50 });
  assert.equal(all.total, 48);
  assert.equal(all.items.length, 48);
  assert.equal(new Set(all.items.map((item) => item.image)).size, 48);
  for (const listed of all.items) {
    const item = getPantryItem(String(listed.id));
    assert.ok(item, String(listed.id));
    assert.match(String(item.image), /^images\/albury-produce\/individual\//);
    assert.ok(fs.existsSync(String(item.image)), `missing portrait: ${item.image}`);
    assert.equal(item.imageUrl, `https://albury-house.vercel.app/${item.image}`);
    const group = item.imageGroup as { ids: string[]; imageUrl: string };
    if (group.ids.length > 1) assert.notEqual(item.imageUrl, group.imageUrl);
    else assert.ok(group.ids.includes(String(item.id)) || String(item.id).startsWith("seasonal-"));
  }
  const gallery = fs.readFileSync('ALBURY_PANTRY_ITEMS.html', 'utf8');
  assert.equal((gallery.match(/class="pantry-item"/g) ?? []).length, 48);
  assert.match(gallery, /id="P46"/);
  assert.match(gallery, /id="seasonal-rhubarb-orange-cordial"/);
  const found = searchImages({ query: 'Albury brown sauce', kind: 'pantry', limit: 50 });
  assert.ok(found.items.some((image) => image.path === getPantryItem('P34')?.image));
});
