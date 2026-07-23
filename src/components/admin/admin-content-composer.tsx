"use client";

import { useMemo, useState } from "react";

import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

const INITIAL_CONTENT = "<p>Kickoff notes for the next District 76 community ride...</p>";

export function AdminContentComposer() {
  const [title, setTitle] = useState("District 76 Weekly Ride Brief");
  const [summary, setSummary] = useState("Route updates, meetup notes, and rider callouts.");
  const [content, setContent] = useState(INITIAL_CONTENT);

  const wordCount = useMemo(() => {
    const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainText) {
      return 0;
    }

    return plainText.split(" ").length;
  }, [content]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Editor</p>
        <h1 className="mt-2 font-display text-2xl text-white">New Content Draft</h1>
        <p className="mt-2 text-sm text-slate-300">
          Same WYSIWYG foundation as Vara Performance, now wired for admin publishing workflows in District 76.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none"
              placeholder="Post title"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none"
              placeholder="Short summary for list cards"
            />
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Body</p>
            <WysiwygEditor value={content} onChange={setContent} placeholder="Share ride updates, route notes, and reminders..." />
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Draft Metrics</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Words</dt>
              <dd className="mt-1 font-display text-2xl text-white">{wordCount}</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Status</dt>
              <dd className="mt-1 text-sm font-semibold text-emerald-300">Draft</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="w-full rounded-lg bg-sunset px-3 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85"
            >
              Save Draft (UI Wired)
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-white/20 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Queue Publish (Next Step)
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Preview</p>
          <h2 className="mt-2 font-display text-xl text-white">{title || "Untitled draft"}</h2>
          <p className="mt-1 text-sm text-slate-300">{summary || "No summary yet."}</p>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div
              className="admin-preview prose prose-invert prose-sm max-w-none text-slate-200"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </section>
      </aside>
    </div>
  );
}
