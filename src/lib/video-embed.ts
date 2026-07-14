/**
 * Parse a video URL and return an embeddable iframe src.
 * Supports YouTube, TikTok, Vimeo, Instagram, and Facebook.
 * Returns null for unrecognised URLs.
 */
export function getEmbedUrl(url: string): { src: string; provider: string } | null {
  try {
    const u = new URL(url);

    // YouTube – regular, short, and embed links
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId: string | null = null;
      if (u.hostname === "youtu.be") {
        videoId = u.pathname.slice(1);
      } else if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1]?.split(/[/?]/)[0] ?? null;
      } else if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/shorts/")[1]?.split(/[/?]/)[0] ?? null;
      }
      if (videoId) {
        return { src: `https://www.youtube-nocookie.com/embed/${videoId}`, provider: "youtube" };
      }
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const match = u.pathname.match(/\/(\d+)/);
      if (match?.[1]) {
        return { src: `https://player.vimeo.com/video/${match[1]}?dnt=1`, provider: "vimeo" };
      }
    }

    // TikTok – e.g. tiktok.com/@user/video/1234567890
    if (u.hostname.includes("tiktok.com")) {
      const match = u.pathname.match(/\/video\/(\d+)/);
      if (match?.[1]) {
        return { src: `https://www.tiktok.com/embed/v2/${match[1]}`, provider: "tiktok" };
      }
    }

    // Instagram Reels/Posts – e.g. instagram.com/reel/ABC123/ or /p/ABC123/
    if (u.hostname.includes("instagram.com")) {
      const match = u.pathname.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match?.[2]) {
        return { src: `https://www.instagram.com/${match[1]}/${match[2]}/embed`, provider: "instagram" };
      }
    }

    // Facebook video
    if (u.hostname.includes("facebook.com") || u.hostname.includes("fb.watch")) {
      return {
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
        provider: "facebook",
      };
    }
  } catch {
    return null;
  }

  return null;
}
