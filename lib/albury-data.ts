import { applyContentEdits, readContent, type Content, type ContentKey } from "./content-edits.js";
import { pantryPublic, updateProduce, type Pantry } from "./pantry-public.js";
import type { Revision } from "./room-editor-store.js";
import { applyCollectionEdits, collectionItemId, type Collection } from "./collection-edits.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { roomEditorStore, type RoomEditorStore } from "./room-editor-store.js";
import { applyRoomViewEdits, type TourSection } from "./room-views.js";

const requireJson = createRequire(import.meta.url);
const houseSource = requireJson("../site/data/public/house.json");
const roomsSource = requireJson("../site/data/public/rooms.json");
const staffSource = requireJson("../site/data/public/staff.json");
const collectionsSource = requireJson("../site/data/public/collections.json");
const pantryGroupsSource = requireJson("../site/data/public/pantry.json");
const culinarySource = requireJson("../site/data/public/culinary.json");
const hospitalitySource = requireJson("../site/data/public/hospitality.json");
const powderSuiteSource = requireJson("../site/data/public/powder-suite-2026-11-25.json");
const basementRefreshSource = requireJson("../site/data/public/upper-basement-views-2026-11-25.json");
const assetsSource = requireJson("../site/data/public/assets.json");
const brandsSource = requireJson("../site/data/public/brands.json");
const pantryItemsSource = requireJson("../mcp-data/pantry-items.json");
const menusSource = requireJson("../site/data/public/menus.json");
const eventsSource = requireJson("../mcp-data/london-events.json");
const weatherSource = requireJson("../site/data/public/weather.json");
const floorPlanDocumentsSource = requireJson("../mcp-data/floor-plan-documents.json");

export const PUBLIC_BASE_URL = "https://albury-house.vercel.app";
export const STORY_DATE = "2025-08-11";

const DRINK_SERVICE_CONTEXT = "Drinks are available choices, not automatic orders. A known favourite does not imply a recurring order or service ritual. Ordinary drinks usually stay off page unless chosen by Ryan or relevant to the immediate activity; existing played orders remain that scene's choices.";

type Dict = Record<string, unknown>;

type ViewUpdate = { legacyPath: string; view: Dict; asset: Dict };

const basementRefresh = basementRefreshSource as {
  sectionId: string;
  views: ViewUpdate[];
};
const house = houseSource as unknown as Dict;
const floorPlanDocuments = (source: typeof floorPlanDocumentsSource) => (source as Array<{
  id: string;
  title: string;
  path: string;
  mimeType?: string;
  status: string;
  notes: string;
  floorId?: string;
  roomIds?: string[];
}>).map(({ path, mimeType = "application/pdf", ...document }) => ({
  ...document,
  mimeType,
  url: `${PUBLIC_BASE_URL}${path}`,
}));
const powderSuite = powderSuiteSource as {
  sectionId: string;
  roomId: string;
  views: ViewUpdate[];
};
const powderViews = new Map(powderSuite.views.map(entry => [entry.legacyPath, entry]));
const refreshedViews = new Map(basementRefresh.views.map(entry => [entry.legacyPath, entry.view]));
const updatedAssets = new Map(
  [...powderSuite.views, ...basementRefresh.views].map(entry => [entry.legacyPath, entry.asset])
);
const roomViewUpdates = requireJson("../site/data/public/room-views-2026-11-25.json") as Array<{
  section: string;
  anchor: string;
  view: Dict;
  asset: Dict;
  replace?: boolean;
}>;
const roomViewAssets: Dict[] = [];
export const baseTourSections = (roomsSource as unknown as { tour: TourSection[] }).tour.map(section => {
  const hasPowderViews = section.id === powderSuite.sectionId;
  const hasRefreshedViews = section.id === basementRefresh.sectionId;
  const newViews = roomViewUpdates.filter(entry => entry.section === section.id);
  if (!hasPowderViews && !hasRefreshedViews && !newViews.length) return section;

  const rooms = (section.rooms as Dict[]).map(view => {
    const path = String(view.path);
    if (hasPowderViews && view.roomId === powderSuite.roomId) {
      return powderViews.get(path)?.view ?? view;
    }
    const refresh = hasRefreshedViews ? refreshedViews.get(path) : undefined;
    return refresh ? { ...view, ...refresh } : view;
  });
  for (const { anchor, view, replace, asset } of newViews) {
    const index = rooms.findIndex(candidate => candidate.path === anchor);
    if (index < 0) continue;
    const updated = { ...rooms[index], ...view };
    if (!replace) {
      delete updated.legacySlugs;
      delete updated.configurationId;
    }
    rooms.splice(index + (replace ? 0 : 1), replace ? 1 : 0, updated);
    roomViewAssets.push(asset);
  }
  return { ...section, rooms: rooms as TourSection["rooms"] };
});

