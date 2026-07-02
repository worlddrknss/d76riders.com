import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateEventForm } from "@/components/events/create-event-form";
import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";

export default async function CreateEventPage() {
  const currentUser = await getCurrentUser();

  try {
    await requireUserRole(currentUser?.id, "USER");
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login?next=/events/new");
    }

    if (error instanceof AuthorizationError) {
      redirect("/events");
    }

    redirect("/events");
  }

  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Create Event</h1>
              <p className="mt-2 text-sm text-muted">
                Publish a new ride event with meetup details. Route details are optional and can be added now.
              </p>
            </div>
            <Link href="/events" className="text-sm font-semibold text-sunset hover:underline">
              Back to events
            </Link>
          </div>

          <CreateEventForm />
        </div>
      </div>
    </section>
  );
}
