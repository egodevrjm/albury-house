import assert from "node:assert/strict";
import test from "node:test";

import {
  eventsForDate,
  getDateContext,
  getFloor,
  getOutdoorArea,
  getMenuForDate,
  getPantryItem,
  getRoom,
  getSummary,
  listEvents,
  listFloors,
  listOutdoorAreas,
  listPantry,
  listPartners,
  listRooms,
  listStaff,
  searchImages,
} from "../lib/albury-data.js";

test("summary exposes the complete Albury reference", () => {
  const summary = getSummary();
  assert.equal(summary.asOf, "2025-08-11");
  assert.equal(summary.totals.floors, 7);
  assert.equal(summary.totals.outdoorAreas, 1);
  assert.equal(summary.totals.tourSections, 8);
  assert.equal(summary.totals.permanentStaff, 36);
  assert.equal(summary.totals.scheduledSpecialists, 5);
  assert.equal(summary.totals.externalPartners, 6);
  assert.equal(summary.totals.pantryOpeningItems, 33);
  assert.ok(Number(summary.totals.rooms) > 80);
  assert.ok(summary.totals.images > 400);
});

test("named internal floors are distinct from the combined outdoor area", () => {
  assert.deepEqual(listFloors().map((floor) => [floor.name, floor.level]), [
    ["Albury Spa", "Lower Basement"],
    ["Club Alex", "Upper Basement"],
    ["Raised Ground", "Raised Ground"],
    ["Music Nobile", "First Floor"],
    ["Principal guest suites", "Second Floor"],
    ["The Dorm", "Third Floor"],
    ["Alex's Apartment", "Top Floor"],
  ]);
  assert.equal(getFloor("Music Nobile")?.name, "Music Nobile");
  assert.equal(getFloor("Studio Albury"), undefined);
  assert.equal(getFloor("Albury Spa")?.level, "Lower Basement");
  assert.equal(getFloor("Alex’s Apartment")?.level, "Top Floor");
  assert.equal(getFloor("garden"), undefined);
  assert.equal(getFloor("exterior"), undefined);
  assert.equal(listOutdoorAreas().length, 1);
  const outside = getOutdoorArea("garden");
  assert.equal(outside?.name, "Exterior & Garden");
  assert.equal(outside?.kind, "outdoor");
  assert.equal(outside?.level, null);
  assert.ok(outside?.rooms.some((room) => room.id === "front-elevation"));
  assert.ok(outside?.rooms.some((room) => room.id === "far-garden-salon"));
  assert.ok(outside?.rooms.every((room) => room.floorId === null));
  assert.deepEqual(listRooms({ floorId: "garden" }), listRooms({ outdoorAreaId: "exterior" }));
});

test("Studio Albury is within Music Nobile and both normal-height booths are inside its live room", () => {
  assert.equal(getSummary().house.name, "Albury House");
  const live = getRoom("live-tracking-room");
  const control = getRoom("control-room");
  assert.equal(live?.floorName, "Music Nobile");
  assert.equal(control?.floorName, "Music Nobile");
  assert.equal(live?.studioName, "Studio Albury");
  assert.equal(control?.studioName, "Studio Albury");
  assert.equal(getRoom("rec-room")?.studioName, null);
  assert.equal(live?.ceilingHeight, "double height");
  assert.deepEqual(live?.containedRoomIds, ["vocal-booth", "instrument-isolation-booth"]);
  const voice = getRoom("vocal-booth");
  const strings = getRoom("instrument-isolation-booth");
  for (const booth of [voice, strings]) {
    assert.equal(booth?.parentRoomId, "live-tracking-room");
    assert.equal(booth?.ceilingHeight, "normal room height");
  }
  assert.equal(voice?.comfortableCapacity, "3–4 people");
  assert.equal(strings?.comfortableCapacity, "string quartet (4 musicians)");
  assert.equal(strings?.seatingArrangement, "in the round");
});

test("menu rotation remains anchored to Monday 11 August 2025", () => {
  const opening = getMenuForDate("2025-08-11");
  assert.equal(opening.cycle, 1);
  assert.equal(opening.day, "Monday");
  assert.equal(opening.meals.length, 3);
  assert.deepEqual(opening.meals.map((meal) => meal.meal), ["Breakfast", "Lunch", "Dinner"]);

  const following = getMenuForDate("2025-08-18");
  assert.equal(following.cycle, 2);
  assert.equal(following.day, "Monday");
  assert.equal(getMenuForDate("2025-08-25").cycle, 1);
  assert.equal(getMenuForDate("2025-08-10").cycle, 2);
});

test("pantry exposes every P-number and seasonal recipes only on request", () => {
  const opening = listPantry({ includeSeasonal: false });
  assert.equal(opening.total, 33);
  assert.equal(getPantryItem("P26")?.labelFamily, "albury-drinks");
  assert.match(String(getPantryItem("P05")?.uses), /Hatfield bourbon/);
  assert.equal(listPantry({ includeSeasonal: true }).total, 35);
});

test("rooms group coherent views and expose public images", () => {
  const bar = getRoom("bar-games-room");
  assert.equal(bar?.floorId, "upper-basement");
  assert.ok((bar?.views.length ?? 0) > 1);
  assert.match(String(bar?.views[0].imageUrl), /^https:\/\/albury-house\.vercel\.app\/images\//);
  assert.ok(listRooms({ floorId: "upper-basement", query: "bar" }).total > 0);
});

test("staff and partners preserve the opening establishment", () => {
  assert.equal(listStaff({ employmentType: "permanent" }).total, 36);
  assert.equal(listStaff({ employmentType: "scheduled" }).total, 5);
  assert.equal(listPartners().length, 6);
  assert.equal(listPartners("studio")[0]?.name, "Miloco");
});

test("event lookup uses inclusive overlap semantics", () => {
  const openingEvents = eventsForDate("2025-08-11");
  assert.ok(openingEvents.some((event) => event.id === "bbc-proms-2025"));
  const range = listEvents({ startDate: "2026-06-14", endDate: "2026-06-14", query: "Queen" });
  assert.ok(range.items.some((event) => event.id === "queens-cup"));
  assert.equal(getDateContext("2025-08-11").isStoryOpeningDate, true);
});

test("image search returns directly viewable URLs", () => {
  const result = searchImages({ query: "Bethan bread", limit: 10 });
  assert.ok(result.total >= 1);
  assert.ok(result.items.every((item) => String(item.url).startsWith("https://albury-house.vercel.app/")));
});
