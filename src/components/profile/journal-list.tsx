"use client";

import { AnimatePresence } from "framer-motion";
import { JournalEntryCard } from "@/components/profile/journal-entry-card";

type Entry = {
  id: string;
  title: string | null;
  body: string;
  createdAt: Date;
  galleryItems: { url: string; caption: string | null }[];
};

export function JournalList({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => (
          <JournalEntryCard key={entry.id} entry={entry} />
        ))}
      </AnimatePresence>
    </div>
  );
}
