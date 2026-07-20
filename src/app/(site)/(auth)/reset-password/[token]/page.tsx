import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new District 76 password.",
  robots: { index: false },
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-3xl font-semibold text-ink">Set a new password</h1>
          <p className="mt-2 text-sm text-muted">Choose a new password for your account.</p>
          <div className="mt-6">
            <ResetPasswordForm token={token} />
          </div>
        </div>
      </div>
    </section>
  );
}
