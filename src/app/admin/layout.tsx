import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { AuthenticationError, AuthorizationError, requireUserRole } from "@/lib/authz";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/admin");
  }

  try {
    await requireUserRole(currentUser.id, "ADMINISTRATOR");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/");
    }

    if (error instanceof AuthenticationError) {
      redirect("/login?next=/admin");
    }

    redirect("/");
  }

  return <AdminShell currentUser={currentUser}>{children}</AdminShell>;
}
