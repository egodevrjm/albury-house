# Albury House

The deployed project contains the Albury House visitor site and a read-only Model Context Protocol reference for story sessions.

- Website: <https://albury-house.vercel.app/ALBURY_WELCOME.html>
- MCP endpoint: <https://albury-house.vercel.app/mcp>

The MCP covers the house and its rooms, household staff, external partners, menus resolved against a date, the complete P01–P33 pantry, house collections, guest provision, image retrieval, and dated London events. Monday 11 August 2025 anchors Cycle 1 of the two-week menu rotation.

The public Albury House website: guest welcome, house guide, room tour, collections, house identity, kitchen and front of house, weekly menus, London calendar and authored story weather.

This repository is the optimized deployment artifact generated from `aw_v45`. Public structured content is available under `site/data/public/`; schedule data is under `site/data/`. Images are deployed as WebP or SVG.

The private Albury operations collection is deliberately excluded from this public repository.

## Floors and outdoor area

Albury has seven internal floors, including its two basements:

| Name | Physical level |
|---|---|
| Albury Spa | Lower Basement |
| Club Alex | Upper Basement |
| Raised Ground | Raised Ground |
| Studio Albury | First Floor |
| Principal guest suites | Second Floor |
| The Dorm | Third Floor |
| Alex's Apartment | Top Floor |

Exterior & Garden is one combined outdoor area. The website tour therefore has eight sections; it does not have eight or nine floors. `list_floors` returns only the seven internal floors. Use `list_outdoor_areas` and `get_outdoor_area` for the frontage, mews, terraces and garden. Stable internal floor IDs and legacy names remain supported; old garden tour links and room filters resolve to the combined outdoor area. Outdoor room records have `floorId: null` and an `outdoorAreaId`.
