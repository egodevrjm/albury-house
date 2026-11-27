import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { mcpWebHandler } from '../api/mcp.js';
import { getRoom, listRooms, searchImages } from '../lib/albury-data.js';

test('Club Alex opens on the permanent-stage speakeasy and retains a reversible nightclub through MCP', async () => {
  const response = await mcpWebHandler(new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_room', arguments: { room_id: 'bar-games-room', floor_id: 'upper-basement' } } }),
  }));
  assert.equal(response.status, 200);
  const raw = await response.text();
  const payload = raw.startsWith('event:') ? raw.split('\n').find(line => line.startsWith('data: '))!.slice(6) : raw;
  const result = JSON.parse(payload).result;
  assert.ok(!result.isError, JSON.stringify(result));
  const room = result.structuredContent;
  assert.equal(room.name, 'Bar & Games Room');
  assert.equal(room.floorName, 'Club Alex');
  assert.deepEqual(room.configurations.map((c: { id: string }) => c.id), ['normal', 'live-music', 'nightclub']);
  assert.equal(room.defaultConfigurationId, 'normal');
  assert.equal(room.viewCount, 7);
  for (const config of room.configurations.filter((config: { path?: string }) => config.path)) {
    assert.ok(room.views.some((view: { configurationId: string; path: string }) => view.configurationId === config.id && view.path === config.path));
    assert.ok(fs.existsSync(config.path));
    assert.equal(config.imageUrl, `https://albury-house.vercel.app/${config.path}`);
  }
  const stage = room.views[0];
  assert.match(stage.description, /permanent raised stage at the north end is 36 by 16 ft/);
  assert.match(stage.description, /Welmar.*at floor level beside the east wing/);
  assert.match(stage.description, /Seven small round café tables with 18 oxblood chairs/);
  assert.match(stage.description, /solid Kentucky limestone counter/);
  assert.match(stage.description, /banquette on the south wall opposite the stage/);
  assert.match(stage.description, /9 ft billiards table, a 16 ft shuffleboard/);
  assert.equal(room.eventCapacity.seated, 29);
  assert.equal(room.eventCapacity.standing, 250);
  assert.equal(room.seatingArrangement.barStools, 6);
  for (const view of [...room.views, ...room.configurations]) {
    assert.doesNotMatch(view.description, /retractable stage|stage[^.]*lower(?:s|ed)?|lower(?:s|ed)?[^.]*stage|flush-floor/);
  }
  const nightclub = room.configurations.find((config: { id: string }) => config.id === 'nightclub');
  const djView = room.views.find((view: { configurationId: string }) => view.configurationId === 'nightclub');
  assert.ok(djView);
  assert.equal(nightclub.path, djView.path);
  assert.equal(nightclub.imageUrl, djView.imageUrl);
  assert.ok(djView.legacySlugs.includes('08-nightclub-mode'));
  const packedView = room.views.find((view: { title: string }) => view.title.endsWith('DJ and Dance Floor'));
  assert.equal(packedView?.configurationId, 'nightclub');
  assert.ok(fs.existsSync(packedView.path));
  assert.ok(searchImages({ query: 'DJ and Dance Floor', kind: 'room' }).items.some(image => image.path === packedView.path));
  assert.ok(searchImages({ query: 'nightclub mode', kind: 'room' }).items.some(image => image.path === djView.path));
  assert.match(nightclub.description, /fixed stage, six-stool bar, oxblood banquette and floor-level Welmar stay in place/);
  assert.match(nightclub.description, /central dance floor and routes clear/);
  assert.match(nightclub.description, /DJ booth sits at centre stage.*clear route to the backstage door/);
  assert.match(nightclub.description, /House lights are off.*Discreetly integrated ceiling fixtures/);
  assert.doesNotMatch(nightclub.description, /Welmar move to storage|northwest DJ recess/);
  assert.equal(room.views[0].configurationId, 'normal');
  assert.equal(getRoom('bar-games-room')?.viewCount, room.viewCount);
  const discovery = listRooms({ query: 'permanent raised stage' });
  assert.ok(discovery.items.some(room => room.id === 'bar-games-room'));
  const images = searchImages({ query: 'speakeasy stage', kind: 'room' });
  assert.ok(images.items.some(image => image.path === stage.path));
  const reverse = room.views.find((view: { title: string }) => view.title.endsWith('From the Stage'));
  assert.ok(reverse);
  assert.equal(reverse.configurationId, 'normal');
  assert.match(reverse.description, /towards the guest doors and oxblood banquette/);
  assert.ok(stage.legacySlugs.includes('09-live-stage-mode'));
  assert.match(stage.description, /north-wall stage door.*Backstage Store \/ Preparation Room/);
  const backstage = getRoom('backstage-store-preparation-room', 'upper-basement');
  assert.ok(backstage);
  assert.equal(backstage.viewCount, 1);
  assert.match(backstage.description, /10 by 12 ft/);
  assert.match(backstage.description, /bench.*large brass-framed mirror.*vertical.*sconces/);
  assert.match(backstage.description, /opal ceiling light/);
  assert.match(backstage.description, /task lighting inside the instrument cupboards/);
  assert.match(backstage.description, /dimmable.*high colour rendering/);
  assert.match(backstage.description, /fixed rear landing at stage level/);
  assert.match(backstage.description, /second door opens to the mews service corridor/);
  assert.ok(fs.existsSync(String(backstage.views[0].path)));

  const browser: { window: { ALBURY_CONTENT?: { rooms: { tour: Array<{ id: string; rooms: Array<{ roomId: string; path: string }> }> } } } } = { window: {} };
  vm.runInNewContext(fs.readFileSync('site/content-data.js', 'utf8'), browser);
  vm.runInNewContext(fs.readFileSync('site/upper-basement-views-2026-11-25.js', 'utf8'), browser);
  vm.runInNewContext(fs.readFileSync('site/room-views-2026-11-25.js', 'utf8'), browser);
  const gallery = browser.window.ALBURY_CONTENT?.rooms.tour.find(floor => floor.id === 'upper-basement');
  const clubIds = [room.id, backstage.id];
  const galleryPaths = gallery?.rooms.filter(view => clubIds.includes(view.roomId)).map(view => view.path);
  const mcpPaths = [...room.views, ...backstage.views].map(view => view.path);
  assert.equal(JSON.stringify(galleryPaths), JSON.stringify(mcpPaths));
  assert.ok(mcpPaths.every(path => /\/club-alex-2026-11-(?:24|25)\/[^/]+\.(?:jpg|webp)$/.test(String(path)) && fs.existsSync(String(path))));
});
