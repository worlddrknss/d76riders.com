"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";

import { messageEventRidersAction, type EventMessageResult } from "@/app/(site)/events/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type MessageRidersDialogProps = {
  eventId: string;
  eventTitle: string;
  counts: { going: number; waitlisted: number; interested: number; checkedIn: number };
};

const AUDIENCES = [
  { value: "ALL", label: "Everyone who RSVP'd" },
  { value: "GOING", label: "Going only" },
  { value: "WAITLISTED", label: "Waitlist only" },
  { value: "INTERESTED", label: "Interested only" },
  { value: "CHECKED_IN", label: "Checked in (on the ride)" },
] as const;

// Starting points for the messages organizers actually send. Editable — they
// fill the box rather than send as-is.
const TEMPLATES: { label: string; audience: string; body: (title: string) => string }[] = [
  {
    label: "Update",
    audience: "ALL",
    body: () => "Quick update on this ride: ",
  },
  {
    label: "Delay",
    audience: "GOING",
    body: () => "We're running late — new KSU time is ",
  },
  {
    label: "Weather call",
    audience: "ALL",
    body: () => "Weather looks rough. We're still deciding — watch this space and check back by ",
  },
  {
    label: "Cancelled",
    audience: "ALL",
    body: (title) => `${title} is cancelled. Sorry for the short notice — reason: `,
  },
  {
    label: "Route change",
    audience: "GOING",
    body: () => "Route change: we're now going ",
  },
];

export function MessageRidersDialog({ eventId, eventTitle, counts }: MessageRidersDialogProps) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<string>("ALL");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<EventMessageResult | null>(null);
  const [pending, start] = useTransition();

  const audienceSize: Record<string, number> = {
    ALL: counts.going + counts.waitlisted + counts.interested,
    GOING: counts.going,
    WAITLISTED: counts.waitlisted,
    INTERESTED: counts.interested,
    CHECKED_IN: counts.checkedIn,
  };

  function submit() {
    const formData = new FormData();
    formData.set("audience", audience);
    formData.set("body", body);

    start(async () => {
      const res = await messageEventRidersAction(eventId, formData);
      setResult(res);
      if (res.sent) {
        setBody("");
        setTimeout(() => setOpen(false), 1800);
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Message Riders
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Riders</DialogTitle>
          </DialogHeader>

          {result?.sent ? (
            <p className="mt-3 rounded-md border border-forest/40 bg-forest/10 px-3 py-2 text-sm text-forest">
              Sent to {result.sent} rider{result.sent === 1 ? "" : "s"}. It&apos;s in their notifications
              now.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <label htmlFor="msg-audience" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Who gets it
                </label>
                <select
                  id="msg-audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
                >
                  {AUDIENCES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({audienceSize[option.value] ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Templates</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => {
                        setBody(template.body(eventTitle));
                        setAudience(template.audience);
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:border-sunset/50 hover:text-sunset"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="msg-body" className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Message
                </label>
                <Textarea
                  id="msg-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Keep it short — this lands in their notifications."
                  className="mt-1"
                />
                <p className="mt-1 text-right text-xs text-muted">{body.length}/1000</p>
              </div>

              {result?.error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {result.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="accent" size="sm" onClick={submit} disabled={pending || !body.trim()}>
                  <Send className="h-3.5 w-3.5" />
                  {pending ? "Sending…" : `Send to ${audienceSize[audience] ?? 0}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
