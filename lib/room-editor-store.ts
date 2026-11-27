import { neon } from "@neondatabase/serverless";
import type { CollectionEdit } from "./collection-edits.js";
import type { RoomViewEdit } from "./room-views.js";

export type Draft = { id: string; name: string; baseRevision: number; version: number; edits: RoomViewEdit[]; collectionEdits?: CollectionEdit[] };
export type Revision = { id: number; name: string; publishedAt: string | null; edits: RoomViewEdit[]; collectionEdits?: CollectionEdit[] };
export type State = { current: Revision; previous: Revision[]; drafts: Draft[]; exposedImages: string[] };
export type ImageRecord = { id: string; name: string; width: number; height: number };
export type StoredImage = ImageRecord & { content: Buffer };

export interface RoomEditorStore {
  load(): Promise<{ version: string; state: State }>;
  save(version: string, state: State): Promise<boolean>;
  saveImage(image: StoredImage): Promise<ImageRecord>;
  image(id: string): Promise<StoredImage | undefined>;
  images(): Promise<ImageRecord[]>;
  hasImages(ids: string[]): Promise<boolean>;
}

export function initialState(): State {
  return { current: { id: 0, name: "Built-in catalogue", publishedAt: null, edits: [] },
    previous: [], drafts: [], exposedImages: [] };
}

let configuredStore: RoomEditorStore | undefined;

export function roomEditorStore(): RoomEditorStore | undefined {
  const connection = process.env.ALBURY_EDITOR_DATABASE_URL;
  if (!connection) return undefined;
  if (configuredStore) return configuredStore;
  const sql = neon(connection);
  configuredStore = {
    async load() {
      const [row] = await sql`SELECT version::text AS version, state FROM albury_editor.catalogue WHERE singleton`;
      return row ? { version: row.version as string, state: row.state as State } : { version: "0", state: initialState() };
    },
    async save(version, state) {
      const serialized = JSON.stringify(state);
      if (version === "0") {
        const inserted = await sql`INSERT INTO albury_editor.catalogue (version, state) VALUES (1, ${serialized}::jsonb)
          ON CONFLICT (singleton) DO NOTHING RETURNING version`;
        return inserted.length === 1;
      }
      const updated = await sql`UPDATE albury_editor.catalogue SET state = ${serialized}::jsonb, version = version + 1
        WHERE singleton AND version = ${version}::bigint RETURNING version`;
      return updated.length === 1;
    },
    async saveImage({ id, name, content, width, height }) {
      await sql`INSERT INTO albury_editor.images (id, name, content, width, height)
        VALUES (${id}, ${name}, decode(${content.toString("base64")}, 'base64'), ${width}, ${height}) ON CONFLICT (id) DO NOTHING`;
      const [row] = await sql`SELECT id, name, width, height FROM albury_editor.images WHERE id = ${id}`;
      return row as ImageRecord;
    },
    async image(id) {
      const [row] = await sql`SELECT id, name, width, height, encode(content, 'base64') AS encoded
        FROM albury_editor.images WHERE id = ${id}`;
      if (!row) return undefined;
      const { encoded, ...metadata } = row;
      return { ...metadata as ImageRecord, content: Buffer.from(encoded as string, "base64") };
    },
    async images() {
      return await sql`SELECT id, name, width, height FROM albury_editor.images ORDER BY created_at DESC, id LIMIT 200` as ImageRecord[];
    },
    async hasImages(ids) {
      if (!ids.length) return true;
      const [row] = await sql`SELECT count(*)::int AS count FROM albury_editor.images WHERE id = ANY(${ids}::text[])`;
      return row.count === ids.length;
    },
  };
  return configuredStore;
}
