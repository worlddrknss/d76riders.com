type VideoEmbedProps = {
  url: string;
  platform: string;
};

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      return parsed.searchParams.get("v");
    }
  } catch {
    // ignore
  }
  return null;
}

function getTikTokId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    // ignore
  }
  return null;
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  if (platform === "YOUTUBE") {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
  }

  if (platform === "TIKTOK") {
    const videoId = getTikTokId(url);
    if (videoId) {
      return (
        <div className="aspect-[9/16] max-h-[400px] w-full">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            title="TikTok video"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    }
  }

  // Fallback: just show a link
  return (
    <div className="flex h-32 items-center justify-center bg-canvas">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-sunset hover:underline">
        Watch Video ↗
      </a>
    </div>
  );
}
