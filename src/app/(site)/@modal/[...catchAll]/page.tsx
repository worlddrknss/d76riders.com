// Soft navigations to any non-intercepted route resolve the modal slot to null,
// so the modal closes when the create form redirects to the new event (or the
// organizer navigates elsewhere) rather than sticking around.
export default function CatchAllModal() {
  return null;
}