const staff = staffSource as unknown as { summary: Dict; people: Dict[]; servicePartners: Dict[]; asOf: string };
export const baseCollections = (collectionsSource as { collections: Collection[] }).collections;
const pantryGroups = (pantryGroupsSource as unknown as { preparations: Dict[] }).preparations;
const culinary = culinarySource as unknown as {
  programme: Dict;
  media: Record<string, Dict>;
  mediaGroups: Record<string, string[]>;
  availableFood: Dict[];
  signatureBakes: Dict[];
  cordialServes: Dict[];
  menuPhotos: Dict[];
  featuredTeam: string[];
  serviceRoster: string[];
  asOf: string;
};
const hospitality = hospitalitySource as unknown as { principles: Dict; collections: Dict[] };
const assets = (assetsSource as unknown as { assets: Dict[] }).assets.map(asset =>
  updatedAssets.get(String(asset.path)) ?? asset
).concat(roomViewAssets);
const brands = (brandsSource as unknown as { brands: Dict[] }).brands;
const pantryItems = pantryItemsSource as Pantry;
const menus = menusSource.menus as Dict[];

const specialMenusSource = requireJson("../site/data/public/special-menus.json");
const specialMenus = specialMenusSource.menus as Array<{ id: string; name: string; occasion: string; season: string; meal: string; notes: string; menu: Dict }>;
function menuSeason(date: string): string {
  const month = isoDate(date).getUTCMonth() + 1;
  const seasons = currentCatalogue().content.menus.seasonMonths;
  const match = Object.entries(seasons).find(([, months]) => months.includes(month));
  if (!match) throw new Error(`No menu season for ${date}.`);
  return match[0];
}

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
type CatalogueResources = Content & {
  house: Dict; rooms: Dict & { tour: TourSection[] }; staff: typeof staff; pantry: Pantry;
  pantryGroups: Dict & { preparations: Dict[] }; collections: Dict & { collections: Collection[] };
  culinary: typeof culinary; hospitality: typeof hospitality; brands: Dict & { brands: Dict[] };
  menus: Dict & { menus: Dict[]; seasonMonths: Record<string, number[]> };
  specialMenus: Dict & { menus: typeof specialMenus }; floorPlans: typeof floorPlanDocumentsSource;
  events: Dict[]; weather: typeof weather; pageCopy: Record<string, Array<{ id: string }>>;
};

const baseContent: CatalogueResources = {
  house, rooms: { ...roomsSource, tour: baseTourSections }, staff, pantry: pantryItems,
  pantryGroups: { ...pantryGroupsSource, preparations: pantryGroups },
  collections: { ...collectionsSource, collections: baseCollections },
  culinary, hospitality, brands: { ...brandsSource, brands }, menus: { ...menusSource, menus,
    seasonMonths: menusSource.seasonMonths as Record<string, number[]> },
  specialMenus: { ...specialMenusSource, menus: specialMenus },
  floorPlans: floorPlanDocumentsSource, events, weather,
  walk: requireJson("../site/data/public/walk.json"),
  houseStyle: requireJson("../site/data/public/house-style.json"),
  houseAtWork: requireJson("../site/data/public/house-at-work.json"),
  pageCopy: requireJson("../site/data/public/page-copy.json") as Record<string, Array<{ id: string }>>,
};

export function contentAtRevision(revision: Pick<Revision, "edits" | "collectionEdits" | "contentEdits">): typeof baseContent {
  const initial = { ...baseContent, rooms: { ...baseContent.rooms, tour: applyRoomViewEdits(baseTourSections, revision.edits) },
    collections: { ...baseContent.collections,
      collections: applyCollectionEdits(baseCollections, revision.collectionEdits ?? []) } };
  const content = applyContentEdits(initial, revision.contentEdits ?? []) as typeof baseContent;
  return content;
}

