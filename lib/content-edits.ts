import { z } from "zod";
import { assetIdSchema, EditorError, publicImagePath, roomViewSlug, type RoomView } from "./room-views.js";

export const contentLabels = {
  house: "House, history and facilities",
  rooms: "Floors, rooms and views",
  staff: "Staff and service partners",
  pantry: "Pantry products",
  pantryGroups: "Pantry image groups",
  collections: "Art and collections",
  culinary: "Kitchen, bakes and drinks",
  hospitality: "Guest provision and gifts",
  brands: "House brands",
  menus: "Seasonal menus",
  specialMenus: "Occasion menus",
  floorPlans: "Floor plan documents",
  walk: "Walk Albury map",
  houseStyle: "House style",
  houseAtWork: "House at work",
  events: "London calendar",
  weather: "Story weather",
  pageCopy: "Visitor page copy and photos",
} as const;

export type ContentKey = keyof typeof contentLabels;
export type Content = Record<ContentKey, unknown>;
export const contentKeySchema = z.enum(Object.keys(contentLabels) as [ContentKey, ...ContentKey[]]);
export const contentPathSchema = z.array(z.string().min(1).max(240)).max(20);
const target = { resource: contentKeySchema, path: contentPathSchema };
export const contentEditSchema = z.discriminatedUnion("action", [
  z.strictObject({ ...target, action: z.literal("set"), value: z.json() }),
  z.strictObject({ ...target, action: z.literal("append"), value: z.json() }),
  z.strictObject({ ...target, action: z.literal("remove") }),
  z.strictObject({ ...target, action: z.literal("image"), assetId: assetIdSchema }),
]);

export type ContentEdit = z.infer<typeof contentEditSchema>;
type Fields = Record<string, unknown>;
const unsafeKeys = new Set(["__proto__", "prototype", "constructor"]);
const managedPath = /^\/?images\/albury\/managed\/([a-f0-9]{64})\.webp$/;
const simpleFormatting = /<\/?(?:p|b|i|em|strong|br|ul|ol|li)(?:\s*\/)?>/gi;

function fields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function valueType(value: unknown) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}

function getMember(container: unknown, segment: string): string | number {
  if (unsafeKeys.has(segment)) throw new EditorError(400, "That field name is reserved.");
  if (Array.isArray(container)) {
    if (/^(0|[1-9]\d*)$/.test(segment)) {
      const index = Number(segment);
      if (index < container.length) return index;
    }
    if (segment.startsWith("@")) {
      const id = segment.slice(1);
      const matches = container.flatMap((item, index) => {
        if (!fields(item)) return [];
        const roomView = typeof item.roomId === "string" && typeof item.path === "string";
        return item.id === id || item.date === id || item.viewSlug === id ||
          (roomView && roomViewSlug(item as RoomView) === id) ? [index] : [];
      });
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new EditorError(409, "This ID matches more than one record. Use its position in the list.");
    }
    throw new EditorError(404, "That record is no longer in this list.");
  }
  if (fields(container)) return segment;
  throw new EditorError(400, "This value has no nested fields.");
}

export function readContent(value: unknown, path: string[]): unknown {
  let node = value;
  for (const segment of path) {
    const key = getMember(node, segment);
    const container = node as Fields;
    if (!Object.hasOwn(container, key)) throw new EditorError(404, "That field does not exist.");
    node = container[key];
  }
  return node;
}

