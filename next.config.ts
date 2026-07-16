import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Profile edit submits avatar + cover together, and event/garage/gear
      // photo uploads all flow through Server Actions — modern phone photos are
      // several MB each, so keep headroom for a multi-image submission.
      bodySizeLimit: "30mb",
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
    ];
  },
};

export default nextConfig;
