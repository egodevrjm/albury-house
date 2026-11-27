import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(summary.totals.permanentStaff, 48);
  assert.equal(summary.totals.scheduledSpecialists, 5);
  assert.equal(summary.totals.externalPartners, 13);
  assert.equal(summary.totals.pantryOpeningItems, 47);
  assert.equal(summary.totals.pantrySeasonalRecipes, 2);
  assert.equal(summary.totals.pantryImageGroups, 21);
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

test("floor-plan PDFs appear alongside the current floor diagram", () => {
  const [housePlan] = getSummary().house.floorPlanDocuments;
  const floor = getFloor("upper-basement");
  const room = getRoom("bar-games-room");
  const backstage = getRoom("backstage-store-preparation-room");
  const clubPlan = floor?.floorPlanDocuments?.[0];
  assert.ok(floor?.planUrl?.endsWith(".svg"));
  assert.equal(housePlan?.status, "concept-study");
  assert.equal(clubPlan?.status, "layout-study");
  assert.deepEqual(room?.floorPlanDocuments, [clubPlan]);
  assert.deepEqual(backstage?.floorPlanDocuments, [clubPlan]);
  assert.equal(getFloor("raised-ground")?.floorPlanDocuments, undefined);

  for (const document of [housePlan, clubPlan]) {
    assert.ok(document);
    assert.equal(document.mimeType, "application/pdf");
    const path = new URL(document.url).pathname;
    assert.equal(readFileSync(new URL(`..${path}`, import.meta.url)).subarray(0, 5).toString(), "%PDF-");
  }
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
  assert.equal(live?.ceilingHeight, "east half double height; west half normal room height");
  assert.equal((live?.dimensions as { widthFt?: number })?.widthFt, 100);
  assert.equal((live?.eventCapacity as { standing?: number })?.standing, 200);
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

test("opening-day menus include kitchen lead and standing breakfast provision", () => {
  const opening = getMenuForDate("2025-08-11");
  assert.equal(opening.covered, true);
  assert.equal(opening.day, "Monday");
  assert.equal(opening.kitchenLead, "Élodie Martin");
  assert.deepEqual(opening.meals.map((meal) => meal.meal), ["Breakfast", "Lunch", "Dinner"]);
  assert.match(String(opening.meals[0].main), /Continental breakfast/);
  assert.equal(opening.meals[1].dishId, "L01");
  assert.equal(opening.snackOptions.length, 2);
});

test("pantry exposes every P-number and seasonal recipes only on request", () => {
  const opening = listPantry({ includeSeasonal: false });
  assert.equal(opening.total, 47);
  assert.deepEqual(opening.items.map((item) => item.id), Array.from({ length: 47 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`));
  assert.equal(opening.summary.imageGroups, 21);
  assert.equal(opening.summary.seasonalRecipes, 2);
  assert.ok(opening.categories.includes("house sauces"));
  assert.equal(getPantryItem("P26")?.labelFamily, "albury-drinks");
  assert.equal(getPantryItem("P26")?.specificationLead, "crispin-vale");
  assert.equal(getPantryItem("P26")?.productionLead, "rafael-bellocq");
  assert.match(String(getPantryItem("P26")?.productionNotes), /vanilla syrup/);
  assert.match(String(getPantryItem("P05")?.uses), /Hatfield bourbon/);
  assert.equal(listPantry({ includeSeasonal: true }).total, 49);
  for (const [id, name, group] of [
    ["P34", "Albury brown sauce", "11-house-sauces"],
    ["P35", "Espelette chilli sauce", "11-house-sauces"],
    ["P36", "Salted caramel sauce", "11-house-sauces"],
    ["P37", "Chocolate fudge sauce", "11-house-sauces"],
    ["P38", "Cherry and bourbon swirl ice cream", "10-house-ice-creams"],
  ]) {
    const item = getPantryItem(id);
    assert.equal(item?.name, name);
    assert.equal(item?.imageGroupId, group);
    assert.equal(item?.labelFamily, "pantry");
    assert.match(String(item?.imageUrl), /^https:\/\/albury-house\.vercel\.app\/images\//);
  }
  assert.deepEqual((getPantryItem("P34")?.imageGroup as { ids: string[] }).ids, ["P34", "P35", "P36", "P37"]);
  assert.deepEqual((getPantryItem("P38")?.imageGroup as { ids: string[] }).ids, ["P29", "P30", "P38"]);
  for (const [id, name] of [["P39", "White peach and thyme cordial"], ["P40", "Pink grapefruit and rosemary cordial"], ["P41", "Pear and green cardamom cordial"], ["P42", "Demerara syrup"]]) {
    const item = getPantryItem(id);
    assert.equal(item?.name, name);
    assert.equal(item?.labelFamily, "albury-drinks");
    assert.equal(item?.imageGroupId, "12-house-drinks");
    assert.equal(item?.specificationLead, "crispin-vale");
    assert.equal(item?.productionLead, "rafael-bellocq");
  }
});

test("rooms group coherent views and expose public images", () => {
  const bar = getRoom("bar-games-room");
  assert.equal(bar?.floorId, "upper-basement");
  assert.ok((bar?.views.length ?? 0) > 1);
  assert.match(String(bar?.views[0].imageUrl), /^https:\/\/albury-house\.vercel\.app\/images\//);
  assert.ok(listRooms({ floorId: "upper-basement", query: "bar" }).total > 0);
});

test("staff and partners preserve the opening establishment", () => {
  assert.equal(listStaff({ employmentType: "permanent" }).total, 48);
  assert.equal(listStaff({ employmentType: "scheduled" }).total, 5);
  assert.equal(listPartners().length, 13);
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

test("repeated room names cannot silently resolve to another floor", () => {
  const all = listRooms({limit:100}).items;
  assert.equal(new Set(all.map(room => room.id)).size, all.length);
  const upper = getRoom("second-floor/rear-service-landing");
  const ground = getRoom("raised-ground/rear-service-landing");
  assert.equal(upper?.floorId, "second-floor");
  assert.equal(ground?.floorId, "raised-ground");
  assert.ok(upper?.views.every(view => String(view.path).includes("second-floor")));
  assert.equal(getRoom("rear-service-landing", "second-floor")?.id, upper?.id);
  assert.throws(() => getRoom("rear-service-landing"), /Ambiguous room/);
});

test("staff biographies, descriptions and portraits are complete in the intended fields", async () => {
  const { existsSync } = await import("node:fs");
  const people = listStaff({limit:100}).items;
  for (const person of people) {
    assert.ok(person.image && person.imageAlt, String(person.id));
    assert.ok(existsSync(String(person.image)), String(person.image));
    assert.doesNotMatch(String(person.description), /original.*establishment|placeholder|TBD/i);
  }
  for (const id of ["denise-barrett", "gareth-palmer", "lewis-donnelly"]) {
    const person = people.find(person => person.id === id)!;
    assert.ok(String(person.career).length > 80);
    assert.doesNotMatch(String(person.remit), /-born|-raised|began in|worked restaurant/);
  }
  assert.doesNotMatch(String(people.find(person => person.id === "clem-frobisher")?.remit), /No\. 34|planning|Cedars/);
  assert.doesNotMatch(getRoom("staff-overnight-room")!.description, /No\. 34|Cedars|planning/);
  assert.ok(listRooms({limit:100}).items.every(room => room.name.length < 100));
});

test("the published figures distinguish the room, the club footprint and the whole house", () => {
  const bar = getRoom("bar-games-room");
  assert.match(bar?.description ?? "", /full 100-foot width/);
  assert.equal((bar?.dimensions as { depthFt?: number })?.depthFt, 45);
  assert.equal((bar?.eventCapacity as { standing?: number })?.standing, 250);
  const eventCapacity = getSummary().house.eventCapacity as { inStoryClubFloorSafetyLimit: number; plannedWholeHouseGuestLimit: number };
  assert.equal(eventCapacity.inStoryClubFloorSafetyLimit, 400);
  assert.equal(eventCapacity.plannedWholeHouseGuestLimit, 800);
});
