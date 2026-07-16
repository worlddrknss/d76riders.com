import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

// Invite landing: /i/<CODE>. Records the click, drops the code in a cookie so
// it survives the trip through the join form, then hands off to signup.
//
// A route handler rather than a page because there is nothing to render — the
// only job is to set the cookie and redirect.
export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const normalized = code.trim().toUpperCase().slice(0, 16);

  const referral = await prisma.referralCode.findUnique({
    where: { code: normalized },
    select: { id: true, rider: { select: { handle: true, name: true } } },
  });

  // An unknown code still lands on the join page — just without attribution.
  if (!referral) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  await prisma.referralCode.update({
    where: { id: referral.id },
    data: { clicks: { increment: 1 } },
  });

  const destination = new URL("/join", request.url);
  destination.searchParams.set("ref", normalized);
  destination.searchParams.set("from", referral.rider.handle);

  const response = NextResponse.redirect(destination);

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
