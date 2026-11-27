import { z } from "zod";
import { baseCollections, baseTourSections, contentAtRevision } from "../lib/albury-data.js";
import { editorAuth, editorRole, keyMatches, signIn, signOut, type EditorAuth } from "../lib/editor-auth.js";
import { nodeHandler } from "../lib/node-http.js";
import { createRoomEditor, editorSchemas, type EditorAction } from "../lib/room-editor.js";
import { roomEditorStore, type RoomEditorStore } from "../lib/room-editor-store.js";
import { EditorError } from "../lib/room-views.js";

function reply(value: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function roomEditorWebHandler(store: RoomEditorStore | undefined, auth: EditorAuth) {
  return async (request: Request): Promise<Response> => {
    if (!store || !auth.ownerKey || auth.ownerKey.length < 32) return reply({ error: "The editor has not been configured." }, 503);
    const editor = createRoomEditor(store, baseTourSections, baseCollections, contentAtRevision);
    const role = editorRole(request, auth);
    try {
      if (request.method === "GET") {
        if (!role) return reply({ error: "Sign in to use the editor." }, 401);
        const id = new URL(request.url).searchParams.get("image");
        if (id) {
          const image = await editor.read_image(id, false);
          return image ? new Response(new Uint8Array(image.content), { headers: {
            "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
          } }) : reply({ error: "Image unavailable." }, 404);
        }
        return reply({ role });
      }
      if (request.method !== "POST") return reply({ error: "Method unavailable." }, 405, { Allow: "GET, POST" });
      if (role !== "drafter" && request.headers.get("origin") !== auth.origin) {
        return reply({ error: "Open the editor on its configured site." }, 403);
      }
      if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Send JSON." }, 415);
      const raw = await request.text();
      if (raw.length > 4_200_000) return reply({ error: "Image is too large." }, 413);
      let body: unknown;
      try { body = JSON.parse(raw); } catch { return reply({ error: "Send valid JSON." }, 400); }
      const command = z.strictObject({ action: z.string(), input: z.unknown().optional() }).safeParse(body);
      if (!command.success) return reply({ error: "Choose an editor action." }, 400);
      const { action, input = {} } = command.data;
      if (action === "sign_in") {
        const credentials = z.strictObject({ key: z.string().max(512) }).safeParse(input);
        if (!credentials.success || !keyMatches(credentials.data.key, auth.ownerKey)) return reply({ error: "Sign-in key was rejected." }, 401);
        return reply({ role: "owner" }, 200, { "Set-Cookie": signIn(auth) });
      }
      if (!role) return reply({ error: "Sign in to use the editor." }, 401);
      if (action === "sign_out") return reply({ signedOut: true }, 200, { "Set-Cookie": signOut(auth) });
      if ((action === "publish_draft" || action === "rollback") && role !== "owner") {
        return reply({ error: "The owner approves releases in the editor." }, 403);
      }
      if (!Object.hasOwn(editorSchemas, action)) return reply({ error: "Unknown editor action." }, 404);
      const key = action as EditorAction;
      const args = editorSchemas[key].safeParse(input);
      if (!args.success) return reply({ error: args.error.issues[0].message }, 400);
      // Each action uses the schema selected by the same action name.
      const run = editor[key] as (parameters: typeof args.data) => Promise<unknown>;
      return reply(await run(args.data));
    } catch (error) {
      if (error instanceof EditorError) return reply({ error: error.message }, error.status);
      console.error("An Albury room-editor action failed.");
      return reply({ error: "The editor could not save or read this change. Try again." }, 503);
    }
  };
}

export default nodeHandler(request => roomEditorWebHandler(roomEditorStore(), editorAuth())(request));
