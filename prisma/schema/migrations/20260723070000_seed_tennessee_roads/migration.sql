-- Seed real, well-known Tennessee motorcycle roads so /roads isn't empty for a
-- visitor who arrived from a promo. These are factual public places — real
-- names, routes, and distances — attributed to an official curator account.
-- No ratings, reviews, or ride counts are fabricated: with a handful of real
-- members, invented social proof would be obvious and dishonest. A road simply
-- shows without a rating until real riders leave one.

-- Official curator account. passwordHash is NULL, so it can never be logged
-- into — it exists only to own curated content. Idempotent on the unique email.
INSERT INTO "User" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
VALUES ('d76-official-user', 'District 76', 'roads@d76riders.com', now(), now(), now())
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Rider" ("id", "userId", "handle", "name", "bio", "location", "createdAt", "updatedAt")
VALUES (
  'd76-official-rider',
  'd76-official-user',
  'd76riders',
  'District 76',
  'Curated roads and rides from the District 76 crew.',
  'Tennessee',
  now(),
  now()
)
ON CONFLICT ("handle") DO NOTHING;

-- Roads. Idempotent on the unique slug, so re-running (or a prod that already
-- has one by that slug) is a no-op rather than a duplicate.
INSERT INTO "Road" ("id", "riderId", "name", "slug", "distanceMiles", "difficulty", "description", "createdAt", "updatedAt")
VALUES
  ('d76-road-tail-of-the-dragon', 'd76-official-rider', 'Tail of the Dragon', 'tail-of-the-dragon', 11, 'INTERMEDIATE',
   'US-129 at Deals Gap on the Tennessee–North Carolina line: 318 curves in 11 miles, and the most famous motorcycle road in the country. No intersections or driveways along it, but it draws heavy traffic and law enforcement on weekends. Ride your own pace.', now(), now()),

  ('d76-road-cherohala-skyway', 'd76-official-rider', 'Cherohala Skyway', 'cherohala-skyway', 43, 'SCENIC',
   'TN-165 from Tellico Plains across the mountains to Robbinsville, North Carolina — 43 miles of wide, sweeping curves climbing above 5,000 feet. Long sightlines, few services, and cool air at the top even in summer. A calmer alternative to the nearby Dragon.', now(), now()),

  ('d76-road-the-snake-421', 'd76-official-rider', 'The Snake (US-421)', 'the-snake-421', 12, 'INTERMEDIATE',
   'US-421 from Mountain City toward Bristol: 489 curves over three mountains in about 12 miles. Fast, technical, and lightly trafficked, with a well-known overlook and a rider stop partway along.', now(), now()),

  ('d76-road-devils-triangle', 'd76-official-rider', 'The Devil''s Triangle', 'devils-triangle', 44, 'INTERMEDIATE',
   'TN-116 through the ridges near Wartburg and Oliver Springs — roughly a 44-mile loop of tight, low-traffic pavement. Remote and technical: watch for gravel and coal-truck wear on the surface.', now(), now()),

  ('d76-road-natchez-trace', 'd76-official-rider', 'Natchez Trace Parkway (TN)', 'natchez-trace-parkway-tn', 100, 'BEGINNER_FRIENDLY',
   'The Tennessee stretch of the Natchez Trace runs southwest from near Nashville toward the Alabama line. A 50 mph national parkway with gentle curves, no commercial traffic, and no billboards — the most relaxed long ride in Middle Tennessee.', now(), now()),

  ('d76-road-foothills-parkway', 'd76-official-rider', 'Foothills Parkway', 'foothills-parkway', 33, 'SCENIC',
   'A National Park Service scenic road skirting the northern edge of the Smokies between Walland and Wears Valley. Smooth, sweeping, and built for the view, with overlooks the whole way. Well-suited to newer riders.', now(), now()),

  ('d76-road-newfound-gap', 'd76-official-rider', 'Newfound Gap Road (US-441)', 'newfound-gap-road', 31, 'SCENIC',
   'US-441 climbs from Gatlinburg over the crest of the Great Smoky Mountains to the North Carolina line at Newfound Gap — about 30 miles of steady switchbacks and overlooks through the national park. Spectacular, and busy in season.', now(), now()),

  ('d76-road-roan-mountain', 'd76-official-rider', 'Roan Mountain Highway (TN-143)', 'roan-mountain-highway', 15, 'SCENIC',
   'TN-143 climbs from Elizabethton to the grassy balds of Roan Mountain near the North Carolina line. A quiet, steep, curvy run to one of the highest points in East Tennessee, famous for its June rhododendron bloom.', now(), now()),

  ('d76-road-ocoee-byway', 'd76-official-rider', 'Ocoee Scenic Byway (US-64)', 'ocoee-scenic-byway', 26, 'SCENIC',
   'US-64 follows the Ocoee River gorge west of Ducktown, past the whitewater course from the 1996 Olympics. A flowing riverside run of moderate curves with plenty of pull-offs — scenic rather than technical.', now(), now()),

  ('d76-road-the-w-road', 'd76-official-rider', 'The W Road (Signal Mountain)', 'the-w-road', 4, 'INTERMEDIATE',
   'US-127 up Signal Mountain outside Chattanooga — a short, steep set of switchbacks named for its shape on the map. Tight and low-speed, with a valley overlook at the top. A quick local favorite.', now(), now())
ON CONFLICT ("slug") DO NOTHING;
