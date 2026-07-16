import type { TrustLevel } from "@prisma/client";
import { ShieldCheck } from "lucide-react";

const LEVEL_STYLES: Record<TrustLevel, string> = {
  NEW: "border-border bg-white/5 text-muted",
  ESTABLISHED: "border-sky-400/40 bg-sky-400/10 text-sky-700",
  TRUSTED: "border-green-500/40 bg-green-500/10 text-green-700",
  VETERAN: "border-sunset/50 bg-sunset/10 text-sunset",
};

const LEVEL_LABEL: Record<TrustLevel, string> = {
  NEW: "New Rider",
  ESTABLISHED: "Established",
  TRUSTED: "Trusted",
  VETERAN: "Veteran",
};

export function TrustBadge({ level, score }: { level: TrustLevel; score?: number }) {
  return (
    <span
      title={score !== undefined ? `Trust score ${score}/100` : undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${LEVEL_STYLES[level]}`}
    >
      <ShieldCheck className="h-3 w-3" />
      {LEVEL_LABEL[level]}
    </span>
  );
}
