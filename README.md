# Albury House

The deployed project contains the Albury House visitor site and a read-only Model Context Protocol reference for story sessions.

- Website: <https://albury-house.vercel.app/ALBURY_WELCOME.html>
- MCP endpoint: <https://albury-house.vercel.app/mcp>

The MCP covers the house and its rooms, household staff, external partners, menus resolved against a date, the complete P01–P33 pantry, house collections, guest provision, image retrieval, and dated London events. Monday 11 August 2025 anchors Cycle 1 of the two-week menu rotation.

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
