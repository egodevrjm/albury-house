# Albury site

This is a static, local-file-compatible site. No package installation, network connection or external fonts are required to view it. Canonical content lives in `../content/`; run `python3 site/build_content.py` after editing JSON or CSV data.

- `../index.html` leads to `../ALBURY_WELCOME.html`, the visitor welcome page. The bare `../ALBURY_HOUSE_TOUR.html` opens the room tour.
- Existing tour hash links still open the requested room; old guide and collection links redirect to their new dedicated pages, preserving the selected section or item.
- `../ALBURY_CULINARY_MENU.html` is Kitchen & Front of House, managed in-world by Rafael Bellocq and Crispin Vale.
- `../ALBURY_WEEKLY_MENUS.html` renders the selected 21-meal week from the same CSV as the kitchen page. A static copy of the original week remains as a no-JavaScript fallback.
- `../ALBURY_KITCHEN_LIBRARY.html` preserves the food repertoire, pantry photographs and hospitality catalogue.
- `shared.css` / `shared.js` supply cross-site navigation; `kitchen.css` / `kitchen.js` supply the intranet and welcome page.
- `../content/schedules/menus.csv` holds 42 complete summer menus in two weekly cycles. The compiler publishes it to `site/data/menus.csv`. Cycle 1 preserves the existing menu repertoire in `upload/ALBURY_MENUS_AND_COMMON_FOODS.md`; cycle 2 extends the site’s summer repertoire. Neither creates attendance or bookings. The rotation starts on Monday 11 August 2025, not the computer’s current date.
- `../ALBURY_LONDON_CALENDAR.html` is a filterable August 2025–July 2026 event guide using `data/london-events.csv`, with source links and calendar export.

Service brief: produces copyable text only, never sends, books or saves information. There is no authentication, live inventory, rota feed, remote submission or Wi-Fi captive-portal configuration. Do not treat a hidden tab as access control. Configure the actual Wi-Fi landing URL separately when hosting the site.

Historical build scripts in admin predate this integrated site and can overwrite the new pages. Do not run `culinary-programme-2026-09-05/build_menu.py` or `culinary-week-2026-09-07/build_week.py` directly over the live pages. Edit `../content/schedules/menus.csv` and regenerate the site as described below. Never edit generated files in `site/data/public/`, `content-data.js`, `house-catalogue.js`, `menu-data.js`, `events-data.js` or `weather-data.js` by hand. If promoting menu additions into narrative canon, update the owning upload document and its manifest separately.

The separate `vercel-albury-tour/` export was not deployed or overwritten. This change updates the local aw_v45 site. All paths are relative and can be served together from a static host.

## Editing the menus

`../content/schedules/menus.csv` is the editable table: one row per complete breakfast, lunch or dinner. Use UTF-8 CSV. Commas, double quotes and line breaks inside quoted cells are supported.

Required identity fields: `cycle` (consecutive integers from 1), `day` (Monday–Sunday), `theme` (the same for all three meals that day), `meal` (Breakfast/Lunch/Dinner), and `main`. Optional course columns: `with_drinks`, `starter`, `bowl`, `alongside`, `dessert`, `bread_preserves`, `vegetarian`. Leave unused courses empty. Each cycle must have exactly 21 unique meals. Add complete cycles for a longer rotation; do not shuffle individual courses at random.

The date picker determines the weekday and cycle. Every seven days advances one cycle; after the last cycle it repeats from 1. It deliberately remains a summer rotation, not a year-round seasonal menu. Dates before the anchor wrap backwards. Opening week resets to 11 August 2025. `?date=2025-08-18` opens cycle 2. The daily page’s weekly-menu link carries the selected date.

- **Hosted site:** JavaScript fetches the CSV on load, bypassing the browser cache. If fetching fails, it displays the bundle and identifies the fallback. Invalid fetched CSV is reported rather than silently replaced.
- **Opening from disk:** browsers restrict `fetch(file://...)`; generated JavaScript embeds the exact CSV text for the same parser. After saving structured content, run `python3 site/build_content.py` from `aw_v45`, then reload the page. The older `site/build_data.py` command delegates to the same compiler.
- **Quick preview:** open “Menu CSV · download or preview edits”, download/edit the CSV, then select it in the file picker. This preview changes only the current page until reload. It does not write files, persist across pages or update other guests’ browsers. Invalid imports leave the previous valid menus intact.

