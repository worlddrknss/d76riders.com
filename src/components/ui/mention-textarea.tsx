"use client";

import { useEffect, useRef, useState } from "react";

type RiderHit = { handle: string; name: string; avatarUrl: string | null };
type TagHit = { tag: string; count: number };

type ActiveToken = { sigil: "@" | "#"; query: string; start: number; end: number };

/**
 * A textarea with @rider and #tag autocomplete. Drop-in for the plain Textarea:
 * it owns its value but still submits under `name`, so the server action reads
 * it unchanged. As you type a token, it suggests riders (by handle/name) or
 * existing tags (most-used first) and inserts the full `@handle`/`#tag` on pick.
 */
export function MentionTextarea({
  name,
  id,
  rows = 4,
  placeholder,
  defaultValue = "",
  required,
  className = "",
}: {
  name: string;
  id?: string;
  rows?: number;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [token, setToken] = useState<ActiveToken | null>(null);
  const [riders, setRiders] = useState<RiderHit[]>([]);
  const [tags, setTags] = useState<TagHit[]>([]);
  const [active, setActive] = useState(0);

  const items = token?.sigil === "@" ? riders : tags;
  const open = token !== null && items.length > 0;

  // Find a @/# token immediately before the caret. The boundary char keeps an
  // email's "@" or a mid-word "#" from triggering.
  function detect() {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret);
    const m = before.match(/(^|[^\w@#])([@#])([a-z0-9._-]*)$/i);
    if (!m) {
      setToken(null);
      return;
    }
    setActive(0);
    setToken({ sigil: m[2] as "@" | "#", query: m[3].toLowerCase(), start: caret - m[3].length - 1, end: caret });
  }

  // Fetch suggestions for the active token (debounced, abortable). When there's
  // no token the dropdown is closed anyway (see `open`), so stale results are
  // never shown — no need to clear state here.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const path = token.sigil === "@" ? "/api/riders/search" : "/api/tags/search";
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${path}?q=${encodeURIComponent(token.query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (token.sigil === "@") setRiders(data);
        else setTags(data);
      } catch {
        /* aborted or offline — leave the last suggestions */
      }
    }, 130);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token]);

  function choose(index: number) {
    if (!token || !items[index]) return;
    const insert = token.sigil === "@" ? `@${(items[index] as RiderHit).handle}` : `#${(items[index] as TagHit).tag}`;
    const next = `${value.slice(0, token.start)}${insert} ${value.slice(token.end)}`;
    const caret = token.start + insert.length + 1;
    setValue(next);
    setToken(null);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      setToken(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          // detect() reads the caret after the value updates
          requestAnimationFrame(detect);
        }}
        onClick={detect}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) detect();
        }}
        onBlur={() => setTimeout(() => setToken(null), 120)}
        className={`w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-sunset/50 focus:outline-none ${className}`}
      />

      {open ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lift">
          {token?.sigil === "@"
            ? riders.map((r, i) => (
                <li key={r.handle}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm ${i === active ? "bg-sunset/10" : "hover:bg-canvas"}`}
                  >
                    {r.avatarUrl ? (
                       
                      <img src={r.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full border border-border object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunset/10 text-[0.6rem] font-bold text-sunset">
                        {r.name.charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{r.name}</span>{" "}
                      <span className="text-muted">@{r.handle}</span>
                    </span>
                  </button>
                </li>
              ))
            : tags.map((t, i) => (
                <li key={t.tag}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${i === active ? "bg-sunset/10" : "hover:bg-canvas"}`}
                  >
                    <span className="font-medium text-sunset">#{t.tag}</span>
                    <span className="text-xs text-muted">{t.count}</span>
                  </button>
                </li>
              ))}
        </ul>
      ) : null}
    </div>
  );
}
