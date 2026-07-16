# Attribution

Three providers, each doing a different job.

## Basemaps — MapTiler

The map tiles and styles come from [MapTiler](https://www.maptiler.com/copyright/),
derived from [OpenStreetMap](https://www.openstreetmap.org/copyright).

> © MapTiler © OpenStreetMap contributors

The maps carry this on-screen themselves: MapLibre renders it from the style's own
attribution (see `src/hooks/use-route-map.ts`).

## Place search — Mapbox

Searching for a venue goes to the [Mapbox](https://www.mapbox.com/about/maps/)
Search Box API, proxied through `/api/geocode` so the token stays server-side.

> © Mapbox © OpenStreetMap

Search moved off MapTiler because MapTiler's geocoder is OpenStreetMap-derived, and
OSM has no street address for a fair share of the places riders meet at — the
QuikTrip on Rossview Road is mapped with brand tags and nothing else. Mapbox's own
POI dataset has them (19/20 vs 16/20 across the chains riders actually use) and
matches "Quick Trip" to QuikTrip natively.

## Route geometry — OSRM

Driving routes come from [OSRM](https://project-osrm.org/), also OpenStreetMap-derived.

## Geocoded data stored in this database

These columns hold values that originated from place search:

| Table       | Columns                                                               |
| ----------- | --------------------------------------------------------------------- |
| `RideEvent` | `meetAddress`, `meetLat`, `meetLng`, `ksuAddress`, `ksuLat`, `ksuLng` |
| `Route`     | waypoint coordinates and labels, saved route geometry                 |

Two caveats before treating those as clean provider data:

`meetLocation` and `ksuLocation` are the venue names as riders typed or confirmed
them, not geocoder output. `meetAddress` and `ksuAddress` are prefilled from search
but editable, so a value here may be a rider's own words.

Rows created before v2.19.0 were geocoded with MapTiler (© MapTiler
© OpenStreetMap contributors) rather than Mapbox. They aren't distinguished in the
schema, and nothing backfills them — an event keeps whatever it was created with.
