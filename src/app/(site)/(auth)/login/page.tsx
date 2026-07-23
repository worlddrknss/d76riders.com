import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-3xl text-ink">Log in</h1>
          <p className="mt-2 text-sm text-muted">Access your District 76 account.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </section>
  );
}
