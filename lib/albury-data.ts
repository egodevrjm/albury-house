import { createRequire } from "node:module";

const requireJson = createRequire(import.meta.url);
const houseSource = requireJson("../site/data/public/house.json");
const roomsSource = requireJson("../site/data/public/rooms.json");
const staffSource = requireJson("../site/data/public/staff.json");
const collectionsSource = requireJson("../site/data/public/collections.json");
const pantryGroupsSource = requireJson("../site/data/public/pantry.json");
const culinarySource = requireJson("../site/data/public/culinary.json");
const hospitalitySource = requireJson("../site/data/public/hospitality.json");
const assetsSource = requireJson("../site/data/public/assets.json");
const brandsSource = requireJson("../site/data/public/brands.json");
const pantryItemsSource = requireJson("../mcp-data/pantry-items.json");
const menusSource = requireJson("../mcp-data/menus.json");
const eventsSource = requireJson("../mcp-data/london-events.json");
const weatherSource = requireJson("../site/data/public/weather.json");

export const PUBLIC_BASE_URL = "https://albury-house.vercel.app";
export const STORY_DATE = "2025-08-11";

type Dict = Record<string, unknown>;

const house = houseSource as unknown as Dict;
const sections = (roomsSource as unknown as { tour: Dict[] }).tour;
const floors = sections.filter((section) => section.kind === "floor");
const outdoorAreas = sections.filter((section) => section.kind === "outdoor");
const staff = staffSource as unknown as { summary: Dict; people: Dict[]; servicePartners: Dict[]; asOf: string };
const collections = (collectionsSource as unknown as { collections: Dict[] }).collections;
const pantryGroups = (pantryGroupsSource as unknown as { preparations: Dict[] }).preparations;
const culinary = culinarySource as unknown as {
  programme: Dict;
  media: Record<string, Dict>;
  mediaGroups: Record<string, string[]>;
  availableFood: Dict[];
  featuredTeam: string[];
  serviceRoster: string[];
  asOf: string;
};
const hospitality = hospitalitySource as unknown as { principles: Dict; collections: Dict[] };
const assets = (assetsSource as unknown as { assets: Dict[] }).assets;
const brands = (brandsSource as unknown as { brands: Dict[] }).brands;
const pantryItems = pantryItemsSource as unknown as { summary: Dict; openingItems: Dict[]; seasonalRecipes: Dict[]; asOf: string };
const menus = menusSource as unknown as Dict[];
const events = eventsSource as unknown as Dict[];

type WeatherDay = {
  date: string; day: string; condition: string;
  highC: number; lowC: number; highF: number; lowF: number;
  precipitationMm: number; precipitationChancePct: number; windMph: number;
};
const weather = weatherSource as {
  location: string; timeZone: string; fictional: boolean; source: string;
  coverage: { start: string; end: string }; days: WeatherDay[];
};
const weatherByDate = new Map(weather.days.map(day => [day.date, day]));


function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (typeof value === "object") return Object.values(value as Dict).map(text).join(" ");
  return String(value);
}

function normalize(value: unknown): string {
  return text(value).toLocaleLowerCase("en-GB").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[‘’]/g, "'");
}

function matches(item: unknown, query?: string): boolean {
  if (!query?.trim()) return true;
  const haystack = normalize(item);
  return query.trim().toLocaleLowerCase("en-GB").split(/\s+/).every((term) => haystack.includes(term));
}

function slug(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function imageUrl(path: unknown): string | undefined {
  return typeof path === "string" && path ? `${PUBLIC_BASE_URL}/${path.replace(/^\//, "")}` : undefined;
}

function withImage<T extends Dict>(item: T): T & { imageUrl?: string } {
  const path = item.image ?? item.path;
  return { ...item, imageUrl: imageUrl(path) } as T & { imageUrl?: string };
}

function paginate<T>(items: T[], offset = 0, limit = 50) {
  const boundedOffset = Math.max(0, offset);
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  return { total: items.length, offset: boundedOffset, limit: boundedLimit, items: items.slice(boundedOffset, boundedOffset + boundedLimit) };
}

function isoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Expected an ISO date in YYYY-MM-DD form; received ${value}.`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid calendar date: ${value}.`);
  return date;
}

