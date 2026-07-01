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
  description: z.string().max(5000).optional(),
  meetLocation: z.string().max(200).optional(),
  ksuLocation: z.string().max(200).optional(),
  distanceMiles: z.coerce.number().positive().optional(),
  difficulty: z.string().optional(),
});

export const updateEventSchema = createEventSchema;

// ---------- News ----------
export const createNewsSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  slug: z.string().min(1).max(200),
  excerpt: z.string().min(1, "Excerpt is required").max(500),
  category: z.string().min(1).max(100),
  authorName: z.string().min(1).max(100),
  contentHtml: z.string().min(1, "Content is required"),
});
