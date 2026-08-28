import type { Metadata } from "next";

export const SITE_ORIGIN = "https://front-of-pack.front-of-pack-jobs-worker.workers.dev";
export const WHATSAPP_URL = "https://wa.me/919325835971";
export const SITE_TITLE = "Front of Pack — Understand a product label on WhatsApp";
export const SITE_DESCRIPTION = "Send a product photo on WhatsApp and get clear nutrition, ingredient, allergen and claim warnings with supporting evidence.";
export const HOME_SHARE_TITLE = "Know what you’re buying. See the facts that matter.";
export const HOME_CANONICAL_URL = `${SITE_ORIGIN}/`;
export const HOME_OG_IMAGE = {
  url: `${SITE_ORIGIN}/og.png`,
  width: 1200,
  height: 630,
  alt: "Front of Pack example showing added sugar and sodium findings for the total quantity",
  type: "image/png",
} as const;

export const HOME_METADATA: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: HOME_CANONICAL_URL },
  openGraph: {
    type: "website",
    url: HOME_CANONICAL_URL,
    siteName: "Front of Pack",
    title: HOME_SHARE_TITLE,
    description: SITE_DESCRIPTION,
    images: [HOME_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_SHARE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: HOME_OG_IMAGE.url, alt: HOME_OG_IMAGE.alt }],
  },
};
