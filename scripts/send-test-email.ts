/**
 * One-off SMTP smoke test. Verifies the transport, then sends a test email.
 *
 *   npx tsx --env-file-if-exists=.env scripts/send-test-email.ts you@example.com
 *
 * Reads SMTP_HOST/PORT/USER/PASS/EMAIL_FROM from .env (same vars the app uses).
 * Defaults the recipient to SMTP_USER when none is given.
 */
import { sendEmail, verifyEmailTransport, isEmailConfigured } from "../src/lib/mailer";

async function main() {
  const to = process.argv[2] ?? process.env.SMTP_USER;
  if (!isEmailConfigured()) {
    console.error("✗ SMTP not configured — set SMTP_USER and SMTP_PASS in .env");
    process.exit(1);
  }
  if (!to) {
    console.error("✗ No recipient. Pass one: tsx scripts/send-test-email.ts you@example.com");
    process.exit(1);
  }

  console.log(`→ verifying transport (${process.env.SMTP_HOST ?? "smtp.gmail.com"}:${process.env.SMTP_PORT ?? 465})…`);
  const v = await verifyEmailTransport();
  if (!v.ok) {
    console.error("✗ verify failed:", "error" in v ? v.error : v.reason);
    process.exit(1);
  }
  console.log("✓ transport verified");

  console.log(`→ sending test email to ${to}…`);
  const r = await sendEmail({
    to,
    subject: "D76 Riders — SMTP test ✅",
    html: `<p>This is a test from the D76 Riders mailer.</p>
           <p>If you're reading this, Gmail SMTP is configured correctly.</p>`,
  });
  if (r.ok) {
    console.log("✓ sent", r.messageId ? `(messageId: ${r.messageId})` : "");
  } else {
    console.error("✗ send failed:", "error" in r ? r.error : r.reason);
    process.exit(1);
  }
}

main();
