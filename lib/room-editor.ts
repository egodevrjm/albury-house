import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { applyCollectionEdits, changedCollections, collectionEditSchema, collectionItemId, type Collection } from "./collection-edits.js";
import type { Draft, RoomEditorStore, State, StoredImage } from "./room-editor-store.js";
import { applyRoomViewEdits, assetIdSchema, changedRoomViews, EditorError, roomViewEditSchema, roomViewSlug, type TourSection } from "./room-views.js";

export const maxImageBytes = 3 * 1024 * 1024;
const maxPixels = 25_000_000;
const version = z.number().int().min(0);
const draftId = z.uuid();
const draftVersion = { draftId, expectedVersion: version };
const optionalId = z.string().min(1).max(110).optional();

export const editorSchemas = {
  list_rooms: z.strictObject({ sectionId: optionalId, roomId: optionalId }),
  list_collections: z.strictObject({ collectionId: optionalId }),
  list_drafts: z.strictObject({}),
  create_draft: z.strictObject({ name: z.string().trim().min(1).max(120) }),
  preview_draft: z.strictObject({ draftId }),
  stage_view: z.strictObject({ ...draftVersion, edit: roomViewEditSchema }),
  stage_collection_item: z.strictObject({ ...draftVersion, edit: collectionEditSchema }),
  remove_draft_edit: z.strictObject({ ...draftVersion, index: z.number().int().min(0) }),
  remove_collection_edit: z.strictObject({ ...draftVersion, index: z.number().int().min(0) }),
  publish_draft: z.strictObject(draftVersion),
  list_revisions: z.strictObject({}),
  rollback: z.strictObject({ revision: version, expectedRevision: version }),
  list_images: z.strictObject({}),
  upload_image: z.strictObject({
    name: z.string().trim().min(1).max(160),
    base64: z.string().min(4).max(maxImageBytes * 4 / 3).regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
} as const;
export type EditorAction = keyof typeof editorSchemas;

function findDraft(state: State, id: string, expectedVersion?: number): Draft {
  const draft = state.drafts.find(item => item.id === id);
  if (!draft) throw new EditorError(404, "This draft is no longer open.");
  if (expectedVersion !== undefined && expectedVersion !== draft.version) {
    throw new EditorError(409, "The draft changed. Reopen it and try again.");
  }
  return draft;
}

export function createRoomEditor(store: RoomEditorStore, base: TourSection[], collections: Collection[] = []) {
  async function change<T>(operation: (state: State) => T | Promise<T>): Promise<T> {
    const loaded = await store.load();
    const result = await operation(loaded.state);
    if (!await store.save(loaded.version, loaded.state)) {
      throw new EditorError(409, "Another editor saved a change. Refresh and try again.");
    }
    return result;
  }

  return {
    async list_rooms({ sectionId, roomId }: z.infer<typeof editorSchemas.list_rooms>) {
      const { state } = await store.load();
      const sections = applyRoomViewEdits(base, state.current.edits);
      return {
        revision: state.current.id,
        sections: sections.filter(section => !sectionId || section.id === sectionId).map(section => {
          const rooms = new Map<string, { id: string; name: string; views: Array<{ id: string; title: string; caption: string; path: string }> }>();
          for (const view of section.rooms) {
            if (roomId && view.roomId !== roomId) continue;
            const room = rooms.get(view.roomId) ?? { id: view.roomId, name: view.roomName ?? view.title, views: [] };
            room.views.push({ id: roomViewSlug(view), title: view.title, caption: view.description, path: view.path });
            rooms.set(view.roomId, room);
          }
          return { id: section.id, name: section.name, rooms: [...rooms.values()] };
        }),
      };
    },
    async list_collections({ collectionId }: z.infer<typeof editorSchemas.list_collections>) {
      const { state } = await store.load();
      const published = applyCollectionEdits(collections, state.current.collectionEdits ?? []);
      return { revision: state.current.id, collections: published.filter(collection => !collectionId || collection.id === collectionId)
        .map(collection => ({
          id: collection.id, name: collection.name,
          items: collection.rooms.map((item, index) => ({ ...item, id: collectionItemId(collection, item, index) })),
        })) };
    },
    async list_drafts() {
      const { state } = await store.load();
      return { currentRevision: state.current.id, drafts: state.drafts.map(({ edits, collectionEdits, ...draft }) => ({ ...draft, editCount: edits.length + (collectionEdits?.length ?? 0) })) };
    },
    async create_draft({ name }: z.infer<typeof editorSchemas.create_draft>) {
      return change(state => {
        const draft: Draft = { id: randomUUID(), name, version: 0, baseRevision: state.current.id, edits: [] };
        state.drafts.push(draft);
        return draft;
      });
    },
    async preview_draft({ draftId }: z.infer<typeof editorSchemas.preview_draft>) {
      const { state } = await store.load();
      const draft = findDraft(state, draftId);
      const revision = state.current.id === draft.baseRevision ? state.current : state.previous.find(item => item.id === draft.baseRevision);
      if (!revision) throw new EditorError(409, "The draft's base revision is unavailable.");
      const preview = changedRoomViews(applyRoomViewEdits(base, revision.edits), draft.edits);
      const collectionPreview = changedCollections(applyCollectionEdits(collections, revision.collectionEdits ?? []), draft.collectionEdits ?? []);
      return { draft, currentRevision: state.current.id, preview, collectionPreview };
    },
    async stage_view({ draftId, expectedVersion, edit }: z.infer<typeof editorSchemas.stage_view>) {
      if (!await store.hasImages([edit.assetId])) throw new EditorError(404, "Upload the image before staging the view.");
      return change(state => {
        const draft = findDraft(state, draftId, expectedVersion);
        if (draft.baseRevision !== state.current.id) throw new EditorError(409, "The published revision changed. Start a new draft.");
        const edits = [...draft.edits, edit];
        applyRoomViewEdits(base, [...state.current.edits, ...edits]);
        draft.edits = edits;
        draft.version++;
        return draft;
      });
    },
    async stage_collection_item({ draftId, expectedVersion, edit }: z.infer<typeof editorSchemas.stage_collection_item>) {
      if (edit.assetId && !await store.hasImages([edit.assetId])) throw new EditorError(404, "Upload the image before staging the item.");
      return change(state => {
        const draft = findDraft(state, draftId, expectedVersion);
        if (draft.baseRevision !== state.current.id) throw new EditorError(409, "The published revision changed. Start a new draft.");
        const collectionEdits = [...draft.collectionEdits ?? [], edit];
        applyCollectionEdits(collections, [...state.current.collectionEdits ?? [], ...collectionEdits]);
        draft.collectionEdits = collectionEdits;
        draft.version++;
        return draft;
      });
    },
    async remove_draft_edit({ draftId, expectedVersion, index }: z.infer<typeof editorSchemas.remove_draft_edit>) {
      return change(state => {
        const draft = findDraft(state, draftId, expectedVersion);
        const revision = state.current.id === draft.baseRevision ? state.current : state.previous.find(item => item.id === draft.baseRevision);
        if (!revision || index >= draft.edits.length) throw new EditorError(404, "This draft edit is no longer available.");
        const edits = draft.edits.filter((_, i) => i !== index);
        applyRoomViewEdits(base, [...revision.edits, ...edits]);
        draft.edits = edits;
        draft.version++;
        return draft;
      });
    },
    async remove_collection_edit({ draftId, expectedVersion, index }: z.infer<typeof editorSchemas.remove_collection_edit>) {
      return change(state => {
        const draft = findDraft(state, draftId, expectedVersion);
        const revision = state.current.id === draft.baseRevision ? state.current : state.previous.find(item => item.id === draft.baseRevision);
        if (!revision || index >= (draft.collectionEdits?.length ?? 0)) throw new EditorError(404, "This draft edit is no longer available.");
        const edits = draft.collectionEdits!.filter((_, i) => i !== index);
        applyCollectionEdits(collections, [...revision.collectionEdits ?? [], ...edits]);
        draft.collectionEdits = edits;
        draft.version++;
        return draft;
      });
    },
    async publish_draft({ draftId, expectedVersion }: z.infer<typeof editorSchemas.publish_draft>) {
      return change(async state => {
        const draft = findDraft(state, draftId, expectedVersion);
        const editCount = draft.edits.length + (draft.collectionEdits?.length ?? 0);
        if (!editCount) throw new EditorError(400, "This draft has no changes.");
        if (draft.baseRevision !== state.current.id) throw new EditorError(409, "This draft is based on an older revision. Review the current views and create a new draft.");
        const edits = [...state.current.edits, ...draft.edits];
        applyRoomViewEdits(base, edits);
        const collectionEdits = [...state.current.collectionEdits ?? [], ...draft.collectionEdits ?? []];
        applyCollectionEdits(collections, collectionEdits);
        const ids = [...new Set([...draft.edits.map(edit => edit.assetId),
          ...(draft.collectionEdits ?? []).flatMap(edit => edit.assetId ? [edit.assetId] : [])])];
        if (!await store.hasImages(ids)) throw new EditorError(409, "A draft image is unavailable.");
        state.previous.unshift(state.current);
        state.current = { id: state.current.id + 1, name: draft.name, publishedAt: new Date().toISOString(), edits, ...(collectionEdits.length ? { collectionEdits } : {}) };
        state.exposedImages = [...new Set([...state.exposedImages, ...ids])];
        state.drafts = state.drafts.filter(item => item.id !== draftId);
        return { revision: state.current.id, name: draft.name, editCount };
      });
    },
    async list_revisions() {
      const { state } = await store.load();
      return { currentRevision: state.current.id, revisions: [state.current, ...state.previous].map(({ edits: _edits, collectionEdits: _collectionEdits, ...item }) => item) };
    },
    async rollback({ revision, expectedRevision }: z.infer<typeof editorSchemas.rollback>) {
      return change(state => {
        if (state.current.id !== expectedRevision) throw new EditorError(409, "The published revision changed. Refresh the history.");
        const prior = state.previous.find(item => item.id === revision);
        if (!prior) throw new EditorError(404, "This previous revision is unavailable.");
        applyRoomViewEdits(base, prior.edits);
        applyCollectionEdits(collections, prior.collectionEdits ?? []);
        state.previous.unshift(state.current);
        state.current = { id: expectedRevision + 1, name: `Restored revision ${revision}`, publishedAt: new Date().toISOString(), edits: prior.edits };
        return { revision: state.current.id, restored: revision };
      });
    },
    async upload_image({ name, base64 }: z.infer<typeof editorSchemas.upload_image>) {
      const raw = Buffer.from(base64, "base64");
      if (raw.length > maxImageBytes || raw.toString("base64") !== base64) throw new EditorError(400, "Supply a valid image of up to 3 MiB.");
      let stored: StoredImage;
      try {
        const image = sharp(raw, { limitInputPixels: maxPixels });
        const { format, pages } = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(format ?? "") || (pages ?? 1) > 1) throw new Error("Unsupported format");
        const { data, info } = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
        if (data.length > maxImageBytes) throw new Error("Encoded image too large");
        const id = createHash("sha256").update(data).digest("hex");
        stored = { id, name, content: data, width: info.width, height: info.height };
      } catch (error) {
        if (error instanceof EditorError) throw error;
        throw new EditorError(400, "Use a single JPEG, PNG or WebP image within the upload limit.");
      }
      return store.saveImage(stored);
    },
    async list_images() { return { images: await store.images() }; },
    async read_image(id: string, published: boolean) {
      if (!assetIdSchema.safeParse(id).success) return undefined;
      if (published && !(await store.load()).state.exposedImages.includes(id)) return undefined;
      return store.image(id);
    },
  };
}
