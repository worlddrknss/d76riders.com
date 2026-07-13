import type { Metadata, Viewport } from "next";
import { Geist, Manrope } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { JsonLd, organizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const displayFont = Geist({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "District 76 Riders — Motorcycle Community in Clarksville, TN",
    template: "%s | District 76 Riders",
  },
  description:
    "District 76 Riders is a motorcycle riding community based in Clarksville, Tennessee. Join group rides, discover scenic roads, connect with riders, and explore the best routes in Middle Tennessee and beyond.",
  keywords: [
    "motorcycle club",
    "Clarksville TN",
    "motorcycle community",
    "group rides",
    "Tennessee motorcycle roads",
    "scenic rides",
    "District 76",
    "Middle Tennessee riders",
  ],
  authors: [{ name: "District 76 Riders" }],
  creator: "District 76 Riders",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "District 76 Riders",
    title: "District 76 Riders — Motorcycle Community in Clarksville, TN",
    description:
      "Join group rides, discover scenic roads, and connect with motorcycle riders in Clarksville, Tennessee and beyond.",
    images: [{ url: "/images/hero/home.webp", width: 1200, height: 630, alt: "District 76 Riders" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "District 76 Riders",
    description:
      "Motorcycle riding community in Clarksville, Tennessee. Group rides, scenic roads, and rider connections.",
    images: ["/images/hero/home.webp"],
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
      <body className="min-h-full bg-canvas text-ink">
        <JsonLd data={organizationJsonLd()} />
        <div className="relative z-[60] border-b border-amber-300/40 bg-amber-200 px-4 py-2 text-center text-xs font-semibold tracking-[0.06em] text-amber-950 sm:text-sm">
          District 76 Riders is still in Alpha build stages.
        </div>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
