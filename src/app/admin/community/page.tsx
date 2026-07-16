import { redirect } from "next/navigation";

// The single Community page was split into Crews, Challenges, Sponsors,
// Featured Rides, and Referrals, each with its own sidebar entry. Kept as a
// redirect so old links and bookmarks land somewhere useful.
export default function AdminCommunityPage() {
  redirect("/admin/community/crews");
}
