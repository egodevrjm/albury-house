import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import { mcpWebHandler } from '../api/mcp.js';

const pantry = JSON.parse(fs.readFileSync('mcp-data/pantry-items.json', 'utf8'));
const calendar = JSON.parse(fs.readFileSync('site/data/public/dining-calendar.json', 'utf8'));
const specials = JSON.parse(fs.readFileSync('site/data/public/special-menus.json', 'utf8'));
const names = new Map([...pantry.openingItems, ...pantry.seasonalRecipes].map((item: { id: string; name: string }) => [item.id, item.name.toLowerCase()]));
const datedMenuText = JSON.stringify(calendar.days).toLowerCase();
const occasionMenuText = specials.menus.map((entry: { menu: object }) => entry.menu)
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

test('named pantry items in the dated calendar and special menus use their registered names', () => {
  assert.equal(specials.menus.length, 6);
  for (const [menuText, ids] of [
    [datedMenuText, ['P21', 'P22']],
    [occasionMenuText, ['P20', 'P29', 'P31', 'P33']],
  ] as const) for (const id of ids) {
    const name = names.get(id);
    assert.ok(name && menuText.includes(name), `${id} registered name missing from menus`);
  }
  for (const shorthand of [
    'seville marmalade', 'strawberry preserve', 'raspberry preserve', 'apricot preserve',
    'house granola', 'house ketchup', 'house-mustard', 'dark-chocolate sea-salt sablés',
    'vanilla ice cream', 'blackcurrant cordial', 'elderflower-and-lemon cordial',
    'house-pickled red onions',
  ]) assert.ok(!occasionMenuText.includes(shorthand), `outdated pantry shorthand: ${shorthand}`);
});

test('the MCP serves pantry-aligned names in occasion menus', async () => {
  const christmas = await call('get_special_menu', { menu_id: 'christmas-lunch' });
  assert.match(christmas.menu.with_drinks, /Blackcurrant and bay cordial/i);
  const easter = await call('get_special_menu', { menu_id: 'easter-lunch' });
  assert.match(easter.menu.with_drinks, /Elderflower and lemon cordial/i);
  assert.match(easter.menu.with_drinks, /Parmesan and black-pepper sablés/i);
});
