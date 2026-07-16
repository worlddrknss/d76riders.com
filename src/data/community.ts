import type {
  ActivityItem,
  CommunityStat,
  EventItem,
  FaqItem,
  GarageBike,
  JoinBenefit,
  Member,
  NewsArticle,
  Ride,
  Road,
} from "@/types/community";

export type NavItem =
  | { href: string; label: string }
  | { label: string; children: { href: string; label: string }[] };

// Official District 76 presences off-site. Also fed to the Organization
// schema's `sameAs` so search engines tie them to this domain.
export const socialLinks = {
  facebookGroup: "https://www.facebook.com/groups/d76riders",
} as const;

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/roads", label: "Roads" },
  { href: "/r", label: "Riders" },
  {
    label: "Community",
    children: [
      { href: "/crews", label: "Crews" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/skills", label: "Skill Tracks" },
      { href: "/sponsors", label: "Partners" },
      { href: "/invite", label: "Invite Riders" },
    ],
  },
  {
    label: "Preparedness",
    children: [
      { href: "/safety", label: "Ride Safety" },
      { href: "/emergency-response", label: "Emergency Response" },
      { href: "/policies", label: "Policies" },
    ],
  },
  {
    label: "More",
    children: [
      { href: "/about", label: "About" },
      { href: "/news", label: "News" },
      { href: "/gallery", label: "Gallery" },
    ],
  },
];

export const upcomingRides: Ride[] = [
  {
    title: "Saturday Morning Ride",
    location: "Downtown Clarksville",
    distance: "80 Miles",
    difficulty: "Intermediate",
    when: "Saturday, 7:00 AM",
    ridersGoing: 12,
    month: "MAY",
    day: "24",
  },
  {
    title: "Land Between the Lakes",
    location: "West Kentucky Scenic Loop",
    distance: "160 Miles",
    difficulty: "Scenic",
    when: "Next Saturday, 8:00 AM",
    ridersGoing: 18,
    month: "MAY",
    day: "31",
  },
  {
    title: "Sunset River Ride",
    location: "Cumberland River Front",
    distance: "45 Miles",
    difficulty: "Beginner Friendly",
    when: "Wednesday, 6:30 PM",
    ridersGoing: 9,
    month: "JUN",
    day: "5",
  },
];

export const featuredRoads: Road[] = [
  {
    name: "Clarksville River Loop",
    distance: "62 Miles",
    difficulty: "Beginner Friendly",
    scenicRating: "4.2/5",
    rating: "4.6",
    imageLabel: "River curves at golden hour",
  },
  {
    name: "Land Between the Lakes",
    distance: "160 Miles",
    difficulty: "Scenic",
    scenicRating: "4.9/5",
    rating: "4.8",
    imageLabel: "Forest ridge overlooking the lake",
  },
  {
    name: "Natchez Trace Parkway",
    distance: "120 Miles",
    difficulty: "Scenic",
    scenicRating: "4.8/5",
    rating: "4.7",
    imageLabel: "Open parkway with tree-lined horizon",
  },
  {
    name: "Cumberland River Ride",
    distance: "78 Miles",
    difficulty: "Intermediate",
    scenicRating: "4.4/5",
    rating: "4.5",
    imageLabel: "Two-lane blacktop beside the river",
  },
  {
    name: "Dover Run",
    distance: "92 Miles",
    difficulty: "Intermediate",
    scenicRating: "4.5/5",
    rating: "4.4",
    imageLabel: "Rural turns with rolling hills",
  },
  {
    name: "Sango Backroads",
    distance: "50 Miles",
    difficulty: "Beginner Friendly",
    scenicRating: "4.1/5",
    rating: "4.3",
    imageLabel: "Neighborhood roads opening to fields",
  },
];

export const communityStats: CommunityStat[] = [
  { label: "Community Members", value: "247", delta: "+12 this week" },
  { label: "Registered Bikes", value: "127", delta: "+6 this week" },
  { label: "Group Rides", value: "18", delta: "+3 this month" },
  { label: "Community Miles", value: "12,400", delta: "+1,250 this month" },
];

export const communityFeed: ActivityItem[] = [
  {
    id: "activity-1",
    summary: "John uploaded photos from Saturday's ride.",
    when: "2 hours ago",
  },
  {
    id: "activity-2",
    summary: "Emily joined District 76.",
    when: "5 hours ago",
  },
  {
    id: "activity-3",
    summary: "Mike completed the Land Between the Lakes ride.",
    when: "Yesterday",
  },
  {
    id: "activity-4",
    summary: "Sarah is attending the Sunset River Ride.",
    when: "Yesterday",
  },
];

