import { baseTourSections } from "../lib/albury-data.js";
import { nodeHandler } from "../lib/node-http.js";
import { createRoomEditor } from "../lib/room-editor.js";
import { roomEditorStore, type RoomEditorStore } from "../lib/room-editor-store.js";

export function roomMediaWebHandler(store: RoomEditorStore | undefined) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    const id = new URL(request.url).searchParams.get("id") ?? "";
    try {
      const image = store ? await createRoomEditor(store, baseTourSections).read_image(id, true) : undefined;
      if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
      return new Response(request.method === "HEAD" ? null : new Uint8Array(image.content), { headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(image.content.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      } });
    } catch {
      return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export default nodeHandler(request => roomMediaWebHandler(roomEditorStore())(request));
