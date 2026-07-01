import type { Metadata } from "next";
import { RoutePlannerLoader } from "@/components/routes/route-planner-loader";

export const metadata: Metadata = {
  title: "Route Planner · District 76 Riders",
  description:
    "Plan a motorcycle ride around Clarksville. Drop waypoints, snap to real roads, set your KSU and fuel stops, and see live distance and ride time.",
};

export default function RoutesPage() {
  // Fill the viewport beneath the sticky navbar for an immersive planner.
  return (
    <div className="relative h-[calc(100svh-4.25rem)] w-full overflow-hidden">
      <RoutePlannerLoader />
    </div>
  );
}
