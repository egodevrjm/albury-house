import { z } from "zod";

type Fields = Record<string, unknown>;
export type RoomView = Fields & { path: string; roomId: string; title: string; description: string; roomName?: string; viewSlug?: string; legacySlugs?: string[] };
export type TourSection = Fields & { id: string; name: string; rooms: RoomView[] };

export const assetIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);
const viewIdentifier = z.string().min(1).max(160);
export const roomViewEditSchema = z.strictObject({
  action: z.enum(["add", "replace"]),
  sectionId: identifier,
  roomId: identifier,
  viewId: viewIdentifier,
  assetId: assetIdSchema,
  title: z.string().trim().min(1).max(140),
  caption: z.string().trim().max(1200).default(""),
  position: z.number().int().min(1).max(256).optional(),
}).refine(edit => edit.action !== "add" || identifier.safeParse(edit.viewId).success, {
  message: "A new view needs a URL slug using lowercase letters, numbers and hyphens.",
  path: ["viewId"],
});
export type RoomViewEdit = z.infer<typeof roomViewEditSchema>;

export class EditorError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function roomViewSlug(view: RoomView): string {
  return view.viewSlug ?? view.path.split("/").at(-1)!.replace(/\.[^.]+$/, "") +
    (view.path.includes("/new-views/") ? "-additional-view" : "");
}

export function publicImagePath(assetId: string): string {
  return `images/albury/managed/${assetId}.webp`;
}

const roomFields = [
  "studioName", "parentRoomId", "containedRoomIds", "ceilingHeight", "comfortableCapacity",
  "dimensions", "eventCapacity", "seatingArrangement", "defaultConfigurationId",
] as const;

export function applyRoomViewEdits(sections: TourSection[], edits: RoomViewEdit[]): TourSection[] {
  const bySection = new Map<string, Map<string, RoomViewEdit[]>>();
  for (const edit of edits) {
    const rooms = bySection.get(edit.sectionId) ?? new Map<string, RoomViewEdit[]>();
    const changes = rooms.get(edit.roomId) ?? [];
    changes.push(edit);
    rooms.set(edit.roomId, changes);
    bySection.set(edit.sectionId, rooms);
  }
  const updated = sections.map(section => {
    const changes = bySection.get(section.id);
    if (!changes) return section;
    bySection.delete(section.id);
    const byRoom = new Map<string, RoomView[]>();
    for (const view of section.rooms) {
      if (!changes.has(view.roomId)) continue;
      const group = byRoom.get(view.roomId) ?? [];
      group.push(view);
      byRoom.set(view.roomId, group);
    }
    for (const [roomId, roomEdits] of changes) {
      const group = byRoom.get(roomId);
      if (!group?.length) throw new EditorError(409, `Room ${section.id}/${roomId} no longer exists.`);
      byRoom.set(roomId, editRoom(group, roomEdits));
    }
    const emitted = new Set<string>();
    const rooms = section.rooms.flatMap(view => {
      const group = byRoom.get(view.roomId);
      if (!group) return [view];
      if (emitted.has(view.roomId)) return [];
      emitted.add(view.roomId);
      return group;
    });
    return { ...section, rooms };
  });
  if (bySection.size) throw new EditorError(409, "A section in this revision no longer exists.");
  return updated;
}

function editRoom(existing: RoomView[], edits: RoomViewEdit[]): RoomView[] {
  const originalPrimary = existing[0];
  const views = existing.map(view => ({ ...view }));
  const roomDescription = originalPrimary.roomDescription ?? originalPrimary.description;
  let configurations = (originalPrimary.configurations as Fields[] | undefined)?.map(config => ({ ...config }));
  for (const edit of edits) {
    const targetIndex = views.findIndex(view => roomViewSlug(view) === edit.viewId);
    const path = publicImagePath(edit.assetId);
    let view: RoomView;
    if (edit.action === "replace") {
      if (targetIndex < 0) throw new EditorError(409, `View ${edit.viewId} no longer exists.`);
      const original = views[targetIndex];
      view = { ...original, path, viewSlug: edit.viewId, title: edit.title, description: edit.caption };
      delete view.imageVersion;
      configurations = configurations?.map(config => config.path === original.path ? { ...config, path } : config);
      views.splice(targetIndex, 1);
    } else {
      if (targetIndex >= 0 || views.some(view => view.legacySlugs?.includes(edit.viewId))) {
        throw new EditorError(409, `The link ${edit.viewId} is already used by this room.`);
      }
      view = { path, viewSlug: edit.viewId, roomId: edit.roomId, roomName: originalPrimary.roomName,
        title: edit.title, description: edit.caption };
    }
    const index = edit.position === undefined ? (edit.action === "replace" ? targetIndex : views.length) : edit.position - 1;
    if (index > views.length) throw new EditorError(400, `Choose a position from 1 to ${views.length + 1}.`);
    views.splice(index, 0, view);
  }
  for (const view of views) {
    delete view.configurations;
    delete view.roomDescription;
  }
  for (const field of roomFields) if (originalPrimary[field] !== undefined) views[0][field] = originalPrimary[field];
  if (configurations) views[0].configurations = configurations;
  views[0].roomDescription = roomDescription;
  return views;
}

export function changedRoomViews(sections: TourSection[], edits: RoomViewEdit[]) {
  const touched = new Map<string, Set<string>>();
  for (const edit of edits) {
    const rooms = touched.get(edit.sectionId) ?? new Set<string>();
    rooms.add(edit.roomId);
    touched.set(edit.sectionId, rooms);
  }
  return applyRoomViewEdits(sections, edits).flatMap(section =>
    [...(touched.get(section.id) ?? [])].map(roomId => ({
      sectionId: section.id, roomId, views: section.rooms.filter(view => view.roomId === roomId),
    })));
}
