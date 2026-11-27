import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = (path: string) => readFileSync(path, "utf8");
const navigation = JSON.parse(source("site/data/public/navigation.json"));
const calendar = JSON.parse(source("site/data/public/dining-calendar.json"));

function browser(path: string, storage: Map<string, string>, hidden: string[] = []) {
  const location = new URL(path, "https://albury-house.vercel.app");
  const nodes = new Map();
  const element = (selector: string) => {
    if (hidden.includes(selector)) return null;
    if (!nodes.has(selector)) nodes.set(selector, {
      value: "", innerHTML: "", textContent: "", disabled: false, dataset: {},
      options: [{ value: "all" }],
      classList: { toggle() {} },
      addEventListener() {}, setAttribute() {}, removeAttribute() {}, insertAdjacentHTML() {},
      querySelector: element, querySelectorAll: () => [],
    });
    return nodes.get(selector);
  };
  const context = vm.createContext({
    URL, URLSearchParams, location,
    history: { state: {}, replaceState(_state: unknown, _title: string, next: URL) { location.href = next.href; } },
    localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
    document: {
      querySelector: element, querySelectorAll: () => [], createElement: () => element("created"),
      body: { prepend() {} }, addEventListener() {},
    },
    addEventListener() {},
    fetch: async () => ({ ok: true, json: async () => calendar }),
  });
  context.window = context;
  const run = (script: string) => vm.runInContext(source(`site/${script}.js`), context);
  run("content-data");
  run("shared");
  run("csv");
  context.AlburyCSV.load = async (file: string) => ({ text: source(file.split("?")[0]), source: "live" });
  return { context, element, location, run, story: context.AlburyStoryDate };
}

test("all food destinations are discoverable and gifts have one destination", () => {
  const { context, story } = browser("/ALBURY_WELCOME.html", new Map());
  assert.deepEqual(JSON.parse(JSON.stringify(context.ALBURY_CONTENT.navigation)), navigation);
  const destinations = new Set(navigation.food.map((entry: { href: string }) => entry.href));
  for (const route of ["food", "menus", "available", "drinks", "pantry"]) {
    assert.ok(destinations.has("ALBURY_CULINARY_MENU.html#" + route));
  }
  const foodGift = navigation.food.find((entry: { label: string }) => entry.label === "Gifts from Albury");
  const stayGift = navigation.stay.find((entry: { label: string }) => entry.label === "Gifts from Albury");
  assert.equal(new URL(foodGift.href, "https://albury-house.vercel.app").pathname, "/" + stayGift.href);
  assert.equal(story.date, "2025-08-11");
  assert.match(source("ALBURY_KITCHEN_LIBRARY.html"), /id="weekly-menu"[\s\S]*#today/);
});

test("story date follows the kitchen selection to weekly menus, weather and events", async () => {
  const selected = "2025-11-16";
  const storage = new Map<string, string>();
  const kitchen = browser("/ALBURY_CULINARY_MENU.html#today", storage);
  kitchen.run("menu-rotation");
  await kitchen.context.AlburyMenus.ready;
  assert.equal(kitchen.story.set("2025-02-29"), false);
  assert.equal(kitchen.story.set(selected), true);
  assert.equal(kitchen.context.AlburyMenus.date, selected);
  assert.equal(kitchen.location.searchParams.get("date"), selected);
  assert.equal(kitchen.location.hash, "#today");
  assert.equal(kitchen.story.link("ALBURY_WEATHER.html?date=2025-08-22"), "ALBURY_WEATHER.html?date=2025-08-22");
  assert.equal(kitchen.story.link("https://example.com/ALBURY_WEATHER.html"), "https://example.com/ALBURY_WEATHER.html");

  const weekly = browser(kitchen.story.link("ALBURY_WEEKLY_MENUS.html#special-menus"), storage);
  weekly.run("menu-rotation");
  await weekly.context.AlburyMenus.ready;
  const week = weekly.context.AlburyMenus.week();
  assert.equal(week[6][3].date, selected);
  assert.equal(week[6][3].lead, "Élodie Martin");

  const weather = browser("/ALBURY_WEATHER.html", storage, ["#welcome-weather"]);
  weather.run("weather");
  await new Promise(resolve => setImmediate(resolve));
  assert.match(weather.element("#weather-content").innerHTML, /Sunday, 16 November 2025/);
  weather.story.set("2026-09-01");
  assert.match(weather.element("#weather-content").innerHTML, /No daily weather is published/);
  assert.equal(weather.element("#weather-date").value, "2026-09-01");

  const events = browser("/ALBURY_LONDON_CALENDAR.html?date=" + selected, storage);
  events.run("calendar");
  await new Promise(resolve => setImmediate(resolve));
  assert.match(events.element("#event-count").textContent, /events on 16 Nov 2025/);
  assert.equal(events.location.searchParams.get("date"), selected);
  events.element("#event-month").value = "2025-12";
  events.element("#event-month").onchange();
  assert.match(events.element("#event-count").textContent, /in December 2025/);
  assert.equal(events.story.date, selected);
  events.story.set("2025-12-25");
  assert.match(events.element("#event-count").textContent, /on 25 Dec 2025/);
});

test("welcome weather and London events update without changing pages", async () => {
  const welcome = browser("/ALBURY_WELCOME.html?date=2025-11-16", new Map());
  welcome.run("weather");
  welcome.run("welcome-events");
  await new Promise(resolve => setImmediate(resolve));
  assert.match(welcome.element("#welcome-weather").innerHTML, /16 Nov/);
  assert.match(welcome.element("#welcome-events").innerHTML, /Coming up from 16 Nov 2025/);
  welcome.story.set("2025-12-25");
  assert.match(welcome.element("#welcome-weather").innerHTML, /25 Dec/);
  assert.match(welcome.element("#welcome-events").innerHTML, /Coming up from 25 Dec 2025/);
});
