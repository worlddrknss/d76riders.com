"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Lock } from "lucide-react";

import {
  cooldownMessage,
  HANDLE_CHANGE_DAYS,
  isValidUsername,
  normalizeUsername,
  USERNAME_RULE_MESSAGE,
  type UsernameCheck,
} from "@/lib/username";

type UsernameFieldProps = {
  id: string;
  name?: string;
  defaultValue?: string;
  /** The rider's stored handle, when editing. Typing it back is not a change. */
  currentUsername?: string;
  /** Days left on the change cooldown; > 0 locks the field. */
  cooldownDaysLeft?: number;
  label?: string;
  /** Shown when nothing has been typed yet. */
  hint?: string;
};

/**
 * Username input with live availability.
 *
 * Everything decidable locally — empty, unchanged, malformed — is derived
 * during render, so only a genuinely new and well-formed handle costs a
 * request. The fetch is debounced, and its answer is stored against the exact
 * handle it was asked about: a slow reply for an earlier keystroke can't
 * overwrite the verdict for what's in the box now.
 *
 * The server re-checks all of this on save; this only exists so riders stop
 * finding out on submit.
 */
export function UsernameField({
  id,
  name = "username",
  defaultValue = "",
  currentUsername,
  cooldownDaysLeft = 0,
  label = "Username",
  hint = `Changing this locks it for ${HANDLE_CHANGE_DAYS} days.`,
}: UsernameFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [answer, setAnswer] = useState<{ username: string; result: UsernameCheck } | null>(null);

  const locked = cooldownDaysLeft > 0;
  const candidate = normalizeUsername(value);
  const unchanged = !candidate || candidate === normalizeUsername(currentUsername ?? "");
  const malformed = !unchanged && !isValidUsername(candidate);
  const needsCheck = !locked && !unchanged && !malformed;

  useEffect(() => {
    if (!needsCheck) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/riders/username-available?username=${encodeURIComponent(candidate)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const result: UsernameCheck = await res.json();
        setAnswer({ username: candidate, result });
      } catch {
        // Aborted or offline — say nothing rather than show a misleading verdict.
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needsCheck, candidate]);

  // Only trust an answer that was asked about exactly what's in the box now.
  const fresh = needsCheck && answer?.username === candidate ? answer.result : null;

  const tone = locked
    ? "muted"
    : malformed || (fresh && !fresh.available)
      ? "error"
      : fresh?.available
        ? "ok"
        : "muted";

  const message = locked
    ? cooldownMessage(cooldownDaysLeft)
    : malformed
      ? USERNAME_RULE_MESSAGE
      : fresh
        ? fresh.available
          ? `@${candidate} is available.`
          : (fresh.reason ?? "That username isn't available.")
        : needsCheck
          ? "Checking availability…"
          : hint;

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
        <input
          id={id}
          name={name}
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9._-]+"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          // readOnly rather than disabled: a disabled field submits nothing, and
          // the action would then reject the save for a missing username.
          readOnly={locked}
          aria-readonly={locked}
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          aria-invalid={tone === "error"}
          aria-describedby={`${id}-status`}
          className="w-full rounded-lg border border-border bg-canvas py-2 pl-7 pr-9 text-sm text-ink read-only:cursor-not-allowed read-only:opacity-60"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {locked ? (
            <Lock className="h-4 w-4 text-muted" />
          ) : needsCheck && !fresh ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          ) : tone === "ok" ? (
            <Check className="h-4 w-4 text-forest" />
          ) : tone === "error" ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : null}
        </span>
      </div>

      <p
        id={`${id}-status`}
        aria-live="polite"
        className={`mt-1 text-xs ${
          tone === "error" ? "text-red-600" : tone === "ok" ? "text-forest" : "text-muted"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
