"use client";

import { useState, useTransition } from "react";

import { joinCrewAction, leaveCrewAction, type CrewActionState } from "@/app/(site)/sub-communities/actions";
import { Button } from "@/components/ui/button";

type CrewMembershipButtonProps = {
  slug: string;
  isMember: boolean;
  open: boolean;
};

export function CrewMembershipButton({ slug, isMember, open }: CrewMembershipButtonProps) {
  const [member, setMember] = useState(isMember);
  const [result, setResult] = useState<CrewActionState | null>(null);
  const [pending, start] = useTransition();

  // Non-members can't join a closed crew, so there's no button to offer them.
  if (!member && !open) {
    return <p className="text-xs text-muted">Invite only — ask a lead.</p>;
  }

  return (
    <div className="text-right">
      <Button
        variant={member ? "outline" : "accent"}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = member ? await leaveCrewAction(slug) : await joinCrewAction(slug);
            setResult(res);
            if (!res.error) setMember(!member);
          })
        }
      >
        {pending ? "…" : member ? "Leave" : "Join"}
      </Button>
      {result?.error ? <p className="mt-1 max-w-48 text-xs text-red-600">{result.error}</p> : null}
    </div>
  );
}
