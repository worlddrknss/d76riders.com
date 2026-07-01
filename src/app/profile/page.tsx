import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/profile");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { handle: true },
  });

  if (!rider) {
    redirect("/account");
  }

  redirect(`/members/${rider.handle}`);
}