export function visibleContent(content: typeof baseContent) {
  const publishedPantry = content.pantry;
  const staffDirectory = content.staff;
  const productsChanged = publishedPantry !== pantryItems;
  const staffChanged = staffDirectory !== staff;
  const collections = productsChanged ? updateProduce(content.collections.collections, pantryItems, publishedPantry)
    : content.collections.collections;
  const locatedCollections: Collection[] = content.rooms.tour === baseTourSections &&
      content.collections.collections === baseCollections ? collections : collections.map(collection => ({
    ...collection, rooms: collection.rooms.map(item => {
      if (!item.location) return item;
      const room = content.rooms.tour.find(section => section.id === item.location!.sectionId)
        ?.rooms.find(view => view.roomId === item.location!.roomId);
      return room?.roomName ? { ...item, location: { ...item.location, roomName: room.roomName } } : item;
    }),
  }));
  return {
    ...content,
    collections: { ...content.collections, collections: locatedCollections },
    pantry: productsChanged ? { ...publishedPantry, summary: { ...publishedPantry.summary,
      openingItems: publishedPantry.openingItems.length, seasonalRecipes: publishedPantry.seasonalRecipes.length,
      imageGroups: content.pantryGroups.preparations.length } } : publishedPantry,
    staff: staffChanged ? { ...staffDirectory, summary: { ...staffDirectory.summary,
      permanentEmployees: staffDirectory.people.filter(person => person.employmentType === "permanent").length,
      scheduledSpecialists: staffDirectory.people.filter(person => String(person.employmentType).startsWith("scheduled")).length,
      servicePartners: staffDirectory.servicePartners.length,
      departments: new Set(staffDirectory.people.map(person => person.department)).size } } : staffDirectory,
  };
}

export function publicContentUpdates(revision: Pick<Revision, "edits" | "collectionEdits" | "contentEdits">) {
  const updates = new Set((revision.contentEdits ?? []).map(edit => edit.resource));
  if (!updates.size) return {};
  const content = visibleContent(contentAtRevision(revision));
  const published: Record<string, unknown> = {};
  if (updates.has("rooms")) published.collections = content.collections;
  for (const resource of updates) {
    if (resource === "pantry") {
      const originalProducts = new Map([...pantryItems.openingItems, ...pantryItems.seasonalRecipes].map(item => [item.id, JSON.stringify(item)]));
      const changedIds = [...content.pantry.openingItems, ...content.pantry.seasonalRecipes]
        .filter(item => originalProducts.get(item.id) !== JSON.stringify(item)).map(item => item.id);
      published.pantryProducts = { ...pantryPublic(content.pantry), changedIds };
      published.collections = content.collections;
    } else if (resource === "pageCopy") {
      published.pageCopy = Object.fromEntries(Object.entries(content.pageCopy).map(([page, items]) => {
        const originals = new Map((baseContent.pageCopy[page] ?? []).map(item => [item.id, JSON.stringify(item)]));
        return [page, items.filter(item => originals.get(item.id) !== JSON.stringify(item))];
      }).filter(([, records]) => records.length));
    } else {
      published[({ pantryGroups: "pantry", specialMenus: "special-menus",
        houseStyle: "house-style", houseAtWork: "house-at-work" } as Record<string, string>)[resource] ?? resource] = content[resource];
    }
  }
  return published;
}


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
  return normalize(query.trim()).split(/\s+/).every((term) => haystack.includes(term));
}

