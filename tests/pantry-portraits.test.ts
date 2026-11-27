import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { publishedRoomCatalogue } from '../api/room-catalogue.js';
import { baseCollections, getCollectionItem, getPantryItem, listPantry, searchImages, withPublishedRoomCatalogue } from '../lib/albury-data.js';
import { collectionItemId } from '../lib/collection-edits.js';
import { initialState, type RoomEditorStore } from '../lib/room-editor-store.js';

test('every opening and seasonal pantry record has its own deployable portrait', () => {
  const all = listPantry({ includeSeasonal: true, limit: 50 });
  assert.equal(all.total, 48);
  assert.equal(all.items.length, 48);
  assert.equal(new Set(all.items.map((item) => item.image)).size, 48);
  for (const listed of all.items) {
    const item = getPantryItem(String(listed.id));
    assert.ok(item, String(listed.id));
    assert.match(String(item.image), /^images\/albury-produce\/individual\//);
    assert.ok(fs.existsSync(String(item.image)), `missing portrait: ${item.image}`);
    assert.equal(item.imageUrl, `https://albury-house.vercel.app/${item.image}`);
    const group = item.imageGroup as { ids: string[]; imageUrl: string };
    if (group.ids.length > 1) assert.notEqual(item.imageUrl, group.imageUrl);
    else assert.ok(group.ids.includes(String(item.id)) || String(item.id).startsWith("seasonal-"));
  }
  const gallery = fs.readFileSync('ALBURY_PANTRY_ITEMS.html', 'utf8');
  assert.equal((gallery.match(/class="pantry-item"/g) ?? []).length, 48);
  assert.match(gallery, /id="P46"/);
  assert.match(gallery, /id="seasonal-rhubarb-orange-cordial"/);
  const found = searchImages({ query: 'Albury brown sauce', kind: 'pantry', limit: 50 });
  assert.ok(found.items.some((image) => image.path === getPantryItem('P34')?.image));
});

test('pantry catalogue views share products and retain published edits', async () => {
  const baseProduce = baseCollections.find(collection => collection.id === "produce")!;
  const lemonIndex = baseProduce.rooms.findIndex(item => item.path?.endsWith("/p43.webp"));
  const lemonLegacyId = collectionItemId(baseProduce, baseProduce.rooms[lemonIndex], lemonIndex);
  const state = initialState();
  const imageId = "a".repeat(64);
  state.current = {
    ...state.current, id: 7,
    collectionEdits: [
      { action: "add", collectionId: "produce", itemId: "produce-albury-sauce", slug: "albury-sauce",
        title: "Albury Sauce", description: "Rafael’s fresh mayonnaise", assetId: imageId },
      { action: "replace", collectionId: "produce", itemId: lemonLegacyId, description: "Published batch note" },
    ],
  };
  const store = { load: async () => ({ version: "7", state }) } as RoomEditorStore;
  const { revision, food } = await publishedRoomCatalogue(store, true);
  assert.equal(revision, 7);
  assert.ok(food);
  const produce = food.collections.find(collection => collection.id === "produce")!;
  const baking = food.collections.find(collection => collection.id === "baking")!;
  assert.equal(food.pantry.length, 49);
  const productCards = produce.rooms.filter(room => room.foodSection !== "Group photographs");
  assert.equal(productCards.length, 49);
  assert.equal(new Set(productCards.map(card => card.path)).size, 49);
  for (const product of food.pantry) {
    const card = productCards.find(item => (item.productLinks as { id: string }[])[0].id === product.id);
    assert.equal(card?.title, product.name);
    assert.equal(card?.path, product.image);
  }

  const sauce = productCards.find(item => item.id === "produce-albury-sauce")!;
  assert.equal(sauce.viewSlug, "albury-sauce");
  assert.equal(sauce.foodLabel, "Fresh preparation");
  const shortbread = baking.rooms.find(item => item.title === "Butter shortbread")!;
  assert.match(String(shortbread.path), /signature-bakes/);
  assert.deepEqual(shortbread.productLinks, [{ id: "P21", name: "Butter shortbread" }]);
  assert.equal(baking.rooms.filter(item => item.foodSection === "Savoury baking").length, 2);
  const group = produce.rooms.find(item => item.viewSlug === "08-biscuits-and-bar-snacks")!;
  assert.ok((group.productLinks as { id: string }[]).some(item => item.id === "P21"));

  await withPublishedRoomCatalogue(() => {
    assert.equal(listPantry({ includeSeasonal: true }).total, 49);
    assert.equal(getPantryItem("Albury Sauce")?.image, sauce.path);
    assert.equal(getPantryItem("P43")?.description, "Published batch note");
    assert.equal(getCollectionItem(lemonLegacyId)?.id, "pantry-p43");
    assert.ok(searchImages({ query: "Albury Sauce", kind: "pantry" }).items.some(item => item.path === sauce.path));
  }, store);
});
