"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";

import { fetchMessagesAction, sendMessageAction, type MessageDTO } from "@/app/(site)/messages/actions";

const POLL_MS = 4000;

export function DmThread({
  conversationId,
  viewerId,
  otherName,
  initialMessages,
}: {
  conversationId: string;
  viewerId: string;
  otherName: string;
  initialMessages: MessageDTO[];
}) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startSend] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef<string | null>(initialMessages.at(-1)?.createdAt ?? null);

  // Near-real-time: poll for messages newer than the last one we have.
  useEffect(() => {
    let alive = true;
    const iv = setInterval(async () => {
      const incoming = await fetchMessagesAction(conversationId, lastAtRef.current);
      if (!alive || incoming.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      });
      lastAtRef.current = incoming[incoming.length - 1]!.createdAt;
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const body = text.trim();
    if (!body || pending) return;
    setText("");
    startSend(async () => {
      const msg = await sendMessageAction(conversationId, body);
      if (msg) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        lastAtRef.current = msg.createdAt;
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted">
            Say hey to {otherName} — this is the start of your conversation.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === viewerId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-sunset text-white" : "bg-canvas text-ink"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${otherName}…`}
          className="flex-1 rounded-full border border-border bg-canvas px-4 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