function dayDifference(a: Date, b: Date): number {
  return Math.floor((a.valueOf() - b.valueOf()) / 86_400_000);
}

function menuPosition(dateText: string) {
  const date = isoDate(dateText);
  const epoch = isoDate(STORY_DATE);
  const offset = dayDifference(date, epoch);
  const dayIndex = ((offset % 7) + 7) % 7;
  const weekIndex = Math.floor(offset / 7);
  const cycle = ((weekIndex % 2) + 2) % 2 + 1;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return { date: dateText, cycle, day: days[dayIndex], weekOffset: weekIndex };
}

function roomGroups() {
  return sections.flatMap((floor) => {
    const views = (floor.rooms as Dict[]) ?? [];
    const grouped = new Map<string, Dict[]>();
    for (const view of views) {
      const id = String(view.roomId ?? slug(view.roomName ?? view.title));
      grouped.set(id, [...(grouped.get(id) ?? []), withImage(view)]);
    }
    return [...grouped].map(([id, roomViews]) => ({
      id,
      name: String(roomViews[0]?.roomName ?? roomViews[0]?.title ?? id),
      sectionId: String(floor.id),
      sectionName: String(floor.name),
      kind: String(floor.kind),
      level: typeof floor.level === "string" ? floor.level : null,
      floorId: floor.kind === "floor" ? String(floor.id) : null,
      floorName: floor.kind === "floor" ? String(floor.name) : null,
      outdoorAreaId: floor.kind === "outdoor" ? String(floor.id) : null,
      studioName: roomViews[0]?.studioName ?? null,
      parentRoomId: roomViews[0]?.parentRoomId ?? null,
      containedRoomIds: roomViews[0]?.containedRoomIds ?? [],
      ceilingHeight: roomViews[0]?.ceilingHeight ?? null,
      comfortableCapacity: roomViews[0]?.comfortableCapacity ?? null,
      seatingArrangement: roomViews[0]?.seatingArrangement ?? null,
      description: String(roomViews[0]?.description ?? ""),
      viewCount: roomViews.length,
      views: roomViews,
    }));
  });
}

const allRooms = roomGroups();

function collectionItems(): Array<Dict & { id: string; collectionId: string; collectionName: string; imageUrl?: string }> {
  return collections.flatMap((collection) => ((collection.rooms as Dict[]) ?? []).map((item, index) => ({
    id: String(item.id ?? `${collection.id}-${String(index + 1).padStart(2, "0")}-${slug(item.title)}`),
    collectionId: String(collection.id),
    collectionName: String(collection.name),
    ...withImage(item),
  }) as Dict & { id: string; collectionId: string; collectionName: string; imageUrl?: string }));
}

const allCollectionItems = collectionItems();

function imageRecords() {
  const records = new Map<string, Dict>();
  const add = (item: Dict, kind: string, title?: unknown, description?: unknown) => {
    const path = item.image ?? item.path;
    if (typeof path !== "string" || !path) return;
    const asset = assets.find((candidate) => candidate.path === path);
    const id = String(asset?.id ?? item.id ?? slug(path));
    const existing = records.get(path) ?? {};
    records.set(path, {
      ...existing,
      id,
      path,
      url: imageUrl(path),
      kind,
      title: title ?? item.title ?? existing.title ?? id,
      description: description ?? item.description ?? existing.description ?? "",
    });
  };
  for (const asset of assets) add(asset, "asset");
  for (const room of allRooms) for (const view of room.views) add(view, "room", view.title, view.description);
  for (const item of allCollectionItems) add(item, "collection", item.title, item.description);
  for (const item of Object.values(culinary.media)) add(item, "culinary", item.title, item.description);
  for (const item of staff.people) add(item, "staff", item.name, `${item.role ?? ""} ${item.description ?? ""}`);
  for (const item of pantryGroups) add(item, "pantry", item.title, item.description);
  for (const item of hospitality.collections) {
    add(item, "hospitality", item.title, item.description);
    if (item.whitePath) add({ ...item, path: item.whitePath }, "hospitality", `${item.title} — white-led`, item.description);
  }
  return [...records.values()];
}

