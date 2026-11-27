(() => {
  const update = {
    "sectionId": "upper-basement",
    "roomId": "powder-room",
    "views": [
      {
        "legacyPath": "images/albury/upper-basement/04-powder-room.webp",
        "view": {
          "path": "images/albury/upper-basement/powder-suite-2026-11-25/powder-suite-from-corridor.jpg",
          "title": "Powder Room — From the Cinema Corridor",
          "description": "From the cinema corridor, the expanded guest powder suite opens into a shared vanity room with glossy oxblood lacquer, a sculpted black-marble vanity with three basins and a long aged-brass-framed mirror. Four broad fluted opal sconces give soft, warm-neutral light at face height for photographs. A full-length mirror sits in a recessed bay clear of the basins, and Halvard Brekke’s red abstract hangs on the facing wall. Four enclosed WCs are tucked around the return. A separate accessible WC opens off the corridor.",
          "roomName": "Powder Room",
          "roomId": "powder-room",
          "legacySlugs": [
            "04-powder-room"
          ]
        },
        "asset": {
          "id": "images.albury.upper.basement.04.powder.room",
          "path": "images/albury/upper-basement/powder-suite-2026-11-25/powder-suite-from-corridor.jpg",
          "format": "jpg"
        }
      },
      {
        "legacyPath": "images/albury/upper-basement/new-views/04-powder-room.webp",
        "view": {
          "path": "images/albury/upper-basement/powder-suite-2026-11-25/powder-suite-mirror-height.jpg",
          "title": "Powder Room — At Mirror Height",
          "description": "A mirror-height view of the three-basin black-marble vanity and its four fluted opal lights. The broad face-height light is softer and more neutral than the warm wash on the oxblood lacquer. The mirror reflects Brekke’s red abstract, and a separate full-length portrait mirror sits in the recessed bay beyond the vanity.",
          "roomName": "Powder Room",
          "roomId": "powder-room",
          "legacySlugs": [
            "04-powder-room-additional-view"
          ]
        },
        "asset": {
          "id": "images.albury.upper.basement.new.views.04.powder.room",
          "path": "images/albury/upper-basement/powder-suite-2026-11-25/powder-suite-mirror-height.jpg",
          "format": "jpg"
        }
      }
    ]
  };
  const content = window.ALBURY_CONTENT;
  const section = content?.rooms.tour.find(section => section.id === update.sectionId);
  if (!section) return;

  for (const { legacyPath, view, asset } of update.views) {
    const index = section.rooms.findIndex(room => room.roomId === update.roomId && room.path === legacyPath);
    if (index !== -1) section.rooms[index] = view;
    const assets = content.assets?.assets;
    const assetIndex = assets?.findIndex(entry => entry.path === legacyPath) ?? -1;
    if (assetIndex !== -1) assets[assetIndex] = asset;
  }
})();
