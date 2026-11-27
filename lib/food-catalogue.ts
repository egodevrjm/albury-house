import { createRequire } from "node:module";
import { collectionItemId, collectionItemSlug, type Collection, type CollectionItem } from "./collection-edits.js";

const requireJson = createRequire(import.meta.url);

export type PantryProduct = Record<string, unknown> & {
  id: string;
  name: string;
  category: string;
  labelFamily: string;
  image?: string;
  imageGroupId?: string;
  season?: string;
  uses?: string;
  description?: string;
  openingAvailability?: string;
  editableInCollection?: boolean;
};

type Bake = Record<string, unknown> & {
  id: string;
  name: string;
  kind: string;
  description: string;
  image: string;
  pantryId?: string;
};

type PantryGroup = { id: string; title: string; description: string; path: string; ids: string[] };
export const pantryItems = requireJson("../mcp-data/pantry-items.json") as {
  asOf: string;
  summary: Record<string, unknown>;
  openingItems: PantryProduct[];
  seasonalRecipes: PantryProduct[];
};
export const pantryGroups = requireJson("../site/data/public/pantry.json").preparations as PantryGroup[];
const culinary = requireJson("../site/data/public/culinary.json") as { signatureBakes: Bake[]; cordialFoundations: Array<{ pantryId: string }> };
const citrusBaseIds = new Set(culinary.cordialFoundations.map(cordial => cordial.pantryId));

const sections = [
  ["Preserves, curds & compotes", "fruit preserves", "chilled curds and compotes"],
  ["Sauces & condiments", "table condiments", "house sauces", "fresh house preparations"],
  ["Pickles & savoury preserves", "pickles and savoury preserves", "savoury confits"],
  ["Baking & snacks", "breakfast pantry", "crackers and savoury baking", "biscuits", "bar snacks"],
  ["Cordials", "cordial"],
  ["Bar syrups & garnishes", "bar garnish", "syrup"],
  ["Ice creams", "ice cream"],
];
const productsByLabel = [...pantryItems.openingItems, ...pantryItems.seasonalRecipes];
const groupByPath = new Map(pantryGroups.map(group => [group.path, group]));
const productIdByLegacyPath = new Map<string, string>(
  productsByLabel.flatMap(product => {
    const group = pantryGroups.find(candidate => candidate.id === product.imageGroupId);
    return [
      ...(product.image ? [[product.image, product.id] as const] : []),
      ...(group && group.ids.length <= 1 ? [[group.path, product.id] as const] : []),
    ];
  }),
);
productIdByLegacyPath.set("images/albury-culinary/vanilla-syrup.webp", "P26");
productIdByLegacyPath.set("images/albury-culinary/cordial-ginger.webp", "P27");
productIdByLegacyPath.set("images/albury-culinary/cordial-passion.webp", "P28");

type ProductLink = { id: string; name: string };
type PublicFoodItem = CollectionItem & {
  foodSection: string;
  foodLabel?: string;
  legacyId?: string;
  legacySlug?: string;
  productLinks?: ProductLink[];
};

function categorySection(category: string) {
  return sections.find(([, ...categories]) => categories.includes(category))?.[0] ?? "House preparations";
}

function label(product: PantryProduct) {
  return product.season ? `Seasonal · ${product.season}`
    : product.category === "fresh house preparations" ? "Fresh preparation"
    : product.category === "house preparations" ? "House preparation"
    : citrusBaseIds.has(product.id) ? `${product.id} · Citrus base` : product.id;
}

function productCopy(product: PantryProduct) {
  const details = [product.description || product.uses, product.openingAvailability];
  return details.filter((detail): detail is string => !!detail)
    .map(detail => /[.!?]$/.test(detail) ? detail : detail + ".").join(" ");
}

function productCard(product: PantryProduct, section = categorySection(product.category)): PublicFoodItem {
  return {
    id: `pantry-${product.id.toLowerCase()}`, title: product.name, path: product.image,
    viewSlug: product.id.toLowerCase(), description: productCopy(product),
    foodSection: section, foodLabel: label(product), productLinks: [{ id: product.id, name: product.name }],
    imageVersion: product.imageVersion,
  };
}

export function withPantryEditorItems(collections: Collection[]): Collection[] {
  const editable = productsByLabel.filter(product => product.editableInCollection).map(product => ({
    id: `pantry-${product.id.toLowerCase()}`,
    viewSlug: product.id.toLowerCase(),
    pantryId: product.id,
    title: product.name,
    description: productCopy(product),
    path: product.image,
  }));
  return collections.map(collection => collection.id === "produce"
    ? { ...collection, rooms: [...collection.rooms, ...editable] }
    : collection);
}

