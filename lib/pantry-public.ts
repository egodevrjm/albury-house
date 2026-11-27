import type { Collection, CollectionItem } from "./collection-edits.js";

type Product = Record<string, unknown> & { id: string; name: string; category: string };
export type Pantry = { summary: Record<string, unknown>; openingItems: Product[]; seasonalRecipes: Product[]; asOf: string };

export function pantryPublic(pantry: Pantry) {
  const project = (product: Product) => ({
    id: product.id, name: product.name, category: product.category,
    description: String(product.description ?? product.uses ?? ""),
    image: typeof product.image === "string" ? product.image : null,
    imageAlt: String(product.imageAlt ?? product.name),
  });
  return { openingItems: pantry.openingItems.map(project), seasonalRecipes: pantry.seasonalRecipes.map(project) };
}

export function updateProduce(collections: Collection[], before: Pantry, after: Pantry) {
  const originals = [...before.openingItems, ...before.seasonalRecipes];
  const current = new Map([...after.openingItems, ...after.seasonalRecipes].map(product => [product.id, product]));
  const changed = new Map(originals.filter(product => {
    const next = current.get(product.id);
    return !next || JSON.stringify(product) !== JSON.stringify(next);
  }).map(product => [product.id, product]));
  const added = [...current.values()].filter(product => !originals.some(original => original.id === product.id));
  const entry = (product: Product, previous?: CollectionItem): CollectionItem => {
    const description = String(product.description ?? product.uses ?? "");
    return {
      ...(previous ?? { id: "pantry-" + product.id.toLowerCase(), viewSlug: "pantry-" + product.id.toLowerCase() }),
      title: product.name,
      description: [product.id, description].filter(Boolean).join(" · "),
      ...(typeof product.image === "string" ? { path: product.image } : { path: previous?.path }),
    };
  };
  return collections.map(collection => {
    if (collection.id !== "produce") return collection;
    const shown = new Set<string>();
    const items = collection.rooms.flatMap(item => {
      const original = [...changed.values()].find(product =>
        item.title.toLowerCase() === product.name.toLowerCase() ||
        (typeof product.image === "string" && item.path === product.image));
      if (original) {
        shown.add(original.id);
        const next = current.get(original.id);
        return next ? [entry(next, item)] : [];
      }
      const addition = added.find(product => item.title.toLowerCase() === product.name.toLowerCase());
      if (!addition) return [item];
      shown.add(addition.id);
      return [entry(addition, item)];
    });
    const projections = [...added, ...[...changed.keys()].flatMap(id => current.has(id) ? [current.get(id)!] : [])]
      .filter(product => !shown.has(product.id) && typeof product.image === "string").map(product => entry(product));
    return { ...collection, rooms: [...items, ...projections] };
  });
}