export const galleryItems = [
  "Sunrise meetup at Liberty Park",
  "Riders lined up on the riverfront",
  "Golden hour stop outside Clarksville",
  "Backroad group shot near Sango",
  "Cumberland overlook rest break",
  "Downtown coffee and bikes",
  "Weekend route briefing",
  "Evening return ride",
  "Helmet cam still from Dover Run",
];

export const members: Member[] = [
  {
    id: "member-1",
    name: "Alex Turner",
    motorcycle: "Yamaha MT-09",
    yearsRiding: 6,
    location: "Clarksville",
    avatar: "AT",
    joined: "March 2024",
    ridesCompleted: 42,
    favoriteRoad: "Clarksville River Loop",
    bio: "Naked bike rider who loves early morning runs along the river before the roads get busy. Always down to show a new rider the good lines.",
  },
  {
    id: "member-2",
    name: "Emily Brooks",
    motorcycle: "Harley-Davidson Sportster S",
    yearsRiding: 4,
    location: "Sango",
    avatar: "EB",
    joined: "June 2024",
    ridesCompleted: 28,
    favoriteRoad: "Natchez Trace Parkway",
    bio: "Came for the rides and stayed for the people. Weekend cruiser who keeps the group laughing at every fuel stop.",
  },
  {
    id: "member-3",
    name: "Marcus Hale",
    motorcycle: "BMW R 1250 GS",
    yearsRiding: 11,
    location: "Woodlawn",
    avatar: "MH",
    joined: "January 2024",
    ridesCompleted: 67,
    favoriteRoad: "Land Between the Lakes",
    bio: "Adventure rider and Army veteran. Will happily turn a 60 mile ride into a 200 mile day if the weather is right.",
  },
  {
    id: "member-4",
    name: "Sarah Lin",
    motorcycle: "Honda CB500X",
    yearsRiding: 3,
    location: "Downtown",
    avatar: "SL",
    joined: "August 2024",
    ridesCompleted: 19,
    favoriteRoad: "Cumberland River Ride",
    bio: "Newer rider building confidence one ride at a time. Big fan of the beginner friendly evening cruises.",
  },
  {
    id: "member-5",
    name: "Devon Reese",
    motorcycle: "Kawasaki Z900",
    yearsRiding: 8,
    location: "Oak Grove",
    avatar: "DR",
    joined: "February 2024",
    ridesCompleted: 53,
    favoriteRoad: "Dover Run",
    bio: "Spends most weekends chasing twisties. Unofficial group photographer and corner spotter.",
  },
  {
    id: "member-6",
    name: "Noah Carter",
    motorcycle: "Triumph Street Triple RS",
    yearsRiding: 5,
    location: "Pleasant View",
    avatar: "NC",
    joined: "May 2024",
    ridesCompleted: 34,
    favoriteRoad: "Sango Backroads",
    bio: "Triple owner who loves a tight back road and a good coffee stop. Always running a little late but always shows up.",
  },
];

export const upcomingEvents: EventItem[] = [
  {
    id: "event-1",
    title: "Saturday Morning Ride",
    date: "July 6, 2026",
    location: "Downtown Clarksville",
    distance: "80 miles",
    details: "A smooth-paced ride through Montgomery County with one coffee stop.",
    level: "Intermediate",
    ridersGoing: 12,
  },
  {
    id: "event-2",
    title: "Sunset River Ride",
    date: "July 10, 2026",
    location: "Cumberland River Front",
    distance: "45 miles",
    details: "Midweek evening cruise designed for newer riders and social meetups.",
    level: "Beginner Friendly",
    ridersGoing: 9,
  },
  {
    id: "event-3",
    title: "Land Between the Lakes",
    date: "July 13, 2026",
    location: "Grand Rivers Route",
    distance: "160 miles",
    details: "A long scenic loop with scenic stops and lunch at the lake.",
    level: "Scenic",
    ridersGoing: 18,
  },
];

export const pastEvents: EventItem[] = [
  {
    id: "event-past-1",
    title: "Clarksville Coffee Loop",
    date: "June 15, 2026",
    location: "Clarksville Greenway",
    distance: "52 miles",
    details: "Morning city loop with a relaxed pace and first-time rider support.",
    level: "Beginner Friendly",
    ridersGoing: 14,
  },
  {
    id: "event-past-2",
    title: "Dover Scenic Run",
    date: "June 1, 2026",
    location: "Dover Ridge Roads",
    distance: "90 miles",
    details: "A hill-country route focused on pace discipline and safe cornering.",
    level: "Intermediate",
    ridersGoing: 16,
  },
];

