import type { MetadataRoute } from "next";

// Web app manifest — makes the site installable ("Add to Home Screen"). Next
// injects the <link rel="manifest"> automatically from this route.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "District 76 Riders",
    short_name: "D76 Riders",
    description: "A motorcycle community in Clarksville, Tennessee — events, ride journals, routes, and your garage.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f0ea",
    theme_color: "#1c1c1c",
    categories: ["social", "lifestyle", "sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon → jump straight to these.
    shortcuts: [
      { name: "Events", short_name: "Events", url: "/events", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", short_name: "Messages", url: "/messages", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Search", short_name: "Search", url: "/search", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
