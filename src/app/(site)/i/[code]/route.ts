import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Invite landing: /i/<CODE>. Records the click, drops the code in a cookie so
// it survives the trip through the join form, then hands off to signup.
//
// A route handler rather than a page because there is nothing to render — the
// only job is to set the cookie and redirect.

/**
 * Redirect without naming a host.
 *
 * The obvious `NextResponse.redirect(new URL("/join", request.url))` sends
 * invitees to http://0.0.0.0:3000/join in production: the standalone server
 * binds to HOSTNAME=0.0.0.0, and request.url is built from the bind address,
 * not from the address the visitor actually typed. A relative Location (RFC
 * 7231) sidesteps the question — the browser resolves it against the URL it
 * requested, so this stays correct behind the ingress, on localhost, and on
 * any preview host, without trusting a forwarded header.
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase().slice(0, 16);

  const referral = await prisma.referralCode.findUnique({
    where: { code: normalized },
    select: { id: true, rider: { select: { handle: true, name: true } } },
  });

  // An unknown code still lands on the join page — just without attribution.
  if (!referral) {
    return redirectTo("/join");
  }

  // The counter stays as the cheap read; the log is what the chart plots.
  await prisma.$transaction([
    prisma.referralCode.update({
      where: { id: referral.id },
      data: { clicks: { increment: 1 } },
    }),
    prisma.referralClick.create({ data: { codeId: referral.id } }),
  ]);

  const query = new URLSearchParams({ ref: normalized, from: referral.rider.handle });
  const response = redirectTo(`/join?${query}`);

  // Survives the signup flow even if the query string is lost along the way.
  response.cookies.set("d76_ref", normalized, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
