import { getEmbedUrl } from "@/lib/video-embed";

interface VideoEmbedProps {
  url: string;
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const embed = getEmbedUrl(url);

  if (!embed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-canvas text-sm text-muted">
        Unsupported video link
      </div>
    );
  }

  const isTall = embed.provider === "tiktok" || embed.provider === "instagram";

  return (
    <div className={`w-full overflow-hidden ${isTall ? "aspect-9/16 max-h-150" : "aspect-video"}`}>
      <iframe
        src={embed.src}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
        title={`${embed.provider} video`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      />
    </div>
  );
}