function slug(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function imageUrl(path: unknown, version?: unknown): string | undefined {
  return typeof path === "string" && path ? `${PUBLIC_BASE_URL}/${path.replace(/^\//, "")}${version ? `?v=${encodeURIComponent(String(version))}` : ""}` : undefined;
}

function withImage<T extends Dict>(item: T): T & { imageUrl?: string } {
  const path = item.image ?? item.path;
  return { ...item, imageUrl: imageUrl(path, item.imageVersion) } as T & { imageUrl?: string };
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

function roomGroups(sections: TourSection[], collections: Collection[]) {
  const artworkCollection = collections.find(collection => collection.id === "art");
  const artworkByRoom = new Map<string, Dict[]>();
  for (const item of artworkCollection?.rooms ?? []) {
    if (!item.location) continue;
    const { sectionId, roomId, placement } = item.location;
    const key = `${sectionId}/${roomId}`;
    const entries = artworkByRoom.get(key) ?? [];
    entries.push({ id: item.id, title: item.title, artist: item.artist, placement });
    artworkByRoom.set(key, entries);
  }
  return sections.flatMap((floor) => {
    const views = (floor.rooms as Dict[]) ?? [];
    const grouped = new Map<string, Dict[]>();
    for (const view of views) {
      const id = String(view.roomId ?? slug(view.roomName ?? view.title));
      grouped.set(id, [...(grouped.get(id) ?? []), withImage(view)]);
    }
    return [...grouped].map(([id, roomViews]) => ({
      id: sections.filter(section => ((section.rooms as Dict[]) ?? []).some(view => view.roomId === id)).length > 1 ? `${floor.id}/${id}` : id,
      localId: id,
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
      dimensions: roomViews[0]?.dimensions ?? null,
      eventCapacity: roomViews[0]?.eventCapacity ?? null,
      seatingArrangement: roomViews[0]?.seatingArrangement ?? null,
      defaultConfigurationId: roomViews[0]?.defaultConfigurationId ?? null,
      configurations: ((roomViews[0]?.configurations as Dict[]) ?? []).map(withImage),
      description: String(roomViews[0]?.roomDescription ?? roomViews[0]?.description ?? ""),
      artworks: artworkByRoom.get(`${floor.id}/${id}`),
      viewCount: roomViews.length,
      views: roomViews,
    }));
  });
}

function collectionItems(collections: Collection[]): Array<Dict & { id: string; collectionId: string; collectionName: string; imageUrl?: string }> {
  return collections.flatMap((collection) => collection.rooms.map((item, index) => ({
    id: collectionItemId(collection, item, index),
    collectionId: String(collection.id),
    collectionName: String(collection.name),
    ...withImage(item),
  }) as Dict & { id: string; collectionId: string; collectionName: string; imageUrl?: string }));
}

function imageRecords(rooms: ReturnType<typeof roomGroups>, items: ReturnType<typeof collectionItems>, content: typeof baseContent) {
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
      url: imageUrl(path, item.imageVersion),
      kind,
      title: title ?? item.title ?? existing.title ?? id,
      description: description ?? item.description ?? existing.description ?? "",
    });
  };
  for (const asset of assets) add(asset, "asset");
  for (const room of rooms) for (const view of room.views) add(view, "room", view.title, view.description);
  for (const item of items) add(item, "collection", item.title, item.description);
  for (const item of Object.values(content.culinary.media)) add(item, "culinary", item.title, item.description);
  for (const item of content.staff.people) add(item, "staff", item.name, `${item.role ?? ""} ${item.description ?? ""}`);
  for (const item of content.pantryGroups.preparations) add(item, "pantry", item.title, item.description);
  for (const item of [...content.pantry.openingItems, ...content.pantry.seasonalRecipes]) add(item, "pantry", item.name, `${item.category ?? ""}. ${item.uses ?? ""}`);
  for (const item of content.hospitality.collections) {
    add(item, "hospitality", item.title, item.description);
    if (item.whitePath) add({ ...item, path: item.whitePath }, "hospitality", `${item.title} — white-led`, item.description);
  }
  return [...records.values()];
}

function buildCatalogue(resources: typeof baseContent) {
  const content = visibleContent(resources);
  const sections: TourSection[] = content.rooms.tour;
  const collections = content.collections.collections;
  const rooms = roomGroups(sections, collections);
  const items = collectionItems(collections);
  const weatherByDate = new Map(content.weather.days.map(day => [day.date, day]));
  const menuPhotos = new Map(content.culinary.menuPhotos.map(photo =>
    [[photo.season, photo.cycle, photo.day, photo.meal, photo.main].join("|"), photo]));
  return { sections, rooms, collections, items, content, weatherByDate, menuPhotos, images: imageRecords(rooms, items, content) };
}

const builtInCatalogue = buildCatalogue(baseContent);
const catalogueContext = new AsyncLocalStorage<typeof builtInCatalogue>();
let cachedCatalogue: { store: RoomEditorStore; revision: number; value: typeof builtInCatalogue } | undefined;

function currentCatalogue() {
  return catalogueContext.getStore() ?? builtInCatalogue;
}

