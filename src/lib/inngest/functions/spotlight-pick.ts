import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Engagement weights for spotlight scoring.
const W_WAVE = 1;
const W_COMMENT = 2;
const W_POST = 2;
const W_RIDE = 1;

/** UTC-midnight Date of the current Central Monday — the unique key for the week. */
function currentWeekStart(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Pick the week's Rider Spotlight every Monday 7am Central: the rider with the
 * most engagement over the past week (waves + comments received on their posts,
 * plus posts and rides). One spotlight per week; skips a week with no engagement.
 */
export const spotlightPick = inngest.createFunction(
  {
    id: "spotlight-pick",
    name: "Pick the weekly Rider Spotlight",
    triggers: [{ cron: "TZ=America/Chicago 0 7 * * MON" }],
  },
  async ({ step }) => {
    const result = await step.run("score-and-pick", async () => {
      const weekStart = currentWeekStart();
      const existing = await prisma.spotlight.findUnique({ where: { weekStart } });
      if (existing) return { skipped: "already-picked" as const };

      const since = new Date(Date.now() - WEEK_MS);
      const [waves, comments, posts, rides] = await Promise.all([
        prisma.like.findMany({
          where: { createdAt: { gte: since } },
          select: { journalEntry: { select: { authorId: true } } },
        }),
        prisma.comment.findMany({
          where: { createdAt: { gte: since }, journalEntryId: { not: null } },
          select: { journalEntry: { select: { authorId: true } } },
        }),
        prisma.journalEntry.groupBy({
          by: ["authorId"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        prisma.rideLog.groupBy({
          by: ["riderId"],
          where: { riddenAt: { gte: since } },
          _count: { _all: true },
        }),
      ]);

      const score = new Map<string, number>();
      const add = (id: string | null | undefined, n: number) => {
        if (!id) return;
        score.set(id, (score.get(id) ?? 0) + n);
      };
      for (const w of waves) add(w.journalEntry?.authorId, W_WAVE);
      for (const c of comments) add(c.journalEntry?.authorId, W_COMMENT);
      for (const p of posts) add(p.authorId, p._count._all * W_POST);
      for (const r of rides) add(r.riderId, r._count._all * W_RIDE);

      let bestId: string | null = null;
      let bestScore = 0;
      for (const [id, s] of score) {
        if (s > bestScore) {
          bestScore = s;
          bestId = id;
        }
      }
      if (!bestId) return { skipped: "no-engagement" as const };

      await prisma.spotlight.create({ data: { riderId: bestId, weekStart } });
      return { riderId: bestId, score: bestScore };
    });

    return result;
  },
);
