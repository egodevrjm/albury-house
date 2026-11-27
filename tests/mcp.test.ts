import assert from "node:assert/strict";
import test from "node:test";

import { mcpWebHandler } from "../api/mcp.js";

function parseMcpResponse(raw: string) {
  if (!raw.startsWith("event:")) return JSON.parse(raw);
  const data = raw.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
  if (!data) throw new Error(`No data event in MCP response: ${raw}`);
  return JSON.parse(data);
}

async function post(body: unknown) {
  const response = await mcpWebHandler(new Request("http://localhost/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  }));
  assert.equal(response.status, 200);
  return parseMcpResponse(await response.text());
}

test("MCP advertises the complete read-only Albury toolset", async () => {
  const response = await post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  const names = response.result.tools.map((tool: { name: string }) => tool.name);
  assert.equal(names.length, 32);
  for (const name of ["list_special_menus", "get_special_menu", "get_room", "list_household_staff", "get_menu_for_date", "list_pantry_items", "list_signature_bakes", "list_cordial_serves", "get_image", "get_events_for_date", "list_outdoor_areas", "get_outdoor_area", "get_forecast"]) assert.ok(names.includes(name), name);
});

test("MCP counts seven floors and exposes the garden separately", async () => {
  const call = async (name: string, args = {}) => (await post({ jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: args } })).result;
  const summary = await call("get_albury_summary");
  assert.equal(summary.structuredContent.totals.floors, 7);
  assert.equal(summary.structuredContent.totals.outdoorAreas, 1);
  const inside = await call("list_floors");
  assert.equal(inside.structuredContent.floors.length, 7);
  assert.ok(inside.structuredContent.floors.every((floor: { kind: string }) => floor.kind === "floor"));
  const outside = await call("get_outdoor_area", { area_id: "garden" });
  assert.equal(outside.structuredContent.name, "Exterior & Garden");
  assert.equal(outside.structuredContent.level, null);
});

test("MCP keeps preserving and rota responsibilities with the right staff", async () => {
  const member = async (person: string) => {
    const response = await post({ jsonrpc: "2.0", id: person, method: "tools/call", params: { name: "get_household_member", arguments: { person } } });
    assert.equal(response.result.isError, undefined);
    return response.result.structuredContent;
  };
  const [tolly, bethan, jamie, kit, louise] = await Promise.all([
    member("Tolly Venn"), member("Bethan Pritchard"), member("Jamie Fletcher"), member("Kit Peverell"), member("Louise Baines"),
  ]);
  assert.match(tolly.remit, /works with Bethan on preserve production/);
  assert.doesNotMatch(tolly.remit, /preserving alongside.*Jamie/);
  assert.match(bethan.remit, /including preserves/);
  assert.match(bethan.remit, /works with Tolly/);
  assert.match(jamie.remit, /planned everyday cooking cover/);
  assert.match(kit.remit, /daily staff deployment/);
  assert.match(kit.remit, /Louise maintains the rota/);
  assert.match(louise.remit, /^Rotas, purchase orders/);
});

test("MCP menu and pantry calls return structured canonical records", async () => {
  const menu = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_menu_for_date", arguments: { date: "2025-08-18" } } });
  assert.equal(menu.result.structuredContent.covered, true);
  assert.equal(menu.result.structuredContent.meals.length, 3);

  const pantry = await post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_pantry_items", arguments: {} } });
  assert.equal(pantry.result.structuredContent.total, 47);
});

test("MCP date lookups serve the website's pappardelle dinner for 20 August 2025", async () => {
  const date = "2025-08-20";
  const call = async (name: string) => (await post({
    jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: { date } },
  })).result.structuredContent;
  const [menu, context] = await Promise.all([call("get_menu_for_date"), call("get_date_context")]);
  assert.deepEqual(context.menu, menu);
  assert.equal(menu.source, "dated calendar");
  assert.equal(menu.menuUrl, "https://albury-house.vercel.app/ALBURY_CULINARY_MENU.html?date=2025-08-20#today");
  assert.equal(menu.meals[2].main, "Pappardelle with field mushrooms, thyme and aged Parmesan");
  assert.ok(!Object.hasOwn(menu, "cycle"));
  assert.ok(menu.meals.every((meal: object) => !Object.hasOwn(meal, "cycle")));
});

test("MCP between-meals provision adds dated snacks and keeps the standing choices", async () => {
  const call = async (name: string, args: Record<string, string> = {}) => {
    const response = await post({ jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: args } });
    assert.equal(response.result.isError, undefined);
    return response.result.structuredContent;
  };
  const date = "2025-08-11";
  const [provision, menu, outside, filtered, bakes] = await Promise.all([
    call("list_available_food", { date }),
    call("get_menu_for_date", { date }),
    call("list_available_food", { date: "2026-02-11" }),
    call("list_available_food", { query: "friends" }),
    call("list_signature_bakes"),
  ]);
  assert.equal(provision.items.length, 6);
  assert.ok(provision.items.every((item: { veganOption?: string }) => item.veganOption));
  assert.equal(provision.kitchenLead, menu.kitchenLead);
  assert.deepEqual(provision.snackOptions, menu.snackOptions);
  assert.equal(outside.covered, false);
  assert.deepEqual(outside.snackOptions, []);
  assert.deepEqual(outside.items, provision.items);
  assert.deepEqual(filtered.items.map((item: { id: string }) => item.id), ["people-drop-in"]);
  assert.match(filtered.items[0].description, /Parmesan and black-pepper sablés/);
  assert.equal(bakes.items.filter((item: { availability: string }) => item.availability === "Regular tin choice").length, 2);
});