export const missionValues = [
  "Welcome all riders and all bike styles.",
  "Promote safe and respectful group riding.",
  "Build friendships through consistent local rides.",
  "Give back to Clarksville through community action.",
];

export const guidelines = [
  "Ride your own ride and respect pace groups.",
  "Treat every member with respect in person and online.",
  "Follow event briefings and safety instructions.",
  "Support local businesses and keep routes clean.",
];

export const faqs: FaqItem[] = [
  {
    question: "Do I need a certain type of bike to join?",
    answer: "No. District 76 is open to all street-legal motorcycles and rider backgrounds.",
  },
  {
    question: "Is District 76 a motorcycle club?",
    answer: "No. District 76 is a local rider community focused on connection, events, and good routes.",
  },
  {
    question: "Can new riders participate?",
    answer: "Yes. We post beginner-friendly rides and provide mentor support on selected events.",
  },
  {
    question: "How do I hear about new rides?",
    answer: "Upcoming rides are posted on the Events page and community channels each week.",
  },
];

export const joinBenefits: JoinBenefit[] = [
  {
    title: "Find local rides faster",
    description: "Get clear event details, pace expectations, and local route highlights every week.",
  },
  {
    title: "Meet riders near you",
    description: "Connect with people in Clarksville and nearby communities who enjoy the same roads.",
  },
  {
    title: "Grow your riding confidence",
    description: "Join beginner-friendly rides, skill-focused loops, and mentor-supported events.",
  },
  {
    title: "Support local riding culture",
    description: "Help shape a positive rider community that represents Middle Tennessee well.",
  },
];

export const garageBikes: GarageBike[] = [
  {
    id: "bike-1",
    name: "Yamaha MT-09",
    make: "Yamaha",
    year: "2024",
    type: "Naked",
    owner: "Alex Turner",
    engineType: "Inline-3, Liquid Cooled",
    enginePower: "117 hp",
    displacement: "890 cc",
    boreStroke: "78.0 x 62.1 mm",
  },
  {
    id: "bike-2",
    name: "Harley Sportster S",
    make: "Harley-Davidson",
    year: "2023",
    type: "Cruiser",
    owner: "Emily Brooks",
    engineType: "Revolution Max V-Twin",
    enginePower: "121 hp",
    displacement: "1,252 cc",
    boreStroke: "105.0 x 72.3 mm",
  },
  {
    id: "bike-3",
    name: "BMW R 1250 GS",
    make: "BMW",
    year: "2022",
    type: "Adventure",
    owner: "Marcus Hale",
    engineType: "Boxer Twin, Air/Liquid",
    enginePower: "136 hp",
    displacement: "1,254 cc",
    boreStroke: "102.5 x 76.0 mm",
  },
  {
    id: "bike-4",
    name: "Honda CB500X",
    make: "Honda",
    year: "2023",
    type: "Adventure",
    owner: "Sarah Lin",
    engineType: "Parallel Twin, Liquid Cooled",
    enginePower: "47 hp",
    displacement: "471 cc",
    boreStroke: "67.0 x 66.8 mm",
  },
  {
    id: "bike-5",
    name: "Kawasaki Z900",
    make: "Kawasaki",
    year: "2024",
    type: "Naked",
    owner: "Devon Reese",
    engineType: "Inline-4, Liquid Cooled",
    enginePower: "123 hp",
    displacement: "948 cc",
    boreStroke: "73.4 x 56.0 mm",
  },
  {
    id: "bike-6",
    name: "Triumph Street Triple RS",
    make: "Triumph",
    year: "2023",
    type: "Naked",
    owner: "Noah Carter",
    engineType: "Inline-3, Liquid Cooled",
    enginePower: "128 hp",
    displacement: "765 cc",
    boreStroke: "78.0 x 53.4 mm",
  },
];

export const newsCategories = ["Motorcycles", "Routes", "Track Days", "Community"];

export const popularTags = ["Speed", "Service", "Tires", "Maintenance", "Touring", "Safety"];

