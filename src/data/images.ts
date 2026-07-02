// Centralized image assets for District 76.
// These are remote placeholder photos (motorcycle / road / Tennessee themed).
// Swap any URL with a local file in /public/images when real photography is ready.

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const siteImages = {
  hero: "images/hero/home.jpg",
  aboutTown: u("photo-1444723121867-7a241cacace9", 1400),
  ctaRoad: u("photo-1469854523086-cc02fe5d8800", 2000),
  pageHeroes: {
    about: u("photo-1517524008697-84bbe3c3fd98", 2000),
    events: "images/hero/events.jpg",
    roads: u("photo-1469854523086-cc02fe5d8800", 2000),
    members: u("photo-1568772585407-9361f9bf3a87", 2000),
    gallery: u("photo-1485965120184-e220f721d03e", 2000),
    join: u("photo-1464822759023-fed622ff2c3b", 2000),
  },
  history: {
    clarksville: u("photo-1444723121867-7a241cacace9", 1400),
    culture: u("photo-1558981403-c5f9899a28bc", 1400),
    founding: u("photo-1568772585407-9361f9bf3a87", 1400),
  },
  rides: [
    u("photo-1568772585407-9361f9bf3a87"),
    u("photo-1517524008697-84bbe3c3fd98"),
    u("photo-1502920917128-1aa500764cbd"),
  ],
  roads: [
    u("photo-1503736334956-4c8f8e92946d"),
    u("photo-1469854523086-cc02fe5d8800"),
    u("photo-1485965120184-e220f721d03e"),
    u("photo-1464822759023-fed622ff2c3b"),
    u("photo-1449426468159-d96dbf395be1"),
    u("photo-1558981403-c5f9899a28bc"),
  ],
  galleryLarge: u("photo-1517524008697-84bbe3c3fd98", 1400),
  gallery: [
    u("photo-1444723121867-7a241cacace9", 700),
    u("photo-1502920917128-1aa500764cbd", 700),
    u("photo-1503736334956-4c8f8e92946d", 700),
    u("photo-1485965120184-e220f721d03e", 700),
  ],
  galleryPage: [
    u("photo-1558981403-c5f9899a28bc", 800),
    u("photo-1517524008697-84bbe3c3fd98", 800),
    u("photo-1502920917128-1aa500764cbd", 800),
    u("photo-1503736334956-4c8f8e92946d", 800),
    u("photo-1485965120184-e220f721d03e", 800),
    u("photo-1464822759023-fed622ff2c3b", 800),
    u("photo-1449426468159-d96dbf395be1", 800),
    u("photo-1568772585407-9361f9bf3a87", 800),
    u("photo-1469854523086-cc02fe5d8800", 800),
  ],
} as const;
