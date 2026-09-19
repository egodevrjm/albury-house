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
  assert.equal(names.length, 30);
  for (const name of ["list_special_menus", "get_special_menu", "get_room", "list_household_staff", "get_menu_for_date", "list_pantry_items", "get_image", "get_events_for_date", "list_outdoor_areas", "get_outdoor_area", "get_forecast"]) assert.ok(names.includes(name), name);
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

test("MCP menu and pantry calls return structured canonical records", async () => {
  const menu = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_menu_for_date", arguments: { date: "2025-08-18" } } });
  assert.equal(menu.result.structuredContent.cycle, 2);
  assert.equal(menu.result.structuredContent.meals.length, 3);

  const pantry = await post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_pantry_items", arguments: {} } });
  assert.equal(pantry.result.structuredContent.total, 33);
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
