import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Engagement weights — a comment is worth more than a wave, a save more than a
// wave but less than a comment (intent to return).
const W_TWO_DOWN = 1;
const W_COMMENT = 2;
const W_SAVE = 1.5;

/**
 * Recompute the "momentum" (trending) score for recent journal posts every 30
 * minutes. Score = weighted engagement with a Hacker-News-style time decay, so a
 * post that pulls waves/comments/saves quickly outranks an older one with more
 * total engagement. Posts outside the window decay to 0 and fall off the rail.
 */
export const momentumRecompute = inngest.createFunction(
  {
    id: "momentum-recompute",
    name: "Recompute trending momentum",
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const scored = await step.run("score-recent", async () => {
      const since = new Date(Date.now() - WINDOW_MS);
      const entries = await prisma.journalEntry.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          createdAt: true,
          _count: { select: { likes: true, comments: true, saves: true } },
        },
      });

      const now = Date.now();
      let updated = 0;
      for (const e of entries) {
        const raw =
          e._count.likes * W_TWO_DOWN + e._count.comments * W_COMMENT + e._count.saves * W_SAVE;
        const ageHours = (now - e.createdAt.getTime()) / 3_600_000;
        // Gravity 1.5, +2h so brand-new posts aren't divided by ~0.
        const momentum = raw <= 0 ? 0 : (raw / Math.pow(ageHours + 2, 1.5)) * 100;
        await prisma.journalEntry.update({ where: { id: e.id }, data: { momentum } });
        updated += 1;
      }
      return updated;
    });

    const decayed = await step.run("decay-stale", async () => {
      const since = new Date(Date.now() - WINDOW_MS);
      const res = await prisma.journalEntry.updateMany({
        where: { createdAt: { lt: since }, momentum: { gt: 0 } },
        data: { momentum: 0 },
      });
      return res.count;
    });

    return { scored, decayed };
  },
);
