import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE } from "@/site-metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}<footer className="site-footer"><Link className="footer-brand" href="/"><span className="brand-mark" aria-hidden="true">F</span><strong>Front of Pack</strong></Link><p>Front of Pack is an independent consumer-information prototype. It is not affiliated with or endorsed by any government authority. Information is educational, not medical or legal advice.</p><Link href="/how-we-decide">How we decide →</Link></footer></body>
    </html>
  );
}
