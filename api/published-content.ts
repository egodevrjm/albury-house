import { publicContentUpdates } from "../lib/albury-data.js";
import { nodeHandler } from "../lib/node-http.js";
import { roomEditorStore, type RoomEditorStore } from "../lib/room-editor-store.js";

export function publishedContentHandler(store: RoomEditorStore | undefined) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
    let updates = {};
    try {
      if (store) updates = publicContentUpdates((await store.load()).state.current);
    } catch {
      console.error("The published Albury content could not be loaded.");
    }
    // The content is data in an external script, never HTML or executable editor input.
    const payload = JSON.stringify(updates).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    return new Response("window.ALBURY_MANAGED_CONTENT = " + payload + ";\n" +
      "if (window.ALBURY_CONTENT) Object.assign(window.ALBURY_CONTENT, window.ALBURY_MANAGED_CONTENT);\n", {
      headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  };
}

export default nodeHandler(request => publishedContentHandler(roomEditorStore())(request));
