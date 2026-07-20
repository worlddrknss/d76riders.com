import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your District 76 password.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-3xl font-semibold text-ink">Forgot password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </section>
  );
}
