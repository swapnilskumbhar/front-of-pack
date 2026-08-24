import type { Metadata } from "next";

export const SITE_ORIGIN = "https://front-of-pack.front-of-pack-jobs-worker.workers.dev";
export const SITE_TITLE = "Front of Pack — Understand a product label from one photo";
export const SITE_DESCRIPTION = "See whole-pack nutrition, warnings, ingredients, claims and the evidence behind them on web or WhatsApp.";
export const HOME_SHARE_TITLE = "The label shows one serving. See what the whole pack means.";
export const HOME_CANONICAL_URL = `${SITE_ORIGIN}/`;
export const HOME_OG_IMAGE = {
  url: `${SITE_ORIGIN}/og.png`,
  width: 1200,
  height: 630,
  alt: "Front of Pack example showing whole-pack added sugar and sodium findings",
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
