-- Nine evergreen magazine articles so /magazine isn't a single post.
--
-- Deliberately reference-style pieces — laws, route guides, seasonal advice,
-- what-to-do-if — not invented ride recaps. Fabricating "last Saturday twelve of
-- us rode to X" would be inventing club history that never happened, and the
-- real members would know. Everything here is factual and checkable.
--
-- Attributed to the site owner's account so they can edit or unpublish any of it
-- from /admin. Idempotent on the unique slug. Published times are staggered by a
-- few minutes purely to give the list a stable order — not to imply a back-dated
-- publishing history.
INSERT INTO "NewsPost" (
  "id", "slug", "title", "excerpt", "contentHtml", "authorName", "authorUserId",
  "categoryId", "category", "status", "featured", "publishedAt", "createdAt", "updatedAt"
) VALUES
(
  'd76-post-tn-laws', 'tennessee-motorcycle-laws-every-rider-should-know',
  'Tennessee Motorcycle Laws Every Rider Should Know',
  'Helmets, endorsements, eye protection and lane splitting — the rules that actually apply to you on Tennessee roads.',
  $html$<p>Tennessee is friendlier to riders than most states, but a few rules catch people out — especially riders moving here from somewhere with looser requirements.</p>
<h2>Helmets are not optional</h2>
<p>Tennessee has a universal helmet law. Every rider and every passenger must wear a helmet meeting federal safety standards, regardless of age or experience. There is no opt-out for adults here, unlike neighbouring states.</p>
<h2>You need the endorsement</h2>
<p>Riding on public roads requires a Class M endorsement on your license, not just a car license. Getting it means a knowledge test and a skills test, though completing an approved rider course can substitute for the skills portion — and it is a better use of a weekend than the test alone.</p>
<h2>Eye protection</h2>
<p>You need eye protection unless your bike has a windshield. A face shield, goggles, or riding glasses all satisfy it. Ordinary sunglasses are a grey area at speed; a shield or goggles is the safer call.</p>
<h2>Lane splitting is illegal</h2>
<p>Filtering between lanes of traffic is not legal in Tennessee. Whatever you did in California, do not do it here.</p>
<h2>Equipment</h2>
<p>Your bike needs working mirrors, a muffler in good order, functioning lights front and rear, and handlebars that do not sit above shoulder height when you are seated. Straight pipes and very tall bars are the two that get riders pulled over.</p>
<h2>Insurance</h2>
<p>Tennessee requires proof of financial responsibility — in practice, liability insurance. Carry proof with you.</p>
<p><em>Laws change. Confirm anything here against the Tennessee Department of Safety and Homeland Security before you rely on it.</em></p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmlts000201e8xass1dt2', 'Laws', 'PUBLISHED', false,
  now() - interval '9 minutes', now(), now()
),
(
  'd76-post-cherohala', 'riding-the-cherohala-skyway',
  'Riding the Cherohala Skyway: What to Know Before You Go',
  'Forty-three miles above 5,000 feet with no fuel, no food and no cell signal. Worth every mile if you plan for it.',
  $html$<p>The Cherohala Skyway runs from Tellico Plains, Tennessee across the mountains to Robbinsville, North Carolina. It is wide, beautifully surfaced, and built for sweeping curves rather than the tight technical work of the nearby Dragon. For a lot of riders it is the better road.</p>
<h2>Fuel before you start</h2>
<p>There is no fuel, no food and no water on the Skyway itself. Fill up in Tellico Plains. Riders on small tanks should treat the full run and back as a serious range question.</p>
<h2>Dress for the top, not the bottom</h2>
<p>The Skyway climbs past 5,000 feet. It is routinely fifteen to twenty degrees cooler at the overlooks than it was in town, and that gap is bigger in spring and autumn. Carry a layer even if it feels absurd loading up in the heat.</p>
<h2>Weather turns fast</h2>
<p>Cloud sits on the ridge with no warning. Visibility can drop to a few car lengths in minutes, and the road surface goes greasy with it. If you ride into fog, slow well below what feels necessary and use the centre line, not the edge.</p>
<h2>Wildlife</h2>
<p>Deer and wild boar both use the road, most often at dawn and dusk. The long sightlines that make the Skyway a joy also mean riders carry more speed than they realise.</p>
<h2>When to go</h2>
<p>Late spring through autumn. The road is not reliably cleared in winter and can close for ice. Autumn colour is spectacular and brings heavy car traffic with it — ride early.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmhwq000101e8uou5bg63', 'Routes', 'PUBLISHED', false,
  now() - interval '8 minutes', now(), now()
),
(
  'd76-post-fall-color', 'chasing-fall-color-in-east-tennessee',
  'Chasing Fall Color in East Tennessee',
  'The colour moves down the mountain over about three weeks. Here is how to time it, and what the leaves do to your traction.',
  $html$<p>Autumn is the best and worst time to ride East Tennessee. The colour is genuinely world class. So is the traffic.</p>
<h2>Timing</h2>
<p>Colour arrives at elevation first and works downhill over roughly three weeks. The high ground — Roan Mountain, the upper Cherohala, Newfound Gap — usually peaks in the middle of October. The valleys and the foothills follow into late October and early November. If you miss it up high, you have not missed it.</p>
<h2>Where to go</h2>
<p>The Cherohala Skyway and Newfound Gap Road give you elevation and long views. The Foothills Parkway is gentler and has overlooks the whole way, which makes it the easier ride if you are bringing newer riders along. Roan Mountain is quieter than all of them.</p>
<h2>Leaves are not just scenery</h2>
<p>Wet leaves on cold pavement are as slick as ice, and they collect exactly where you do not want them — on the inside of shaded corners that never see sun. Early morning is the worst of it. Brake in a straight line, get your speed off before the corner, and treat any leaf-covered patch as a no-lean zone.</p>
<h2>Go early</h2>
<p>Peak weekends turn the national park roads into a queue. Leaving at first light is the difference between a ride and a parade.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmhwq000101e8uou5bg63', 'Routes', 'PUBLISHED', false,
  now() - interval '7 minutes', now(), now()
),
(
  'd76-post-first-group-ride', 'your-first-group-ride-what-to-expect',
  'Your First Group Ride: What to Expect',
  'Nobody expects you to be fast. Here is how a group ride actually runs, so your first one is not a guessing game.',
  $html$<p>The first group ride is intimidating mostly because nobody explains the routine. It is simpler than it looks.</p>
<h2>Before you leave home</h2>
<p>Fuel up the night before or on the way. Arriving with a full tank is the single easiest way to not be the reason twenty people are waiting. Check your tyres and chain while you are at it.</p>
<h2>Arrival and KSU</h2>
<p>Arrive at the meetup with time to spare. "KSU" means kickstands up — the time the group actually rolls, not the time to show up. There is usually a short riders meeting before it covering the route, the stops, and who is leading and sweeping.</p>
<h2>Formation</h2>
<p>Most groups ride staggered: the lead rider takes the left third of the lane, the next rider the right third, and so on, each with a couple of seconds of gap. On tight or technical roads the group goes single file so everyone has the whole lane to work with. Do not ride side by side.</p>
<h2>Lead and sweep</h2>
<p>The lead sets pace and navigation. The sweep rides last and does not pass anyone — if the sweep is behind you, nobody has been left. That is the whole point of the role.</p>
<h2>Ride your own ride</h2>
<p>This matters more than anything else here. If the pace is faster than you are comfortable with, drop back and let people go. A good group regroups at turns and stops precisely so nobody has to ride over their head to keep up. Anyone who makes you feel bad about that is not worth riding with.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmakq000001e8m1zhzex3', 'Motorcycles', 'PUBLISHED', false,
  now() - interval '6 minutes', now(), now()
),
(
  'd76-post-hand-signals', 'hand-signals-every-group-rider-should-know',
  'Hand Signals Every Group Rider Should Know',
  'Intercoms fail and not everyone has one. These signals are how a group actually talks.',
  $html$<p>A group ride runs on hand signals. They are easy to learn and they work whether or not anyone has a headset.</p>
<h2>The basics</h2>
<ul>
<li><strong>Left turn</strong> — left arm straight out.</li>
<li><strong>Right turn</strong> — left arm out, bent up at the elbow, fist closed.</li>
<li><strong>Stopping</strong> — left arm out and down, palm back.</li>
<li><strong>Slowing</strong> — left arm out and down, palm down, patting the air.</li>
</ul>
<h2>Hazards</h2>
<p>Point at road hazards rather than describing them. Left hand points to a hazard on the left; right foot comes off the peg and points to a hazard on the right. Pass it down the line — the rider behind you cannot see through you.</p>
<h2>Formation</h2>
<p>Index finger straight up means single file. Two fingers up means staggered. The lead will usually call single file before technical sections and put the group back to staggered on open road.</p>
<h2>Stops</h2>
<p>Fingers pointed at the tank means fuel. A thumb toward the mouth means a drink or food stop. Patting the top of the helmet means the lead wants everyone to follow closely — often used getting through a junction as one group.</p>
<h2>Use them early</h2>
<p>A signal given late is worse than none at all. Pass hazards back as soon as you see them, not as you reach them.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmakq000001e8m1zhzex3', 'Motorcycles', 'PUBLISHED', false,
  now() - interval '5 minutes', now(), now()
),
(
  'd76-post-cold-weather', 'cold-weather-riding-in-middle-tennessee',
  'Cold-Weather Riding in Middle Tennessee',
  'Our winters are mild enough to ride through and just cold enough to catch you out. Layers, cold tyres, and shaded bridges.',
  $html$<p>Middle Tennessee gives up plenty of rideable winter days. The riders who use them are the ones who plan for the cold instead of hoping it holds off.</p>
<h2>Wind chill is the real number</h2>
<p>Fifty degrees at rest is far colder at fifty miles an hour. Dress for the temperature you will feel at speed, not the one on your porch. Cold hands are a safety problem long before they are a comfort problem — you lose fine control of clutch and brake first.</p>
<h2>Layer properly</h2>
<p>A wind-blocking outer layer does more than a thick jumper. Trapped air is what keeps you warm, so several thin layers beat one bulky one, and anything that lets wind through the seams undoes the rest. Heated grips are the single best money you will spend if you ride through winter.</p>
<h2>Cold tyres do not grip</h2>
<p>Rubber needs heat to work, and on a cold morning it may never fully get there. Give yourself several miles of gentle riding before you lean on the tyres, and accept that your available grip is lower all day than it would be in July.</p>
<h2>Watch the shade</h2>
<p>Bridges, overpasses and any stretch the sun does not reach will hold frost and ice hours after the open road has dried. Shaded corners on north-facing hillsides are the classic Tennessee winter trap.</p>
<h2>Less daylight</h2>
<p>Plan routes that get you home before dark, or carry clear eyewear. Sunset comes early and the temperature falls off a cliff with it.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmakq000001e8m1zhzex3', 'Motorcycles', 'PUBLISHED', false,
  now() - interval '4 minutes', now(), now()
),
(
  'd76-post-summer-heat', 'heat-hydration-and-summer-riding',
  'Heat, Hydration, and Summer Riding',
  'Tennessee summers punish riders quietly. Dehydration degrades your judgement before you notice it.',
  $html$<p>Heat is the most underrated hazard in a Tennessee summer. It does not announce itself the way rain does — it just slowly makes you a worse rider.</p>
<h2>You are dehydrating faster than you think</h2>
<p>Airflow dries sweat off you so quickly that you never feel wet, which removes the usual cue that you are losing fluid. By the time you are thirsty you are already down. Drink at every stop whether or not you want to.</p>
<h2>Gear anyway</h2>
<p>The temptation to ride in a t-shirt is strongest exactly when pavement is hottest and road rash is worst. Mesh gear flows a genuine amount of air and keeps the abrasion protection. Riding without gear does not make you cooler for long — it makes you dehydrate faster, because sweat evaporates instantly instead of cooling you.</p>
<h2>Know the warning signs</h2>
<p>Heat exhaustion shows up as headache, dizziness, nausea, and a sudden loss of concentration. If you find yourself missing lines you would normally hit, or having to think about basic inputs, stop in shade and drink. Riders talk themselves into pushing on and that is when crashes happen.</p>
<h2>Ride the cool end of the day</h2>
<p>Early morning is the best riding of a Tennessee summer by a wide margin — cooler air, empty roads, better light. Mid-afternoon in August is the worst of everything.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmakq000001e8m1zhzex3', 'Motorcycles', 'PUBLISHED', false,
  now() - interval '3 minutes', now(), now()
),
(
  'd76-post-rider-down', 'if-a-rider-goes-down-the-first-five-minutes',
  'If a Rider Goes Down: The First Five Minutes',
  'What to do, in order, when someone in your group crashes — and why the helmet usually stays on.',
  $html$<p>Nobody wants to think about this. Thinking about it now is exactly what makes you useful later.</p>
<h2>Secure the scene first</h2>
<p>Your first job is preventing a second crash. Get bikes off the road where possible, put someone up-road with hazards on to warn traffic, and do not let the group cluster in a live lane. More riders are hurt in the aftermath than people expect.</p>
<h2>Call it in early</h2>
<p>Call 911 sooner than feels necessary — you can always stand an ambulance down. Give a location a dispatcher can act on: road name plus the nearest mile marker, junction, or landmark. On a mountain road, the nearest overlook name is worth more than a set of coordinates nobody can read back.</p>
<h2>Leave the helmet on</h2>
<p>Unless the rider is not breathing and you cannot open the airway any other way, leave the helmet where it is. Removing it risks moving the neck. This is the single most common well-meant mistake at a crash scene.</p>
<h2>Do not move them</h2>
<p>If they are breathing and out of traffic, leave them still and keep them calm and warm. Let them tell you what hurts rather than checking by moving them.</p>
<h2>Their information</h2>
<p>Somebody should find the rider's emergency contact and medical details. This is the whole reason an emergency ID is worth setting up before you need it — a card a first responder can scan means nobody is guessing about allergies, conditions, or who to call. Set yours up while it costs you two minutes and no urgency.</p>
<h2>Someone stays</h2>
<p>One person stays with them all the way through, including to hospital if it comes to that. Nobody sorts out their own bike, insurance and phone calls from the back of an ambulance.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrnmp6jc000401andbdpy5e0', 'Emergency', 'PUBLISHED', false,
  now() - interval '2 minutes', now(), now()
),
(
  'd76-post-day-ride-packing', 'what-to-pack-for-a-day-ride',
  'What to Pack for a Day Ride',
  'Enough to fix a flat, stay dry, and get home. It all fits in a tail bag.',
  $html$<p>Most day rides need nothing. The one that does need something needs it badly, usually thirty miles from anywhere with no signal.</p>
<h2>Fixing a flat</h2>
<p>A tyre plug kit and a small compressor or CO2 cartridges are the highest-value things you can carry. A punctured tubeless tyre is a twenty-minute roadside fix and an all-day recovery job if you are not carrying for it.</p>
<h2>Tools</h2>
<p>You do not need a workshop. The bike's own toolkit, a multi-tool, a handful of zip ties and a roll of tape will handle most things that come loose. Zip ties have got more bodywork home than any spanner.</p>
<h2>Water and food</h2>
<p>More water than you think, especially in summer. Something to eat matters more than people expect on a long day — riding tired and low on fuel is a real judgement problem.</p>
<h2>Rain layer</h2>
<p>A packable rain shell takes almost no space. Tennessee afternoon storms build fast and pass quickly, and the difference between waiting one out dry and riding home soaked is one small item in a tail bag.</p>
<h2>Documents and power</h2>
<p>Licence, registration and proof of insurance. A charging cable or battery pack — a dead phone is a dead map, a dead camera and no way to call anyone.</p>
<h2>First aid</h2>
<p>A compact kit with gloves, gauze and a pressure bandage. It weighs nothing and the day you need it, nothing else in the bag matters.</p>$html$,
  'WorldDrknss', 'cmr2br8y600003ovlz9alba3x',
  'cmrjpmakq000001e8m1zhzex3', 'Motorcycles', 'PUBLISHED', false,
  now() - interval '1 minute', now(), now()
)
ON CONFLICT ("slug") DO NOTHING;
