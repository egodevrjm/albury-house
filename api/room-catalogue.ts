import { applyCollectionEdits, changedCollections } from "../lib/collection-edits.js";
import { baseCollections, baseTourSections } from "../lib/albury-data.js";
import { createFoodCatalogue } from "../lib/food-catalogue.js";
import { nodeHandler } from "../lib/node-http.js";
import { initialState, roomEditorStore, type RoomEditorStore } from "../lib/room-editor-store.js";
import { changedRoomViews } from "../lib/room-views.js";

export async function publishedRoomCatalogue(store = roomEditorStore(), includeFood = false) {
  const { current } = store ? (await store.load()).state : initialState();
  const collectionUpdates = changedCollections(baseCollections, current.collectionEdits ?? []);
  const food = includeFood ? createFoodCatalogue(applyCollectionEdits(baseCollections, current.collectionEdits ?? []), baseCollections) : undefined;
  return { revision: current.id, updates: changedRoomViews(baseTourSections, current.edits),
    ...(collectionUpdates.length ? { collectionUpdates } : {}), ...(food ? { food } : {}) };

}

export function roomCatalogueWebHandler(store: RoomEditorStore | undefined) {
  return async (request: Request) => {
    if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
    try {
      const catalogue = await publishedRoomCatalogue(store, new URL(request.url).searchParams.get("food") === "1");
      return Response.json(catalogue, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return Response.json({ error: "Published room views are temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export default nodeHandler(request => roomCatalogueWebHandler(roomEditorStore())(request));
