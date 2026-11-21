import { prisma } from "../db.js";
import { getPublishingAdapter } from "./adapters.js";

/** Process due publications. Safe for multiple API instances: updateMany claims each row. */
export async function processDuePublications({ limit = 10, logger = console } = {}) {
  const due = await prisma.publication.findMany({
    where: { status: "QUEUED", scheduledAt: { lte: new Date() }, socialAccountId: { not: null } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    include: { contentItem: true, socialAccount: true },
  });

  let processed = 0;
  for (const candidate of due) {
    const adapter = getPublishingAdapter(candidate.socialAccount.platform);
    // Leave it queued until a real provider adapter is available. This avoids
    // falsely failing posts merely because an integration is not installed.
    if (!adapter?.ready) continue;

    const claim = await prisma.publication.updateMany({
      where: { id: candidate.id, status: "QUEUED" },
      data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
    });
    if (claim.count !== 1) continue;

    try {
      const result = await adapter.publish({
        account: candidate.socialAccount,
        content: candidate.contentItem,
        publication: candidate,
      });
      await prisma.publication.update({
        where: { id: candidate.id },
        data: { status: "PUBLISHED", externalPostId: result?.id || null, publishedAt: new Date(), lastError: null },
      });
      await prisma.contentItem.update({ where: { id: candidate.contentItemId }, data: { status: "PUBLISHED" } });
      processed += 1;
    } catch (error) {
      const maxAttempts = 3;
      const terminal = candidate.attempts + 1 >= maxAttempts;
      await prisma.publication.update({
        where: { id: candidate.id },
        data: { status: terminal ? "FAILED" : "QUEUED", lastError: String(error?.message || "Publishing failed").slice(0, 2000) },
      });
      if (terminal) await prisma.contentItem.update({ where: { id: candidate.contentItemId }, data: { status: "FAILED" } });
      logger.error?.({ err: error, publicationId: candidate.id }, "SocialOps publication failed");
    }
  }
  return { checked: due.length, processed };
}
