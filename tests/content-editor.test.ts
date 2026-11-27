import assert from "node:assert/strict";
import test from "node:test";
import { publishedContentHandler } from "../api/published-content.js";
import { roomEditorWebHandler } from "../api/room-editor.js";
import { writeMcpWebHandler } from "../api/mcp-write.js";
import { baseCollections, baseTourSections, contentAtRevision, getCollectionItem, getPantryItem, getRoom, getStaffMember, withPublishedRoomCatalogue } from "../lib/albury-data.js";
import { initialState, type RoomEditorStore } from "../lib/room-editor-store.js";
import { createRoomEditor } from "../lib/room-editor.js";
import { publicImagePath } from "../lib/room-views.js";

function fixture() {
  let state = initialState();
  let version = 0;
  const image = "a".repeat(64);
  const store: RoomEditorStore = {
    async load() { return { version: String(version), state: structuredClone(state) }; },
    async save(expected, next) {
      if (expected !== String(version)) return false;
      state = structuredClone(next);
      version++;
      return true;
    },
    async saveImage(record) { return record; },
    async image() { return undefined; },
    async images() { return []; },
    async hasImages(ids) { return ids.every(id => id === image); },
  };
  return { store, image, editor: createRoomEditor(store, baseTourSections, baseCollections, contentAtRevision) };
}

test("one release updates the pantry, collections, rooms, staff, public site and rollback together", async () => {
  const { store, image, editor } = fixture();
  const draft = await editor.create_draft({ name: "Story edits" });
  const room = baseTourSections[0].rooms[0];
  const stage = await editor.stage_content_edits({ draftId: draft.id, expectedVersion: draft.version, edits: [
    { action: "append", resource: "pantry", path: ["openingItems"], value: {
      id: "P47", name: "Test blackcurrant vinegar", category: "vinegar", description: "Tart and dry.", productionNotes: "Internal prep note.",
    } },
    { action: "image", resource: "pantry", path: ["openingItems", "@P47", "image"], assetId: image },
    { action: "set", resource: "rooms", path: ["tour", "0", "rooms", "0", "roomDescription"], value: "Story-ready room text" },
    { action: "set", resource: "staff", path: ["people", "@ottilie-marchant", "role"], value: "Household Manager" },
    { action: "remove", resource: "pantry", path: ["openingItems", "@P01"] },
  ] });
  assert.equal(stage.editCount, 5);
  assert.equal((await editor.read_content({ resource: "pantry", draftId: draft.id, path: ["openingItems", "@P47", "image"] })).value, publicImagePath(image));
  assert.equal(await withPublishedRoomCatalogue(() => getPantryItem("P47"), store), undefined);
  assert.deepEqual((await store.load()).state.exposedImages, []);
  await assert.rejects(editor.publish_draft({ draftId: draft.id, expectedVersion: draft.version }), { status: 409 });
  const release = await editor.publish_draft({ draftId: draft.id, expectedVersion: stage.version });
  assert.equal(release.revision, 1);
  await withPublishedRoomCatalogue(() => {
    assert.equal(getPantryItem("P47")?.image, publicImagePath(image));
    assert.equal(getPantryItem("P01"), undefined);
    assert.equal(getCollectionItem("pantry-p47")?.title, "Test blackcurrant vinegar");
    assert.equal(getRoom(room.roomId, baseTourSections[0].id)?.description, "Story-ready room text");
    assert.equal(getStaffMember("ottilie-marchant")?.role, "Household Manager");
  }, store);
  const script = await (await publishedContentHandler(store)(new Request("https://example.test/api/published-content"))).text();
  assert.match(script, /pantryProducts.*Test blackcurrant vinegar/);
  assert.doesNotMatch(script, /Internal prep note/);
  assert.ok((await store.load()).state.exposedImages.includes(image));
  await editor.rollback({ revision: 0, expectedRevision: release.revision });
  assert.equal(await withPublishedRoomCatalogue(() => getPantryItem("P47"), store), undefined);
  const restored = await editor.rollback({ revision: 1, expectedRevision: 2 });
  assert.equal(restored.revision, 3);
  assert.equal(await withPublishedRoomCatalogue(() => getPantryItem("P47")?.name, store), "Test blackcurrant vinegar");
});

test("the editor rejects unuploaded images and stale edits, and keeps draft releases owner-only", async () => {
  const { store, editor } = fixture();
  const draft = await editor.create_draft({ name: "Draft-only" });
  await assert.rejects(editor.stage_content_edits({ draftId: draft.id, expectedVersion: 0, edits: [
    { action: "image", resource: "pantry", path: ["openingItems", "@P01", "image"], assetId: "b".repeat(64) },
  ] }), { status: 404 });
  const auth = { origin: "https://albury.example", ownerKey: "o".repeat(40), draftKey: "d".repeat(40) };
  const request = new Request(auth.origin + "/api/room-editor", {
    method: "POST",
    headers: { authorization: "Bearer " + auth.draftKey, "content-type": "application/json" },
    body: JSON.stringify({ action: "publish_draft", input: { draftId: draft.id, expectedVersion: 0 } }),
  });
  assert.equal((await roomEditorWebHandler(store, auth)(request)).status, 403);
  assert.equal((await writeMcpWebHandler(store, auth)(new Request(auth.origin + "/mcp-write"))).status, 401);
  const stages = await Promise.allSettled(["First", "Second"].map(value =>
    editor.stage_content_edits({ draftId: draft.id, expectedVersion: 0, edits: [
      { action: "set", resource: "house", path: ["purpose"], value },
    ] })));
  assert.equal(stages.filter(stage => stage.status === "fulfilled").length, 1);
  assert.equal(stages.filter(stage => stage.status === "rejected").length, 1);
});