Both daily and weekly views use `menu-rotation.js`; `menu-data.js` is generated, not a separate source of truth. The old static weekly markup is only the original-week no-JS fallback. The compiler uses Python’s standard library and does not fetch anything.

## Editing the London calendar

`../content/schedules/london-events.csv` has 122 researched events, with inclusive start/end dates, location, access notes and an organiser or institutional source URL for each. The compiler publishes it to `site/data/london-events.csv`. The date window is August 2025–July 2026 to match story time. Sources were checked on 8 September 2026. Coverage now includes major exhibitions, architecture, performance, food and drink, awards, seasonal London, cricket, polo and the wider summer social circuit as well as the original headline events. It is deliberately selective within recurring seasons: the Proms, NFL London, Lord's internationals and the major polo tournaments are represented without turning the page into a fixture-by-fixture sports feed.

Some sources are later announcements or archives. These dates are retrospective author research, not evidence that every detail was known at story opening on 11 August 2025. No award results, Alex invitations, attendance or household booking is inferred. Multi-day programme spans can include dark days; individual organiser schedules remain controlling. The research method, coverage audit and grouped source ledger are in `../admin/london-calendar-deep-research-2026-09-08/report-source.md`.

Add or edit rows in the canonical CSV, keeping unique `id` values and ISO dates. Run `python3 site/build_content.py` to refresh the published CSV and local-file bundle `events-data.js`; hosted pages fetch the CSV directly. Filters include events overlapping the chosen month. The full-year view lists each event once in its starting month. Search and filters are reflected in the URL.

Calendar (.ics) downloads contain the filtered events or one chosen event, as transparent all-day entries. CSV end dates are inclusive; the exporter converts them to the exclusive next-day end required by iCalendar and folds long lines at UTF-8 character boundaries. For programmes on selected dates (such as Christmas at Kew), the entry marks the overall programme span, and the notes explain exceptions. Downloads never book or subscribe to anything.

## House identity page

`../ALBURY_HOUSE_STYLE.html` brings together the current architectural mark, household colour variants and product photographs. `house-style.css` and `house-style.js` supply presentation, copyable HEX references and the full-colour / ivory-led stationery comparison. Shared navigation and the welcome page link to it.

Sources: `upload/ALBURY_GUEST_HOSPITALITY.md`, `upload/ALBURY_CULINARY_PROGRAMME.md`, `images/albury-house-items/HOUSEHOLD_VARIANT_SYSTEM.md`, the current mark at `images/albury/identity/house-mark-current.webp`, and current household photographs. The page introduces digital colour reference values and practical production guidance; these are labelled as such, not historical Pantone specifications or supplier-approved production files.

`identity/house-mark-clear-space.svg` is a standalone placement diagram embedding the existing unmodified PNG. Its artwork remains raster; the SVG wrapper provides vector annotations, not a newly traced production logo. It measures a 10% clear-space margin around the visible architectural drawing. Download the diagram or the original PNG from the page.

The house-scent candle is established, but no fragrance formula or notes were found in the current files. The page labels bergamot / black tea / cedar / vetiver as a **proposed scent brief**. Do not promote it to retrieved canon or name a manufacturer without a further decision. The page creates no retail launch or ban on future sale and does not replace third-party producer identities.

## House guide, room tour and collections

The shared navigation groups House guide, Room tour, House collections and House style under **The house**. Weekly menus uses the same editorial layout as Kitchen & Front of House, while retaining the CSV rotation and printable menus.

