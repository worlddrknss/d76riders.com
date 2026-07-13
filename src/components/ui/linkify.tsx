"use client";

const URL_REGEX = /https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*/gi;

type LinkifyProps = {
  text: string;
  className?: string;
};

export function Linkify({ text, className }: LinkifyProps) {
  const parts: (string | { url: string; display: string })[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }
    const raw = match[0];
    parts.push({ url: raw, display: raw });
    lastIndex = matchStart + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sunset underline decoration-sunset/30 hover:decoration-sunset"
          >
            {part.display}
          </a>
        ),
      )}
    </span>
  );
}
