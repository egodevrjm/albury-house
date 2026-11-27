# Albury House

The deployed project contains the Albury House visitor site, a public MCP reference and a private editor for room views and collections.

- Website: <https://albury-house.vercel.app/ALBURY_WELCOME.html>
- MCP endpoint: <https://albury-house.vercel.app/mcp>

The MCP covers the house and its rooms, household staff, external partners, menus resolved against a date, the complete P01–P47 pantry, house collections, guest provision, image retrieval, and dated London events. The dated kitchen calendar covers 11 August 2025 through 10 February 2026.

The public Albury House website: guest welcome, house guide, interactive Walk Albury maps, room tour, collections, house identity, kitchen and front of house, weekly menus, London calendar and authored story weather.

This repository is the optimized deployment artifact generated from `aw_v45`. Public structured content is available under `site/data/public/`; schedule data is under `site/data/`. Images are deployed as WebP or SVG.

The private Albury operations collection is deliberately excluded from this public repository.

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

## Dated menus and special occasions

The daily page, weekly page and MCP share `site/data/public/dining-calendar.json`, drawn from the six-month menu workbook. From 11 August 2025 through 10 February 2026, each date has breakfast provision, lunch and dinner, vegan options and snacks, with puddings and guest service where scheduled. The house dishes gallery includes 96 individual photographs showing late-summer plating and each dish’s autumn and winter variations.

Use `get_menu_for_date` for one day and `get_menu_range` for a span of dates. Uncovered dates report `covered: false` with an empty regular menu. Six optional occasion menus in `site/data/public/special-menus.json` remain available through `list_special_menus` and `get_special_menu`. Supplying `special_menu_id` to `get_menu_for_date` selects the designated lunch or dinner.

Pantry images: `11-house-sauces.webp` shows P34–P37, and the updated `10-house-ice-creams.webp` shows P29, P30 and P38. The former two-tub photograph is archived with the REFRESH maintenance files.

The individual pantry gallery is at `ALBURY_PANTRY_ITEMS.html`. It lists the numbered products, seasonal cordial recipes and additional published preparations, with individual portraits where available. `get_pantry_item.imageUrl` is the single-product photograph; `imageGroup.imageUrl` is the existing group photograph. Rebuild the canonical page with `python3 aw_v45/site/build_content.py` and the optimized copy with `python3 aw_v45/site/build_pantry_portraits.py --optimized` after changing pantry records.

Bethan’s seven signature bakes and all eight cordial cocktail/alcohol-free pairs now have individual photographs. They are shown in the Available food and Drinks sections; `list_signature_bakes` returns a single `imageUrl` for each bake and `list_cordial_serves` returns separate `cocktailImageUrl` and `alcoholFreeImageUrl` values. The site assets are under `images/albury-culinary/signature-bakes/` and `images/albury-culinary/cordial-serves/`.

## Personal gifts sent from Albury

`ALBURY_GIFTS.html` shows six personal courier/post formats. `get_guest_provision({"kind":"sent gifts"})` returns their contents, ownership, packing, storage and photographs. `search_albury` includes the `hospitality` domain; `search_images` exposes their stable image IDs as hospitality images. Dedicated sealed cordial gift batches are validated for ambient storage unopened and refrigerated after opening; fresh service stock retains its refrigeration rules. No dispatch or public retail offer is established.