export function createFoodCatalogue(collections: Collection[], baseline: Collection[]): {
  pantry: Array<PantryProduct & { foodSection: string; foodLabel: string }>;
  bakes: Bake[];
  collections: Collection[];
} {
  const produce = collections.find(collection => collection.id === "produce");
  const baking = collections.find(collection => collection.id === "baking");
  const baseProduce = baseline.find(collection => collection.id === "produce");
  const baseBaking = baseline.find(collection => collection.id === "baking");
  const products = new Map(productsByLabel.map(product => [product.id, product]));
  const legacyCards = new Map<string, { legacyId: string; legacySlug: string }>();
  const familyPhotos: PublicFoodItem[] = [];
  produce?.rooms.forEach((item, index) => {
    const original = baseProduce?.rooms[index];
    const id = collectionItemId(produce, item, index);
    const viewSlug = collectionItemSlug(item, id);
    if (!original) {
      products.set(id, {
        id, name: item.title, category: id === "produce-albury-sauce" ? "fresh house preparations" : "house preparations", labelFamily: "pantry",
        image: item.path, description: item.description,
      });
      legacyCards.set(id, { legacyId: id, legacySlug: viewSlug });
      return;
    }
    const originalPath = original.path ?? "";
    const productId = original.pantryId ?? productIdByLegacyPath.get(originalPath);
    const product = productId ? products.get(productId) : undefined;
    if (product) {
      legacyCards.set(product.id, { legacyId: id, legacySlug: viewSlug });
      products.set(product.id, {
        ...product,
        ...(item.title !== original.title ? { name: item.title } : {}),
        ...(item.description !== original.description ? { description: item.description } : {}),
        ...(item.path !== original.path ? { image: item.path, imageVersion: undefined } : {}),
      });
      return;
    }
    const group = groupByPath.get(originalPath);
    const photo: PublicFoodItem = { ...item, id, viewSlug, foodSection: "Group photographs" };
    if (group) {
      if (photo.description === original.description) photo.description = "Group photograph of the products listed below.";
      if (photo.title === "New House Cordials & Syrup") photo.title = "Cordials and demerara syrup";
    }
    familyPhotos.push({ ...photo, groupId: group?.id });
  });

  const register = [...products.values()].map(product => ({
    ...product, foodSection: categorySection(product.category), foodLabel: label(product),
  }));
  const order = (section: string) => {
    const index = sections.findIndex(([title]) => title === section);
    return index < 0 ? sections.length : index;
  };
  const productCards = register.map(product => {
    const legacy = legacyCards.get(product.id);
    const card = productCard(product);
    return /^P\d+$/.test(product.id) || product.season ? { ...card, ...legacy }
      : { ...card, id: product.id, viewSlug: legacy?.legacySlug ?? card.viewSlug };
  }).sort((a, b) => order(a.foodSection) - order(b.foodSection));

  for (const photo of familyPhotos) {
    const group = pantryGroups.find(item => item.id === photo.groupId);
    photo.productLinks = group?.ids.flatMap(id => {
      const product = products.get(id);
      return product ? [{ id, name: product.name }] : [];
    });
  }

  const bakeByImage = new Map(culinary.signatureBakes.map(bake => [bake.image, bake]));
  const bakes: Bake[] = [];
  const bakingCards = baking?.rooms.map((item, index): PublicFoodItem => {
    const original = baseBaking?.rooms[index];
    const id = collectionItemId(baking, item, index);
    const viewSlug = collectionItemSlug(item, id);
    const bake = bakeByImage.get(original?.path ?? "");
    if (!bake) {
      const section = original?.path?.endsWith("/bethan-bread.webp") ? "Bread"
        : original?.path?.endsWith("/bethan-morning-pastries.webp") ? "Morning pastries"
        : "Cakes & small bakes";
      return { ...item, id, viewSlug, foodSection: section };
    }
    const pantryProduct = bake.pantryId ? products.get(bake.pantryId) : undefined;
    const name = item.title !== original?.title ? item.title : pantryProduct?.name ?? bake.name;
    const description = item.description !== original?.description ? item.description : bake.description;
    bakes.push({ ...bake, name, description, image: item.path ?? bake.image });
    return { ...item, id, viewSlug, title: name, description,
      foodSection: bake.kind === "biscuit tin" ? "Biscuits" : "Cakes & small bakes",
      foodLabel: pantryProduct ? `${pantryProduct.id} · Served bake` : String(bake.availability ?? ""),
      ...(pantryProduct ? { productLinks: [{ id: pantryProduct.id, name: pantryProduct.name }] } : {}),
    };
  }) ?? [];
  for (const id of ["P19", "P20"]) {
    const product = products.get(id);
    if (product) bakingCards.push({ ...productCard(product, "Savoury baking"), id: "baking-" + id.toLowerCase() });
  }
  const bakingOrder = ["Bread", "Morning pastries", "Savoury baking", "Biscuits", "Cakes & small bakes"];
  bakingCards.sort((a, b) => bakingOrder.indexOf(a.foodSection) - bakingOrder.indexOf(b.foodSection));

  return {
    pantry: register,
    bakes,
    collections: [
      ...(produce ? [{ ...produce, name: "Pantry", short: "Individual products, seasonal recipes and group photographs",
        description: "Albury’s labelled preparations, with individual portraits and links to the group photographs.",
        rooms: [...productCards, ...familyPhotos] }] : []),
      ...(baking ? [{ ...baking, short: "Bread, pastries, savoury baking, biscuits and cakes",
        description: "Bethan Pritchard’s repertoire. Pantry labels link to the matching product portrait.",
        rooms: bakingCards }] : []),
    ],
  };
}
