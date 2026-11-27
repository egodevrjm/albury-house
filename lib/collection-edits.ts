import { z } from "zod";
import { assetIdSchema, EditorError, publicImagePath } from "./room-views.js";

export type CollectionItem = Record<string, unknown> & {
  id?: string;
  title: string;
  description: string;
  path?: string;
  location?: { sectionId: string; roomId: string; roomName: string; placement: string };
  viewSlug?: string;
  colourVariant?: "Full colour" | "Ivory led";
};
export type Collection = Record<string, unknown> & { id: string; name: string; rooms: CollectionItem[] };

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const fields = {
  collectionId: slugSchema,
  assetId: assetIdSchema.optional(),
  description: z.string().trim().min(1).max(2400),
  title: z.string().trim().min(1).max(140),
  artist: z.string().trim().min(1).max(140).optional(),
};
export const collectionEditSchema = z.discriminatedUnion("action", [
  z.strictObject({ ...fields, action: z.literal("add"), itemId: slugSchema, slug: slugSchema.optional() }),
  z.strictObject({
    ...fields, action: z.literal("replace"), itemId: z.string().min(1).max(240),
    title: fields.title.optional(), description: fields.description.optional(),
  }),
]).refine(edit => edit.action === "add" || edit.title !== undefined || edit.description !== undefined ||
  edit.assetId !== undefined || edit.artist !== undefined, { message: "Provide a field or image to update." });

export type CollectionEdit = z.infer<typeof collectionEditSchema>;

function slugify(title: string): string {
  return title.toLocaleLowerCase("en-GB").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function collectionItemId(collection: Collection, item: CollectionItem, index: number): string {
  return item.id ?? `${collection.id}-${String(index + 1).padStart(2, "0")}-${slugify(item.title)}`;
}

export function collectionItemSlug(item: CollectionItem, id: string): string {
  return item.viewSlug ?? item.path?.split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? id;
}

export function applyCollectionEdits(base: Collection[], edits: CollectionEdit[]): Collection[] {
  if (!edits.length) return base;
  const collections = new Map(base.map(collection => [
    collection.id, { ...collection, rooms: [...collection.rooms] },
  ]));
  const itemIds = new Set(base.flatMap(collection =>
    collection.rooms.map((item, index) => collectionItemId(collection, item, index))));
  for (const edit of edits) {
    const collection = collections.get(edit.collectionId);
    if (!collection) throw new EditorError(409, `Collection ${edit.collectionId} no longer exists.`);
    const { itemId, assetId, title, description, artist } = edit;
    const image = assetId ? { path: publicImagePath(assetId) } : {};
    if (edit.action === "add") {
      const viewSlug = edit.slug ?? itemId;
      if (itemIds.has(itemId) || collection.rooms.some((item, index) =>
        collectionItemSlug(item, collectionItemId(collection, item, index)) === viewSlug)) {
        throw new EditorError(409, "That collection ID or gallery link is already in use.");
      }
      collection.rooms.push({ id: itemId, viewSlug, title: edit.title, description: edit.description, ...(artist ? { artist } : {}), ...image });
      itemIds.add(itemId);
      continue;
    }
    const index = collection.rooms.findIndex((item, i) => collectionItemId(collection, item, i) === itemId);
    if (index < 0) throw new EditorError(409, `Collection item ${itemId} no longer exists.`);
    const previous = collection.rooms[index]!;
    const colourVariant = previous.colourVariant ?? (/— Full Colour$/.test(previous.title) ? "Full colour" :
      /— White(?:\/Clear)? Led$/.test(previous.title) ? "Ivory led" : undefined);
    const item: CollectionItem = { ...previous, id: itemId, viewSlug: collectionItemSlug(previous, itemId),
      title: title ?? previous.title, description: description ?? previous.description,
      ...(artist ? { artist } : {}), ...(colourVariant ? { colourVariant } : {}), ...image };
    if (assetId) {
      delete item.image;
      delete item.imageVersion;
    }
    collection.rooms[index] = item;
  }
  return [...collections.values()];
}

export function changedCollections(base: Collection[], edits: CollectionEdit[]): Collection[] {
  const ids = new Set(edits.map(edit => edit.collectionId));
  return applyCollectionEdits(base, edits).filter(collection => ids.has(collection.id));
}
