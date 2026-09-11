import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import {
  PUBLIC_BASE_URL,
  eventsForDate,
  getCollectionItem,
  getDateContext,
  getFloor,
  getForecast,
  getOutdoorArea,
  getGuestProvision,
  getImage,
  getMenuForDate,
  getMenuRange,
  getPantryItem,
  getPartner,
  getRoom,
  getStaffMember,
  getSummary,
  listAvailableFood,
  listCollectionCategories,
  listCollectionItems,
  listDrinks,
  listEvents,
  listFloors,
  listOutdoorAreas,
  listPantry,
  listPartners,
  listRooms,
  listStaff,
  searchAlbury,
  searchImages,
} from "../lib/albury-data.js";

export const maxDuration = 60;

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true } as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const visible = (payload: unknown) => [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }];
const ok = (payload: unknown) => ({ structuredContent: payload as Record<string, unknown>, content: visible(payload) });
const fail = (message: string) => ({ isError: true, content: visible({ error: message }) });
const guarded = async (operation: () => unknown | Promise<unknown>) => {
  try { return ok(await operation()); }
  catch (error) { return fail(error instanceof Error ? error.message : String(error)); }
};

export const mcpWebHandler = createMcpHandler((server) => {
  server.registerTool("search_albury", {
    title: "Search Albury House",
    description: "Search rooms, household staff, external partners, pantry preparations, house collections, food and dated London events. This is the broad discovery tool for the closed Albury House reference.",
    inputSchema: z.object({
      query: z.string().min(1),
      domains: z.array(z.enum(["rooms", "staff", "partners", "pantry", "collections", "food", "events"])).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }), annotations: readOnly,
  }, async (input) => guarded(() => searchAlbury(input)));

  server.registerTool("get_albury_summary", {
    title: "Get Albury summary",
    description: "Return the controlling house facts, purpose, story-opening date and record totals.",
    inputSchema: z.object({}), annotations: readOnly,
  }, async () => guarded(getSummary));

  server.registerTool("list_floors", {
    title: "List Albury floors",
    description: "List only Albury's seven internal floors, including both basements. Each has its chosen name and physical level. Exterior & Garden is one separate outdoor area; use list_outdoor_areas for it.",
    inputSchema: z.object({}), annotations: readOnly,
  }, async () => guarded(() => ({ floors: listFloors() })));

  server.registerTool("get_floor", {
    title: "Get an Albury floor",
    description: "Return one of the seven internal floors, its chosen name, physical level, plan and rooms. Accepts stable IDs, current names and legacy names. For Exterior & Garden use get_outdoor_area.",
    inputSchema: z.object({ floor_id: z.string().min(1) }), annotations: readOnly,
  }, async ({ floor_id }) => guarded(() => getFloor(floor_id) ?? (() => {
    if (getOutdoorArea(floor_id)) throw new Error("Exterior & Garden is an outdoor area, not a floor. Use get_outdoor_area.");
    throw new Error(`No Albury floor found for ${floor_id}.`);
  })()));

  server.registerTool("list_outdoor_areas", {
    title: "List Albury outdoor areas",
    description: "Return the single Exterior & Garden area covering the frontage, arrival, mews, terraces and garden. This is not an internal floor.",
    inputSchema: z.object({}), annotations: readOnly,
  }, async () => guarded(() => ({ outdoorAreas: listOutdoorAreas() })));

  server.registerTool("get_outdoor_area", {
    title: "Get Albury outdoor area",
    description: "Return Exterior & Garden with its plans, outdoor spaces and image views. Accepts exterior, garden and the current area name; the old exterior and garden sections are combined.",
    inputSchema: z.object({ area_id: z.string().min(1) }), annotations: readOnly,
  }, async ({ area_id }) => guarded(() => getOutdoorArea(area_id) ?? (() => { throw new Error(`No Albury outdoor area found for ${area_id}.`); })()));

  server.registerTool("list_rooms", {
    title: "List Albury rooms",
    description: "List coherent rooms and outdoor spaces, optionally by internal floor or outdoor area. Outdoor records have a section and outdoorAreaId, with floorId null. Multiple photographs of the same space are grouped as views.",
    inputSchema: z.object({ floor_id: z.string().optional(), outdoor_area_id: z.string().optional(), query: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }), annotations: readOnly,
  }, async ({ floor_id, outdoor_area_id, ...input }) => guarded(() => listRooms({ floorId: floor_id, outdoorAreaId: outdoor_area_id, ...input })));

  server.registerTool("get_room", {
    title: "Get an Albury room",
    description: "Return one room with its floor, description, primary image and every coherent view available on the house site.",
    inputSchema: z.object({ room_id: z.string().min(1) }), annotations: readOnly,
  }, async ({ room_id }) => guarded(() => getRoom(room_id) ?? (() => { throw new Error(`No Albury room found for ${room_id}.`); })()));

  server.registerTool("list_household_staff", {
    title: "List Albury household staff",
    description: "List permanent employees and scheduled specialists with roles, remits, departments, biographies and portrait links.",
    inputSchema: z.object({ department: z.string().optional(), employment_type: z.string().optional(), query: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }), annotations: readOnly,
  }, async ({ employment_type, ...input }) => guarded(() => listStaff({ employmentType: employment_type, ...input })));

  server.registerTool("get_household_member", {
    title: "Get an Albury household member",
    description: "Fetch a complete household staff record by stable ID or exact name.",
    inputSchema: z.object({ person: z.string().min(1) }), annotations: readOnly,
  }, async ({ person }) => guarded(() => getStaffMember(person) ?? (() => { throw new Error(`No Albury household member found for ${person}.`); })()));

  server.registerTool("list_external_partners", {
    title: "List Albury external partners",
    description: "List the six contracted providers supporting household operations, security, service, wellness, catering and studio work.",
    inputSchema: z.object({ query: z.string().optional() }), annotations: readOnly,
  }, async ({ query }) => guarded(() => ({ total: listPartners(query).length, partners: listPartners(query) })));

  server.registerTool("get_external_partner", {
    title: "Get an Albury external partner",
    description: "Fetch one external partner by stable ID or exact name.",
    inputSchema: z.object({ partner: z.string().min(1) }), annotations: readOnly,
  }, async ({ partner }) => guarded(() => getPartner(partner) ?? (() => { throw new Error(`No Albury external partner found for ${partner}.`); })()));

  server.registerTool("get_menu_for_date", {
    title: "Get the menu for a date",
    description: "Return Albury's breakfast, lunch and dinner for an exact date using the anchored two-week house rotation. Monday 11 August 2025 is Cycle 1 Monday.",
    inputSchema: z.object({ date: isoDate }), annotations: readOnly,
  }, async ({ date }) => guarded(() => getMenuForDate(date)));

  server.registerTool("get_menu_range", {
    title: "Get menus for a date range",
    description: "Return dated breakfast, lunch and dinner menus for up to 31 consecutive days.",
    inputSchema: z.object({ start_date: isoDate, days: z.number().int().min(1).max(31).default(7) }), annotations: readOnly,
  }, async ({ start_date, days }) => guarded(() => getMenuRange(start_date, days)));

  server.registerTool("list_available_food", {
    title: "List food available at Albury",
    description: "Return the standing between-meal, studio, journey and late-return food provision with dish images where available.",
    inputSchema: z.object({ query: z.string().optional() }), annotations: readOnly,
  }, async ({ query }) => guarded(() => ({ items: listAvailableFood(query) })));

  server.registerTool("list_pantry_items", {
    title: "List Albury pantry items",
    description: "List the complete individually indexed P01-P33 opening pantry, preserving category, availability, uses, label family and image group. Seasonal recipes can be added explicitly.",
    inputSchema: z.object({ category: z.string().optional(), label_family: z.string().optional(), include_seasonal: z.boolean().default(false), query: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }), annotations: readOnly,
  }, async ({ label_family, include_seasonal, ...input }) => guarded(() => listPantry({ labelFamily: label_family, includeSeasonal: include_seasonal, ...input })));

  server.registerTool("get_pantry_item", {
    title: "Get an Albury pantry item",
    description: "Fetch one pantry item by P-number, seasonal recipe ID or exact name, including its associated collection image.",
    inputSchema: z.object({ item: z.string().min(1) }), annotations: readOnly,
  }, async ({ item }) => guarded(() => getPantryItem(item) ?? (() => { throw new Error(`No Albury pantry item found for ${item}.`); })()));

  server.registerTool("list_drinks", {
    title: "List Albury drinks",
    description: "List house syrups, core and seasonal cordials, cocktails, and the linked Limestone Springs and Hatfield house brands.",
    inputSchema: z.object({ category: z.string().optional(), query: z.string().optional() }), annotations: readOnly,
  }, async (input) => guarded(() => listDrinks(input)));

  server.registerTool("list_collection_categories", {
    title: "List Albury collection categories",
    description: "List the pantry, baking, guest-room, travel, table and service collections with item counts and collection images.",
    inputSchema: z.object({}), annotations: readOnly,
  }, async () => guarded(() => ({ collections: listCollectionCategories() })));

  server.registerTool("list_collection_items", {
    title: "List Albury collection items",
    description: "List house-marked items and pantry/baking collection records, optionally within one collection or matching text.",
    inputSchema: z.object({ collection_id: z.string().optional(), query: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }), annotations: readOnly,
  }, async ({ collection_id, ...input }) => guarded(() => listCollectionItems({ collectionId: collection_id, ...input })));

  server.registerTool("get_collection_item", {
    title: "Get an Albury collection item",
    description: "Fetch one collection item by stable ID or exact title, including its image URL.",
    inputSchema: z.object({ item: z.string().min(1) }), annotations: readOnly,
  }, async ({ item }) => guarded(() => getCollectionItem(item) ?? (() => { throw new Error(`No Albury collection item found for ${item}.`); })()));

  server.registerTool("get_guest_provision", {
    title: "Get Albury guest provision",
    description: "Return arrival, departure and gift provision, including what a guest keeps, what stays with the house, hamper contents and image links.",
    inputSchema: z.object({ kind: z.string().optional().describe("Optional term such as arrival, food hamper, stationery, drinkware or selected gifts.") }), annotations: readOnly,
  }, async ({ kind }) => guarded(() => getGuestProvision(kind)));

  server.registerTool("search_images", {
    title: "Search Albury images",
    description: "Search house, room, staff, culinary, pantry, hospitality and collection images. Returns stable metadata and directly viewable public WebP/SVG URLs.",
    inputSchema: z.object({ query: z.string().optional(), kind: z.enum(["asset", "room", "collection", "culinary", "staff", "pantry", "hospitality"]).optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) }), annotations: readOnly,
  }, async (input) => guarded(() => searchImages(input)));

  server.registerTool("get_image", {
    title: "Get an Albury image",
    description: "Fetch one image by stable image ID, deployed path or exact title. By default the image is returned inline for visual inspection; set include_data false for metadata and URL only.",
    inputSchema: z.object({ image: z.string().min(1), include_data: z.boolean().default(true) }), annotations: readOnly,
  }, async ({ image, include_data }) => {
    const record = getImage(image);
    if (!record) return fail(`No Albury image found for ${image}.`);
    if (!include_data) return ok(record);
    try {
      const url = String(record.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Image request returned ${response.status}.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 4_000_000) return ok({ ...record, inlineImageOmitted: true, reason: "Image exceeds the 4 MB inline limit; use the public URL." });
      const mimeType = response.headers.get("content-type")?.split(";")[0] || (url.endsWith(".svg") ? "image/svg+xml" : "image/webp");
      return {
        structuredContent: record,
        content: [
          ...visible(record),
          { type: "image" as const, data: Buffer.from(bytes).toString("base64"), mimeType },
        ],
      };
    } catch (error) {
      return ok({ ...record, inlineImageOmitted: true, reason: error instanceof Error ? error.message : String(error) });
    }
  });

  server.registerTool("get_events_for_date", {
    title: "Get London events for a date",
    description: "Return every London and social-calendar event active on a date, including multi-day events whose spans contain that date.",
    inputSchema: z.object({ date: isoDate, category: z.string().optional() }), annotations: readOnly,
  }, async ({ date, category }) => guarded(() => ({ date, events: eventsForDate(date, category) })));

  server.registerTool("list_events", {
    title: "List London events",
    description: "List events overlapping an inclusive date range, optionally filtered by category or text, with source and verification fields preserved.",
    inputSchema: z.object({ start_date: isoDate, end_date: isoDate.optional(), category: z.string().optional(), query: z.string().optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }), annotations: readOnly,
  }, async ({ start_date, end_date, ...input }) => guarded(() => listEvents({ startDate: start_date, endDate: end_date, ...input })));

  server.registerTool("get_forecast", {
    title: "Get Albury weather for a date",
    description: "Return the authored London story weather for one date: condition, high/low temperatures in Celsius and Fahrenheit, daily precipitation in mm, precipitation chance as a percentage and wind speed in mph. Coverage: 2025-08-01 through 2026-08-31 inclusive. Dates outside the dataset return an error. This is fictional story weather, not live or historical observations.",
    inputSchema: z.object({ date: isoDate.describe("Story date in YYYY-MM-DD format, e.g. 2025-08-11.") }), annotations: readOnly,
  }, async ({ date }) => guarded(() => getForecast(date)));

  server.registerTool("get_date_context", {
    title: "Get Albury date context",
    description: "Return the rotated full-day menu, every active calendar event and authored weather for one date. Weather is null outside its supplied date range; menu and event lookup remain available.",
    inputSchema: z.object({ date: isoDate }), annotations: readOnly,
  }, async ({ date }) => guarded(() => getDateContext(date)));
}, {
  serverInfo: { name: "Albury House MCP", version: "1.0.0" },
  instructions: "Use this read-only server for Albury House rooms, household staff, contracted partners, dated menus, pantry preparations, house collections, imagery, dated London events and authored daily London weather. Use get_forecast with the story date for weather; never substitute the computer date or invent values outside its coverage. Treat returned records as the closed-world Albury reference and do not invent absent room, staff, menu, pantry or partner details.",
  maxSubscriptions: 0,
});

type NodeRequest = { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type NodeResponse = { status(code: number): NodeResponse; setHeader(name: string, value: string | string[]): void; send(body: Buffer): void };

function requestHeaders(source: NodeRequest["headers"]) {
  const result = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) for (const item of value) result.append(name, item);
    else if (value !== undefined) result.set(name, value);
  }
  return result;
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  const headers = requestHeaders(req.headers);
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "albury-house.vercel.app";
  const protocol = headers.get("x-forwarded-proto") ?? "https";
  const method = req.method ?? "GET";
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (typeof req.body === "string" || req.body instanceof Uint8Array) body = req.body as BodyInit;
    else body = JSON.stringify(req.body ?? {});
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
  }
  const response = await mcpWebHandler(new Request(`${protocol}://${host}${req.url ?? "/api/mcp"}`, { method, headers, body }));
  res.status(response.status);
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.send(Buffer.from(await response.arrayBuffer()));
}

export const serviceMetadata = {
  service: "Albury House MCP",
  status: "ready",
  access: "read_only",
  transport: "streamable_http",
  endpoint: `${PUBLIC_BASE_URL}/mcp`,
};
