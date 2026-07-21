import { redirect } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { RiderProximityProvider } from "@/components/location/rider-proximity";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  // Read here rather than in each page so every location search across the site
  // shares one lookup. Signed-out riders get null, and searches fall back to
  // Clarksville.
  const currentUser = await getCurrentUser();

  // Hard email-verification gate: a signed-in but unconfirmed account can't
  // reach any of the app. The /verify-email pages live outside this layout, so
  // there's no redirect loop — that's where they land to confirm or resend.
  if (currentUser && !currentUser.emailVerified) {
    redirect("/verify-email");
  }
  const rider = currentUser?.id
    ? await prisma.rider.findUnique({
        where: { userId: currentUser.id },
        select: { location: true },
      })
    : null;

  return (
    <RiderProximityProvider location={rider?.location ?? null}>
      <main>{children}</main>
      {modal}
      <Footer />
    </RiderProximityProvider>
  );
}
