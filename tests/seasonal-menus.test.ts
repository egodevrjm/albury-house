import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { getMenuForDate, getMenuRange, listSpecialMenus } from "../lib/albury-data.js";

const calendar = JSON.parse(readFileSync("site/data/public/dining-calendar.json", "utf8"));
const occasionMenus = JSON.parse(readFileSync("site/data/public/special-menus.json", "utf8"));

test("daily and weekly pages share the complete dated MCP menu", async () => {
  const context = vm.createContext({
    URLSearchParams, location: { search: "" }, ALBURY_CONTENT: { "special-menus": occasionMenus },
    fetch: async () => ({ ok: true, json: async () => calendar }),
  });
  context.window = context;
  vm.runInContext(readFileSync("site/csv.js", "utf8"), context);
  vm.runInContext(readFileSync("site/menu-rotation.js", "utf8"), context);
  const browser = context.AlburyMenus;
  await browser.ready;
  assert.equal(calendar.days.length, 184);
  assert.equal(Object.keys(calendar.dishes).length, 96);
  for (const dish of Object.values(calendar.dishes) as { path: string }[]) {
    const photo = readFileSync(dish.path);
    assert.equal(photo.subarray(8, 12).toString(), "WEBP", dish.path);
  }
  assert.equal((browser.repertoire().match(/class="panel dish-card"/g) ?? []).length, 96);

  const opening = Date.parse(calendar.coverage.start);
  for (const [index, day] of calendar.days.entries()) {
    assert.equal(day.date, new Date(opening + index * 86_400_000).toISOString().slice(0, 10));
    const mcp = getMenuForDate(day.date);
    const page = browser.forDate(day.date);
    assert.equal(mcp.kitchenLead, day.lead);
    assert.equal(mcp.kitchenLead, page.lead);
    assert.equal(mcp.guestService, page.guestService || null);
    assert.equal(mcp.seasonLabel, page.season);
    assert.equal(mcp.covered, true);
    assert.equal(mcp.meals.length, 3);
    for (const [i, meal] of mcp.meals.entries()) {
      assert.equal(meal.main, page.rows[i].main, day.date);
      assert.equal(meal.image, page.rows[i].image, day.date);
      assert.equal(meal.dessert, page.rows[i].dessert, day.date);
    }
    assert.equal((mcp.meals[1].vegan as { description: string }).description, page.veganLunch.description);
    assert.equal((mcp.meals[2].vegan as { description: string }).description, page.veganDinner.description);
    assert.deepEqual(mcp.snackOptions.map(choice => choice.description), page.snackOptions.map((choice: { description: string }) => choice.description));
  }
  const lastWeek = browser.week("2026-02-10");
  assert.equal(lastWeek[1][3].date, "2026-02-10");
  assert.equal(lastWeek[2][3].covered, false);
  assert.deepEqual(getMenuRange("2026-02-09", 3).menus.map(menu => menu.covered), [true, true, false]);
  for (const date of ["2025-08-10", "2026-02-11"]) {
    assert.equal(getMenuForDate(date).covered, false);
    assert.deepEqual(getMenuForDate(date).meals, []);
    assert.equal(browser.forDate(date).rows.length, 0);
  }
});

test("between-meals page uses the canonical standing provision and the selected date’s snacks", async () => {
  const location = { search: "?date=2025-08-12", hash: "#available" };
  const content = { dataset: {}, innerHTML: "" };
  const context = vm.createContext({
    URLSearchParams, location,
    fetch: async () => ({ ok: true, json: async () => calendar }),
    addEventListener() {},
    document: {
      querySelector: (selector: string) => selector === "#kitchen-content" ? content : null,
      querySelectorAll: () => [],
    },
  });
  context.window = context;
  for (const script of ["content-data", "csv", "menu-rotation", "culinary-media", "kitchen"]) {
    vm.runInContext(readFileSync(`site/${script}.js`, "utf8"), context);
  }
  await context.AlburyMenus.ready;
  const culinary = JSON.parse(readFileSync("site/data/public/culinary.json", "utf8"));
  assert.deepEqual(JSON.parse(JSON.stringify(context.ALBURY_CONTENT.culinary.availableFood)), culinary.availableFood);
  assert.deepEqual(JSON.parse(JSON.stringify(context.ALBURY_CONTENT.culinary.signatureBakes)), culinary.signatureBakes);
  for (const choice of getMenuForDate("2025-08-12").snackOptions) {
    assert.ok(content.innerHTML.includes(choice.description));
  }
  for (const item of culinary.availableFood) {
    assert.ok(content.innerHTML.includes(item.title));
    readFileSync(culinary.media[item.mediaId].image);
  }
  assert.match(content.innerHTML, /The guest-lounge tin[\s\S]+On a plate with tea or coffee/);
  assert.match(content.innerHTML, /ALBURY_PANTRY_ITEMS\.html#P20/);
});

test("occasion menus replace only their selected meal", () => {
  const date = "2025-12-25";
  const regular = getMenuForDate(date);
  assert.equal(regular.specialMenu, null);
  assert.match(String(regular.meals[1].main), /turkey/i);
  assert.equal(regular.meals[1].imageUrl, undefined);
  for (const special of listSpecialMenus()) {
    const selected = getMenuForDate(date, special.id);
    assert.equal(selected.meals.length, 3);
    assert.equal(selected.meals.find(meal => meal.meal === special.meal)?.main, special.menu.main);
    for (const [i, meal] of regular.meals.entries()) {
      if (meal.meal !== special.meal) assert.deepEqual(selected.meals[i], meal);
    }
  }
  assert.throws(() => getMenuForDate(date, "unknown"));
});
