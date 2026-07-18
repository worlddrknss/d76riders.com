import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { deleteFileByUrl } from "@/lib/s3";

/**
 * Sweep expired stories every hour: delete each one's S3 object (best-effort),
 * then the rows. Stories are ephemeral by design — this is what makes the 24h
 * promise real instead of just hiding them at read time.
 */
export const storiesExpiry = inngest.createFunction(
  {
    id: "stories-expiry",
    name: "Sweep expired stories",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const expired = await step.run("load-expired", () =>
      prisma.story.findMany({
        where: { expiresAt: { lte: new Date() } },
        select: { id: true, url: true },
        take: 500,
      }),
    );

    if (expired.length === 0) return { swept: 0 };

    await step.run("delete-objects", async () => {
      for (const story of expired) {
        try {
          await deleteFileByUrl(story.url);
        } catch {
          // Never let a stuck object block the sweep; the row still goes.
        }
      }
      return expired.length;
    });

    await step.run("delete-rows", () =>
      prisma.story.deleteMany({ where: { id: { in: expired.map((s) => s.id) } } }),
    );

    return { swept: expired.length };
  },
);
