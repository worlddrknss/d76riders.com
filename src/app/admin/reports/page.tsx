import { redirect } from "next/navigation";

// The journal-only report queue was replaced by the unified triage queue, which
// covers every reportable content type. Kept as a redirect so existing links
// and bookmarks still land somewhere useful.
export default function AdminReportsPage() {
  redirect("/admin/triage");
}
