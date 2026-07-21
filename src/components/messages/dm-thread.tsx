"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, SendHorizontal, X } from "lucide-react";

import { fetchMessagesAction, sendMessageAction, type MessageDTO } from "@/app/(site)/messages/actions";

const POLL_MS = 4000;

export function DmThread({
  conversationId,
  viewerId,
  otherName,
  initialMessages,
  canSend = true,
  blockedNote,
}: {
  conversationId: string;
  viewerId: string;
  otherName: string;
  initialMessages: MessageDTO[];
  /** When false, the composer is replaced with a notice (e.g. a block). */
  canSend?: boolean;
  blockedNote?: string;
}) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

  function clearImage() {
    setImage(null);
    setPreview(null);
  }

  function send() {
    if (pending) return;
    const body = text.trim();
    if (!body && !image) return;
    const fd = new FormData();
    fd.set("body", body);
    if (image) fd.set("photo", image);
    setText("");
    clearImage();
    startSend(async () => {
      const msg = await sendMessageAction(conversationId, fd);
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
                  className={`max-w-[75%] overflow-hidden rounded-2xl text-sm ${
                    mine ? "bg-sunset text-white" : "bg-canvas text-ink"
                  }`}
                >
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={m.imageUrl} alt="" className="max-h-72 w-full object-cover" />
                    </a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words px-3.5 py-2">{m.body}</p>}
                </div>
              </div>
            );
          })
        )}
        {(() => {
          const lastMine = [...messages].reverse().find((m) => m.senderId === viewerId);
          return lastMine?.readAt ? (
            <p className="pr-1 text-right text-[0.65rem] font-medium text-muted">Seen</p>
          ) : null;
        })()}
        <div ref={bottomRef} />
      </div>

      {!canSend ? (
        <p className="border-t border-border p-4 text-center text-sm text-muted">
          {blockedNote ?? "You can't reply to this conversation."}
        </p>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border p-3"
      >
        {preview && (
          <div className="relative mb-2 inline-block">
            <img src={preview} alt="" className="h-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-asphalt text-white"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-canvas hover:text-sunset">
            <ImagePlus className="h-5 w-5" />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setImage(f);
                  setPreview(URL.createObjectURL(f));
                }
              }}
            />
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherName}…`}
            className="flex-1 rounded-full border border-border bg-canvas px-4 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || (!text.trim() && !image)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
            aria-label="Send"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
