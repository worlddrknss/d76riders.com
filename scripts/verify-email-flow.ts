/**
 * Exercises the email-verification consume lifecycle against the local DB with
 * no real email sends: it inserts EmailVerification rows directly and asserts
 * consumeVerification applies / rejects them correctly. Cleans up after itself.
 *
 *   npx tsx --env-file-if-exists=.env scripts/verify-email-flow.ts
 */
import { randomBytes } from "node:crypto";

import { consumeVerification } from "../src/lib/email-verification";
import { prisma } from "../src/lib/prisma";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
}

const tag = randomBytes(4).toString("hex");
const startEmail = `verify-${tag}-old@test.local`;
const newEmail = `verify-${tag}-new@test.local`;

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Verify Test",
      email: startEmail,
      emailVerified: null,
      rider: { create: { handle: `vtest_${tag}`, name: "Verify Test" } },
      roles: { create: { role: "USER" } },
    },
    select: { id: true },
  });

  try {
    // 1) invalid token
    const invalid = await consumeVerification("does-not-exist");
    assert(!invalid.ok && invalid.reason === "invalid", "unknown token → invalid");

    // 2) expired token
    const expiredToken = randomBytes(16).toString("hex");
    await prisma.emailVerification.create({
      data: { userId: user.id, email: newEmail, token: expiredToken, expires: new Date(Date.now() - 1000) },
    });
    const expired = await consumeVerification(expiredToken);
    assert(!expired.ok && expired.reason === "expired", "past-expiry token → expired");

    // 3) valid token applies the email change + verification
    const goodToken = randomBytes(16).toString("hex");
    await prisma.emailVerification.create({
      data: { userId: user.id, email: newEmail, token: goodToken, expires: new Date(Date.now() + 3600_000) },
    });
    const ok = await consumeVerification(goodToken);
    assert(ok.ok, "valid token → ok");

    const after = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, emailVerified: true },
    });
    assert(after?.email === newEmail, `email switched to pending address (${after?.email})`);
    assert(after?.emailVerified != null, "emailVerified stamped");

    // 4) tokens cleared (single-use)
    const remaining = await prisma.emailVerification.count({ where: { userId: user.id } });
    assert(remaining === 0, "all tokens cleared after consume");

    // 5) email_taken conflict
    const other = await prisma.user.create({
      data: {
        name: "Other", email: `verify-${tag}-other@test.local`, emailVerified: new Date(),
        rider: { create: { handle: `votherr_${tag}`, name: "Other" } },
      },
      select: { id: true },
    });
    const clashToken = randomBytes(16).toString("hex");
    await prisma.emailVerification.create({
      data: { userId: user.id, email: `verify-${tag}-other@test.local`, token: clashToken, expires: new Date(Date.now() + 3600_000) },
    });
    const clash = await consumeVerification(clashToken);
    assert(!clash.ok && "reason" in clash && clash.reason === "email_taken", "colliding address → email_taken");
    await prisma.user.delete({ where: { id: other.id } });

    console.log("\n🏁 all verification-flow assertions passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
