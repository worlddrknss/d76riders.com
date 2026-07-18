import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { VerifyEmailPanel } from "./verify-email-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirm your email — D76 Riders" };

export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <VerifyEmailPanel email={user.email} />
    </main>
  );
}
