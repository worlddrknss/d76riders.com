import { NavbarClient } from "@/components/layout/navbar-client";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentUser } from "@/lib/session";

export async function Navbar() {
  const currentUser = await getCurrentUser();
  const user = currentUser
    ? { ...currentUser, avatarUrl: mediaUrl(currentUser.avatarUrl) || null }
    : null;
  return <NavbarClient currentUser={user} />;
}
