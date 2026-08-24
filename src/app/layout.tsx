import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Front of Pack — Understand a product label from one photo",
  description:
    "See whole-pack nutrition, warnings, ingredients, claims and the evidence behind them on web or WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}<footer className="site-footer"><Link className="footer-brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><strong>Front of Pack</strong></Link><p>Front of Pack is an independent consumer-information prototype. It is not affiliated with or endorsed by any government authority. Information is educational, not medical or legal advice.</p><Link href="/how-we-decide">How we decide →</Link></footer></body>
    </html>
  );
}