const allImages = imageRecords();

export function getSummary() {
  return {
    house,
    asOf: STORY_DATE,
    totals: {
      floors: floors.length,
      outdoorAreas: outdoorAreas.length,
      tourSections: sections.length,
      rooms: allRooms.length,
      roomViews: sections.reduce((sum, section) => sum + (((section.rooms as Dict[]) ?? []).length), 0),
      permanentStaff: staff.summary.permanentEmployees,
      scheduledSpecialists: staff.summary.scheduledSpecialists,
      externalPartners: staff.servicePartners.length,
      pantryOpeningItems: pantryItems.openingItems.length,
      collectionItems: allCollectionItems.length,
      images: allImages.length,
      calendarEvents: events.length,
    },
    purpose: "Closed-world, read-only reference for Albury House, its operation and its hospitality programme.",
  };
}

function matchesSection(section: Dict, id: string) {
  return [section.id, section.name, section.level, ...((section.aliases as string[]) ?? []), ...((section.legacyIds as string[]) ?? [])]
    .filter((value) => typeof value === "string").some((value) => normalize(value) === normalize(id));
}

function sectionSummary(section: Dict) {
  const { rooms: _views, ...metadata } = section;
  return {
    ...metadata,
    id: String(section.id),
    name: String(section.name),
    kind: String(section.kind),
    level: typeof section.level === "string" ? section.level : null,
    planUrl: imageUrl(section.plan),
    additionalPlans: ((section.additionalPlans as Dict[]) ?? []).map((plan) => ({ ...plan, planUrl: imageUrl(plan.path) })),
    uniqueRooms: allRooms.filter((room) => room.sectionId === section.id).length,
    views: ((section.rooms as Dict[]) ?? []).length,
  };
}

export function listFloors() {
  return floors.map(sectionSummary);
}

export function listOutdoorAreas() {
  return outdoorAreas.map(sectionSummary);
}

export function getFloor(id: string) {
  const floor = floors.find((item) => matchesSection(item, id));
  if (!floor) return undefined;
  return { ...sectionSummary(floor), rooms: allRooms.filter((room) => room.sectionId === floor.id) };
}

export function getOutdoorArea(id: string) {
  const area = outdoorAreas.find((item) => matchesSection(item, id));
  if (!area) return undefined;
  return { ...sectionSummary(area), rooms: allRooms.filter((room) => room.sectionId === area.id) };
}

export function listRooms(input: { floorId?: string; outdoorAreaId?: string; query?: string; offset?: number; limit?: number }) {
  const requestedSection = input.outdoorAreaId ?? input.floorId;
  // Legacy floor_id="garden" and floor_id="exterior" links still resolve to the combined outdoor area.
  const section = requestedSection ? sections.find((item) => matchesSection(item, requestedSection)) : undefined;
  const filtered = allRooms.filter((room) => (!requestedSection || room.sectionId === section?.id) && matches(room, input.query));
  return paginate(filtered.map(({ views, ...room }) => ({ ...room, primaryImage: views[0] })), input.offset, input.limit);
}

export function getRoom(id: string) {
  return allRooms.find((room) => room.id === id || normalize(room.name) === normalize(id));
}

export function listStaff(input: { department?: string; employmentType?: string; query?: string; offset?: number; limit?: number }) {
  const employment = normalize(input.employmentType);
  const filtered = staff.people.filter((person) => (!input.department || normalize(person.department) === normalize(input.department)) && (!employment || normalize(person.employmentType).startsWith(employment)) && matches(person, input.query));
  return { asOf: staff.asOf, summary: staff.summary, ...paginate(filtered.map(withImage), input.offset, input.limit) };
}

export function getStaffMember(id: string) {
  const person = staff.people.find((item) => item.id === id || normalize(item.name) === normalize(id));
  return person ? withImage(person) : undefined;
}

export function listPartners(query?: string) {
  return staff.servicePartners.filter((item) => matches(item, query));
}

