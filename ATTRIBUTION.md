# Attribution

## Maps and location search

Basemaps, place search, and routing come from [MapTiler](https://www.maptiler.com/copyright/),
whose data is derived from [OpenStreetMap](https://www.openstreetmap.org/copyright).

> © MapTiler © OpenStreetMap contributors

The maps themselves carry this on-screen: MapLibre renders it from the style's own
attribution (see `src/hooks/use-route-map.ts`). This file covers the part a map
control can't — the geocoded values we keep in our database.

## Geocoded data stored in this database

MapTiler's terms require that a database built using their search services carry
attribution "either as part of the database or in a separate file attached to the
database". This is that file.

These columns hold values derived from MapTiler's geocoding API, and are therefore
© MapTiler © OpenStreetMap contributors:

| Table       | Columns                                                            |
| ----------- | ------------------------------------------------------------------ |
| `RideEvent` | `meetAddress`, `meetLat`, `meetLng`, `ksuAddress`, `ksuLat`, `ksuLng` |
| `Route`     | waypoint coordinates and labels, saved route geometry               |

Two caveats worth knowing before treating the address columns as MapTiler data:

`meetLocation` and `ksuLocation` are the venue names as riders typed or confirmed
them, not geocoder output. `meetAddress` and `ksuAddress` start out prefilled from
the geocoder but are editable, because roughly a fifth of the places riders meet at
have no street address in OpenStreetMap — the QuikTrip on Rossview Road is mapped
with brand tags and nothing else. So an address here may be a rider's own words
rather than anything MapTiler returned.

Route geometry comes from [OSRM](https://project-osrm.org/), also OpenStreetMap-derived.
