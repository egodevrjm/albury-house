import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { mcpWebHandler } from '../api/mcp.js';

async function call(name: string, args: Record<string, unknown> = {}) {
  const response = await mcpWebHandler(new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: name, method: 'tools/call', params: { name, arguments: args } }),
  }));
  assert.equal(response.status, 200);
  const raw = await response.text();
  const data = raw.startsWith('event:') ? raw.split('\n').find(line => line.startsWith('data: '))!.slice(6) : raw;
  const result = JSON.parse(data).result;
  assert.ok(!result.isError, JSON.stringify(result));
  return result.structuredContent;
}

test('Career discoveries lead to complete staff records through the MCP', async () => {
  for (const [query, id, employers] of [
    ['Savoy', 'crispin-vale', ['Connaught', 'Wolseley', 'Savoy']],
    ['Claridge', 'ottilie-marchant', ['Claridge', 'refurbishment']],
  ] as const) {
    const discovery = await call('search_albury', { query, domains: ['staff'] });
    assert.ok(discovery.results.some((r: { id: string }) => r.id === id));
    const person = await call('get_household_member', { person: id });
    for (const employer of employers) assert.ok(person.career.includes(employer));
    assert.ok(person.career.includes('January 2025'));
    assert.equal(person.employmentType, 'permanent');
  }
  const roster = await call('list_household_staff', { employment_type: 'permanent', limit: 100 });
  assert.equal(roster.total, 48);
});

test('Core and seasonal cordial lookups retain inventory and expose specification versus production', async () => {
  const opening = await call('list_pantry_items');
  assert.equal(opening.total, 46);
  const all = await call('list_pantry_items', { include_seasonal: true });
  assert.equal(all.total, 48);
  const cordials = all.items.filter((item: { name: string }) => item.name.toLowerCase().includes('cordial'));
  assert.equal(cordials.length, 14);
  for (const listed of cordials) {
    const item = await call('get_pantry_item', { item: listed.id });
    assert.equal(item.specificationLead, 'crispin-vale');
    assert.equal(item.productionLead, 'rafael-bellocq');
    assert.match(item.productionNotes, /kitchen makes it to his specifications/);
    assert.equal(item.labelFamily, 'albury-drinks');
  }
  const cherries = await call('get_pantry_item', { item: 'P25' });
  assert.equal(cherries.specificationLead, undefined);
  const syrup = await call('get_pantry_item', { item: 'P26' });
  assert.equal(syrup.specificationLead, 'crispin-vale');
  assert.equal(syrup.productionLead, 'rafael-bellocq');
  assert.match(syrup.productionNotes, /vanilla syrup/);
  assert.equal(syrup.labelFamily, 'albury-drinks');
  const drinks = await call('list_drinks', { category: 'core cordial' });
  assert.equal(drinks.houseDrinks.length, 12);
  assert.ok(drinks.houseDrinks.every((item: { specificationLead: string }) => item.specificationLead === 'crispin-vale'));
  const bakes = await call('list_signature_bakes');
  assert.equal(bakes.total, 7);
  assert.ok(bakes.items.some((item: { id: string }) => item.id === 'black-cherry-thumbprints'));
  for (const item of bakes.items) {
    assert.ok(fs.existsSync(item.image), item.image);
    assert.equal(item.imageUrl, `https://albury-house.vercel.app/${item.image}`);
  }
  const serves = await call('list_cordial_serves');
  assert.equal(serves.total, 8);
  assert.ok(serves.serves.every((item: { cocktail: string; alcoholFree: string }) => item.cocktail && item.alcoholFree));
  for (const item of serves.serves) {
    assert.ok(fs.existsSync(item.cocktailImage), item.cocktailImage);
    assert.ok(fs.existsSync(item.alcoholFreeImage), item.alcoholFreeImage);
    assert.equal(item.cocktailImageUrl, `https://albury-house.vercel.app/${item.cocktailImage}`);
    assert.equal(item.alcoholFreeImageUrl, `https://albury-house.vercel.app/${item.alcoholFreeImage}`);
  }
  const discovery = await call('search_albury', { query: 'Crispin', domains: ['pantry'], limit: 50 });
  assert.equal(discovery.total, 16);
});


test('Citrus foundations are four distinct core cordials with matching bottle assets and service directions', async () => {
  const culinary = JSON.parse(fs.readFileSync('site/data/public/culinary.json', 'utf8'));
  assert.deepEqual(culinary.cordialFoundations.map((item: { pantryId: string }) => item.pantryId), ['P43', 'P44', 'P45', 'P46']);
  for (const [id, name] of [['P43', 'Sorrento lemon cordial'], ['P44', 'Blood orange cordial'], ['P45', 'Lime cordial'], ['P46', 'Sweet orange cordial']]) {
    const pantry = await call('get_pantry_item', { item: id });
    assert.equal(pantry.name, name);
    assert.match(pantry.openingAvailability, /chilled preparation/);
    const foundation = culinary.cordialFoundations.find((item: { pantryId: string }) => item.pantryId === id);
    const media = culinary.media[foundation.id];
    assert.equal(media.category, 'core cordial');
    assert.equal(media.image, pantry.image);
    assert.ok(fs.existsSync(media.image));
    assert.ok(foundation.serve && foundation.uses && foundation.profile);
    assert.ok(culinary.mediaGroups.citrusFoundations.includes(media.id));
    assert.ok(culinary.mediaGroups.coreHouseDrinks.includes(media.id));
  }
  const lemon = await call('search_albury', { query: 'Sorrento', domains: ['pantry'] });
  assert.ok(lemon.results.some((item: { id: string }) => item.id === 'P43'));
  const bloodOrange = await call('get_pantry_item', { item: 'P44' });
  assert.match(bloodOrange.openingAvailability, /seasonal.*reserve/);
});
