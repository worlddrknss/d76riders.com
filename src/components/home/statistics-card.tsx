import type { CommunityStat } from "@/types/community";
import { CardShell } from "@/components/ui/card-shell";

interface StatisticsCardProps {
  stat: CommunityStat;
}

export function StatisticsCard({ stat }: StatisticsCardProps) {
  return (
    <CardShell className="text-center">
      <p className="font-display text-4xl leading-none tracking-tight text-asphalt">{stat.value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.11em] text-muted">{stat.label}</p>
    </CardShell>
  );
}
