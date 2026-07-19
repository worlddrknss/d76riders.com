"use client";

import { useState, useTransition } from "react";
import { Gauge, Star } from "lucide-react";

import { submitRoadFeedbackAction, type RoadFeedbackState } from "@/app/(site)/roads/actions";

function StarRow({
  label,
  avg,
  value,
  onChange,
  disabled,
}: {
  label: string;
  avg: number | null;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{avg != null ? `${avg.toFixed(1)} avg` : "Not yet rated"}</p>
      </div>
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(s)}
            onClick={() => onChange(s)}
            className="p-0.5 transition disabled:cursor-default disabled:opacity-60"
            aria-label={`${label}: ${s} of 5`}
          >
            <Star className={`h-5 w-5 transition ${s <= shown ? "fill-sunset text-sunset" : "fill-none text-border"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function RoadQualityCard({
  roadId,
  isAuthenticated,
  initial,
}: {
  roadId: string;
  isAuthenticated: boolean;
  initial: RoadFeedbackState;
}) {
  const [state, setState] = useState(initial);
  const [scenery, setScenery] = useState(initial.mine?.scenery ?? 0);
  const [condition, setCondition] = useState(initial.mine?.condition ?? 0);
  const [twistiness, setTwistiness] = useState(initial.mine?.twistiness ?? 0);
  const [pending, start] = useTransition();

  const canSubmit = scenery >= 1 && condition >= 1 && twistiness >= 1 && !pending;
  const q = state.averages.quality;

  function submit() {
    if (!canSubmit) return;
    start(async () => {
      const res = await submitRoadFeedbackAction(roadId, scenery, condition, twistiness);
      if (!res.error) setState(res);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-sunset">
          <Gauge className="h-4 w-4" /> Route Quality
        </h2>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-ink">
            {q != null ? q.toFixed(1) : "—"}
            <span className="text-sm font-normal text-muted"> / 5</span>
          </p>
          <p className="text-xs text-muted">
            {state.count > 0 ? `${state.count} ${state.count === 1 ? "rating" : "ratings"}` : "No ratings yet"}
          </p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border">
        <StarRow label="Scenery" avg={state.averages.scenery} value={scenery} onChange={setScenery} disabled={!isAuthenticated || pending} />
        <StarRow label="Road condition" avg={state.averages.condition} value={condition} onChange={setCondition} disabled={!isAuthenticated || pending} />
        <StarRow label="Twistiness" avg={state.averages.twistiness} value={twistiness} onChange={setTwistiness} disabled={!isAuthenticated || pending} />
      </div>

      {isAuthenticated ? (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
        >
          {pending ? "Saving…" : state.mine ? "Update your feedback" : "Rate all three to submit"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-muted">Log in to rate this road.</p>
      )}
      {state.error ? <p className="mt-2 text-xs text-red-600">{state.error}</p> : null}
    </div>
  );
}
