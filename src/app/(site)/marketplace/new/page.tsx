import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CreateListingForm } from "@/components/marketplace/create-listing-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Post a Listing",
  description: "List a bike, part, or piece of gear for sale.",
  robots: { index: false },
};

export default async function NewListingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <AppShell>
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" /> Marketplace
      </Link>
      <div className="mt-3 max-w-2xl">
        <h1 className="font-display text-3xl text-ink">Post a listing</h1>
        <p className="mt-1 text-sm text-muted">Bikes, parts, gear — sell it to the community.</p>
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-soft">
          <CreateListingForm />
        </div>
      </div>
    </AppShell>
  );
}
