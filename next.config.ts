import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Profile edit submits avatar + cover together; marketplace allows up to
      // 6 photos; and high-res exports/illustrations can be tens of MB each.
      // When a body exceeds this, Next truncates it and the multipart read
      // (file.arrayBuffer()) hangs forever — so keep generous headroom.
      bodySizeLimit: "75mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
  async redirects() {
    return [
      // /news became /magazine. Permanent (308) so search engines transfer the
      // ranking rather than treating these as two pages, and so existing links
      // and shares keep working. The admin routes under /admin/news are
      // untouched — only the public section was renamed.
      { source: "/news", destination: "/magazine", permanent: true },
      { source: "/news/:path*", destination: "/magazine/:path*", permanent: true },
      // Sponsors folded into the directory: a sponsor is a shop that also backs
      // us, and two near-empty pages served nobody. The filter keeps the
      // sponsors-only view that /sponsors used to be.
      { source: "/sponsors", destination: "/shops?tier=sponsor", permanent: true },
      // "Crews" became "Sub-communities" (the public term). Permanent so old
      // links/shares and search rankings carry over. The Crew model/tables and
      // the /admin/community/crews routes are internal and unchanged.
      { source: "/crews", destination: "/sub-communities", permanent: true },
      { source: "/crews/:path*", destination: "/sub-communities/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
