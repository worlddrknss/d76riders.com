import { z } from "zod/v4";

// ---------- Journal Entry ----------
export const createJournalEntrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Story is required").max(10000),
});

export const updateJournalEntrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Story is required").max(10000),
  removePhoto: z.boolean().optional(),
});

// ---------- Bike ----------
export const createBikeSchema = z.object({
  name: z.string().min(1, "Bike name is required").max(100),
  make: z.string().min(1, "Make is required").max(100),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  type: z.string().max(50).optional(),
  engineType: z.string().max(100).optional(),
  displacement: z.string().max(50).optional(),
});

export const updateBikeSchema = createBikeSchema;

// ---------- Road ----------
export const createRoadSchema = z.object({
  name: z.string().min(1, "Road name is required").max(200),
  description: z.string().max(5000).optional(),
  difficulty: z.string().optional(),
  scenicRating: z.coerce.number().min(0).max(5).optional(),
});

export const updateRoadSchema = createRoadSchema;

// ---------- Event ----------
export const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(200),
  excerpt: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  meetLocation: z.string().max(200).optional(),
  ksuLocation: z.string().max(200).optional(),
  distanceMiles: z.coerce.number().positive().optional(),
  maxCapacity: z.coerce.number().int().positive().max(100000).optional(),
  difficulty: z.string().optional(),
});

export const updateEventSchema = createEventSchema;

// RSVP intent from the register/cancel button.
export const rsvpIntentSchema = z.enum(["GOING", "CANCEL"]);

// ---------- Batch message to a ride's riders ----------
export const eventMessageAudienceSchema = z.enum([
  "ALL",
  "GOING",
  "WAITLISTED",
  "INTERESTED",
  "CHECKED_IN",
]);

export const eventMessageSchema = z.object({
  audience: eventMessageAudienceSchema,
  body: z.string().min(1, "Write a message first.").max(1000),
});

// ---------- Rider Down incident ----------
export const riderDownSchema = z.object({
  affectedRiderId: z.string().min(1, "Select the affected rider."),
  notes: z.string().max(2000),
  locationText: z.string().max(300),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

// ---------- Emergency Card ----------
export const emergencyContactSchema = z.object({
  name: z.string().max(120),
  relationship: z.string().max(80),
  phone: z.string().max(40),
});

export const emergencyCardSchema = z.object({
  contacts: z.array(emergencyContactSchema).max(3),
  bloodType: z.string().max(16),
  allergies: z.string().max(1000),
  conditions: z.string().max(2000),
  medications: z.string().max(2000),
  insuranceProvider: z.string().max(200),
  insurancePolicy: z.string().max(120),
  notes: z.string().max(2000),
  showBloodType: z.boolean(),
  showAllergies: z.boolean(),
  showConditions: z.boolean(),
  showMedications: z.boolean(),
  showInsurance: z.boolean(),
  active: z.boolean(),
});

// Coordinates reported when an emergency card is scanned/viewed.
export const emergencyAccessSchema = z.object({
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

// ---------- Route geometry / waypoints (events + roads) ----------
export const routeWaypointSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  kind: z.enum(["START", "KSU", "FUEL", "FOOD", "REST", "STOP", "END"]),
  label: z.string().max(120).optional(),
});

export const routeWaypointsSchema = z.array(routeWaypointSchema).max(200);

export const routeGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).max(50000),
});

// ---------- Hazard reports ----------
export const hazardReportSchema = z
  .object({
    // A hazard hangs off a road (featured road) or a route (event). Exactly one
    // is supplied by the reporting surface.
    roadId: z.string().min(1).optional(),
    routeId: z.string().min(1).optional(),
    type: z.enum(["DEBRIS", "POLICE", "ROADWORK", "WEATHER", "ANIMAL", "ACCIDENT", "OTHER"]),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    description: z.string().max(280).optional(),
  })
  .refine((d) => Boolean(d.roadId) || Boolean(d.routeId), {
    message: "A hazard must reference a road or a route.",
  });

// ---------- Auth ----------
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24)
    .regex(/^[a-z0-9._-]+$/i, "Username may only contain letters, numbers, . _ -"),
  email: z.string().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// ---------- News ----------
export const createNewsSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  slug: z.string().min(1).max(200),
  excerpt: z.string().min(1, "Excerpt is required").max(500),
  category: z.string().min(1).max(100),
  authorName: z.string().min(1).max(100),
  contentHtml: z.string().min(1, "Content is required"),
});
