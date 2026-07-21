import { redirect } from "next/navigation";

import { loadCreateEventFormData } from "@/app/(site)/events/new/shared";
import { CreateEventForm } from "@/components/events/create-event-form";
import { FullPageModal } from "@/components/ui/full-page-modal";
import { AuthenticationError, requireUserRole } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";

// Intercepts client-side navigations to /events/new and shows the create form in
// a full-page modal over the current page. Hard nav / refresh / direct visit
// falls through to the real page at (site)/events/new/page.tsx instead.
export default async function InterceptedCreateEventPage() {
  const currentUser = await getCurrentUser();

  let userId: string;
  try {
    userId = await requireUserRole(currentUser?.id, "USER");
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login?next=/events/new");
    }
    redirect("/events");
  }

  const { recentSpots, defaultTimezone, crews } = await loadCreateEventFormData(userId);

  return (
    <FullPageModal eyebrow="Rider Tools" title="Create Event">
      <CreateEventForm recentSpots={recentSpots} defaultTimezone={defaultTimezone} crews={crews} withPreview />
    </FullPageModal>
  );
}
