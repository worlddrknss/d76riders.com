import Link from "next/link";
import { redirect } from "next/navigation";

import { consumeVerification } from "@/lib/email-verification";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirming your email — D76 Riders" };

const MESSAGES: Record<string, { heading: string; body: string }> = {
  invalid: {
    heading: "This link isn't valid",
    body: "It may have already been used or been replaced by a newer one. Sign in and resend a fresh confirmation email.",
  },
  expired: {
    heading: "This link has expired",
    body: "Confirmation links last 24 hours. Sign in and we'll send you a new one.",
  },
  email_taken: {
    heading: "That email is already in use",
    body: "Another account now uses this address. Sign in and try a different email.",
  },
};

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await consumeVerification(token);

  if (result.ok) {
    // Session user's emailVerified is now set, so the gate will let them in.
    const user = await getCurrentUser();
    if (user) redirect("/");
  }

  const message = result.ok
    ? { heading: "Email confirmed ✅", body: "You're all set. Sign in to start riding with the community." }
    : MESSAGES[result.reason];

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-asphalt">{message.heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message.body}</p>
        <Link
          href={result.ok ? "/login" : "/verify-email"}
          className="mt-6 inline-block rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85"
        >
          {result.ok ? "Sign in" : "Back to confirmation"}
        </Link>
      </div>
    </main>
  );
}