test("MCP discovers sendable gifts and preserves the distinction between gift batches and chilled service cordials", async () => {
  const call = async (name: string, args = {}) => {
    const response = await post({ jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: args } });
    assert.equal(response.result.isError, undefined);
    return response.result.structuredContent;
  };
  const gifts = await call("get_guest_provision", { kind: "sent gifts" });
  assert.equal(gifts.provisions.length, 6);
  const cordial = gifts.provisions.find((item: { id: string }) => item.id === "gift-cordial-pair");
  assert.equal(cordial.tumblerCount, 2);
  assert.equal(cordial.coasterCount, 2);
  assert.equal(cordial.alcoholFree, true);
  assert.match(cordial.storage.unopened, /validated for ambient storage/);
  assert.match(cordial.storage.afterOpening, /Refrigerate/);
  assert.match(cordial.storage.workingStock, /refrigeration requirements/);
  assert.match(cordial.imageUrl, /albury-cordial-pair-gift.webp\?v=2$/);
  const breakfast = gifts.provisions.find((item: { id: string }) => item.id === "gift-breakfast-parcel");
  assert.equal(breakfast.mugCount, 1);
  assert.equal(breakfast.preserveJarCount, 2);
  const sweet = gifts.provisions.find((item: { id: string }) => item.id === "gift-sweet-hamper");
  assert.equal(sweet.jarCount, 4);
  assert.deepEqual(sweet.picturedPantryIds, ["P01", "P02", "P04", "P05"]);
  const pantry = await call("get_pantry_item", { item: "P32" });
  assert.match(pantry.openingAvailability, /chilled/);
  assert.equal(pantry.giftBatch.provisionId, cordial.id);
  assert.match(pantry.giftBatch.unopened, /ambient/);
  const discovery = await call("search_albury", { query: "highball", domains: ["hospitality"] });
  assert.ok(discovery.results.some((item: { id: string }) => item.id === cordial.id));
  const broad = await call("search_albury", { query: "Breakfast Parcel" });
  assert.ok(broad.results.some((item: { id: string }) => item.id === breakfast.id));
  const photos = await call("search_images", { query: "highball", kind: "hospitality" });
  assert.ok(photos.items.some((item: { id: string }) => item.id === "images.albury.gifts.cordial-pair"));
  const photo = await call("get_image", { image: "images.albury.gifts.cordial-pair", include_data: false });
  assert.equal(photo.kind, "hospitality");
  assert.equal(photo.url, cordial.imageUrl);
});

test("MCP returns exact authored weather and handles invalid or uncovered dates", async () => {
  const call = async (date: string) => (await post({ jsonrpc: "2.0", id: date, method: "tools/call", params: { name: "get_forecast", arguments: { date } } })).result;
  const opening = await call("2025-08-11");
  assert.equal(opening.isError, undefined);
  assert.equal(opening.structuredContent.condition, "Partly Cloudy");
  assert.equal(opening.structuredContent.highC, 24.1);
  assert.equal(opening.structuredContent.precipitationChancePct, 20);
  assert.equal(opening.structuredContent.fictional, true);
  const last = await call("2026-08-31");
  assert.equal(last.structuredContent.highC, 23.5);
  for (const date of ["2025-02-29", "2026-09-01", "2025-07-31"]) {
    const result = await call(date);
    assert.equal(result.isError, true, date);
    assert.equal(result.structuredContent, undefined);
  }
  const listing = await post({ jsonrpc: "2.0", id: "schema", method: "tools/list", params: {} });
  const tool = listing.result.tools.find((t: {name: string}) => t.name === "get_forecast");
  assert.deepEqual(tool.inputSchema.required, ["date"]);
  assert.equal(tool.annotations.readOnlyHint, true);
});

 test("MCP can select a special menu without replacing breakfast", async () => {
  const call = async (name: string, args = {}) => (await post({jsonrpc:"2.0",id:name,method:"tools/call",params:{name,arguments:args}})).result;
  const special = await call("get_special_menu", {menu_id:"christmas-lunch"});
  assert.equal(special.structuredContent.meal, "Lunch");
  const regular = await call("get_menu_for_date", {date:"2025-12-25"});
  const selected = await call("get_menu_for_date", {date:"2025-12-25",special_menu_id:"christmas-lunch"});
  assert.equal(selected.structuredContent.specialMenu.id, "christmas-lunch");
  assert.deepEqual(selected.structuredContent.meals[0], regular.structuredContent.meals[0]);
  assert.equal(regular.structuredContent.specialMenu, null);
 });

test("MCP resolves each service landing to its requested floor", async () => {
  const call = async (args: Record<string,string>) => (await post({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"get_room",arguments:args}})).result;
  const second = await call({room_id:"rear-service-landing",floor_id:"second-floor"});
  assert.equal(second.structuredContent.floorId,"second-floor");
  assert.equal(second.structuredContent.id,"second-floor/rear-service-landing");
  const ground = await call({room_id:"raised-ground/rear-service-landing"});
  assert.equal(ground.structuredContent.floorId,"raised-ground");
  const ambiguous = await call({room_id:"rear-service-landing"});
  assert.equal(ambiguous.isError,true);
  assert.match(JSON.stringify(ambiguous),/Ambiguous room/);
});
