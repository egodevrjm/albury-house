import { createMcpHandler } from "mcp-handler";
import { baseCollections, baseTourSections, contentAtRevision } from "../lib/albury-data.js";
import { draftKeyAuthorizes, editorAuth, type EditorAuth } from "../lib/editor-auth.js";
import { nodeHandler } from "../lib/node-http.js";
import { createRoomEditor, editorSchemas } from "../lib/room-editor.js";
import { roomEditorStore, type RoomEditorStore } from "../lib/room-editor-store.js";
import { EditorError } from "../lib/room-views.js";

const definitions = [
  { name: "list_content", title: "List editable content", details: "Discover the editable Albury resources before reading or staging a change.", mutates: false },
  { name: "read_content", title: "Read editable content", details: "Read a section of the current content or a draft. Use path segments for fields, @id for a stable list item ID, or a zero-based list position for entries without IDs.", mutates: false },
  { name: "stage_content_edits", title: "Stage changes to house content", details: "Set a field, append a new record, remove a record, or attach a previously uploaded image. Always read the target first and keep the returned draft version for subsequent edits.", mutates: true },
  { name: "remove_content_edit", title: "Remove a staged content change", details: "Remove a staged content change by zero-based index.", mutates: true },
  { name: "upload_image", title: "Upload an image to the editor", details: "Send base64 bytes for a JPEG, PNG or WebP image up to 3 MiB. Use the returned asset ID in a draft. The image stays private until publication.", mutates: true },
  { name: "list_rooms", title: "List room view IDs", details: "Find floor and room IDs and the existing view IDs. Narrow to a section or room when possible.", mutates: false },
  { name: "list_collections", title: "List house collections", details: "Find collection IDs, existing items and item IDs. Supply a collection ID to narrow the result.", mutates: false },
  { name: "list_drafts", title: "List publication drafts", details: "Find open drafts and their current edit versions.", mutates: false },
  { name: "create_draft", title: "Create a publication draft", details: "Open a named batch of room-view or collection edits based on the current published revision.", mutates: true },
  { name: "list_images", title: "List uploaded room photos", details: "Find image IDs for staging. The owner's editor or the authenticated editor API can upload files.", mutates: false },
  { name: "stage_view", title: "Stage a room view", details: "Add or replace a photo in a draft using an uploaded image ID. Positions are one based. Omitting a position preserves the replaced view's position or appends a new view.", mutates: true },
  { name: "stage_collection_item", title: "Stage a collection item", details: "Add a new item with a stable item ID and optional gallery slug, or update the title, description, artist or image of an existing item. Images use an uploaded asset ID. Updating an item preserves its gallery link.", mutates: true },
  { name: "remove_collection_edit", title: "Remove a staged collection edit", details: "Remove a collection edit from the draft by its zero-based index.", mutates: true },
  { name: "remove_draft_edit", title: "Remove a staged view edit", details: "Remove an edit by its zero-based index. The published catalogue is unaffected.", mutates: true },
  { name: "preview_draft", title: "Preview a publication draft", details: "Return the changed rooms and collections and the draft version for owner review.", mutates: false },
] as const;

export function writeMcpWebHandler(store: RoomEditorStore | undefined, auth: EditorAuth) {
  const handler = store && createMcpHandler(server => {
    const editor = createRoomEditor(store, baseTourSections, baseCollections, contentAtRevision);
    for (const { name, title, details, mutates } of definitions) {
      const schema = editorSchemas[name];
      server.registerTool(name, {
        title, description: details, inputSchema: schema,
        annotations: { readOnlyHint: !mutates, destructiveHint: false, idempotentHint: !mutates, openWorldHint: false },
      }, async (input: unknown) => {
        try {
          const args = schema.parse(input);
          const result = await (editor[name] as (value: typeof args) => Promise<unknown>)(args);
          const draftQuery = name === "preview_draft" ? `?draft=${encodeURIComponent((args as { draftId: string }).draftId)}` : "";
          const payload = { ...result as Record<string, unknown>, ...(draftQuery ? {
            previewUrl: `${auth.origin}/ALBURY_HOUSE_TOUR.html${draftQuery}`,
            collectionPreviewUrl: `${auth.origin}/ALBURY_HOUSE_COLLECTIONS.html${draftQuery}`,
          } : {}) };
          return { structuredContent: payload, content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
        } catch (error) {
          const message = error instanceof EditorError ? error.message : "The draft operation could not be completed.";
          return { isError: true, content: [{ type: "text" as const, text: message }] };
        }
      });
    }
  }, {
    serverInfo: { name: "Albury House Editor", version: "1.1.0" },
    maxSubscriptions: 0,
    instructions: "Use these private tools to prepare Albury House drafts. Discover resources, read current values and retain each draft version. Upload images before staging them. The owner reviews, publishes and restores revisions in the web editor.",
  });

  return async (request: Request) => {
    if (!draftKeyAuthorizes(request, auth)) {
      return new Response("Draft editor credentials required.", { status: 401, headers: {
        "WWW-Authenticate": 'Bearer realm="Albury House Editor"', "Cache-Control": "no-store",
      } });
    }
    if (!handler) return new Response("Editor storage is unavailable.", { status: 503 });
    return handler(request);
  };
}

let runtimeHandler: ReturnType<typeof writeMcpWebHandler> | undefined;
export default nodeHandler(request => {
  runtimeHandler ??= writeMcpWebHandler(roomEditorStore(), editorAuth());
  return runtimeHandler(request);
});
