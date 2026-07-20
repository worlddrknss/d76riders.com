import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email via SMTP (Gmail in production — d76riders@gmail.com with an app
 * password). Mirrors the s3.ts pattern: reads config from env and degrades
 * gracefully when it isn't set, so nothing throws in a dev environment without
 * mail configured — sends just no-op with a warning.
 *
 * Prod env (Gmail):
 *   SMTP_HOST=smtp.gmail.com   SMTP_PORT=465   SMTP_USER=d76riders@gmail.com
 *   EMAIL_FROM="D76 Riders <d76riders@gmail.com>"   SMTP_PASS=<gmail app password>
 * SMTP_PASS is the only secret (Citadel); the rest live in the ConfigMap.
 */

const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM ?? user;

export function isEmailConfigured(): boolean {
  return Boolean(user && pass);
}

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!cached) {
    cached = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user, pass },
      // Bound every phase so a stalled SMTP connection (e.g. blocked egress)
      // fails fast instead of hanging the action that triggered the send.
      connectionTimeout: 10_000, // TCP connect
      greetingTimeout: 10_000, // wait for the server 220 greeting
      socketTimeout: 20_000, // inactivity once connected
    });
  }
  return cached;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; skipped?: false; messageId?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

/**
 * Send one email. Never throws — returns a result the caller can log. When SMTP
 * isn't configured (local dev), returns `{ ok: false, skipped: true }` so a
 * missing mailer never breaks the action that triggered it (e.g. an @mention).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[mailer] SMTP not configured — skipping "${input.subject}"`);
    return { ok: false, skipped: true, reason: "SMTP not configured" };
  }

  try {
    const info = await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text ?? htmlToText(input.html),
      html: input.html,
      replyTo: input.replyTo,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mailer] send failed for "${input.subject}": ${message}`);
    return { ok: false, error: message };
  }
}

/** Verify the SMTP connection/credentials without sending mail. */
export async function verifyEmailTransport(): Promise<SendEmailResult> {
  const transport = getTransport();
  if (!transport) {
    return { ok: false, skipped: true, reason: "SMTP not configured" };
  }
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Crude fallback plain-text body when a caller only supplies HTML. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
