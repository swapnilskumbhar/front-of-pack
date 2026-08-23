import Link from "next/link";

import { ENGINE_VERSION } from "@/engine/types";
import { CLAIM_TESTS } from "@/knowledge/claim-tests";
import { RULE_PACKS } from "@/knowledge/rule-packs";

export default function HowWeDecidePage() {
  return <main className="service-page decision-page">
    <Link href="/">← Front of Pack</Link>
    <p className="eyebrow">Open decision logic · {ENGINE_VERSION}</p>
    <h1>Every warning has a calculation.</h1>
    <p>Terra reads the package once. Code validates the transcription and applies only the checks below. Missing inputs produce no derived warning.</p>

    <section className="service-card decision-flow">
      <h2>One model call, then reproducible decisions</h2>
      <ol><li><b>Transcribe</b><span>Printed serving, quantity, %RDA, claims and ingredient names.</span></li><li><b>Validate</b><span>Schema, bounds, evidence and official source IDs.</span></li><li><b>Calculate</b><span>Pure functions—no second model call and no hidden paraphrasing.</span></li></ol>
    </section>

    <section className="service-card">
      <p className="eyebrow">Serving-size reality</p>
      <h2>What does the whole pack mean?</h2>
      <code>derived RDA = serving amount ÷ (printed serving %RDA ÷ 100)</code>
      <code>whole-pack % = whole-pack amount ÷ derived RDA × 100</code>
      <div className="worked-example"><b>Worked example</b><span>12.6 g saturated fat / 100 g · 20 g serving · 11% printed RDA · 52 g packet</span><strong>Whole packet ≈ 29%</strong></div>
      <p className="decision-note">A signal appears only when the whole pack is at least 25% of the pack-derived reference and at least 1.5× its printed serving percentage. “Moderate” and “high” are presentation bands, not regulatory classifications.</p>
    </section>

    <section className="service-card">
      <p className="eyebrow">Literal package consistency</p>
      <h2>Which claim checks run?</h2>
      <div className="decision-grid">{CLAIM_TESTS.map((test) => <article key={test.id}>
        <span>{test.id}</span><h3>{test.label}</h3>
        <p>Claim patterns: {test.claimPatterns.map((pattern) => pattern.source).join(" · ")}</p>
        <p>Contradicting printed ingredients: {test.contradictingIngredients.join(", ")}</p>
        <a href={test.sourceUrl} target="_blank" rel="noreferrer">Official context ↗</a>
        <small>{test.limitation}</small>
      </article>)}</div>
      <p className="decision-note">These checks report an apparent package inconsistency. They do not determine formulation, intent, legality, or enforcement liability.</p>
    </section>

    <section className="service-card">
      <p className="eyebrow">Verified context</p>
      <h2>Rule packs supplied to Terra</h2>
      <ul className="source-list">{RULE_PACKS.map((rule) => <li key={rule.id}><div><b>{rule.title}</b><small>{rule.status} · accessed {rule.source.accessedDate}</small></div><a href={rule.source.url} target="_blank" rel="noreferrer">Source ↗</a></li>)}</ul>
      <p className="decision-note">The CCPA Greenwashing Guidelines apply to environmental claims. Front of Pack does not automatically label every “free-from” cosmetic claim as greenwashing. <a href="https://consumeraffairs.nic.in/latestnews/guidelines-prevention-and-regulation-greenwashing-or-misleading-environmental-claims-2024" target="_blank" rel="noreferrer">Official guidelines ↗</a></p>
    </section>
  </main>;
}
