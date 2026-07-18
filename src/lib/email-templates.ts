import { absoluteUrl } from "@/lib/absolute-url";

/**
 * Branded HTML email builder. Email clients strip <style>/<head> and ignore
 * external CSS, so everything here is inline-styled and table-free-ish, kept
 * deliberately simple. The palette mirrors the app tokens (asphalt/sunset).
 */

const COLORS = {
  asphalt: "#1a1a1a",
  sunset: "#e0592a",
  ink: "#222222",
  muted: "#6b7280",
  border: "#e5e7eb",
  canvas: "#f7f6f4",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailLayoutInput = {
  preheader?: string;
  heading: string;
  /** Body paragraphs (plain strings; each becomes a <p>). Pre-escaped is fine. */
  paragraphs: string[];
  cta?: { label: string; href: string };
  footnote?: string;
};

/** Wrap content in the branded shell. Returns a full HTML document. */
export function emailLayout({ preheader, heading, paragraphs, cta, footnote }: EmailLayoutInput): string {
  const home = absoluteUrl();
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
    : "";
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.ink};">${p}</p>`,
    )
    .join("");
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="border-radius:10px;background:${COLORS.sunset};">
           <a href="${cta.href}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a>
         </td></tr>
       </table>`
    : "";
  const foot = footnote
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};">${footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.canvas};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
      <tr><td style="background:${COLORS.asphalt};padding:20px 28px;">
        <a href="${home}" style="font-size:18px;font-weight:800;letter-spacing:0.02em;color:#ffffff;text-decoration:none;">D76&nbsp;Riders</a>
      </td></tr>
      <tr><td style="padding:28px 28px 8px;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${COLORS.asphalt};">${escapeHtml(heading)}</h1>
        ${body}
        ${button}
        ${foot}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid ${COLORS.border};">
        <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
          D76 Riders — a motorcycle community in Clarksville, TN.<br>
          Manage your email preferences in your <a href="${absoluteUrl("/account")}" style="color:${COLORS.muted};">account settings</a>.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ---- Specific emails -------------------------------------------------------

export function welcomeVerifyEmail(name: string, verifyUrl: string) {
  return {
    subject: "Welcome to D76 Riders — confirm your email",
    html: emailLayout({
      preheader: "Confirm your email to start riding with the community.",
      heading: `Welcome, ${escapeHtml(name)} 🏍️`,
      paragraphs: [
        "You're in. D76 Riders is a community of riders around Clarksville, TN — events, ride journals, routes, and a garage for your builds.",
        "First, confirm this is your email so we can keep your account secure and reach you about your rides.",
      ],
      cta: { label: "Confirm my email", href: verifyUrl },
      footnote: "This link expires in 24 hours. If you didn't create this account, you can ignore this email.",
    }),
  };
}

export function verifyEmail(name: string, verifyUrl: string, isChange: boolean) {
  return {
    subject: isChange ? "Confirm your new D76 Riders email" : "Confirm your D76 Riders email",
    html: emailLayout({
      preheader: "Confirm your email address.",
      heading: isChange ? "Confirm your new email" : "Confirm your email",
      paragraphs: [
        `Hi ${escapeHtml(name)},`,
        isChange
          ? "Click below to confirm this new address. Your account email won't change until you do."
          : "Click below to confirm your email address and unlock your account.",
      ],
      cta: { label: "Confirm email", href: verifyUrl },
      footnote: "This link expires in 24 hours. If this wasn't you, you can safely ignore it.",
    }),
  };
}

export function mentionEmail(name: string, mentionerName: string, url: string) {
  return {
    subject: `${mentionerName} mentioned you on D76 Riders`,
    html: emailLayout({
      preheader: `${mentionerName} tagged you in a ride journal.`,
      heading: "You were mentioned",
      paragraphs: [
        `Hi ${escapeHtml(name)},`,
        `<strong>${escapeHtml(mentionerName)}</strong> mentioned you in a ride journal post.`,
      ],
      cta: { label: "View the post", href: url },
    }),
  };
}

export function commentEmail(name: string, commenterName: string, url: string) {
  return {
    subject: `${commenterName} commented on your journal post`,
    html: emailLayout({
      preheader: `${commenterName} left a comment on your post.`,
      heading: "New comment on your post",
      paragraphs: [
        `Hi ${escapeHtml(name)},`,
        `<strong>${escapeHtml(commenterName)}</strong> commented on your ride journal post.`,
      ],
      cta: { label: "Read the comment", href: url },
    }),
  };
}

export function rsvpEmail(name: string, riderName: string, eventTitle: string, url: string) {
  return {
    subject: `${riderName} is going to ${eventTitle}`,
    html: emailLayout({
      preheader: `${riderName} just RSVP'd to your ride.`,
      heading: "New RSVP for your ride",
      paragraphs: [
        `Hi ${escapeHtml(name)},`,
        `<strong>${escapeHtml(riderName)}</strong> is going to <strong>${escapeHtml(eventTitle)}</strong>.`,
      ],
      cta: { label: "View the ride", href: url },
    }),
  };
}
