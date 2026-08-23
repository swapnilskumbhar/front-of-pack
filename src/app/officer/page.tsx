import Link from "next/link"; import OfficerClient from "./officer-client";
export default function OfficerPage(){return <main className="service-page"><Link href="/">← Front of Pack</Link><p className="eyebrow">Restricted demonstration</p><h1>Officer dashboard</h1><p>Redacted aggregate counts only. The dashboard fails closed when demo credentials are not configured.</p><OfficerClient /></main>}