- `../ALBURY_HOUSE_GUIDE.html` owns the eight guide sections, including the household directory. `house-guide.css` / `house-guide.js` provide section navigation, person/department search and expandable profiles. The directory preserves 36 household employees, five scheduled specialists and three service partners, with their existing distinctions.
- `../ALBURY_HOUSE_TOUR.html` focuses on rooms and photographs. `room-gallery.css` / `room-gallery.js` present 98 rooms and spaces as cards in the shared ivory-and-green style. Floor filters and search narrow the gallery; each room opens its own photograph viewer with thumbnails, previous/next views, expandable notes, image downloads and floor plans. Separate previous/next room controls follow the filtered gallery. Arrow keys change views; Escape closes the viewer and restores focus. Images open at full size in a separate tab. The retired `tour-theme.css` is no longer loaded.
- `../ALBURY_HOUSE_COLLECTIONS.html` is a searchable gallery with category navigation, detail views and colour-variant controls. `collections.css` / `collections.js` provide its presentation and behaviour. The 64 photographs are displayed as 39 item families, pairing matching full-colour and ivory-led views.
- `../content/public/rooms.json` and `../content/public/collections.json` are the shared sources for all room and collection images, their descriptions and relative image paths. `house-catalogue.js` is a generated compatibility adapter. Each tour photograph has an explicit `roomId` and `roomName`: use the same values to attach another view or service scene to an existing room. Grouping does not guess from filenames. The first view is the room card cover. Keep section IDs and image filename slugs stable for existing deep links; retain the `-additional-view` suffix for images under `new-views/`.

New guide links use `ALBURY_HOUSE_GUIDE.html#staff` (or another section ID). New collection links use `ALBURY_HOUSE_COLLECTIONS.html#house-items-guest/21-guest-floor-bathroom-full-colour`. Existing `ALBURY_HOUSE_TOUR.html#/guide/...` and `#/collections/...` URLs redirect locally. New room links use `#/floor/room-id/view-slug`. Original `#/floor/view-slug` links still select the exact photograph within its room. `#/floor` filters the gallery, `#/all` shows every space, and `?q=...` preserves the search. Floor plans remain selectable from the gallery or within a room. Current street views lead the exterior gallery; before-works and future Cedars proposals retain their explicit labels.

The previous monolithic tour and ungrouped catalogue are backed up in `admin/room-gallery-2026-09-07/before/`. Do not restore historical tour-building scripts over the current gallery.

The pre-separation pages are backed up in `admin/site-separation-2026-09-07/before/`. The standalone guide now owns its content; do not restore the embedded guide from a historical tour build script over these pages.

## Story weather

`../ALBURY_WEATHER.html` and the Welcome weather panel share the published copy of `../content/schedules/weather.csv`: 92 authored fictional daily records, 1 August–31 October 2025. These are seasonal story conditions, not observations, a live forecast or evidence of what happened in London. They do not overwrite played continuity or the opening snapshot. Both views default to 11 August 2025 and accept `?date=2025-09-15`. No computer-clock date or random daily weather is used.

Each row supplies `date`, `condition` (`sunny`, `partly-cloudy`, `cloudy`, `showers`, `rain`), `summary`, `high_c`, `low_c`, `rain_mm` (daily total), `wind_mph` (prevailing speed, not gusts), `wind_direction`, three period notes and `house_note`. `low_c` is that evening's overnight low. Edit the canonical UTF-8 CSV and run `python3 site/build_content.py` to refresh the published CSV and `weather-data.js` for file:// use. Hosted pages fetch the CSV; network failure uses the labelled bundle, invalid content is reported. Keep dates unique and consecutive, and retain the opening date. The selector follows the CSV's actual bounds; it does not extrapolate or repeat at the end.

`weather.js` validates and renders both surfaces; `weather.css` supplies the shared forecast styling. The weather page shows the selected day and up to six following days. Welcome shows the selected day and up to three following days. Date selection stays in the URL; it does not change the menu date, save a session or advance the story. Supply the same date parameter on Welcome to show another story day's weather. Downloading a CSV does not write back changes.

## Culinary photography, producers and house at work

`culinary-media.js` supplies Kitchen & Front of House with three clearly captioned repertoire photographs on Today, one image for each of the six Available food categories, two cordial serves and three example classic cocktails. These images do not switch the menu, promise live stock, or declare additional personal favourites. `culinary-media.css` supplies these galleries and the producer / house-at-work layouts. The existing CSV menus and pantry catalogue remain intact.