export const newsArticles: NewsArticle[] = [
  {
    id: "getting-ready-for-the-track",
    title: "Getting Ready for the Track",
    category: "Track Days",
    date: "June 22, 2026",
    author: "Marcus Hale",
    excerpt:
      "Your first track day is closer than you think. Here is how District 76 riders prep their bikes, their gear, and their heads before the green flag drops.",
    body: [
      "A track day is the safest place to learn what your motorcycle can really do. There is no oncoming traffic, no gravel in the corners, and no surprises hiding past the apex. What you do get is room to build skill on your own terms, with corner workers watching out for you the whole way around.",
      "Start with the bike. Check your tires for wear and set pressures for a track session rather than the street. Look over your brake pads, fork seals, chain tension, and every fastener you can reach. Tape over your lights and mirrors, and make sure nothing is loose enough to fall off at speed.",
      "Then get your head right. Walk the layout if you can, learn the flag rules at the riders meeting, and ride your own pace. Fast riders started exactly where you are now. The goal of your first day is to leave with a smile and a list of things to work on, not a trophy.",
    ],
    pullQuote:
      "The goal of your first track day is to leave with a smile and a list of things to work on, not a trophy.",
    tags: ["Speed", "Safety", "Track Days"],
  },
  {
    id: "is-the-ktm-390-worth-it",
    title: "Is the KTM 390 Worth It?",
    category: "Motorcycles",
    date: "June 15, 2026",
    author: "Devon Reese",
    excerpt:
      "Light, sharp, and endlessly fun around town. We put some miles on the little KTM to see whether it earns a spot in your garage.",
    body: [
      "Small bikes have a way of teaching you more than big ones. The KTM 390 is quick to turn, easy to flick through traffic, and light enough that a new rider can manage it in a parking lot without breaking a sweat.",
      "Out on the back roads around Clarksville it punches well above its size. You can carry real corner speed and use most of the engine without losing your license, which is exactly the kind of riding that makes you better.",
      "Is it worth it? For a first bike, a commuter, or a second machine to grin on, absolutely. Just go in knowing it rewards momentum over muscle.",
    ],
    tags: ["Speed", "Maintenance"],
  },
  {
    id: "what-separates-the-yamaha-mt07",
    title: "What Separates the Yamaha MT-07",
    category: "Motorcycles",
    date: "June 8, 2026",
    author: "Alex Turner",
    excerpt:
      "The MT-07 keeps showing up on best-bike lists for a reason. We break down the torque, the price, and the personality.",
    body: [
      "The MT-07 built its reputation on a torquey parallel twin that pulls hard from low in the rev range. It is the kind of engine that makes everyday riding feel like an event without ever feeling intimidating.",
      "Add a light chassis and a friendly price, and you have a bike that works for new riders and veterans alike. It is comfortable in town, happy on a twisty road, and easy to live with day to day.",
      "If you want one bike that does most things well without draining your wallet, the MT-07 remains hard to beat.",
    ],
    tags: ["Service", "Maintenance"],
  },
  {
    id: "tips-for-your-next-track-day",
    title: "Tips and Tricks for Your Next Track Day",
    category: "Track Days",
    date: "May 30, 2026",
    author: "Marcus Hale",
    excerpt:
      "Already past your first session? These habits will help you find time, stay smooth, and come home tired in the best way.",
    body: [
      "Smooth is fast. The riders setting quick laps are rarely the ones making dramatic inputs. They brake earlier and lighter than you think, get their eyes up, and let the bike settle before they add throttle.",
      "Reference points are everything. Pick a braking marker, a turn-in point, and an apex for each corner, then repeat them lap after lap until they are automatic.",
      "Hydrate, rest between sessions, and debrief honestly. The track rewards patience far more than bravery.",
    ],
    tags: ["Speed", "Safety"],
  },
  {
    id: "starting-as-a-ride-leader",
    title: "Starting Out as a Ride Leader",
    category: "Community",
    date: "May 18, 2026",
    author: "Emily Brooks",
    excerpt:
      "Leading a group ride is part route planning, part people skills. Here is how our volunteers keep everyone safe and together.",
    body: [
      "A good ride leader plans the route in advance, scouts the fuel stops, and knows where the group can regroup if it gets split up at a light.",
      "Brief everyone before you roll. Cover the pace, the hand signals, and the plan if someone gets separated. A two-minute talk prevents most of the problems that show up on the road.",
      "Most of all, ride for the group you have, not the one you wish you had. Keep the pace honest and everyone comes home happy.",
    ],
    tags: ["Safety", "Touring"],
  },
  {
    id: "does-this-helmet-live-up-to-the-hype",
    title: "Does This Helmet Live Up to the Hype?",
    category: "Motorcycles",
    date: "May 9, 2026",
    author: "Sarah Lin",
    excerpt:
      "A quiet shell, a wide field of view, and a price that raised eyebrows. We wore it for a month to find out if it delivers.",
    body: [
      "Helmet reviews live and die on fit, so try before you trust any list. That said, the shell we tested stayed quiet at highway speed and sealed out wind better than gear costing twice as much.",
      "The view through the visor is wide and distortion free, and the vents actually move air on a hot Tennessee afternoon.",
      "Is it perfect? No. But for the money it earns its spot on the shelf, and that is high praise in a crowded market.",
    ],
    tags: ["Service", "Safety"],
  },
];

