import Link from "next/link";
import type { Member } from "@/types/community";
import { CardShell } from "@/components/ui/card-shell";

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <CardShell>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ridge text-sm font-semibold text-asphalt">{member.avatar}</div>
        <div>
          <h3 className="font-display text-2xl tracking-tight text-asphalt">{member.name}</h3>
          <p className="text-sm text-muted">{member.motorcycle}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-canvas/50 p-3 text-sm text-muted">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Years Riding</dt>
          <dd>{member.yearsRiding}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Location</dt>
          <dd>{member.location}</dd>
        </div>
      </dl>
      <Link href="#" className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-asphalt hover:border-asphalt">
        View Profile
      </Link>
    </CardShell>
  );
}