Sixteen new images were made with the built-in image generator and saved in `images/albury-culinary/`. Exact generation prompts and reference paths are recorded in `data/culinary-image-prompts.json`. Room scenes were edited from the existing service kitchen, butler's pantry and laundry photographs to preserve architecture and circulation. People are illustrative unnamed staff, not new employees or replacements for the named portrait roster. The close-up food images illustrate dishes rather than establishing another architectural view. The two cordial photographs illustrate service bottles; the existing pantry packaging catalogue remains the product reference.

`../ALBURY_HOUSE_AT_WORK.html` collects three service scenes, also linked from Welcome, the house navigation, the guide and Kitchen Service notes. They are added as extra views in `house-catalogue.js` (now 233 room views); no old view or deep link was removed. This gallery does not fix a particular dinner, shift or guest attendance in played continuity.

`../ALBURY_LIMESTONE_SPRINGS.html` and `../ALBURY_HATFIELD.html` give brief producer histories, selected products and direct links to the user-supplied external brand sites. Copy comes from `Walker Holdings/03_HATFIELD_GROUP/08_LIMESTONE_SPRINGS.md`, `01_DISTILLERY_AND_SPIRITS.md`, `00_CORPORATE_ARCHITECTURE.md`, and their product CSVs, plus established Albury hospitality references. Five original producer photographs were copied from the local Walker Holdings website assets into `images/albury-culinary/producers/`; their labels are unchanged. These are project/worldbuilding brands. No commercial arrangement, paid endorsement or new live inventory is created.

`welcome-events.js` reads the same event CSV / local bundle as the London calendar. It shows the ongoing event ending soonest plus the next two events from the Welcome `?date=YYYY-MM-DD`, defaulting to 11 August 2025. This prevents long exhibitions from filling all three positions now that the calendar is much denser. Detail links open the existing calendar filtered to the event. Beyond the final event it shows an empty state. The notice preserves the retrospective nature of the research and distinguishes local events from household bookings. A failed load leaves a link to the full calendar.

## Expanded room views and illustrated guide

The gallery now includes 38 additional photographs: closer perspectives for 34 principal rooms and spaces, plus four illustrative circulation scenes. They attach to the existing room groups; all earlier images and deep links remain intact. Files live in `../images/albury/guide-expansion/`.

`data/room-expansion-prompts.json` records reference files, output files, generation method and prompts (four records explicitly identify reconstructed briefs). Each photograph was generated with the built-in image generator using the existing room image as a reference, then visually reviewed for major architectural openings, furniture placement and finishes. These are visual references, not measured architectural surveys.

Every House Guide section now includes supporting photography. The floors section shows seven landing or arrival views; the upper-basement photograph is specifically labelled as the cinema approach. Getting around includes a working scene for the main stair, passenger lift, service stair and goods lift. People in these scenes are unnamed illustrative occupants, not new canon staff or visitors. `guide-visuals.css` supplies the responsive layout.

`diagrams/albury-section.svg` shows five above-ground levels, both basement extents and the double-height live-room volume occupying part of the second floor. `diagrams/albury-circulation.svg` maps four vertical routes across seven levels. Both are explicitly schematic. The guide distinguishes current Albury from the future Cedars scheme and leads with the current whole-house standing capacity.

Pre-change files and the expansion build/verification scripts are retained under `../admin/guide-expansion-2026-09-07/`. Browser checks covered all 271 room routes, guide links, all new image decoding, staff search and desktop/tablet/mobile layouts.

## Syrup and cordial packaging

The P26–P28 drinks family uses short clear round-shouldered bottles with gold screw caps and ivory/bottle-green ALBURY labels. There is no chef name or architectural mark on the front. P25 cocktail cherries remains a charcoal/gold pantry jar. The current group photograph replaces `../images/albury-produce/opening-range/09-bar-preparations.webp`; the passion-fruit serve uses the matching label, and `../images/albury-culinary/vanilla-syrup.webp` joins the drinks page. `ALBURY_CULINARY_PROGRAMME.md` owns this distinction, mirrored in guest hospitality, house style and the kitchen library. Built-in image-generation prompts and pre-change backups are under `../admin/labels-slack-2026-09-07/`.

The internal Slack plan is `../upload/AW_HOLDINGS_SLACK.md`, routed from the business/chat canon and RAG manifest. It is not linked into this guest-facing site and does not provision a live workspace.
