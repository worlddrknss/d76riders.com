// Default social-share image (Open Graph + Twitter). Pages that set their own
// `openGraph` shallow-replace the root's, so spread these to keep a share image.
export const OG_IMAGE_URL = "/images/og/image.png";

export const OG_IMAGE = [
  { url: OG_IMAGE_URL, width: 1200, height: 651, alt: "District 76 Riders" },
];
