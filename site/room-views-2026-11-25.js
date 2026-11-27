(() => {
  const updates = [
  {
    "section": "raised-ground",
    "anchor": "images/albury/ground-floor/07-dining-room.webp",
    "view": {
      "path": "images/albury/ground-floor/2026-11-25/dining-room-summer-daylight.webp",
      "title": "Dining Room — Summer Daylight",
      "legacySlugs": [
        "07-dining-room"
      ]
    },
    "asset": {
      "id": "images.albury.raised-ground.dining-room-summer-daylight",
      "path": "images/albury/ground-floor/2026-11-25/dining-room-summer-daylight.webp",
      "format": "webp"
    },
    "replace": true
  },
  {
    "section": "exterior",
    "anchor": "images/albury/garden/2026-11-24/rear-terrace-bronze-canopy.jpg",
    "view": {
      "path": "images/albury/garden/2026-11-25/rear-terrace-lounge-blue-hour.webp",
      "title": "Rear Terrace — Lounge at Blue Hour",
      "description": "View along the terrace at blue hour."
    },
    "asset": {
      "id": "images.albury.exterior.rear-terrace-lounge-blue-hour",
      "path": "images/albury/garden/2026-11-25/rear-terrace-lounge-blue-hour.webp",
      "format": "webp"
    }
  },
  {
    "section": "exterior",
    "anchor": "images/albury/garden/2026-11-25/rear-terrace-lounge-blue-hour.webp",
    "view": {
      "path": "images/albury/garden/2026-11-25/rear-terrace-from-the-table.webp",
      "title": "Rear Terrace — From the Dining Table",
      "description": "The view from the dining table."
    },
    "asset": {
      "id": "images.albury.exterior.rear-terrace-from-the-table",
      "path": "images/albury/garden/2026-11-25/rear-terrace-from-the-table.webp",
      "format": "webp"
    }
  },
  {
    "section": "raised-ground",
    "anchor": "images/albury/ground-floor/06-kitchen-breakfast-room.webp",
    "view": {
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-from-the-breakfast-table.webp",
      "title": "Principal Kitchen — From the Breakfast Table",
      "description": "The kitchen from the breakfast table."
    },
    "asset": {
      "id": "images.albury.raised-ground.principal-kitchen-from-the-breakfast-table",
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-from-the-breakfast-table.webp",
      "format": "webp"
    }
  },
  {
    "section": "raised-ground",
    "anchor": "images/albury/ground-floor/2026-11-25/principal-kitchen-from-the-breakfast-table.webp",
    "view": {
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-at-work.webp",
      "title": "Principal Kitchen — At Work",
      "description": "A view during prep."
    },
    "asset": {
      "id": "images.albury.raised-ground.principal-kitchen-at-work",
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-at-work.webp",
      "format": "webp"
    }
  },
  {
    "section": "raised-ground",
    "anchor": "images/albury/ground-floor/2026-11-25/principal-kitchen-at-work.webp",
    "view": {
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-stocked-pantry.webp",
      "title": "Principal Kitchen — Inside the Pantry",
      "description": "The shelves and prep fridge."
    },
    "asset": {
      "id": "images.albury.raised-ground.principal-kitchen-stocked-pantry",
      "path": "images/albury/ground-floor/2026-11-25/principal-kitchen-stocked-pantry.webp",
      "format": "webp"
    }
  },
  {
    "section": "upper-basement",
    "anchor": "images/albury/upper-basement/club-alex-2026-11-24/from-the-stage.jpg",
    "view": {
      "path": "images/albury/upper-basement/club-alex-2026-11-25/empty-stage-welmar.webp",
      "title": "Bar & Games Room — Empty Stage",
      "description": "The stage between setups."
    },
    "asset": {
      "id": "images.albury.upper-basement.empty-stage-welmar",
      "path": "images/albury/upper-basement/club-alex-2026-11-25/empty-stage-welmar.webp",
      "format": "webp"
    }
  }
];
  const content = window.ALBURY_CONTENT;
  for (const { section, anchor, view, replace, asset } of updates) {
    const rooms = content.rooms.tour.find(floor => floor.id === section)?.rooms;
    const index = rooms?.findIndex(candidate => candidate.path === anchor) ?? -1;
    if (index < 0) continue;
    const updated = { ...rooms[index], ...view };
    if (!replace) {
      delete updated.legacySlugs;
      delete updated.configurationId;
    }
    rooms.splice(index + (replace ? 0 : 1), replace ? 1 : 0, updated);
    content.assets.assets.push(asset);
  }
})();
