import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Front of Pack — Evidence-backed shopper briefs from one photo",
  description:
    "See every material warning, absolute nutrition plus %RDA, allergens, ingredients, claims, rating and official next steps on web or WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