export function getPartner(id: string) {
  return staff.servicePartners.find((item) => item.id === id || normalize(item.name) === normalize(id));
}

export function getMenuForDate(date: string) {
  const position = menuPosition(date);
  const meals = menus.filter((row) => Number(row.cycle) === position.cycle && row.day === position.day);
  return { ...position, sourceAnchor: STORY_DATE, rotation: "Two-week cycle; Cycle 1 begins Monday 11 August 2025.", theme: meals[0]?.theme ?? "", meals };
}

export function getMenuRange(startDate: string, days: number) {
  const start = isoDate(startDate);
  const boundedDays = Math.max(1, Math.min(days, 31));
  return {
    startDate,
    days: boundedDays,
    menus: Array.from({ length: boundedDays }, (_, index) => getMenuForDate(new Date(start.valueOf() + index * 86_400_000).toISOString().slice(0, 10))),
  };
}

export function listAvailableFood(query?: string) {
  return culinary.availableFood.filter((item) => matches(item, query)).map((item) => ({ ...item, media: culinary.media[String(item.mediaId)] ? withImage(culinary.media[String(item.mediaId)]) : undefined }));
}

export function listPantry(input: { category?: string; labelFamily?: string; includeSeasonal?: boolean; query?: string; offset?: number; limit?: number }) {
  const candidates = [...pantryItems.openingItems, ...(input.includeSeasonal ? pantryItems.seasonalRecipes : [])];
  const filtered = candidates.filter((item) => (!input.category || normalize(item.category) === normalize(input.category)) && (!input.labelFamily || normalize(item.labelFamily) === normalize(input.labelFamily)) && matches(item, input.query));
  return { asOf: pantryItems.asOf, summary: pantryItems.summary, categories: [...new Set(candidates.map((item) => item.category))].sort(), ...paginate(filtered.map(withImage), input.offset, input.limit) };
}

export function getPantryItem(id: string): Dict | undefined {
  const item = [...pantryItems.openingItems, ...pantryItems.seasonalRecipes].find((entry) => normalize(entry.id) === normalize(id) || normalize(entry.name) === normalize(id));
  if (!item) return undefined;
  const group = pantryGroups.find((candidate) => candidate.id === item.imageGroupId);
  return { ...withImage(item), imageGroup: group ? withImage(group) : undefined };
}

export function listDrinks(input: { category?: string; query?: string }) {
  const allowed = new Set(["house drink", "core cordial", "seasonal cordial", "cocktail"]);
  const drinks = Object.values(culinary.media).filter((item) => allowed.has(String(item.category)) && (!input.category || normalize(item.category) === normalize(input.category)) && matches(item, input.query)).map(withImage);
  return { houseDrinks: drinks, waterAndHouseBrands: brands.map((brand) => ({ ...brand, externalUrl: brand.externalUrl })) };
}

export function listCollectionCategories() {
  return collections.map((collection) => ({ id: collection.id, name: collection.name, short: collection.short, plan: collection.plan, planUrl: imageUrl(collection.plan), itemCount: ((collection.rooms as Dict[]) ?? []).length }));
}

export function listCollectionItems(input: { collectionId?: string; query?: string; offset?: number; limit?: number }) {
  const filtered = allCollectionItems.filter((item) => (!input.collectionId || item.collectionId === input.collectionId) && matches(item, input.query));
  return paginate(filtered, input.offset, input.limit);
}

export function getCollectionItem(id: string) {
  return allCollectionItems.find((item) => item.id === id || normalize(item.title) === normalize(id));
}

export function getGuestProvision(kind?: string) {
  const provisions = hospitality.collections.filter((item) => !kind || normalize(item.id).includes(normalize(kind)) || matches(item, kind)).map((item) => ({ ...withImage(item), whiteImageUrl: imageUrl(item.whitePath) }));
  return { principles: hospitality.principles, provisions };
}

export function searchImages(input: { query?: string; kind?: string; offset?: number; limit?: number }) {
  const filtered = allImages.filter((item) => (!input.kind || item.kind === input.kind) && matches(item, input.query));
  return paginate(filtered, input.offset, input.limit);
}

