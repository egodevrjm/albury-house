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
  assert.equal(names.length, 27);
  for (const name of ["get_room", "list_household_staff", "get_menu_for_date", "list_pantry_items", "get_image", "get_events_for_date", "list_outdoor_areas", "get_outdoor_area"]) assert.ok(names.includes(name), name);
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
