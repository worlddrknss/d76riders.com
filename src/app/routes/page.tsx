import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Route Planner · District 76 Riders",
  description:
    "Plan a motorcycle ride around Clarksville. Drop waypoints, snap to real roads, set your KSU and fuel stops, and see live distance and ride time.",
};

export default function RoutesPage() {
  redirect("/events/new");
}