export async function withPublishedRoomCatalogue<T>(operation: () => T, store = roomEditorStore()): Promise<T> {
  if (!store) return operation();
  let catalogue: typeof builtInCatalogue;
  try {
    const { state } = await store.load();
    const revision = state.current;
    if (cachedCatalogue?.store !== store || cachedCatalogue.revision !== revision.id) {
      cachedCatalogue = { store, revision: revision.id, value: buildCatalogue(contentAtRevision(revision)) };
    }
    catalogue = cachedCatalogue.value;
  } catch {
    console.error("The published room-view revision could not be loaded.");
    catalogue = builtInCatalogue;
  }
  return catalogueContext.run(catalogue, operation);
}

export function getReferenceContent(resource: ContentKey, path: string[]) {
  const catalogue = currentCatalogue();
  if (resource === "pantry") return readContent(pantryPublic(catalogue.content.pantry), path);
  return readContent(catalogue.content[resource], path);
}

export function getSummary() {
  const { sections, rooms, images, items } = currentCatalogue();
  return {
    house: { ...currentCatalogue().content.house, floorPlanDocuments: floorPlanDocuments(currentCatalogue().content.floorPlans).filter((document) => !document.floorId) } as typeof house & {
      floorPlanDocuments: ReturnType<typeof floorPlanDocuments>;
    },
    asOf: currentCatalogue().content.house.storyDate ?? STORY_DATE,
    totals: {
      floors: sections.filter(section => section.kind === "floor").length,
      outdoorAreas: sections.filter(section => section.kind === "outdoor").length,
      tourSections: sections.length,
      rooms: rooms.length,
      roomViews: sections.reduce((sum, section) => sum + (((section.rooms as Dict[]) ?? []).length), 0),
      permanentStaff: currentCatalogue().content.staff.summary.permanentEmployees,
      scheduledSpecialists: currentCatalogue().content.staff.summary.scheduledSpecialists,
      externalPartners: currentCatalogue().content.staff.servicePartners.length,
      pantryOpeningItems: currentCatalogue().content.pantry.openingItems.length,
      pantrySeasonalRecipes: currentCatalogue().content.pantry.seasonalRecipes.length,
      sentGiftFormats: currentCatalogue().content.hospitality.collections.filter(item => item.category === "sent-gifts").length,
      pantryImageGroups: currentCatalogue().content.pantryGroups.preparations.length,
      collectionItems: items.length,
      images: images.length,
      calendarEvents: currentCatalogue().content.events.length,
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
    uniqueRooms: currentCatalogue().rooms.filter((room) => room.sectionId === section.id).length,
    views: ((section.rooms as Dict[]) ?? []).length,
  };
}

export function listFloors() {
  return currentCatalogue().sections.filter(section => section.kind === "floor").map(sectionSummary);
}

export function listOutdoorAreas() {
  return currentCatalogue().sections.filter(section => section.kind === "outdoor").map(sectionSummary);
}

export function getFloor(id: string) {
  const floor = currentCatalogue().sections.find(item => item.kind === "floor" && matchesSection(item, id));
  if (!floor) return undefined;
  const documents = floorPlanDocuments(currentCatalogue().content.floorPlans).filter((document) => document.floorId === floor.id);
  return {
    ...sectionSummary(floor),
    floorPlanDocuments: documents.length ? documents : undefined,
    rooms: currentCatalogue().rooms.filter(room => room.sectionId === floor.id),
  };
}

export function getOutdoorArea(id: string) {
  const area = currentCatalogue().sections.find(item => item.kind === "outdoor" && matchesSection(item, id));
  if (!area) return undefined;
  return { ...sectionSummary(area), rooms: currentCatalogue().rooms.filter(room => room.sectionId === area.id) };
}

export function listRooms(input: { floorId?: string; outdoorAreaId?: string; query?: string; offset?: number; limit?: number }) {
  const requestedSection = input.outdoorAreaId ?? input.floorId;
  // Legacy floor_id="garden" and floor_id="exterior" links still resolve to the combined outdoor area.
  const { sections, rooms } = currentCatalogue();
  const section = requestedSection ? sections.find((item) => matchesSection(item, requestedSection)) : undefined;
  const filtered = rooms.filter((room) => (!requestedSection || room.sectionId === section?.id) && matches(room, input.query));
  return paginate(filtered.map(({ views, ...room }) => ({ ...room, primaryImage: views[0] })), input.offset, input.limit);
}

export function getRoom(id: string, floorId?: string) {
  const candidates = currentCatalogue().rooms.filter(room => (!floorId || room.sectionId === floorId) &&
    (room.id === id || `${room.sectionId}/${room.localId}` === id || room.localId === id || normalize(room.name) === normalize(id)));
  if (candidates.length > 1) throw new Error(`Ambiguous room ${id}; use a floor-qualified room_id (${candidates.map(room => room.id).join(", ")}) or provide floor_id.`);
  const room = candidates[0];
  if (!room) return undefined;
  const documents = floorPlanDocuments(currentCatalogue().content.floorPlans).filter((document) =>
    document.floorId === room.floorId && document.roomIds?.includes(room.localId));
  return { ...room, floorPlanDocuments: documents.length ? documents : undefined };
}

export function listStaff(input: { department?: string; employmentType?: string; query?: string; offset?: number; limit?: number }) {
  const employment = normalize(input.employmentType);
  const filtered = currentCatalogue().content.staff.people.filter((person) => (!input.department || normalize(person.department) === normalize(input.department)) && (!employment || normalize(person.employmentType).startsWith(employment)) && matches(person, input.query));
  return { asOf: currentCatalogue().content.staff.asOf, summary: currentCatalogue().content.staff.summary, ...paginate(filtered.map(withImage), input.offset, input.limit) };
}

export function getStaffMember(id: string) {
  const person = currentCatalogue().content.staff.people.find((item) => item.id === id || normalize(item.name) === normalize(id));
  return person ? withImage(person) : undefined;
}

export function listPartners(query?: string) {
  return currentCatalogue().content.staff.servicePartners.filter((item) => matches(item, query));
}

export function getPartner(id: string) {
  return currentCatalogue().content.staff.servicePartners.find((item) => item.id === id || normalize(item.name) === normalize(id));
}

export function listSpecialMenus() { return currentCatalogue().content.specialMenus.menus; }

export function getSpecialMenu(id: string) {
  const menu = currentCatalogue().content.specialMenus.menus.find(item => item.id === id);
  if (!menu) throw new Error(`Unknown special menu: ${id}. Use list_special_menus to choose one.`);
  return menu;
}

export function getMenuForDate(date: string, specialMenuId?: string) {
  const position = menuPosition(date);
  const season = menuSeason(date);
  const special = specialMenuId ? getSpecialMenu(specialMenuId) : undefined;
  const meals: Dict[] = currentCatalogue().content.menus.menus.filter(row => row.season === season && Number(row.cycle) === position.cycle && row.day === position.day)
    .map(row => {
      if (special && row.meal === special.meal) return { ...row, ...special.menu, specialMenuId: special.id };
      const photo = currentCatalogue().menuPhotos.get([row.season, row.cycle, row.day, row.meal, row.main].join("|"));
      return photo ? { ...row, image: photo.image, imageAlt: photo.imageAlt, imageUrl: imageUrl(photo.image) } : { ...row };
    });
  return { ...position, season, sourceAnchor: STORY_DATE, rotation: "Four seasonal two-week rotations, anchored to Monday 11 August 2025. Special menus are optional and do not establish a booking.", serviceContext: DRINK_SERVICE_CONTEXT, theme: special?.name ?? meals[0]?.theme ?? "", specialMenu: special ? {id: special.id, name: special.name, meal: special.meal, notes: special.notes} : null, meals };
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
  return currentCatalogue().content.culinary.availableFood.filter((item) => matches(item, query)).map((item) => ({ ...item, media: currentCatalogue().content.culinary.media[String(item.mediaId)] ? withImage(currentCatalogue().content.culinary.media[String(item.mediaId)]) : undefined }));
}

export function listSignatureBakes(query?: string) {
  const items = currentCatalogue().content.culinary.signatureBakes.filter((item) => matches(item, query));
  return { total: items.length, items: items.map(withImage) };
}

export function listCordialServes(query?: string) {
  const items = currentCatalogue().content.culinary.cordialServes.filter((item) => matches(item, query));
  return { total: items.length, serves: items.map((item) => ({ ...item, cocktailImageUrl: imageUrl(String(item.cocktailImage)), alcoholFreeImageUrl: imageUrl(String(item.alcoholFreeImage)) })) };
}

export function listPantry(input: { category?: string; labelFamily?: string; includeSeasonal?: boolean; query?: string; offset?: number; limit?: number }) {
  const candidates = [...currentCatalogue().content.pantry.openingItems, ...(input.includeSeasonal ? currentCatalogue().content.pantry.seasonalRecipes : [])];
  const filtered = candidates.filter((item) => (!input.category || normalize(item.category) === normalize(input.category)) && (!input.labelFamily || normalize(item.labelFamily) === normalize(input.labelFamily)) && matches(item, input.query));
  return { asOf: currentCatalogue().content.pantry.asOf, summary: currentCatalogue().content.pantry.summary, categories: [...new Set(candidates.map((item) => item.category))].sort(), ...paginate(filtered.map(withImage), input.offset, input.limit) };
}

export function getPantryItem(id: string): Dict | undefined {
  const item = [...currentCatalogue().content.pantry.openingItems, ...currentCatalogue().content.pantry.seasonalRecipes].find((entry) => normalize(entry.id) === normalize(id) || normalize(entry.name) === normalize(id));
  if (!item) return undefined;
  const group = currentCatalogue().content.pantryGroups.preparations.find((candidate) => candidate.id === item.imageGroupId);
  return { ...withImage(item), imageGroup: group ? withImage(group) : undefined };
}

export function listDrinks(input: { category?: string; query?: string }) {
  const allowed = new Set(["house drink", "core cordial", "seasonal cordial", "cocktail", "cordial cocktail", "alcohol-free cordial"]);
  const drinks = Object.values(currentCatalogue().content.culinary.media).filter((item) => allowed.has(String(item.category)) && (!input.category || normalize(item.category) === normalize(input.category)) && matches(item, input.query)).map(withImage);
  return { serviceContext: DRINK_SERVICE_CONTEXT, houseDrinks: drinks, waterAndHouseBrands: currentCatalogue().content.brands.brands.map((brand) => ({ ...brand, externalUrl: brand.externalUrl })) };
}

export function listCollectionCategories() {
  return currentCatalogue().collections.map((collection) => ({ id: collection.id, name: collection.name, short: collection.short, description: collection.description, plan: collection.plan, planUrl: imageUrl(collection.plan), itemCount: ((collection.rooms as Dict[]) ?? []).length }));
}

export function listCollectionItems(input: { collectionId?: string; query?: string; offset?: number; limit?: number }) {
  const filtered = currentCatalogue().items.filter((item) => (!input.collectionId || item.collectionId === input.collectionId) && matches(item, input.query));
  return paginate(filtered, input.offset, input.limit);
}

export function getCollectionItem(id: string) {
  return currentCatalogue().items.find((item) => item.id === id || normalize(item.title) === normalize(id));
}

export function getGuestProvision(kind?: string) {
  const provisions = currentCatalogue().content.hospitality.collections.filter((item) => !kind || normalize(item.id).includes(normalize(kind)) || matches(item, kind)).map((item) => ({ ...withImage(item), whiteImageUrl: imageUrl(item.whitePath) }));
  return { principles: currentCatalogue().content.hospitality.principles, serviceContext: DRINK_SERVICE_CONTEXT, provisions };
}

export function searchImages(input: { query?: string; kind?: string; offset?: number; limit?: number }) {
  const filtered = currentCatalogue().images.filter((item) => (!input.kind || item.kind === input.kind) && matches(item, input.query));
  return paginate(filtered, input.offset, input.limit);
}

export function getImage(idOrPath: string) {
  return currentCatalogue().images.find((item) => item.id === idOrPath || item.path === idOrPath || normalize(item.title) === normalize(idOrPath));
}

export function eventsForDate(date: string, category?: string) {
  isoDate(date);
  return currentCatalogue().content.events.filter((event) => String(event.start_date) <= date && String(event.end_date) >= date && (!category || normalize(event.category) === normalize(category)));
}

export function listEvents(input: { startDate: string; endDate?: string; category?: string; query?: string; offset?: number; limit?: number }) {
  isoDate(input.startDate);
  const endDate = input.endDate ?? input.startDate;
  isoDate(endDate);
  if (endDate < input.startDate) throw new Error("endDate must be on or after startDate.");
  const filtered = currentCatalogue().content.events.filter((event) => String(event.start_date) <= endDate && String(event.end_date) >= input.startDate && (!input.category || normalize(event.category) === normalize(input.category)) && matches(event, input.query));
  return { startDate: input.startDate, endDate, ...paginate(filtered, input.offset, input.limit) };
}

export function getForecast(date: string) {
  isoDate(date);
  const day = currentCatalogue().weatherByDate.get(date);
  if (!day) throw new Error(`No authored weather available for ${date}. Available dates: ${currentCatalogue().content.weather.coverage.start} through ${currentCatalogue().content.weather.coverage.end}.`);
  return {
    ...day,
    location: currentCatalogue().content.weather.location,
    timeZone: currentCatalogue().content.weather.timeZone,
    fictional: currentCatalogue().content.weather.fictional,
    source: currentCatalogue().content.weather.source,
    coverage: { ...currentCatalogue().content.weather.coverage },
    forecastUrl: `${PUBLIC_BASE_URL}/ALBURY_WEATHER.html?date=${date}`,
  };
}

export function getDateContext(date: string) {
  return { date, menu: getMenuForDate(date), events: eventsForDate(date), weather: currentCatalogue().weatherByDate.has(date) ? getForecast(date) : null, weatherCoverage: { ...currentCatalogue().content.weather.coverage }, isStoryOpeningDate: date === STORY_DATE };
}

export function searchAlbury(input: { query: string; domains?: string[]; limit?: number }) {
  const domains = new Set(input.domains?.length ? input.domains : ["rooms", "staff", "partners", "pantry", "collections", "food", "hospitality", "events"]);
  const records: Dict[] = [];
  if (domains.has("rooms")) records.push(...currentCatalogue().rooms.map((item) => ({ domain: "rooms", id: item.id, title: item.name, floor: item.floorName, section: item.sectionName, kind: item.kind, level: item.level, text: item.description, artworks: item.artworks })));
  if (domains.has("staff")) records.push(...currentCatalogue().content.staff.people.map((item) => ({ domain: "staff", id: item.id, title: item.name, text: `${item.role ?? ""}. ${item.remit ?? ""} ${item.description ?? ""} ${item.career ?? ""}` })));
  if (domains.has("partners")) records.push(...currentCatalogue().content.staff.servicePartners.map((item) => ({ domain: "partners", id: item.id, title: item.name, text: `${item.type ?? ""}. ${item.remit ?? ""}` })));
  if (domains.has("pantry")) records.push(...[...currentCatalogue().content.pantry.openingItems, ...currentCatalogue().content.pantry.seasonalRecipes].map((item) => ({ domain: "pantry", id: item.id, title: item.name, text: `${item.category ?? ""}. ${item.uses ?? ""} ${item.openingAvailability ?? ""} ${item.productionNotes ?? ""}` })));
  if (domains.has("collections")) records.push(...currentCatalogue().items.map((item) => ({ domain: "collections", id: item.id, title: item.title, collection: item.collectionName, text: item.description, artist: item.artist, location: item.location })));
  if (domains.has("food")) records.push(...Object.values(currentCatalogue().content.culinary.media).map((item) => ({ domain: "food", id: item.id, title: item.title, text: `${item.category ?? ""}. ${item.description ?? ""} ${item.productionNotes ?? ""}` })));
  if (domains.has("hospitality")) records.push(...currentCatalogue().content.hospitality.collections.map((item) => ({ domain: "hospitality", id: item.id, title: item.title, text: text(item) })));
  if (domains.has("events")) records.push(...currentCatalogue().content.events.map((item) => ({ domain: "events", id: item.id, title: item.title, text: `${item.category ?? ""}. ${item.location ?? ""}. ${item.description ?? ""}`, startDate: item.start_date, endDate: item.end_date })));
  const filtered = records.filter((item) => matches(item, input.query));
  return { query: input.query, total: filtered.length, results: filtered.slice(0, Math.max(1, Math.min(input.limit ?? 20, 50))) };
}

export const testOnly = { menuPosition, allRooms: builtInCatalogue.rooms, allCollectionItems: builtInCatalogue.items,
  allImages: builtInCatalogue.images, menus, events };
