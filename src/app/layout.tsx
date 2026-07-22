import type { Metadata, Viewport } from "next";
import { Anton, Manrope } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { JsonLd, organizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

// Anton for headings and Manrope for body — the same pair 93rdavenue uses, and a
// condensed poster face suits the ride flyers better than Geist did.
//
// Anton is published in a single weight. Headings across the site ask for
// font-bold anyway, so globals.css turns off synthetic bolding rather than
// stripping the weight from 200-odd call sites: the browser would otherwise
// smear an already-heavy face into a fake bold.
const displayFont = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://district76riders.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1c1c",
  // Required for env(safe-area-inset-*) to report anything on notched iPhones —
  // the mobile tab bar sits on top of the home indicator without it.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "D76 Riders",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "D76 Riders" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  title: {
    default: "District 76 Riders — Founded in Clarksville, Built for Tennessee Riders",
    template: "%s | District 76 Riders",
  },
  description:
    "All bikes, all riders, one community. District 76 is a motorcycle community founded in Clarksville, TN and built for all riders — group rides, scenic roads, and a platform made by riders, for riders.",
  keywords: [
    "motorcycle community",
    "Clarksville TN",
    "Tennessee motorcycle riders",
    "group rides",
    "Tennessee motorcycle roads",
    "scenic rides",
    "District 76",
    "Middle Tennessee riders",
    "Tennessee riders",
  ],
  authors: [{ name: "District 76 Riders" }],
  creator: "District 76 Riders",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "District 76 Riders",
    title: "District 76 Riders — All Bikes, All Riders, One Community",
    description:
      "All bikes, all riders, one community. Founded in Clarksville, TN and built for all riders. Share your rides, plan the next group ride, log your build, and discover scenic roads. No patches, no politics, no brand requirements.",
    images: [{ url: "/images/og/image.png", width: 1200, height: 651, alt: "District 76 Riders" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@district76riders",
    title: "District 76 Riders",
    description:
      "All bikes, all riders, one community. A Tennessee motorcycle community founded in Clarksville, TN.",
    images: ["/images/og/image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      {/* Bottom padding clears the fixed mobile tab bar (and the home
          indicator beneath it) so page content is never trapped under it. */}
      <body
        className="min-h-full bg-canvas pb-[calc(4rem+env(safe-area-inset-bottom))] text-ink lg:pb-0"
      >
        <JsonLd data={organizationJsonLd()} />
        <Navbar />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
