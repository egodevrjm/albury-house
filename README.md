# Albury House

The deployed project contains the Albury House visitor site, a public MCP reference and a private editor for story content.

- Website: <https://albury-house.vercel.app/ALBURY_WELCOME.html>
- MCP endpoint: <https://albury-house.vercel.app/mcp>

The MCP covers the house and its rooms, household staff, external partners, menus resolved against a date, the complete P01–P46 pantry, house collections, guest provision, image retrieval, and dated London events. Monday 11 August 2025 anchors Cycle 1 of the two-week menu rotation.

The public Albury House website: guest welcome, house guide, interactive Walk Albury maps, room tour, collections, house identity, kitchen and front of house, weekly menus, London calendar and authored story weather.

This repository is the optimized deployment artifact generated from `aw_v45`. Public structured content is available under `site/data/public/`; schedule data is under `site/data/`. Images are deployed as WebP or SVG.

The private Albury operations collection is deliberately excluded from this public repository.

## Edit and publish story content

Open /room-editor and sign in with the existing owner key. Create a draft, choose a content area, then open a record or field. Ordinary fields use text controls. Images can be uploaded or selected from the private image collection. Add or remove records from their list. The stage-view form remains available for room galleries. Review staged changes and select Publish draft. The website and the public MCP read the same published revision. Publication history can restore previous revisions.

The authenticated /mcp-write endpoint retains the existing draft-only bearer credential. Use list_content, read_content and stage_content_edits to prepare a draft. In paths, use @id where a unique stable identifier is available and a zero-based index otherwise. Upload an image with upload_image and use its returned asset ID in an image edit. The owner publishes through the browser editor. Send a generated JPEG, PNG or WebP as file bytes up to 3 MiB.

Add house-label products to Pantry products, openingItems or seasonalRecipes, using a unique product ID. An image-backed product appears in Produce as well as in its own pantry register and the pantry MCP tools. Existing collection entries can also be edited independently for artwork and other displays.

The updated editor reuses the existing ALBURY_EDITOR_DATABASE_URL, ALBURY_EDITOR_OWNER_KEY and ALBURY_EDITOR_DRAFT_KEY settings. Older saved drafts and revisions still load. The browser and write MCP share validation and revision checks. The public website receives only the fields from pantry records needed to display the product.

## Floors and outdoor area

Albury has seven internal floors, including its two basements:

| Name | Physical level |
|---|---|
| Albury Spa | Lower Basement |
| Club Alex | Upper Basement |
| Raised Ground | Raised Ground |
| Music Nobile | First Floor |
| Principal guest suites | Second Floor |
| The Dorm | Third Floor |
| Alex's Apartment | Top Floor |

Exterior & Garden is one combined outdoor area. The website tour therefore has eight sections; it does not have eight or nine floors. `list_floors` returns only the seven internal floors. Use `list_outdoor_areas` and `get_outdoor_area` for the frontage, mews, terraces and garden. Stable internal floor IDs and legacy names remain supported; old garden tour links and room filters resolve to the combined outdoor area. Outdoor room records have `floorId: null` and an `outdoorAreaId`.

The house is Albury House. Studio Albury is the live room and control room on Music Nobile; the floor’s rec room is separate. The double-height live room contains two normal-height isolation booths: one comfortably holds three to four people for voice work, and the other comfortably fits a string quartet seated in the round. Room records expose their studio name, parent room, ceiling type and comfortable capacity.

Walk Albury is available at `/ALBURY_WALK.html`. It links 96 current spaces across seven floors and one outdoor area to their photographs, with room focus, zoom, floor changes, search, deep links and backtracking. Historical/proposal material stays in the gallery. Layouts are schematic, not measured plans. Source and build instructions live in `aw_v45/site/README.md`.


## Weather by story date

`get_forecast({"date":"2025-08-11"})` returns the supplied daily London weather, including condition, high/low °C and °F, precipitation mm/chance %, wind mph, provenance and date coverage. It covers 396 days, 1 August 2025–31 August 2026 inclusive. Invalid calendar dates and uncovered dates return errors; there is no extrapolation. This is authored story weather.

`get_date_context` also includes `weather` (or null outside coverage) alongside menus and events. The MCP reads generated `site/data/public/weather.json`; its source is `aw_v45/content/schedules/weather.csv`. Rebuild via `python3 aw_v45/site/build_content.py`, then copy the generated weather JSON, CSV and browser fallback together with the weather UI files into this deployment. The public weather page and Welcome panel share that CSV.

## Year-round menus and special occasions

The house has four seasonal two-week rotations: spring (March–May), summer (June–August), autumn (September–November) and winter (December–February). Together these provide 168 breakfast, lunch and dinner menus. The two-week cycle remains anchored to Monday 11 August 2025; each date uses its own season, even within a week that crosses a seasonal boundary.

The complete regular menus are maintained in `content/schedules/menus.csv`. Six optional occasion menus are maintained in `content/public/special-menus.json`: Christmas lunch, Boxing Day lunch, New Year's Eve dinner, Easter lunch, a summer garden party and a celebration dinner. Each includes vegetarian provision and service notes.

Use the Albury House MCP `get_menu_for_date` for regular provision, `list_special_menus` to browse occasions and `get_special_menu` for full details. Supplying `special_menu_id` to `get_menu_for_date` substitutes only the designated lunch or dinner on that date. A special menu is an available kitchen plan; it does not establish guests, a booking or a meal already eaten. Christmas and other occasions do not override ordinary menus automatically.

Pantry images: `11-house-sauces.webp` shows P34–P37, and the updated `10-house-ice-creams.webp` shows P29, P30 and P38. The former two-tub photograph is archived with the REFRESH maintenance files.

The individual pantry gallery is at `ALBURY_PANTRY_ITEMS.html`. All 46 numbered products and both unnumbered seasonal cordial recipes have one-product images. `get_pantry_item.imageUrl` is the single-product photograph; `imageGroup.imageUrl` is the existing group photograph. Rebuild the canonical page with `python3 aw_v45/site/build_content.py` and the optimized copy with `python3 aw_v45/site/build_pantry_portraits.py --optimized` after changing pantry records.

Bethan’s seven signature bakes and all eight cordial cocktail/alcohol-free pairs now have individual photographs. They are shown in the Available food and Drinks sections; `list_signature_bakes` returns a single `imageUrl` for each bake and `list_cordial_serves` returns separate `cocktailImageUrl` and `alcoholFreeImageUrl` values. The site assets are under `images/albury-culinary/signature-bakes/` and `images/albury-culinary/cordial-serves/`.

## Personal gifts sent from Albury

`ALBURY_GIFTS.html` shows six personal courier/post formats. `get_guest_provision({"kind":"sent gifts"})` returns their contents, ownership, packing, storage and photographs. `search_albury` includes the `hospitality` domain; `search_images` exposes their stable image IDs as hospitality images. Dedicated sealed cordial gift batches are validated for ambient storage unopened and refrigerated after opening; fresh service stock retains its refrigeration rules. No dispatch or public retail offer is established.
