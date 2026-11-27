import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import { mcpWebHandler } from '../api/mcp.js';

const pantry = JSON.parse(fs.readFileSync('mcp-data/pantry-items.json', 'utf8'));
const menus = JSON.parse(fs.readFileSync('site/data/public/menus.json', 'utf8'));
const specials = JSON.parse(fs.readFileSync('site/data/public/special-menus.json', 'utf8'));
const names = new Map([...pantry.openingItems, ...pantry.seasonalRecipes].map((item: { id: string; name: string }) => [item.id, item.name.toLowerCase()]));
const menuText = [...menus.menus, ...specials.menus.map((entry: { menu: object }) => entry.menu)]
  .flatMap((row: Record<string, string>) => Object.values(row).filter((value): value is string => typeof value === 'string'))
  .join('\n').toLowerCase();

async function call(name: string, args: Record<string, string>) {
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

test('named pantry items in the historical repertoire and special menus use their registered names', () => {
  assert.equal(menus.menus.length, 168);
  assert.equal(specials.menus.length, 6);
  for (const id of ['P01', 'P02', 'P03', 'P04', 'P08', 'P09', 'P10', 'P15', 'P18', 'P20', 'P21', 'P22', 'P29', 'P31', 'P33']) {
    const name = names.get(id);
    assert.ok(name && menuText.includes(name), `${id} registered name missing from menus`);
  }
  for (const shorthand of [
    'seville marmalade', 'strawberry preserve', 'raspberry preserve', 'apricot preserve',
    'house granola', 'house ketchup', 'house-mustard', 'dark-chocolate sea-salt sablés',
    'vanilla ice cream', 'blackcurrant cordial', 'elderflower-and-lemon cordial',
    'house-pickled red onions',
  ]) assert.ok(!menuText.includes(shorthand), `outdated pantry shorthand: ${shorthand}`);
  assert.match(menuText, /raspberry compote/); // A fresh preparation, distinct from P03 confiture.
  assert.match(menuText, /apricot compote/); // A fresh preparation, distinct from P04 preserve.
});

test('the MCP serves pantry-aligned names in occasion menus', async () => {
  const christmas = await call('get_special_menu', { menu_id: 'christmas-lunch' });
  assert.match(christmas.menu.with_drinks, /Blackcurrant and bay cordial/i);
  const easter = await call('get_special_menu', { menu_id: 'easter-lunch' });
  assert.match(easter.menu.with_drinks, /Elderflower and lemon cordial/i);
  assert.match(easter.menu.with_drinks, /Parmesan and black-pepper sablés/i);
});