export function getImage(idOrPath: string) {
  return allImages.find((item) => item.id === idOrPath || item.path === idOrPath || normalize(item.title) === normalize(idOrPath));
}

export function eventsForDate(date: string, category?: string) {
  isoDate(date);
  return events.filter((event) => String(event.start_date) <= date && String(event.end_date) >= date && (!category || normalize(event.category) === normalize(category)));
}

export function listEvents(input: { startDate: string; endDate?: string; category?: string; query?: string; offset?: number; limit?: number }) {
  isoDate(input.startDate);
  const endDate = input.endDate ?? input.startDate;
  isoDate(endDate);
  if (endDate < input.startDate) throw new Error("endDate must be on or after startDate.");
  const filtered = events.filter((event) => String(event.start_date) <= endDate && String(event.end_date) >= input.startDate && (!input.category || normalize(event.category) === normalize(input.category)) && matches(event, input.query));
  return { startDate: input.startDate, endDate, ...paginate(filtered, input.offset, input.limit) };
}

export function getForecast(date: string) {
  isoDate(date);
  const day = weatherByDate.get(date);
  if (!day) throw new Error(`No authored weather available for ${date}. Available dates: ${weather.coverage.start} through ${weather.coverage.end}.`);
  return {
    ...day,
    location: weather.location,
    timeZone: weather.timeZone,
    fictional: weather.fictional,
    source: weather.source,
    coverage: { ...weather.coverage },
    forecastUrl: `${PUBLIC_BASE_URL}/ALBURY_WEATHER.html?date=${date}`,
  };
}

export function getDateContext(date: string) {
  return { date, menu: getMenuForDate(date), events: eventsForDate(date), weather: weatherByDate.has(date) ? getForecast(date) : null, weatherCoverage: { ...weather.coverage }, isStoryOpeningDate: date === STORY_DATE };
}

export function searchAlbury(input: { query: string; domains?: string[]; limit?: number }) {
  const domains = new Set(input.domains?.length ? input.domains : ["rooms", "staff", "partners", "pantry", "collections", "food", "events"]);
  const records: Dict[] = [];
  if (domains.has("rooms")) records.push(...allRooms.map((item) => ({ domain: "rooms", id: item.id, title: item.name, floor: item.floorName, section: item.sectionName, kind: item.kind, level: item.level, text: item.description })));
  if (domains.has("staff")) records.push(...staff.people.map((item) => ({ domain: "staff", id: item.id, title: item.name, text: `${item.role ?? ""}. ${item.remit ?? ""} ${item.description ?? ""}` })));
  if (domains.has("partners")) records.push(...staff.servicePartners.map((item) => ({ domain: "partners", id: item.id, title: item.name, text: `${item.type ?? ""}. ${item.remit ?? ""}` })));
  if (domains.has("pantry")) records.push(...[...pantryItems.openingItems, ...pantryItems.seasonalRecipes].map((item) => ({ domain: "pantry", id: item.id, title: item.name, text: `${item.category ?? ""}. ${item.uses ?? ""} ${item.openingAvailability ?? ""}` })));
  if (domains.has("collections")) records.push(...allCollectionItems.map((item) => ({ domain: "collections", id: item.id, title: item.title, collection: item.collectionName, text: item.description })));
  if (domains.has("food")) records.push(...Object.values(culinary.media).map((item) => ({ domain: "food", id: item.id, title: item.title, text: `${item.category ?? ""}. ${item.description ?? ""}` })));
  if (domains.has("events")) records.push(...events.map((item) => ({ domain: "events", id: item.id, title: item.title, text: `${item.category ?? ""}. ${item.location ?? ""}. ${item.description ?? ""}`, startDate: item.start_date, endDate: item.end_date })));
  const filtered = records.filter((item) => matches(item, input.query));
  return { query: input.query, total: filtered.length, results: filtered.slice(0, Math.max(1, Math.min(input.limit ?? 20, 50))) };
}

export const testOnly = { menuPosition, allRooms, allCollectionItems, allImages, menus, events };