function inspectValue(value: unknown, assets = new Set<string>(), depth = 0): Set<string> {
  if (depth > 24) throw new EditorError(400, "This value has too many nested fields.");
  if (typeof value === "string") {
    if (/^(?:javascript|vbscript|data|file):/i.test(value.trimStart().replace(/[\u0000-\u0020]/g, "")) || /<[A-Za-z/!]/.test(value.replace(simpleFormatting, ""))) {
      throw new EditorError(400, "Use plain text, simple formatting or a safe link.");
    }
    const asset = value.match(managedPath);
    if (asset) assets.add(asset[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) inspectValue(item, assets, depth + 1);
  } else if (fields(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (unsafeKeys.has(key)) throw new EditorError(400, "That field name is reserved.");
      inspectValue(item, assets, depth + 1);
    }
  }
  return assets;
}

export function contentAssets(edits: ContentEdit[]): string[] {
  const ids = new Set<string>();
  for (const edit of edits) {
    if (edit.action === "image") ids.add(edit.assetId);
    if (edit.action === "set" || edit.action === "append") inspectValue(edit.value, ids);
  }
  return [...ids];
}

function applyEdit(root: unknown, edit: ContentEdit) {
  if (edit.action === "append") {
    const list = readContent(root, edit.path);
    if (!Array.isArray(list)) throw new EditorError(400, "Add an entry to a list.");
    const value = edit.value;
    if (fields(value) && typeof value.id === "string" && list.some(item => fields(item) && item.id === value.id)) {
      throw new EditorError(409, "This ID is already in the list.");
    }
    list.push(structuredClone(value));
    return;
  }

  const name = edit.path.at(-1);
  if (!name) throw new EditorError(400, "Choose a field or record to change.");
  const container = readContent(root, edit.path.slice(0, -1)) as Fields;
  const key = getMember(container, name);
  const exists = Object.hasOwn(container, key);
  if (edit.action === "remove") {
    if (!exists) throw new EditorError(404, "That field does not exist.");
    if (Array.isArray(container)) container.splice(Number(key), 1);
    else delete container[key];
    return;
  }

  const current = container[key];
  if (key === "path" && typeof current === "string" && typeof container.title === "string" && !container.viewSlug) {
    if (typeof container.roomId === "string") container.viewSlug = roomViewSlug(container as RoomView);
    if (edit.resource === "collections") container.viewSlug = current.split("/").at(-1)?.replace(/\.[^.]+$/, "");
  }
  const value = edit.action === "image" ? publicImagePath(edit.assetId) : edit.value;
  if (exists && current !== null && value !== null && valueType(current) !== valueType(value)) {
    throw new EditorError(400, "This field expects a " + valueType(current) + ".");
  }
  if (name === "id" && exists && current !== value) {
    throw new EditorError(400, "Keep existing record IDs so links and references keep working.");
  }
  if (Array.isArray(container) && fields(current) && fields(value) && current.id && value.id !== current.id) {
    throw new EditorError(400, "Keep the existing record ID.");
  }
  if (edit.resource === "rooms" && key === "path" && typeof container.roomId === "string" && typeof current === "string") {
    const roomViews = readContent(root, edit.path.slice(0, -2));
    if (Array.isArray(roomViews)) {
      for (const view of roomViews) {
        if (fields(view) && view.roomId === container.roomId && Array.isArray(view.configurations)) {
          for (const configuration of view.configurations) {
            if (fields(configuration) && configuration.path === current) configuration.path = value;
          }
        }
      }
    }
  }
  container[key] = structuredClone(value);
}

export function applyContentEdits(base: Content, edits: ContentEdit[]): Content {
  const result = { ...base };
  const copied = new Set<ContentKey>();
  for (const edit of edits) {
    if (!copied.has(edit.resource)) {
      result[edit.resource] = structuredClone(result[edit.resource]);
      copied.add(edit.resource);
    }
    applyEdit(result[edit.resource], edit);
  }
  return result;
}

export function validateContent(content: Content, edits: ContentEdit[]) {
  const changed = new Set(edits.map(edit => edit.resource));
  const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/;
  for (const edit of edits) {
    if (edit.resource === "pageCopy" && (edit.action === "append" || edit.action === "remove" || edit.path.length < 3)) {
      throw new EditorError(400, "Edit an existing piece of page text or an image. Page layout belongs to the site.");
    }
    if (edit.action === "append" && fields(edit.value) && "id" in edit.value &&
        (typeof edit.value.id !== "string" || !idPattern.test(edit.value.id))) {
      throw new EditorError(400, "Record IDs use letters, numbers, underscores and hyphens.");
    }
  }
  function requireFields(items: unknown, names: string[], label: string) {
    if (!Array.isArray(items) || items.some(item => !fields(item) || names.some(name => typeof item[name] !== "string" || !item[name]))) {
      throw new EditorError(400, label + " need " + names.join(", ") + ".");
    }
  }
  const arrays = {
    house: ["facts", "timeline", "levels", "outdoorAreas", "designTeam"],
    rooms: ["tour"], collections: ["collections"], staff: ["people", "servicePartners"],
    pantry: ["openingItems", "seasonalRecipes"], pantryGroups: ["preparations"],
    culinary: ["availableFood", "signatureBakes", "cordialServes", "menuPhotos", "featuredTeam", "serviceRoster"],
    hospitality: ["collections"], brands: ["brands"], menus: ["menus"], specialMenus: ["menus"],
    walk: ["sections"], houseAtWork: ["scenes"], houseStyle: ["colours"], weather: ["days"],
  } as const;
  for (const resource of changed) {
    const root = content[resource];
    if (resource === "pageCopy") {
      if (!fields(root)) throw new EditorError(400, "Keep the pages indexed by filename.");
      for (const page of Object.values(root)) requireFields(page, ["id"], "Page entries");
      continue;
    }
    if (resource === "events" || resource === "floorPlans") {
      requireFields(root, resource === "events" ? ["title", "start_date", "end_date"] : ["id", "title", "path"], contentLabels[resource]);
      continue;
    }
    if (!fields(root)) throw new EditorError(400, "This content needs a record.");
    for (const key of arrays[resource]) {
      if (!Array.isArray(root[key])) throw new EditorError(400, "Keep the " + key + " list.");
    }
    if (resource === "rooms" || resource === "collections") {
      const sections = root[resource === "rooms" ? "tour" : "collections"] as Fields[];
      requireFields(sections, ["id", "name"], contentLabels[resource]);
      for (const section of sections) {
        requireFields(section.rooms, resource === "rooms" ? ["roomId", "title", "path"] : ["title"], String(section.name));
      }
    }
    if (resource === "pantry") {
      requireFields(root.openingItems, ["id", "name", "category"], "Pantry products");
      requireFields(root.seasonalRecipes, ["id", "name", "category"], "Seasonal pantry products");
      const ids = [...root.openingItems as Fields[], ...root.seasonalRecipes as Fields[]].map(item => String(item.id).toLowerCase());
      if (new Set(ids).size !== ids.length) throw new EditorError(409, "Pantry product IDs must be unique.");
    }
    if (resource === "staff") {
      requireFields(root.people, ["id", "name", "department", "role", "employmentType"], "Staff members");
      requireFields(root.servicePartners, ["id", "name", "type"], "Service partners");
    }
    if (resource === "weather") requireFields(root.days, ["date", "condition"], "Weather entries");
    if (resource === "menus") requireFields(root.menus, ["season", "day", "meal"], "Menu entries");
    if (resource === "specialMenus") requireFields(root.menus, ["id", "name", "meal"], "Occasion menus");
  }
}
