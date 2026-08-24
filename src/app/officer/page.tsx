import type { Metadata } from "next";
import Link from "next/link";
import OfficerClient from "./officer-client";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OfficerPage() {
  return <main className="service-page officer-page">
    <Link href="/">← Front of Pack</Link>
    <p className="eyebrow">Restricted demonstration</p>
    <h1>Officer dashboard</h1>
    <p>See anonymous operational volumes and the estimated OpenAI cost of each analyzed image. No image, shopper identity, product detail, or model response is exposed.</p>
    <OfficerClient />
  </main>;
}
